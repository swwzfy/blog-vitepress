---
title: SSH 安全加固实战
date: 2026-09-03
tags: [服务器, SSH, 安全, DevOps]
description: 一台暴露公网的服务器，SSH 是唯一的门。改端口、禁 root、配密钥、上 fail2ban，把暴力破解挡在门外。
---

# SSH 安全加固实战

服务器上线后，SSH 是你唯一能进的门。这扇门每时每刻都在被全世界的人敲。

我把刚上线的服务器日志拉出来看了一眼——上线第一周，就有上千次来自陌生 IP 的登录尝试，全是脚本在自动撞 `root` 密码。这些不是冲着你来的，是冲着所有暴露 22 端口的机器来的，你只是被扫到了而已。

这篇记录我怎么把这扇门关严实。全是通用操作，阿里云、腾讯云、任何一台 Ubuntu/Debian 都适用。

<!-- more -->

## 为什么值得花这半小时

| 你做的事 | 不做的后果 |
|---|---|
| 用密钥登录 | 密码被撞出来，服务器变成肉鸡 |
| 禁 root 登录 | 爆破者拿到 root 直接为所欲为 |
| 改默认端口 | 日志被无差别扫描刷屏 |
| 上 fail2ban | 同一个 IP 可以无限试错 |

半小时做完，收益是永久性的。这笔账怎么算都划算。

## 第一步：别再用 root 登录

拿到的云服务器默认只有一个 `root` 账号。用它干所有事，等于把命门钥匙随身带着到处走。

先创建一个普通用户，再给它 `sudo` 权限：

```bash
# 创建用户（会提示设密码）
adduser deploy
# 加入 sudo 组
usermod -aG sudo deploy
```

之后日常操作一律用 `deploy` 登录，需要提权再 `sudo`。`root` 这个账号留作最后的救命稻草，而不是天天用。

## 第二步：密钥登录，关掉密码

这是整个加固里最重要的一步。密钥是几百位的随机串，暴力破解在数学上不可行；密码再复杂，也扛不住脚本无限试。

**在你自己的电脑上**生成密钥对：

```bash
ssh-keygen -t ed25519 -C "deploy@my-server"
```

一路回车，会生成 `~/.ssh/id_ed25519`（私钥）和 `.pub`（公钥）。私钥留在自己电脑，公钥拷到服务器：

```bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub deploy@服务器IP
```

输一次密码，公钥就写进了服务器的 `~/.ssh/authorized_keys`。现在测试一下：

```bash
ssh deploy@服务器IP
```

**能直接登进去、不再要密码，说明密钥生效了。** 这一步没确认之前，千万别往下走——后面关密码登录会把你一起锁在门外。

确认无误后，关掉密码登录：

```bash
sudo nano /etc/ssh/sshd_config
```

找到这行，改成 `no`：

```ini
PasswordAuthentication no
```

保存后重启 SSH：

```bash
sudo systemctl restart ssh
```

从现在起，只有拿着私钥的机器能进来，猜密码这条路彻底断了。

## 第三步：改端口（先说清楚它到底能干嘛）

很多人把「改端口」当成安全手段。我得诚实地说一句：**改端口不加密任何东西，它挡不住真正盯着你的人。**

它真正的作用有两个：

1. 躲开扫描器默认探 `22` 端口的无差别攻击，日志立刻安静下来；
2. 让用默认端口批量爆破的脚本直接扑空。

把 `#Port 22` 改成你要的端口：

```bash
sudo sed -i 's/#Port 22/Port 2222/' /etc/ssh/sshd_config
sudo systemctl restart ssh
```

改完后登录要显式带端口：

```bash
ssh -p 2222 deploy@服务器IP
```

> **国内云特有的坑**：阿里云/腾讯云除了服务器里的 `ufw`，外面还套着一层「安全组」防火墙。你在系统里改了端口，安全组里没放行，SSH 一样连不上。记得去控制台的安全组加一条入方向规则，放行新端口，否则你会被自己锁在外面。

## 第四步：禁止 root 直接登录

既然已经用 `deploy` + 密钥登录了，`root` 的直接登录入口就该关掉：

```bash
sudo nano /etc/ssh/sshd_config
```

```ini
PermitRootLogin no
```

```bash
sudo systemctl restart ssh
```

这样即使有人拿到了 root 密码，也没法远程登进来，只能先通过 `deploy` 再 `sudo` 提权——多一道防线。

## 第五步：fail2ban 自动封禁

前几步是「把门关严」，fail2ban 是「给门装个报警器 + 自动锁」——同一个 IP 连续试错几次，直接封它一段时间。

```bash
sudo apt install fail2ban
```

新版 fail2ban 装完默认就带 `sshd` 这条规则，开箱即用，不用额外配置。确认它在跑：

```bash
sudo systemctl enable --now fail2ban
sudo fail2ban-client status sshd
```

输出里 `Currently banned` 后面就是正在被封的 IP 数量。

一个提醒：如果你的网络是固定 IP，把它加进白名单，避免自己哪天手滑输错几次被误封：

```bash
sudo nano /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
ignoreip = 127.0.0.1/8 你的固定IP
```

## 几个差点把自己锁外面的坑

这几条是我踩过、或眼睁睁看别人踩过的，按重要程度排：

1. **顺序是铁律**：先配好密钥并测通 → 再动 `PasswordAuthentication`、`PermitRootLogin`、`Port`。顺序反了，一 `restart` 就再也进不去了。
2. **改端口前先放行防火墙**：上面说的安全组/`ufw`，先放行新端口，再改配置，再重启。
3. **改配置永远留一个活着的会话**：改 `sshd_config` 之前，先开第二个 SSH 连接挂着。第一个会话手滑重启了服务，第二个还能兜底。
4. **重启前先 `sudo sshd -t`** 校验配置语法，语法错了重启会失败，但不会断连。

## 检查清单

做完后对一遍：

- [ ] 能只用密钥登录，`PasswordAuthentication no` 已生效
- [ ] `deploy` 用户有 sudo，日常不再用 root
- [ ] `PermitRootLogin no`
- [ ] 端口已改，安全组/防火墙已放行新端口
- [ ] fail2ban 在跑，`status sshd` 能看到封禁记录

做完这些，你的服务器从「谁都能来撞几下」，变成了「撞了也没用，撞多了还被封」。它不会因此变得无懈可击——安全没有一劳永逸——但已经从裸奔状态，进化到了能挡住 99% 无差别攻击的水平。

> 服务器是你在数字世界的家。花点时间把门锁好，值得。
