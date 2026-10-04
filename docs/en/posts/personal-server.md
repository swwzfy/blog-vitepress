---
title: Building a Personal Server from Scratch
date: 2026-04-28
tags: [Server Ops]
description: From a bare CentOS box to a static blog plus a live stats backend — SSH hardening, BT Panel and Nginx reverse proxying, systemd, least privilege, and three real deployment failures.
---

# Building a Personal Server from Scratch

The story of picking the server and getting through ICP filing lives in "Choosing an Aliyun ECS and Getting It Filed"; this post covers the second half: from SSH-ing into a freshly booted bare box, to a static site live with HTTPS, to a dynamic service with a database running steadily. Every step here is one I actually walked, including three failures.

<!-- more -->

## The First Hour After Boot

The first things you get are an IP address and an initial root password. What you do in the first hour matters more than anything you install later.

The textbook sequence:

```bash
# 1. Change the initial password
passwd

# 2. Create a regular user with sudo (on CentOS, join the wheel group)
useradd -m deploy
passwd deploy
usermod -aG wheel deploy

# 3. Generate a key locally and push it up; log in without a password from now on
ssh-keygen -t ed25519
ssh-copy-id deploy@your.server.ip
```

Then SSH hardening — two config lines and one tool:

```bash
# Move off the default port 22; blocks the bulk of mindless scanning
sed -i 's/#Port 22/Port 2222/' /etc/ssh/sshd_config
# Make sure root login is disabled (after your key works)
sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart sshd

# fail2ban: ban whoever keeps brute-forcing (CentOS needs the epel repo)
yum install -y epel-release
yum install -y fail2ban
systemctl enable --now fail2ban
```

Two classic beginner traps:

- **Open the new port in your cloud console's firewall BEFORE restarting sshd**, or the moment it restarts, you are locked outside. On Aliyun Lightsail it's under the Firewall tab;
- Keep your current session alive when restarting sshd, and **test the new port from a second session** before closing the old one.

Full disclosure: I still log in as root to this day, and BT Panel assumes a root environment anyway — I never reached textbook level here. But one line I never cross: **everyday sloppiness is fine; no process that faces the public internet ever runs as root.** Section seven explains why.

## Installing Nginx: Why I Chose BT Panel

Purists can get there with a single `yum install nginx`, handling certificates, renewal and log rotation by hand. I went with BT Panel (BaoTa) for a practical reason: for a single-site, low-traffic personal blog, it takes over the chores — certificate issue and renewal, firewall, file manager — and **the time it saves outweighs the holes it introduces**.

Using it means accepting two conventions, which everything below hinges on:

- Sites live under `/www/wwwroot/`;
- nginx and the sites run as the **www** user — remember that name; in section six it saves you from a big trap.

### BT Panel's First Trap: The Reverse Proxy Dialog Is a Dead End

Once the backend service was up (section four), I needed `/api/` forwarded to it. I tried the "Reverse Proxy" dialog in my site's settings — it rejected me with **"The website already exists. Do not add it again."**

It took me a while to understand: that dialog's semantics are **create a separate site for a new domain and proxy to it** — not "add a forwarding rule to the existing site". For a site that already exists, it's a dead end.

The working solution is plain: site settings → config file, and paste a location block into the server block by hand:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:8787;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

After editing, run `nginx -t` before any reload. That habit saves lives — one wrong line in the config and a reload takes the whole site down with it. By the way, a `conflicting server name` warning from `nginx -t` is nothing to panic about: it's a leftover duplicate server declaration across ports 80/443, harmless, clean it up whenever.

## Going Live with the Static Site

VitePress builds a purely static bundle locally:

```bash
npm run docs:build   # output in docs/.vitepress/dist
```

