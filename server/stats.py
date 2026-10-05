#!/usr/bin/env python3
"""
站点访客统计服务 —— SQLite 单文件 + Python 标准库，零第三方依赖。

端点：
  GET /api/hit?url=<路径>       记一次访问（204），同 IP+路径 30 分钟内去重
  GET /api/like?url=<路径>      给文章点赞（204），同 IP+路径 永久去重
  GET /api/react?url=<路径>&r=<表情> 给文章添加反应（204），白名单四枚表情，
                                同 IP+路径+表情 永久去重（可多选不同表情，无取消）
  GET /api/search?q=<词>        记录本地搜索热词（204），2-80 字符，
                                同 IP+词 10 分钟内去重
  GET /api/searches.json[?n=N]  {"items":[{term,count}...]} 近 30 天热词榜（默认 10，上限 20）
  GET /api/friends-activity     {"fetchedAt","items":[{title,link,date,friend,avatar}...]}
                                友链圈子动态（与构建期 friends-activity.json 同构，
                                前端拿不到时回退种子文件）。数据来自后台线程定时
                                抓取 FRIENDS_JSON 里带 feed 的友链（启动即抓，
                                此后每 6 小时一轮），健康状态记录在 friend_health 表
  GET /api/stats.json[?url=路径] {"uv","pv"[,"views","likes","reactions"]}（带 url 时附该路径数据）
  GET /api/top.json[?n=N]       {"items":[{url,views}...]} 文章阅读 Top N（默认 8，上限 20）
  GET /api/trend.json           {"days":[{date,pv,uv}...]} 近 30 天逐日聚合
  GET /api/health               存活检查（200 ok）
  GET /api/weather              {"code","temperature","city"} 访客所在地当前天气：
                                X-Real-IP 经 ip2region 离线库（ip2region_v4/v6.xdb，
                                独立部署在数据目录，缺失时本端点 502、服务不受影响）
                                城市级定位 → 城市坐标永久缓存 → Open-Meteo 当前天气
                                按城市缓存 30 分钟；只对中国城市负责，内网/海外返回
                                502，由前端浏览器直连定位链接管（其最终兜底为扬州）

设计取舍：
  - 只监听 127.0.0.1，公网入口交给 nginx 反代 + limit_req 限流，
    因此信任 nginx 传来的 X-Real-IP，不做来源校验
  - IP 只存 sha256(ip + 盐)，盐在数据目录自动生成（0600），不落原始 IP
  - 明细不清理：个人博客一年 ~10MB，量级无忧；daily 聚合表启动时从明细全量重建（自愈）
  - UA 含 bot/spider/curl 等的请求不计入（页脚和阅读数是给人看的）
  - 点赞与打点同构：GET + IP 哈希去重，不存任何用户文本，不引入 POST/CSRF 面
  - URL 统一无 .html 后缀存储：写入时剥后缀，读取按"无后缀 + .html"双形态聚合
    （线上 nginx 下访客地址带 .html，历史明细两种形态并存，2026-10-02 起）
"""
import hashlib
import ipaddress
import json
import os
import re
import socket
import sqlite3
import threading
import time
import urllib.request
from datetime import datetime
from email.utils import parsedate_to_datetime
from http.server import BaseHTTPRequestHandler, HTTPServer
from socketserver import ThreadingMixIn
from urllib.parse import urlparse, parse_qs, quote


class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    """兼容 Python 3.6（CentOS 7 自带版本没有 http.server.ThreadingHTTPServer）"""

    daemon_threads = True

DB_PATH = os.environ.get('STATS_DB', '/var/lib/site-stats/stats.db')
SALT_PATH = os.environ.get('STATS_SALT', '/var/lib/site-stats/salt')
FRIENDS_JSON = os.environ.get('FRIENDS_JSON', '/var/lib/site-stats/friends.json')
HOST = os.environ.get('STATS_HOST', '127.0.0.1')
PORT = int(os.environ.get('STATS_PORT', '8787'))
DEDUPE_WINDOW = 1800  # 同 IP+路径的打点去重窗口（秒）
SEARCH_DEDUPE_WINDOW = 600  # 同 IP+搜索词的去重窗口（秒）
FEED_INTERVAL = 6 * 3600  # 友链 feed 抓取周期（秒）
FEED_TIMEOUT = 8
UA_RE = re.compile(r'bot|spider|crawl|curl|wget|python-requests|headless', re.I)
PATH_RE = re.compile(r'^/[\w\-./]{0,150}$')

