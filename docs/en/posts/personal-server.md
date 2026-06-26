---
title: Building a Personal Server from Scratch
date: 2026-04-28
tags: [Server, Nginx, DevOps]
description: The whole process from buying a domain, choosing a VPS, configuring Nginx, installing SSL to deploying the first service. Suitable for beginners.
---

# Building a Personal Server from Scratch

Recorded the entire process from buying a domain, choosing a VPS, configuring Nginx, installing SSL to deploying the first service. Suitable for beginners.

<!-- more -->

## Prerequisites

You need: a domain, a VPS, basic SSH knowledge.

## Steps

1. Purchase VPS, get IP and root password
2. SSH connect, change password, create regular user, configure SSH key
3. Install Nginx: `apt install nginx`
4. Point domain DNS to VPS IP
5. Get SSL certificate: `certbot --nginx`

## Security Hardening

```bash
# Change SSH port
sed -i 's/#Port 22/Port 2222/' /etc/ssh/sshd_config
# Disable root login
sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
# Install fail2ban
apt install fail2ban
```

> Your server is your home in the digital world. Spend time building it well, it's worth it.
