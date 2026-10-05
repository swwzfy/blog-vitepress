# 自建访客统计部署（server/）

SQLite 单文件 + Python 标准库的访客统计。服务端零第三方依赖，`apt install python3` 即满足全部要求。
前端（Layout.vue）只在 `*.jossecho.com` 域名下发打点/拉数据，本地开发不污染线上数据；
接口拿不到数时统计区整块隐藏，不出现"-"。

## 组件

| 文件 | 去向 |
|---|---|
| `stats.py` | `/opt/site-stats/stats.py` |
| `stats.service` | `/etc/systemd/system/stats.service` |
| `nginx-stats-snippet.conf` | 内容粘进 nginx 对应位置（见下） |
| `../docs/.vitepress/friends.json`（仓库里的友链清单） | `/var/lib/site-stats/friends.json`（友链动态抓取的数据源，加/删友链后记得同步这份） |
| ip2region 数据文件（不入仓库） | `/var/lib/site-stats/ip2region_v4.xdb` + `ip2region_v6.xdb`（`/api/weather` 的离线 IP 库，见下） |

## 部署步骤（ECS 上执行）

```bash
# 1. 目录与权限（数据库目录归 www-data，服务以它运行）
sudo mkdir -p /opt/site-stats /var/lib/site-stats
sudo chown www-data:www-data /var/lib/site-stats
# 2. 上传 stats.py（scp 或直接粘贴）
sudo cp stats.py /opt/site-stats/stats.py
# 3. 手动试跑一次，确认能起
sudo -u www-data python3 /opt/site-stats/stats.py &
curl -s http://127.0.0.1:8787/api/health     # 期望输出 ok
sudo pkill -f stats.py
# 4. systemd 常驻
sudo cp stats.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now stats
systemctl status stats                       # active (running)
# 5. nginx：把 nginx-stats-snippet.conf 的两段分别粘进
#    nginx.conf 的 http {} 块 和 站点的 server {} 块
sudo nginx -t && sudo systemctl reload nginx
```

## 验证

```bash
# 注意：curl 的默认 UA 会被机器人过滤拦掉（返回 204 但不入库）——这本身就是验证。
# 带 normal UA 测：
curl -s -A 'Mozilla/5.0' 'https://www.jossecho.com/api/hit?url=/test'
curl -s 'https://www.jossecho.com/api/stats.json?url=/test'
# 期望 {"uv": 1, "pv": 1, "views": 1, "likes": 0}
# 点赞：同 IP+路径 永久去重，连点两次 likes 仍是 1
curl -s -A 'Mozilla/5.0' 'https://www.jossecho.com/api/like?url=/test'
curl -s 'https://www.jossecho.com/api/top.json'      # 文章阅读 Top N（默认 8）
curl -s 'https://www.jossecho.com/api/trend.json'    # 近 30 天逐日 pv/uv
```

浏览器访问几篇文章后，页脚出现「访客 N · 访问 M」，文章页元信息行出现「👁 N 次阅读」。

## 天气端点（/api/weather）

