#!/usr/bin/env python3
"""
站点访客统计服务 —— SQLite 单文件 + Python 标准库，零第三方依赖。

端点：
  GET /api/hit?url=<路径>       记一次访问（204），同 IP+路径 30 分钟内去重
  GET /api/like?url=<路径>      给文章点赞（204），同 IP+路径 永久去重
  GET /api/react?url=<路径>&r=<表情> 给文章添加反应（204），白名单四枚表情，
                                同 IP+路径+表情 永久去重（可多选不同表情，无取消）
  GET /api/stats.json[?url=路径] {"uv","pv"[,"views","likes","reactions"]}（带 url 时附该路径数据）
  GET /api/top.json[?n=N]       {"items":[{url,views}...]} 文章阅读 Top N（默认 8，上限 20）
  GET /api/trend.json           {"days":[{date,pv,uv}...]} 近 30 天逐日聚合
  GET /api/health               存活检查（200 ok）

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
import json
import os
import re
import sqlite3
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from socketserver import ThreadingMixIn
from urllib.parse import urlparse, parse_qs


class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    """兼容 Python 3.6（CentOS 7 自带版本没有 http.server.ThreadingHTTPServer）"""

    daemon_threads = True

DB_PATH = os.environ.get('STATS_DB', '/var/lib/site-stats/stats.db')
SALT_PATH = os.environ.get('STATS_SALT', '/var/lib/site-stats/salt')
HOST = os.environ.get('STATS_HOST', '127.0.0.1')
PORT = int(os.environ.get('STATS_PORT', '8787'))
DEDUPE_WINDOW = 1800  # 同 IP+路径的打点去重窗口（秒）
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
        elif url.path == '/api/stats.json':
            self._stats(qs)
        elif url.path == '/api/top.json':
            self._top(qs)
        elif url.path == '/api/trend.json':
            self._trend()
        elif url.path == '/api/health':
            self._send(200, b'ok', 'text/plain')
        else:
            self._send(404, b'{"error":"not found"}')

    # —— 端点 ——

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
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
