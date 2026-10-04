---
title: 从零搭建个人服务器
date: 2026-04-28
tags: [服务器运维]
description: 从登录一台裸机 CentOS 到静态博客和动态统计服务真正跑起来：SSH 加固、宝塔与 Nginx 反代、systemd 托管、权限最小化，和三次真实上线事故的完整记录。
---

# 从零搭建个人服务器

选服务器、比价格、跑备案的故事，写在《阿里云 ECS 选型与备案实录》里，这篇不重复。这篇管下半场：从 SSH 登录一台刚开机的裸机开始，到静态站上线、HTTPS 挂好，再到一个带数据库的动态服务稳定运行。每一步都是我实际走过的，包括三次翻车。

<!-- more -->

## 一、开机第一个小时

拿到服务器的第一样东西是一串 IP 和一个初始 root 密码。第一个小时做什么，比后面装什么都重要。

教科书次序是这样的：

```bash
# 1. 改掉初始密码
passwd

# 2. 建一个日常用的普通用户，配 sudo（CentOS 加进 wheel 组）
useradd -m deploy
passwd deploy
usermod -aG wheel deploy

# 3. 本地生成密钥推上去，之后免密登录
ssh-keygen -t ed25519
ssh-copy-id deploy@你的服务器IP
```

然后是 SSH 加固，两行配置加一个工具：

```bash
# 换掉默认 22 端口，挡掉绝大多数无脑扫描
sed -i 's/#Port 22/Port 2222/' /etc/ssh/sshd_config
# 确认禁止 root 直接登录（配好密钥之后）
sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart sshd

# fail2ban：谁爆破就封谁的 IP（CentOS 需要 epel 源）
yum install -y epel-release
yum install -y fail2ban
systemctl enable --now fail2ban
```

两个新手最容易踩的地方：

- **改端口之前，先把新端口在云控制台的安全组里放行**，否则 restart sshd 的瞬间你就在门外了。阿里云轻量服务器在防火墙页签里加规则；
- restart sshd 前保持当前会话别断，**另开一个新会话用新端口试连**，确认能进再退出旧会话。

老实交代：我自己到现在还是 root 直登，宝塔面板也默认 root 环境，这段没做到教科书级。但有一条底线我守得很死——**日常操作乱一点没关系，对外跑服务的进程绝不能用 root**。为什么，第七节展开说。

## 二、装 Nginx：我为什么用宝塔

纯手动党一条 `yum install nginx` 也能走通，证书、续期、日志切割全自己配。我选了宝塔面板，理由很实际：个人博客这种单站点低负载场景，它把证书申请续期、防火墙、文件管理这些琐碎事全接管了，**省下来的时间比它引入的坑多**。

用宝塔要接受它的两个约定，后面全是围绕这两个约定展开的：

- 网站目录在 `/www/wwwroot/` 下；
- nginx 和网站的运行用户固定是 **www**——记住这个名字，第六节它会帮你少踩一个大坑。

### 宝塔的第一个坑：反向代理对话框是死路

后端服务跑起来之后（第四节），需要把 `/api/` 转发给它。我在宝塔站点的「反向代理」对话框里配——直接报错：**「网站已存在，请勿重复添加」**。

折腾半天才看懂：这个对话框的语义是**按一个新域名另建一个独立站点**再做反代，而不是给现有站点加一条转发规则。对已经建好的站，它是条死路。

最终方案很朴素：站点设置 → 配置文件，把 location 手贴进 server 块：

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8787;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

手贴之后、reload 之前，先 `nginx -t` 验一遍语法。这条习惯救命——配置写错一行，reload 会把整个站一起带崩。顺带一提，`nginx -t` 时看到 `conflicting server name` 的 warn 不用慌，那是 80 和 443 两个 server 块重复声明的遗留警告，不影响服务，有空再清理。

## 三、静态站上线

VitePress 在本地构建出纯静态产物：

```bash
npm run docs:build   # 产物在 docs/.vitepress/dist
```

把 dist 整包上传到站点目录（宝塔文件管理器拖上去就行），然后两件事：

1. **SSL 证书**：站点设置 → SSL → Let's Encrypt 一键申请，开「强制 HTTPS」；
2. **备案号挂页面底部**——国内服务器的监管要求，备案过程本身见另一篇。

浏览器打开域名，Ctrl+F5，静态博客就完整上线了。到这里如果你只需要静态站，可以不用往下读。但我是从纯静态托管搬过来的——搬完就开始想：**服务器都是自己的了，能做点静态托管做不了的事吗？**

## 四、第一个动态服务

起因很小：第三方访客统计时准时不准，还不受控制。干脆自建一个——服务器有了，这正是静态托管做不到的事。

我的设计原则是「能简则简」：

- **Python 标准库 + SQLite**，不引入任何框架。博客量级根本轮不到 MySQL，SQLite 单文件，备份等于复制一个文件；
- **只监听 127.0.0.1:8787**。公网流量一概进不来，所有外部请求都走 nginx 的 `/api/` 反代——上一节那三行 location 就是它唯一的入口；
- 一个常驻线程定时抓友链的 RSS，聚合进库。