# 反应白名单：不在名单内的 r 参数直接忽略
REACT_EMOJIS = ('👍', '❤️', '😂', '🎉')


def normalize_url(path: str) -> str:
    """入库口径：剥掉 .html 后缀。同篇文章只允许一个 url 形态，避免计数分裂"""
    return path[:-5] if path.endswith('.html') else path


def load_salt() -> str:
    # 目录不存在时自建，杜绝"忘建目录"这类部署失败（init_db 对 DB 同样处理）
    os.makedirs(os.path.dirname(SALT_PATH), exist_ok=True)
    try:
        with open(SALT_PATH, encoding='ascii') as f:
            return f.read().strip()
    except FileNotFoundError:
        salt = os.urandom(16).hex()
        fd = os.open(SALT_PATH, os.O_WRONLY | os.O_CREAT, 0o600)
        with os.fdopen(fd, 'w', encoding='ascii') as f:
            f.write(salt)
        return salt


SALT = load_salt()


def init_db() -> None:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute('PRAGMA journal_mode=WAL')
        conn.execute('''CREATE TABLE IF NOT EXISTS hits (
            ts      INTEGER NOT NULL,
            url     TEXT NOT NULL,
            ip_hash TEXT NOT NULL,
            ua      TEXT)''')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_hits_url ON hits(url)')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_hits_ip ON hits(ip_hash, url, ts)')
        conn.execute('''CREATE TABLE IF NOT EXISTS likes (
            url     TEXT NOT NULL,
            ip_hash TEXT NOT NULL,
            ts      INTEGER NOT NULL)''')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_likes_ip ON likes(ip_hash, url)')
        conn.execute('''CREATE TABLE IF NOT EXISTS reactions (
            url      TEXT NOT NULL,
            reaction TEXT NOT NULL,
            ip_hash  TEXT NOT NULL,
            ts       INTEGER NOT NULL)''')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_reactions_ip ON reactions(ip_hash, url, reaction)')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_reactions_url ON reactions(url, reaction)')
        conn.execute('''CREATE TABLE IF NOT EXISTS searches (
            term    TEXT NOT NULL,
            ts      INTEGER NOT NULL,
            ip_hash TEXT NOT NULL)''')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_searches_term ON searches(term, ts)')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_searches_ip ON searches(ip_hash, ts)')
        conn.execute('''CREATE TABLE IF NOT EXISTS friend_feeds (
            friend      TEXT NOT NULL,
            title       TEXT NOT NULL,
            link        TEXT NOT NULL,
            published   TEXT,
            published_ts INTEGER NOT NULL,
            fetched_at  INTEGER NOT NULL)''')
        conn.execute('CREATE INDEX IF NOT EXISTS idx_feeds_ts ON friend_feeds(published_ts)')
        conn.execute('''CREATE TABLE IF NOT EXISTS friend_health (
            friend    TEXT PRIMARY KEY,
            last_ok   INTEGER,
            last_fail INTEGER,
            last_error TEXT)''')
        # daily 是明细的派生缓存（旧版 SQLite 无 UPSERT，重建比增量合并可靠）：
        # 启动时全量重算一次，运行期在打点事务里增量累加 —— 重启即自愈
        conn.execute('''CREATE TABLE IF NOT EXISTS daily (
            date TEXT PRIMARY KEY,
            pv   INTEGER NOT NULL,
            uv   INTEGER NOT NULL)''')
        conn.execute('DELETE FROM daily')
        conn.execute(
            "INSERT INTO daily(date, pv, uv) "
            "SELECT date(ts, 'unixepoch', 'localtime'), COUNT(*), COUNT(DISTINCT ip_hash) "
            "FROM hits GROUP BY 1"
        )
        conn.commit()
    finally:
        conn.close()


def _assert_public_http_url(url: str) -> None:
    """SSRF 防护（Mimosa 要求）：仅允许 http(s)，解析出的全部 IP 不得落在
    私网/环回/链路本地/保留段。友链地址来自服务器本地配置文件（管理员可控），
    此为纵深防御；DNS rebinding 的彻底防护需固定 IP 连接，个人博客量级
    采用解析校验 + 短超时。"""
    m = re.match(r'^https?://([^/:?#]+)', url, re.I)
    if not m:
        raise ValueError('only http(s) feed urls are allowed: %s' % url)
    host = m.group(1)
    for info in socket.getaddrinfo(host, None):
        ip = ipaddress.ip_address(info[4][0])
        if (ip.is_private or ip.is_loopback or ip.is_link_local
                or ip.is_reserved or ip.is_multicast or ip.is_unspecified):
            raise ValueError('feed host resolves to a forbidden address: %s' % ip)