首页时钟卡与背景粒子按**访客所在地**显示天气。定位在服务端完成：访客 IP 经
[ip2region](https://github.com/lionsoul2014/ip2region) 离线库查城市（数据文件独立部署，
**不入仓库**，从该仓库 `data/` 目录下载 `ip2region_v4.xdb`（11MB）与 `ip2region_v6.xdb`
（37MB）），城市坐标永久缓存、天气按城市缓存 30 分钟（Open-Meteo 上游）。判不出
中国城市（海外/内网/数据缺失）回退扬州。xdb 文件缺失只影响这一个端点（返回 502），
服务本体与前端（回退浏览器直连定位链）都不受影响。

部署/更新（宝塔面板）：

1. **文件**：把两个 xdb 文件上传到 `/var/lib/site-stats/`，与 stats.db 同目录
   （文件名保持 `ip2region_v4.xdb` / `ip2region_v6.xdb`，或用环境变量
   `IP2REGION_XDB_V4/V6` 改路径）
2. **上传新 stats.py 后** `systemctl restart stats`（xdb 支持热上传，不重启也行——
   文件是按请求懒加载的，但重启一次可以清掉坐标缓存）

验证：

```bash
# 不带 X-Real-IP：本机回环属内网 → 回退扬州
curl -s http://127.0.0.1:8787/api/weather
# 伪装一个江苏电信 IP：应返回南京的天气（X-Real-IP 由 nginx 在线上注入，本地测试可手动加）
curl -s -H 'X-Real-IP: 114.114.114.114' http://127.0.0.1:8787/api/weather
# 期望形如 {"code": 0, "temperature": 16.2, "city": "南京"}（code 是 WMO 天气码）
```

浏览器 Ctrl+F5 后首页时钟卡天气胶囊应显示访客所在城市名。

## 语义口径

- **访客（uv）**：全历史去重 IP（哈希后），明细不清理，所以是真正的累计值
- **访问（pv）**：全历史打点次数，同 IP 同路径 30 分钟内的刷新只计一次
- **阅读数（views）**：该路径的累计打点数
- **点赞（likes）**：该路径的累计点赞数，同 IP 同路径永久只计一次（无"取消赞"）
- **圈子动态（friend_feeds 表）**：后台线程每 6 小时抓一次各友链 RSS（启动即抓一轮），
  每友链最多 4 条；数据源是 `/var/lib/site-stats/friends.json`（部署时从仓库上传，
  加删友链后同步更新）；各站存活状态在 friend_health 表（SSH 只读查看）
- **端点 `/api/friends-activity`**：与构建期 friends-activity.json 同构，
  前端拿不到时自动回退已提交的种子文件
- **每日聚合（daily 表）**：pv/uv 按服务器本地日聚合，启动时从明细全量重建（自愈），
  运行期在打点事务里增量累加；uv = 当日去重访客
- 数据目录备份：`sqlite3 /var/lib/site-stats/stats.db ".backup '/备份路径/stats.db'"`，挂 cron 即可

## 恢复电台时的注意

`server/` 与 `docs/.vitepress/theme/components/Radio.vue` 无依赖关系；电台恢复不影响本服务。

## 宝塔面板用户（阿里云轻量镜像）

原理不变，只是文件上传和改配置走面板 UI：

1. **文件**：`/opt/site-stats/` 上传 stats.py；`/var/lib/site-stats/` 建目录（数据库归这里）；stats.service 传到 `/etc/systemd/system/`
2. **nginx 两处**：软件商店 → Nginx → 设置 → 配置修改，在 `http {}` 里加 `limit_req_zone` 行；网站 → 站点 → 设置 → 配置文件，在 `server {}` 里加 `location /api/` 块 → 保存 → 重载配置
3. **终端**（`id www` 先确认用户名，宝塔镜像一般是 `www` 而非 `www-data`）：
   `chown -R www:www /var/lib/site-stats`；unit 文件里 `User=`/`Group=` 同步改成实际用户
4. **systemd**：`systemctl daemon-reload && systemctl enable --now stats`
5. **防火墙**：8787 只监听 127.0.0.1，安全组和宝塔防火墙都不要开

### 关于「数据库」页

MySQL / MongoDB / Redis / PgSQL 那些标签都**不需要**——统计服务用 SQLite，Python 标准库自带。
`stats.py` 首次启动会自动在 `/var/lib/site-stats/stats.db` 建库建表，无需在面板里预先创建。

SQLite 标签的可选用法：服务跑起来后，数据库 → SQLite → 添加数据库文件 →
选中 `/var/lib/site-stats/stats.db`，即可在面板里浏览 hits 表（只读看看没问题，别在面板里改表结构——
服务按固定 schema 读写）。想用面板备份的话，见下方「计划任务」。

### 备份（宝塔 计划任务）

计划任务 → 添加 → Shell 脚本 → 每天 4:00：

```bash
sqlite3 /var/lib/site-stats/stats.db ".backup '/www/backup/site-stats-$(date +\%F).db'"
```

（若系统没有 sqlite3 命令，用 `cp` 也可以——低写入量下风险可忽略。）

