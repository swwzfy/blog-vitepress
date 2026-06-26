---
title: 从零搭建个人服务器
date: 2026-04-28
tags: [服务器, Nginx, DevOps]
description: 从买域名、选 VPS、配 Nginx、装 SSL 到部署第一个服务的全过程，适合新手参考。
---

# 从零搭建个人服务器

记录了从买域名、选 VPS、配 Nginx、装 SSL 到部署第一个服务的全过程。适合新手参考。

<!-- more -->

## 准备工作

你需要：一个域名、一台 VPS、SSH 基础。

## 步骤

1. 购买 VPS，获取 IP 和 root 密码
2. SSH 连接，改密码、创建普通用户、配 SSH key
3. 装 Nginx：`apt install nginx`
4. 域名 DNS 解析到 VPS IP
5. 申请 SSL 证书：`certbot --nginx`

## 安全加固

```bash
# 改 SSH 端口
sed -i 's/#Port 22/Port 2222/' /etc/ssh/sshd_config
# 禁止 root 登录
sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
# 装 fail2ban
apt install fail2ban
```

> 服务器是你在数字世界的家。花点时间把它建好，值得。
