---
title: "Self-Hosting Visitor Stats: Ditching Busuanzi with 200 Lines of Python and SQLite"
date: 2026-10-01
tags: [Server Ops]
description: The free stats service on my blog footer was half-dead, leaving a permanent dash. I replaced it with a self-hosted counter built on the Python standard library and SQLite — zero dependencies, five pitfalls, each worth more than the feature.
---

# Self-Hosting Visitor Stats: Ditching Busuanzi with 200 Lines of Python and SQLite

My blog footer showed "Visitors - · Views -" for a long time. The source was Busuanzi, a free stats service that works whenever it feels like it. A while ago I asked someone to review my blog, and one line stung: a broken badge is worse than no badge. Harsh, but fair.

So I built my own. This post walks through the whole journey — five pitfalls, each worth more than the feature.

<!-- more -->

## The result first

Two layers:

```
Browser ──GET /api/hit?url=...──▶ nginx ──▶ 127.0.0.1:8787 stats service ──▶ stats.db (SQLite)
Browser ──fetch /api/stats.json──▶ nginx ──▶ the same service
```

Three decisions, all of which held up:

**SQLite, not MySQL.** One file, no daemon, driver built into the Python standard library. A personal blog produces at most a few thousand records a year — installing a database server for two footer numbers costs more in ops than it delivers in features.

**Python standard library, zero packages.** http.server for the API, sqlite3 for storage. I never even ran pip install on the server. The fewer dependencies, the higher the odds it still runs six months from now.

**Listen on 127.0.0.1 only.** nginx handles the public side; the service itself never exposes a single byte to the internet.

The server came out to about 200 lines, plus 12 lines of systemd and 6 lines of nginx. All of it lives in the server/ directory of the repo.

## Service design

One table:

```sql
CREATE TABLE hits (
    ts      INTEGER NOT NULL,   -- unix seconds
    url     TEXT NOT NULL,      -- /posts/xxx
    ip_hash TEXT NOT NULL,      -- sha256(ip + salt)
    ua      TEXT
);
```

Three decisions worth expanding:

**Hash the IP, never store it raw.** sha256 with a salt — good enough for dedup, and if the database leaks it's just hex soup. The salt is generated on first start with 0600 permissions.

**Deduplicate per IP + path within 30 minutes.** Ten refreshes count as one visit. The core is a single query:

```python
dup = conn.execute(
    'SELECT 1 FROM hits WHERE ip_hash=? AND url=? AND ts>? LIMIT 1',
    (ip_hash, path, now - DEDUPE_WINDOW),
).fetchone()
```

**Bots don't count.** Requests whose user agent contains bot, spider, curl, wget and friends get dropped — the footer number is for humans. This filter later proved itself during deployment verification: testing the endpoint with curl returned 204 but the number didn't move. The filter was working.

## Pitfall 1: parameter name mismatch, the views field vanishes

I tested locally right after writing — the only thing I did right up front.

The service has two endpoints: /api/hit reads a u parameter, /api/stats.json reads url, and the frontend sends url. So the aggregation endpoint always returned:

```json
{"uv": 1, "pv": 2}
```

Where was views? uv matched, pv matched, only the per-path read count was missing. Line by line, I found it: **the same parameter had two different names across two endpoints**. Three edits to unify on url, and views appeared:

```json
{"uv": 1, "pv": 2, "views": 1}
```

Lesson: ten rounds of code review are worth less than one real run with the response body open.

## Pitfall 2: the server's Python has no ThreadingHTTPServer

Everything worked locally. Deployed to the server, systemd offered a dismissive crash loop:

```
Active: activating (auto-restart) (Result: exit-code)
Main PID: 665616 (code=exited, status=1/FAILURE)
```

Crash-looping, with no Python error visible in the status output. Running it in the foreground revealed the truth:

```
AttributeError: module 'http.server' has no attribute 'ThreadingHTTPServer'
```

The server runs CentOS 7 with Python 3.6 — ThreadingHTTPServer joined the standard library in 3.7. The compatible way is to assemble one yourself, works on every version:

```python
from http.server import BaseHTTPRequestHandler, HTTPServer
from socketserver import ThreadingMixIn

class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True
```

Lesson: "works locally" only proves the local version works. `python3 -V` should be checked before writing the first line.

## Pitfall 3: the salt file cannot be created

```
FileNotFoundError: [Errno 2] No such file or directory: '/var/lib/site-stats/salt'
```

The salt is a random string used to hash IPs, generated on first start. The cause: **os.open with O_CREAT creates files, not parent directories** — and the "create the directory" step in my deployment checklist got skipped.

The fix is to let the code cover for itself:

```python
os.makedirs(os.path.dirname(SALT_PATH), exist_ok=True)
```

Lesson: steps in a deployment document written for "a person" will eventually be skipped by that person. The most reliable executor is the code.

## Pitfall 4: testing in the foreground as root makes everything root-owned

While chasing pitfall 3, I ran the service once in the foreground as root. The problem got fixed, but the salt and stats.db files were now owned by root, while systemd runs the service as the www user — instant PermissionError on startup.

Two commands:

```bash
chown -R www:www /var/lib/site-stats
systemctl restart stats
```

Lesson: use foreground runs only to **read the error**. After Ctrl+C, chown immediately — otherwise you're planting the next error while digging out this one.

## Pitfall 5: 502, a zero-size shared memory zone, and "website already exists"

All the frontend needs is /api/ proxied to port 8787. This part had three acts.

First I added rate limiting, and the nginx config test failed immediately:

```
nginx: [emerg] zero size shared memory zone "statsapi"
```

Pasting had eaten the size parameter of limit_req_zone, so nginx saw a zero-size memory zone and refused to load. Decision: drop rate limiting for now — the service dedupes on its own. Get it working first, polish later.

Then I tried the reverse proxy GUI in the BT hosting panel. After filling in the domain, Confirm answered:

```
Website already exists, do not add duplicates
```

Once I understood what that dialog does, it made sense: it creates a **brand-new standalone site** for the domain to hang the proxy on — and the blog's domain already exists. Dead end.

Back to three hand-written lines, pasted into the server block listening on 443:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8787;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header User-Agent $http_user_agent;
}
```

Saved, opened /api/health in the browser, and got **502 Bad Gateway**.

A 502 is half good news: the request had successfully traveled through the proxy and been forwarded to 8787 — the backend just wasn't alive. The rest was a replay of the earlier pitfalls: start the service, create the directory, fix ownership, one by one.

## Launch

```
$ curl http://127.0.0.1:8787/api/health
ok

$ curl 'https://www.jossecho.com/api/stats.json?url=/posts/xxx'
{"uv": 1, "pv": 3, "views": 1}
```

The footer went from "Visitors - · Views -" to "Visitors 1 · Views 3 · Running for 97 days". The 1 is me.

Two honest disclaimers: IP-based dedup counts everyone behind one company network as one visitor, and some crawlers may slip in — these numbers are order-of-magnitude correct, not precise analytics. Also, the details table only ever grows; a year of this blog is a few megabytes, SQLite shrugs. If it ever gets big, daily aggregation comes next.

## Finally

The ledger: about 200 lines of Python, 12 lines of systemd, 6 lines of nginx. The alternative was signing up for a third-party service, embedding someone else's script, reading my own data in someone else's dashboard — and a permanent dash on my footer whenever it died.

Every pitfall in this post came from a single real deployment afternoon. The pitfalls are worth more than the feature — the feature is two numbers in a footer, the pitfalls are five lessons. Now they're all words, and next time a service of mine dies, this page will walk me through the potholes all over again.