class _SafeRedirectHandler(urllib.request.HTTPRedirectHandler):
    """重定向目标逐跳复检，防止校验通过后被 302 引入内网"""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        _assert_public_http_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


_FEED_OPENER = urllib.request.build_opener(_SafeRedirectHandler())


_FEED_ENTITIES = {'amp': '&', 'lt': '<', 'gt': '>', 'quot': '"', 'apos': "'", '#39': "'"}


def _decode_entities(s: str) -> str:
    return re.sub(r'&(amp|lt|gt|quot|apos|#39);', lambda m: _FEED_ENTITIES[m.group(1)], s)


def _parse_feed(xml: str):
    """极简 RSS 2.0 / Atom 解析：只取 title/link/date，剥 CDATA 与内联标签（与构建期 JS 同口径）"""
    items = []
    for block in re.split(r'<(?:item|entry)[\s>]', xml)[1:]:
        def pick(tag, block=block):
            m = re.search(r'<%s[^>]*>([\s\S]*?)</%s>' % (tag, tag), block, re.I)
            if not m:
                return ''
            stripped = re.sub(r'<!\[CDATA\[([\s\S]*?)\]\]>', r'\1', m.group(1))
            return _decode_entities(re.sub(r'<[^>]+>', '', stripped)).strip()
        title = pick('title')
        link = pick('link')
        if not link:
            m = re.search(r'<link[^>]*href="([^"]+)"', block, re.I)
            link = m.group(1).strip() if m else ''
        date = pick('pubDate') or pick('published') or pick('updated')
        if title and link:
            items.append({'title': title, 'link': link, 'date': date})
    return items


def _date_epoch(s: str) -> int:
    for parser in (parsedate_to_datetime,
                   lambda x: datetime.fromisoformat(x.replace('Z', '+00:00'))):
        try:
            return int(parser(s).timestamp())
        except Exception:
            continue
    return 0


def _load_friends():
    with open(FRIENDS_JSON, encoding='utf-8') as f:
        return json.load(f)


def fetch_friend_feeds():
    try:
        friends = _load_friends()
    except Exception as e:
        print('friend_feeds: FRIENDS_JSON unreadable:', e)
        return
    ok = fail = 0
    for f in friends:
        feed = f.get('feed')
        if not feed:
            continue
        name = f.get('name', '')
        now = int(time.time())
        try:
            _assert_public_http_url(feed)
            req = urllib.request.Request(feed, headers={
                'User-Agent': 'jossecho-blog friends-feed fetcher (+https://www.jossecho.com)',
                'Accept-Encoding': 'identity',
            })
            with _FEED_OPENER.open(req, timeout=FEED_TIMEOUT) as r:
                xml = r.read().decode('utf-8', errors='replace')
            conn = sqlite3.connect(DB_PATH)
            try:
                conn.execute('DELETE FROM friend_feeds WHERE friend=?', (name,))
                for it in _parse_feed(xml)[:4]:
                    conn.execute(
                        'INSERT INTO friend_feeds(friend, title, link, published, published_ts, fetched_at)'
                        ' VALUES(?,?,?,?,?,?)',
                        (name, it['title'], it['link'], it['date'], _date_epoch(it['date']), now),
                    )
                conn.execute('INSERT OR IGNORE INTO friend_health(friend) VALUES(?)', (name,))
                conn.execute('UPDATE friend_health SET last_ok=?, last_error=NULL WHERE friend=?', (now, name))
                conn.commit()
            finally:
                conn.close()
            ok += 1
        except Exception as e:
            conn = sqlite3.connect(DB_PATH)
            try:
                conn.execute('INSERT OR IGNORE INTO friend_health(friend) VALUES(?)', (name,))
                conn.execute('UPDATE friend_health SET last_fail=?, last_error=? WHERE friend=?',
                             (now, str(e)[:200], name))
                conn.commit()
            finally:
                conn.close()
            fail += 1
    print('friend_feeds: %d ok, %d fail' % (ok, fail))