写的时候还有个版本细节：CentOS 7 自带的是 Python 3.6，`ThreadingHTTPServer` 这种 3.7 才有的 API 用不了，老老实实用 `ThreadingMixIn` 自己组。

## 五、systemd：让服务一直活着

SSH 一断进程就死、崩了没人拉、重启机器全靠手动——这些问题 `nohup` 都救不了，正解是交给 systemd 托管。写一个 `/etc/systemd/system/stats.service`：

```ini
[Unit]
Description=Personal site stats (SQLite + Python stdlib)
After=network.target

[Service]
ExecStart=/usr/bin/python3 /opt/site-stats/stats.py
Environment=STATS_DB=/var/lib/site-stats/stats.db
Restart=always
RestartSec=3
User=www
Group=www

[Install]
WantedBy=multi-user.target
```

值得逐行说的是这几条：

- `User=`/`Group=`：**服务以什么身份运行**。这是整个文件里安全上最重要的一行，也是我第一次翻车的地方；
- `Restart=always` + `RestartSec=3`：崩了 3 秒后自动拉起；
- `WantedBy=multi-user.target`：开机自启。

三个命令的时机要分清：改了 unit 文件 → `systemctl daemon-reload`；要让服务用新配置跑 → `restart`；查状态 → `status`。**改完 unit 文件忘了 daemon-reload，restart 跑的还是旧配置**，这个坑下面马上用到。

## 六、翻车实录

这节是全文最值钱的部分。三次事故，三个教训。

### 第一次：status=217/USER，服务疯狂重启

unit 文件里我写了 `User=www-data`——从 Ubuntu 系教程里抄来的默认用户。可这台是 CentOS，**系统里根本不存在 www-data 这个用户**。systemd 的 217/USER 状态码意思就是「你指定的用户不存在」，于是服务在崩溃循环里出不来。

`journalctl -u stats` 里翻到状态码的那一刻才反应过来：宝塔的 nginx 用的是 www。改回 `User=www`，daemon-reload，起来。

**教训：教程里的默认值是教程的，不是你服务器的。**抄配置之前，先 `id 用户名` 确认这个用户在你机器上存在。

而且这个坑我前后撞了两回：第二回是后来重传配置文件时，把带错默认值的老文件又传了上去。所以仓库里那份模板，后来也专门改对了。

### 第二次：目录没建，起一次死一次

程序启动时要在 `/var/lib/site-stats/` 下写一个盐文件，目录不存在，直接 FileNotFoundError。手动 `mkdir` 当然能解决，但这次我选了更彻底的办法：在代码开头加一行 `os.makedirs(dirname, exist_ok=True)`——**目录不存在就自己建，这类部署失败从此自愈**。

**教训：能用代码兜住的部署坑，别靠部署清单兜。**清单会被忘掉，代码不会。

### 第三次：root 前台试跑留下的遗产

为了看实时报错，我用 root 在前台跑过一次服务——报错看清楚了，问题解决了，但数据库和盐文件也用 root 的身份被创建了出来。等 systemd 按配置用 www 身份正式去跑：PermissionError，root 建的文件 www 动不了。

`chown -R www:www /var/lib/site-stats` 交付。

**教训：前台调试尽量用正式服务同一个用户**，否则调试本身就在给正式运行埋雷。

## 七、权限这件事，展开说两句

三次翻车里两次半和「谁在跑」有关，值得单独一节。

**为什么服务绝不用 root 跑？**对公网开放的服务，永远要假设它会被打。真被打穿的那天：服务跑在 root 下，攻击者直接拿到整台机器的最高权限；跑在 www 下，损失被圈在那几个数据文件里。前者叫服务器沦陷，后者叫坏了一个目录。

**为什么全站统一用 www？**nginx 是 www，服务是 www，数据目录属主也改成 www——三个东西在同一个「房间」里工作，天然互相可读写。如果身份不一致，你就得靠放宽目录权限来凑合（`chmod 777` 那种），等于把门禁拆了给所有人。

最小权限原则一句话版：**给程序完成任务所需的最小权限，多一分都不给。**

## 八、上线后的日常

现在的日常更新就四步：

1. 本地 `npm run docs:build`；
2. dist 整包上传覆盖；
3. 后端有改动的话，重传 stats.py 后 `systemctl restart stats`——**这步最容易忘**，忘了的症状是前端明明更新了、接口还在吐旧数据；
4. 浏览器 Ctrl+F5。

排查三板斧：`systemctl status stats` 看生死，`journalctl -u stats` 看日志，`curl 127.0.0.1:8787/...` 绕过 nginx 直接验服务本身。

## 几点总结

1. **开机第一小时决定安全底线**：密钥登录、服务非 root，这两条无论如何别省。
2. **用宝塔可以，但要懂它替你做了什么**：/www 目录约定、www 运行用户、反代对话框的语义。
3. **动态服务抓两头**：对公网只留 nginx 反代一个入口，进程交给 systemd 托管。
4. **事故是最好的教材**：217/USER 教会我查用户，缺目录教会我代码自愈，root 遗产教会我用统一身份——每一个都变成了现在配置里的防线。

> 服务器是你在数字世界的家。这篇是砌墙，备案那篇是上户口——墙砌正，户口齐，这个家才算真正住进去。
