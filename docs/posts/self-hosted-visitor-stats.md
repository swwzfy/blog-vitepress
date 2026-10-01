---
title: 自建访客统计实录：告别不蒜子，200 行 Python + SQLite
date: 2026-10-01
tags: [服务器运维]
description: 不蒜子常年半死不活，页脚挂着永远的减号。用 Python 标准库加 SQLite 自建访客统计，零第三方依赖，从写完到上线踩了五个坑，每个都比效果值钱。
---

# 自建访客统计实录：告别不蒜子，200 行 Python + SQLite

博客页脚的「访客 - · 访问 -」挂了很久。来源是不蒜子，一个免费但常年不太行的统计服务，脚本能不能加载全看缘分。前几天让人给博客挑毛病，收到一句很扎的评语：挂着比没有更减分。这话难听，但对。

于是决定自建。这篇文章记录从选型到上线的全过程——五个坑，每个都比效果值钱。

<!-- more -->

## 先说结论

架构就两层：

```
浏览器 ──GET /api/hit?url=...──▶ nginx ──▶ 127.0.0.1:8787 统计服务 ──▶ stats.db (SQLite)
浏览器 ──fetch /api/stats.json──▶ nginx ──▶ 同一个服务
```

三个决定，事后看都站得住：

**SQLite，不是 MySQL。** 单文件、零守护进程、Python 标准库自带驱动。个人博客一年的记录量撑死几万条，为两个页脚数字装一套数据库服务，运维成本比功能还贵。

**Python 标准库，不装任何包。** http.server 起服务，sqlite3 存数据，服务器上连 pip install 都不用执行。依赖越少，半年后还能跑起来的概率越高。

**只监听 127.0.0.1。** 公网入口交给 nginx 反代，服务本身不对公网开一个字节的口子。

服务端最终两百行上下，加 systemd 12 行、nginx 6 行，全在仓库 server/ 目录。

## 服务端设计

表结构只有一张：

```sql
CREATE TABLE hits (
    ts      INTEGER NOT NULL,   -- unix 秒
    url     TEXT NOT NULL,      -- /posts/xxx
    ip_hash TEXT NOT NULL,      -- sha256(ip + 盐)
    ua      TEXT
);
```

三个设计决策值得展开：

**IP 只存哈希。** 真实 IP 永远不落盘，sha256 加盐后存哈希——统计够用，库泄露了也只是一串十六进制乱码。盐在服务首次启动时自动生成，权限 0600。

**同 IP 同路径 30 分钟去重。** 刷新十次页面，访问数只加一。核心逻辑就是一条查询：

```python
dup = conn.execute(
    'SELECT 1 FROM hits WHERE ip_hash=? AND url=? AND ts>? LIMIT 1',
    (ip_hash, path, now - DEDUPE_WINDOW),
).fetchone()
```

**机器人不计入。** UA 里带 bot、spider、curl、wget 的请求直接丢弃，页脚的数字是给人看的。这个过滤后来在部署验证时还顺手套住了自己：curl 测接口返回 204 但数字不涨——过滤在工作。

## 坑一：参数名不一致，views 字段人间蒸发

本地写完就测——这是这次唯一做对的前置动作。

服务端两个端点：`/api/hit` 读 u 参数，`/api/stats.json` 读 url 参数，前端统一发 url。于是聚合接口永远返回：

```json
{"uv": 1, "pv": 2}
```

说好的 views 呢？uv 对、pv 对，唯独按路径查的阅读数失踪。逐行对出来的：**同一个参数在两个端点里写了两个名字**。三处改动统一成 url，views 就回来了：

```json
{"uv": 1, "pv": 2, "views": 1}
```

教训：代码 review 十遍，不如真跑一遍看响应体。

## 坑二：服务器上的 Python 没有 ThreadingHTTPServer

本地一切正常，部署到服务器，systemd 给了一个很敷衍的崩溃循环：