def _feeds_loop():
    while True:
        try:
            fetch_friend_feeds()
        except Exception:
            pass  # 周期循环不允许死：下一轮再试
        time.sleep(FEED_INTERVAL)


# —— 天气（ip2region 离线定位 + Open-Meteo）——
# xdb 整体载入内存（v4 11MB + v6 37MB）：检索免文件句柄，天然线程安全，免锁。
# 城市坐标与天气缓存的读写依赖 GIL 的原子性，最坏情况是并发时重复一次上游请求，
# 结果幂等，不值得为此加锁。

XDB_V4_PATH = os.environ.get('IP2REGION_XDB_V4', '/var/lib/site-stats/ip2region_v4.xdb')
XDB_V6_PATH = os.environ.get('IP2REGION_XDB_V6', '/var/lib/site-stats/ip2region_v6.xdb')
WEATHER_TTL = 1800
UPSTREAM_TIMEOUT = 6

_XDB_BUFS = {}       # 'v4'/'v6' -> bytes；加载失败不缓存，下次请求重试（文件后补部署即可自愈）
_COORD_CACHE = {}    # city -> (lat, lon)，城市坐标基本不变，进程内永久
_WEATHER_CACHE = {}  # city -> (ts, payload)


def _load_xdb(which):
    if which in _XDB_BUFS:
        return _XDB_BUFS[which]
    path = XDB_V4_PATH if which == 'v4' else XDB_V6_PATH
    try:
        with open(path, 'rb') as f:
            buf = f.read()
    except OSError as e:
        print('weather: xdb unreadable (%s): %s' % (path, e))
        return None
    _XDB_BUFS[which] = buf
    return buf


def _u16(b, o):
    return b[o] | (b[o + 1] << 8)


def _u32(b, o):
    return b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)


def _search_xdb(buf, ip_bytes):
    """v3 xdb 检索：向量索引定位段 → 段内二分。v4 索引是小端字节序（逐字节反转比较，
    兼容旧编码实现），v6 直接大端比较；index_size v4=14 / v6=38（起止 IP + 2B 长度 + 4B 指针）"""
    n = len(ip_bytes)
    idx = ip_bytes[0] * 2048 + ip_bytes[1] * 8
    s_ptr = _u32(buf, 256 + idx)
    e_ptr = _u32(buf, 256 + idx + 4)
    if s_ptr == 0 or e_ptr == 0:
        return ''
    index_size = 14 if n == 4 else 38

    def cmp_at(off):
        # 输入 ip 与 XDB 中 (off) 处起始 IP 的比较
        if n == 4:
            j = off + n - 1
            for i in range(n):
                if ip_bytes[i] != buf[j]:
                    return -1 if ip_bytes[i] < buf[j] else 1
                j -= 1
            return 0
        sub = buf[off:off + n]
        return (ip_bytes > sub) - (ip_bytes < sub)

    l, h = 0, (e_ptr - s_ptr) // index_size
    d_len = d_ptr = 0
    while l <= h:
        m = (l + h) >> 1
        p = s_ptr + m * index_size
        c = cmp_at(p)
        if c < 0:
            h = m - 1
        elif cmp_at(p + n) > 0:
            l = m + 1
        else:
            d_len = _u16(buf, p + 2 * n)
            d_ptr = _u32(buf, p + 2 * n + 2)
            break
    if d_len == 0:
        return ''
    return buf[d_ptr:d_ptr + d_len].decode('utf-8', errors='replace')


def _ip_to_city(ip):
    """访客 IP → 中国城市名（市级缺失退省级，剥掉 trailing 市/省）。
    内网/保留段、海外、未收录一律返回空串：海外交给前端浏览器直连定位链
    （国际库判定更准），不做硬编码兜底"""
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return ''
    if not addr.is_global:
        return ''
    buf = _load_xdb('v4' if addr.version == 4 else 'v6')
    if not buf:
        return ''
    try:
        region = _search_xdb(buf, addr.packed)
    except Exception:
        return ''
    # v3 地区格式：国家|省|市|ISP|国家码（中国条目为中文，海外为英文）
    parts = region.split('|')
    if len(parts) < 3 or parts[0] != '中国':
        return ''
    for field in (parts[2], parts[1]):
        name = field.strip()
        if name and name != '0':
            return name[:-1] if name.endswith(('市', '省')) else name
    return ''


