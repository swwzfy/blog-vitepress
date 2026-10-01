#!/usr/bin/env python3
"""
站点访客统计服务 —— SQLite 单文件 + Python 标准库，零第三方依赖。

端点：
  GET /api/hit?u=<路径>         记一次访问（204），同 IP+路径 30 分钟内去重
  GET /api/stats.json[?u=路径]  {"uv": 累计访客, "pv": 累计访问[, "views": 该路径阅读数]}
  GET /api/health               存活检查（200 ok）

设计取舍：
  - 只监听 127.0.0.1，公网入口交给 nginx 反代 + limit_req 限流，
    因此信任 nginx 传来的 X-Real-IP，不做来源校验
  - IP 只存 sha256(ip + 盐)，盐在数据目录自动生成（0600），不落原始 IP
  - 明细不清理：个人博客一年 ~10MB，量级无忧；真大了再加日聚合表
  - UA 含 bot/spider/curl 等的请求不计入（页脚和阅读数是给人看的）
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
        elif url.path == '/api/stats.json':
            self._stats(qs)
        elif url.path == '/api/health':
            self._send(200, b'ok', 'text/plain')
        else:
            self._send(404, b'{"error":"not found"}')

    # —— 端点 ——

    def _hit(self, qs):
        path = (qs.get('url') or [''])[0]
        ua = self.headers.get('User-Agent', '')
        if not PATH_RE.match(path) or UA_RE.search(ua):
            self._send(204, b'')
            return
        ip = self.headers.get('X-Real-IP') or self.client_address[0]
        ip_hash = hashlib.sha256((ip + SALT).encode()).hexdigest()
        now = int(time.time())
        conn = sqlite3.connect(DB_PATH)
        try:
            dup = conn.execute(
                'SELECT 1 FROM hits WHERE ip_hash=? AND url=? AND ts>? LIMIT 1',
                (ip_hash, path, now - DEDUPE_WINDOW),
            ).fetchone()
            if not dup:
                conn.execute(
                    'INSERT INTO hits(ts, url, ip_hash, ua) VALUES(?,?,?,?)',
                    (now, path, ip_hash, ua[:200]),
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
                out['views'] = conn.execute(
                    'SELECT COUNT(*) FROM hits WHERE url=?', (path,)
                ).fetchone()[0]
        finally:
            conn.close()
        self._send(200, json.dumps(out).encode())

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