Upload the whole dist folder to the site directory (drag-and-drop in BT Panel's file manager), then two things:

1. **SSL certificate**: site settings → SSL → one-click Let's Encrypt, and turn on "Force HTTPS";
2. **Hang the ICP filing number at the bottom of the page** — a regulatory requirement for domestic servers; the filing saga itself is the other post.

Open your domain in a browser, Ctrl+F5, and the static blog is fully live. If a static site is all you need, you can stop here. But I had moved over from a purely static host — and as soon as I settled in, I started thinking: **the server is mine now; what could I do that static hosting couldn't?**

## The First Dynamic Service

It started small: third-party visitor counters were unreliable and out of my control. So I built my own — the server was there, and this was exactly the thing static hosting couldn't do.

My design principle was "as simple as possible":

- **Python standard library + SQLite**, no framework at all. At blog scale MySQL never comes into play; SQLite is a single file, and backing it up means copying one file;
- **Listen on 127.0.0.1:8787 only.** No traffic from the public internet reaches it directly; every external request goes through nginx's `/api/` reverse proxy — the three-line location from the previous section is its only entrance;
- A resident thread fetches friends' RSS feeds on a schedule and aggregates them into the database.

One version detail I hit while writing it: CentOS 7 ships Python 3.6, and `ThreadingHTTPServer` — a 3.7+ API — is off the table, so you assemble your own from `ThreadingMixIn`.

## systemd: Keeping the Service Alive

SSH disconnects kill the process, crashes go unpicked, reboots need manual starts — `nohup` fixes none of that. The right answer is systemd. Write `/etc/systemd/system/stats.service`:

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

The lines worth going through one by one:

- `User=`/`Group=`: **which identity the service runs as**. Security-wise the most important line in the file — and where my first failure happened;
- `Restart=always` + `RestartSec=3`: if it crashes, pick it back up in three seconds;
- `WantedBy=multi-user.target`: start on boot.

Keep three commands straight: after editing the unit file → `systemctl daemon-reload`; to run with the new config → `restart`; to check on it → `status`. **If you forget daemon-reload, restart happily runs the old config** — a trap we'll need right below.

## Three Failures, Logged

This section is the most valuable part of the post. Three incidents, three lessons.

### #1: status=217/USER, crash-looping

I wrote `User=www-data` in the unit file — the default user copied from Ubuntu-flavored tutorials. But this box is CentOS, **where the www-data user simply does not exist**. systemd's 217/USER status means exactly "the user you specified does not exist", so the service sat in a crash loop.

The moment I dug the status code out of `journalctl -u stats`, it clicked: BT Panel's nginx runs as www. Changed it to `User=www`, daemon-reload, up it came.

**Lesson: a tutorial's defaults belong to the tutorial, not to your server.** Before copying config, run `id username` and confirm that user exists on your machine.

And I hit this trap twice: the second time was when re-uploading the config file later brought the old wrong copy back with it. So the template in my repo got fixed properly afterwards, too.

### #2: Missing directory, dies on every start

The program writes a salt file under `/var/lib/site-stats/` at startup; the directory didn't exist, so it died with FileNotFoundError. A manual `mkdir` would have fixed it, but I went one step further and added `os.makedirs(dirname, exist_ok=True)` at the top of the code — **if the directory is missing, create it. That whole class of deployment failure heals itself now.**

**Lesson: if code can absorb a deployment pitfall, don't rely on a checklist to catch it.** Checklists get forgotten; code doesn't.

### #3: What debugging as root left behind

To watch errors live, I once ran the service in the foreground as root — I saw the error, fixed it, and also created the database and salt files as root. When systemd later ran the service as www, as configured: PermissionError. www cannot touch root's leftovers.

`chown -R www:www /var/lib/site-stats` and it was done.

**Lesson: debug under the same user the service will run as**, or debugging itself plants the next incident.

## On Permissions, at Length

Two and a half of the three failures were about "who is running this" — it deserves its own section.

**Why must a service never run as root?** Any service open to the public internet must be assumed to be attackable. On the day it's breached: as root, the attacker holds the entire machine; as www, the damage is boxed into a few data files. The first is a lost server; the second is a broken directory.

**Why is everyone www?** nginx is www, the service is www, and the data directory belongs to www — they all work in the same room and can read each other's files by default. With mismatched identities you end up loosening directory permissions to compensate (`chmod 777`-style), which is tearing the access control off the door for everyone.

Least privilege in one sentence: **give a program the minimum permissions it needs to do its job — not one bit more.**

## Life After Launch

The update routine is four steps:

1. `npm run docs:build` locally;
2. Upload and overwrite the whole dist folder;
3. If the backend changed, re-upload stats.py and `systemctl restart stats` — **the step most often forgotten**; the symptom is a new frontend serving stale API data;
4. Ctrl+F5 in the browser.

The debugging trio: `systemctl status stats` for life signs, `journalctl -u stats` for logs, and `curl 127.0.0.1:8787/...` to test the service itself with nginx out of the picture.

## Takeaways

1. **The first hour sets the security floor**: key-based login and non-root services — never skip these two.
2. **BT Panel is fine, as long as you know what it does for you**: the /www directory convention, the www run user, the true semantics of the reverse-proxy dialog.
3. **For a dynamic service, nail both ends**: only one entrance from the internet (the nginx reverse proxy), and the process lives under systemd.
4. **Incidents are the best teachers**: 217/USER taught me to check users, the missing directory taught me self-healing code, root's leftovers taught me unified identity — each one is now a line of defense in the config.

> Your server is your home in the digital world. This post is the bricklaying; the filing post is the household registration. Only with straight walls and papers in order is the home truly lived in.