```
Active: activating (auto-restart) (Result: exit-code)
Main PID: 665616 (code=exited, status=1/FAILURE)
```

崩溃循环，但 status 里看不到 Python 的报错。前台跑一次，真相：

```
AttributeError: module 'http.server' has no attribute 'ThreadingHTTPServer'
```

服务器是 CentOS 7，python3 是 3.6——`ThreadingHTTPServer` 是 3.7 才加进标准库的。兼容写法自己组一个，全版本通用：

```python
from http.server import BaseHTTPRequestHandler, HTTPServer
from socketserver import ThreadingMixIn

class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True
```

教训：本地跑通只证明本地的版本能跑。`python3 -V` 应该在写第一行代码之前查。

## 坑三：salt 文件建不出来

```
FileNotFoundError: [Errno 2] No such file or directory: '/var/lib/site-stats/salt'
```

盐是哈希 IP 用的随机串，服务首次启动自动生成。报错原因：**os.open 的 O_CREAT 只负责建文件，不负责建父目录**——而部署清单里"建目录"那一步被跳过了。

修法是让代码自己兜底：

```python
os.makedirs(os.path.dirname(SALT_PATH), exist_ok=True)
```

教训：部署文档里写给"人"执行的步骤，迟早有人不执行。最可靠的执行者是代码自己。

## 坑四：root 跑前台测试，文件属主全变 root

排查坑三的时候，用 root 前台跑了一次服务。问题修好了，但 salt 和 stats.db 的属主变成了 root。systemd 里服务以 www 用户运行，启动即 PermissionError。

修法两条命令：

```bash
chown -R www:www /var/lib/site-stats
systemctl restart stats
```

教训：前台测试只用来**看报错**，看完 Ctrl+C 顺手 chown——否则就是在给下一次报错埋雷。

## 坑五：502、零尺寸内存区和"网站已存在"

前端要的只是把 /api/ 反代到 8787 端口。这一段一波三折。

先加限流，nginx 配置检查直接报：

```
nginx: [emerg] zero size shared memory zone "statsapi"
```

粘贴时把 limit_req_zone 的尺寸参数弄丢了，nginx 认为这个内存区尺寸为零，拒绝加载。决定：限流先不要，服务端本来就有去重，先跑通再打磨。

再试宝塔面板的反向代理图形界面，填完域名点确定：

```
网站已存在，请勿重复添加
```

看明白这个对话框的原理就懂了：它按域名**新建一个独立站点**来挂代理，而博客域名早就有了。这条路是死路。

最后回到手写三行，粘进监听 443 的 server 块：

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8787;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header User-Agent $http_user_agent;
}
```

保存，浏览器访问 /api/health，得到 **502 Bad Gateway**。

502 反而是好消息的一半：请求已经成功走到反代并转发给 8787，只是后端没活着。剩下的就是前几个坑的复盘——起服务、补目录、改属主，一条条修完。

## 上线

```
$ curl http://127.0.0.1:8787/api/health
ok

$ curl 'https://example.com/api/stats.json?url=/posts/xxx'
{"uv": 1, "pv": 3, "views": 1}
```

页脚从「访客 - · 访问 -」变成了「访客 1 · 访问 3 · 已运行 97 天」。那个 1 是我自己。

诚实声明两句：IP 去重会把同一公司出口的人算成一个人，爬虫也可能混进来——这两个数是量级正确，不是精确统计。另外明细只增不删，一年也就几 MB，SQLite 扛得住；真大了再做日聚合。

## 最后

总账：服务端 200 行 Python，systemd 12 行，nginx 6 行。对照组是接入第三方统计：注册账号、嵌别人的脚本、在别人的面板里看自己的数据，以及它挂掉之后页面上永远的减号。

这篇文章里的每个坑都来自真实部署的同一个下午。坑比效果值钱——效果是页脚多了两个数字，坑是这五个教训。现在它们都变成字了，下一个服务挂掉的时候，这页会帮我自己把坑重新踩一遍。