def _get_coords(city):
    """城市 → 坐标（Open-Meteo geocoding，进程内永久缓存）。先查剥掉市后缀的短名，
    再退全名；查不到返回 None"""
    if city in _COORD_CACHE:
        return _COORD_CACHE[city]
    for q in (city, city + '市'):
        try:
            url = ('https://geocoding-api.open-meteo.com/v1/search?name=%s&count=1&language=zh'
                   % quote(q))
            _assert_public_http_url(url)
            req = urllib.request.Request(url, headers={
                'User-Agent': 'jossecho-blog weather (+https://www.jossecho.com)',
            })
            with _FEED_OPENER.open(req, timeout=UPSTREAM_TIMEOUT) as r:
                results = (json.load(r) or {}).get('results') or []
            if results:
                loc = (results[0]['latitude'], results[0]['longitude'])
                _COORD_CACHE[city] = loc
                return loc
        except Exception:
            continue
    return None


def _get_weather(city):
    now = int(time.time())
    hit = _WEATHER_CACHE.get(city)
    if hit and now - hit[0] < WEATHER_TTL:
        return hit[1]
    coords = _get_coords(city)
    if not coords:
        return None
    url = ('https://api.open-meteo.com/v1/forecast?latitude=%s&longitude=%s'
           '&current=temperature_2m,weather_code' % coords)
    try:
        _assert_public_http_url(url)
        req = urllib.request.Request(url, headers={
            'User-Agent': 'jossecho-blog weather (+https://www.jossecho.com)',
        })
        with _FEED_OPENER.open(req, timeout=UPSTREAM_TIMEOUT) as r:
            cur = (json.load(r) or {}).get('current') or {}
        code, temp = cur.get('weather_code'), cur.get('temperature_2m')
        if code is None or temp is None:
            return None
        payload = {'code': int(code), 'temperature': temp, 'city': city}
    except Exception:
        return None
    _WEATHER_CACHE[city] = (now, payload)
    return payload


class Handler(BaseHTTPRequestHandler):
    server_version = 'SiteStats/1.0'

    def do_GET(self):
        url = urlparse(self.path)
        qs = parse_qs(url.query)
        if url.path == '/api/hit':
            self._hit(qs)
        elif url.path == '/api/like':
            self._like(qs)
        elif url.path == '/api/react':
            self._react(qs)
        elif url.path == '/api/search':
            self._search(qs)
        elif url.path == '/api/searches.json':
            self._searches(qs)
        elif url.path == '/api/friends-activity':
            self._friends_activity()
        elif url.path == '/api/stats.json':
            self._stats(qs)
        elif url.path == '/api/top.json':
            self._top(qs)
        elif url.path == '/api/trend.json':
            self._trend()
        elif url.path == '/api/weather':
            self._weather()
        elif url.path == '/api/health':
            self._send(200, b'ok', 'text/plain')
        else:
            self._send(404, b'{"error":"not found"}')

    # —— 端点 ——

    def _weather(self):
        ip = self.headers.get('X-Real-IP') or self.client_address[0]
        city = _ip_to_city(ip)
        if not city:
            # 内网/海外/未收录：502 交给前端浏览器直连定位链（海外判定更准）
            self._send(502, b'{"error":"no cn city for client ip"}')
            return
        payload = _get_weather(city)
        if not payload:
            self._send(502, b'{"error":"weather upstream unavailable"}')
            return
        self._send(200, json.dumps(payload).encode())

    def _hit(self, qs):
        path = normalize_url((qs.get('url') or [''])[0])
        ua = self.headers.get('User-Agent', '')
        if not PATH_RE.match(path) or UA_RE.search(ua):
            self._send(204, b'')
            return
        ip = self.headers.get('X-Real-IP') or self.client_address[0]
        ip_hash = hashlib.sha256((ip + SALT).encode()).hexdigest()
        now = int(time.time())
        # 当日零点（服务器本地时区）：uv 口径是"当日去重访客"
        day = time.strftime('%Y-%m-%d')
        day_start = int(time.mktime(time.strptime(day, '%Y-%m-%d')))
        conn = sqlite3.connect(DB_PATH)
        try:
            dup = conn.execute(
                'SELECT 1 FROM hits WHERE ip_hash=? AND url=? AND ts>? LIMIT 1',
                (ip_hash, path, now - DEDUPE_WINDOW),
            ).fetchone()
            if not dup:
                # 今日新访客判断必须在插入本条 hit 之前，否则本条必然命中
                new_today = conn.execute(
                    'SELECT 1 FROM hits WHERE ip_hash=? AND ts>=? LIMIT 1',
                    (ip_hash, day_start),
                ).fetchone() is None
                conn.execute(
                    'INSERT INTO hits(ts, url, ip_hash, ua) VALUES(?,?,?,?)',
                    (now, path, ip_hash, ua[:200]),
                )
                conn.execute(
                    'INSERT OR IGNORE INTO daily(date, pv, uv) VALUES(?, 0, 0)', (day,)
                )
                conn.execute(
                    'UPDATE daily SET pv=pv+1, uv=uv+? WHERE date=?',
                    (1 if new_today else 0, day),
                )
            conn.commit()
        finally:
            conn.close()
        self._send(204, b'')

    def _like(self, qs):
        path = normalize_url((qs.get('url') or [''])[0])
        ua = self.headers.get('User-Agent', '')
        if not PATH_RE.match(path) or UA_RE.search(ua):
            self._send(204, b'')
            return
        ip = self.headers.get('X-Real-IP') or self.client_address[0]
        ip_hash = hashlib.sha256((ip + SALT).encode()).hexdigest()
        conn = sqlite3.connect(DB_PATH)
        try:
            dup = conn.execute(
                'SELECT 1 FROM likes WHERE ip_hash=? AND url=? LIMIT 1',
                (ip_hash, path),
            ).fetchone()
            if not dup:
                conn.execute(
                    'INSERT INTO likes(url, ip_hash, ts) VALUES(?,?,?)',
                    (path, ip_hash, int(time.time())),
                )
            conn.commit()
        finally:
            conn.close()
        self._send(204, b'')

    def _react(self, qs):
        path = normalize_url((qs.get('url') or [''])[0])
        reaction = (qs.get('r') or [''])[0]
        # http.server 以 latin-1 解码请求行：客户端若未百分号编码 emoji，
        # 这里会拿到乱码——还原一次；已正确解码的（含 >U+00FF 字符）会抛错，原样保留
        try:
            reaction = reaction.encode('latin-1').decode('utf-8')
        except UnicodeError:
            pass
        ua = self.headers.get('User-Agent', '')
        if not PATH_RE.match(path) or reaction not in REACT_EMOJIS or UA_RE.search(ua):
            self._send(204, b'')
            return
        ip = self.headers.get('X-Real-IP') or self.client_address[0]
        ip_hash = hashlib.sha256((ip + SALT).encode()).hexdigest()
        conn = sqlite3.connect(DB_PATH)
        try:
            dup = conn.execute(
                'SELECT 1 FROM reactions WHERE ip_hash=? AND url=? AND reaction=? LIMIT 1',
                (ip_hash, path, reaction),
            ).fetchone()
            if not dup:
                conn.execute(
                    'INSERT INTO reactions(url, reaction, ip_hash, ts) VALUES(?,?,?,?)',
                    (path, reaction, ip_hash, int(time.time())),
                )
            conn.commit()
        finally:
            conn.close()
        self._send(204, b'')

    def _search(self, qs):
        term = (qs.get('q') or [''])[0]
        # http.server 以 latin-1 解码请求行：未百分号编码的中文先还原（浏览器路径不受影响）
        try:
            term = term.encode('latin-1').decode('utf-8')
        except UnicodeError:
            pass
        term = ' '.join(term.split())
        ua = self.headers.get('User-Agent', '')
        # 2-80 字符：过滤单字噪声与超长滥用
        if not (2 <= len(term) <= 80) or UA_RE.search(ua):
            self._send(204, b'')
            return
        ip = self.headers.get('X-Real-IP') or self.client_address[0]
        ip_hash = hashlib.sha256((ip + SALT).encode()).hexdigest()
        now = int(time.time())
        conn = sqlite3.connect(DB_PATH)
        try:
            dup = conn.execute(
                'SELECT 1 FROM searches WHERE ip_hash=? AND term=? AND ts>? LIMIT 1',
                (ip_hash, term, now - 600),
            ).fetchone()
            if not dup:
                conn.execute(
                    'INSERT INTO searches(term, ts, ip_hash) VALUES(?,?,?)',
                    (term, now, ip_hash),
                )
            conn.commit()
        finally:
            conn.close()
        self._send(204, b'')

    def _searches(self, qs):
        try:
            n = int((qs.get('n') or ['10'])[0])
        except ValueError:
            n = 10
        n = max(1, min(n, 20))
        since = int(time.time()) - 30 * 86400
        conn = sqlite3.connect(DB_PATH)
        try:
            rows = conn.execute(
                'SELECT term, COUNT(*) AS c FROM searches WHERE ts>? GROUP BY term ORDER BY c DESC LIMIT ?',
                (since, n),
            ).fetchall()
        finally:
            conn.close()
        self._send(200, json.dumps(
            {'items': [{'term': t, 'count': c} for t, c in rows]}
        ).encode())

    def _friends_activity(self):
        conn = sqlite3.connect(DB_PATH)
        try:
            rows = conn.execute(
                'SELECT friend, title, link, published FROM friend_feeds'
                ' ORDER BY published_ts DESC LIMIT 8'
            ).fetchall()
            fetched_at = conn.execute('SELECT MAX(fetched_at) FROM friend_feeds').fetchone()[0]
        finally:
            conn.close()
        try:
            avatars = {f.get('name', ''): f.get('avatar', '') for f in _load_friends()}
        except Exception:
            avatars = {}
        items = [
            {'title': t, 'link': l, 'date': p, 'friend': fr, 'avatar': avatars.get(fr, '')}
            for fr, t, l, p in rows
        ]
        fetched_iso = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(fetched_at)) if fetched_at else ''
        self._send(200, json.dumps({'fetchedAt': fetched_iso, 'items': items}).encode())

    def _stats(self, qs):
        path = (qs.get('url') or [None])[0]
        conn = sqlite3.connect(DB_PATH)
        try:
            uv = conn.execute('SELECT COUNT(DISTINCT ip_hash) FROM hits').fetchone()[0]
            pv = conn.execute('SELECT COUNT(*) FROM hits').fetchone()[0]
            out = {'uv': uv, 'pv': pv}
            if path and PATH_RE.match(path):
                # 历史明细两种后缀形态并存，按双形态聚合
                base = normalize_url(path)
                out['views'] = conn.execute(
                    'SELECT COUNT(*) FROM hits WHERE url IN (?, ?)', (base, base + '.html')
                ).fetchone()[0]
                out['likes'] = conn.execute(
                    'SELECT COUNT(*) FROM likes WHERE url IN (?, ?)', (base, base + '.html')
                ).fetchone()[0]
                out['reactions'] = {
                    e: c for e, c in conn.execute(
                        'SELECT reaction, COUNT(*) FROM reactions WHERE url=? GROUP BY reaction',
                        (base,),
                    ).fetchall()
                }
        finally:
            conn.close()
        self._send(200, json.dumps(out).encode())

    def _top(self, qs):
        try:
            n = int((qs.get('n') or ['8'])[0])
        except ValueError:
            n = 8
        n = max(1, min(n, 20))
        conn = sqlite3.connect(DB_PATH)
        try:
            rows = conn.execute(
                "SELECT u, COUNT(*) AS views FROM ("
                "  SELECT CASE WHEN url LIKE '%.html' THEN substr(url, 1, length(url) - 5)"
                "         ELSE url END AS u FROM hits"
                ") WHERE u LIKE '/posts/%' OR u LIKE '/en/posts/%' "
                "GROUP BY u ORDER BY views DESC LIMIT ?",
                (n,),
            ).fetchall()
        finally:
            conn.close()
        self._send(200, json.dumps(
            {'items': [{'url': u, 'views': v} for u, v in rows]}
        ).encode())

    def _trend(self):
        conn = sqlite3.connect(DB_PATH)
        try:
            rows = conn.execute(
                'SELECT date, pv, uv FROM daily ORDER BY date DESC LIMIT 30'
            ).fetchall()
        finally:
            conn.close()
        rows.reverse()
        self._send(200, json.dumps(
            {'days': [{'date': d, 'pv': p, 'uv': u} for d, p, u in rows]}
        ).encode())

    # —— 底层 ——

    def _send(self, code, body, ctype='application/json; charset=utf-8'):
        self.send_response(code)
        if code != 204:
            self.send_header('Content-Type', ctype)
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        if body:
            self.wfile.write(body)

    def log_message(self, *args):
        pass  # 访问日志 nginx 已经记了，这里静默


if __name__ == '__main__':
    init_db()
    # 友链圈子动态抓取线程：启动即抓一轮，此后每 6 小时一次（守护线程不阻塞服务）
    threading.Thread(target=_feeds_loop, daemon=True).start()
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
