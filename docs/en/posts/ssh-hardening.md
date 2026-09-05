---
title: Hardening SSH on a Fresh Server
date: 2026-09-03
tags: [Server, SSH, Security, DevOps]
description: "A server exposed to the public internet has one door: SSH. Change the port, disable root login, switch to key auth, and add fail2ban to keep brute-force bots out."
---

# Hardening SSH on a Fresh Server

Once a server is live, SSH is the only door you can walk through. And that door gets knocked on, constantly, by the whole internet.

I pulled the logs on my freshly launched server a week in — there were already thousands of login attempts from unfamiliar IPs, all scripts blindly trying `root` passwords. They aren't after you specifically; they sweep every machine that exposes port 22. You just happened to get scanned.

This post records how I locked the door. Every step is generic and works on any Ubuntu/Debian box — Alibaba Cloud, Tencent Cloud, or bare metal.

<!-- more -->

## Why spend half an hour on this

| What you do | What happens if you don't |
|---|---|
| Key-based login | Your password gets cracked and the box becomes a bot |
| Disable root login | Attackers walk straight in with root |
| Change the default port | Your logs drown in blind scans |
| Add fail2ban | A single IP can retry forever |

Half an hour of work, and the payoff is permanent. There's no way to do that math wrong.

## Step 1: stop logging in as root

A cloud server arrives with a single `root` account. Using it for everything is like carrying your master key around in your pocket.

Create a normal user first, then give it `sudo`:

```bash
adduser deploy
usermod -aG sudo deploy
```

From now on, log in as `deploy` and use `sudo` when you need privileges. Keep `root` as the emergency spare, not the daily driver.

## Step 2: key login, password off

This is the single most important step. A key is a hundreds-of-bits random string — brute-forcing it is mathematically infeasible. A password, however complex, can't survive infinite retries.

Generate a key pair **on your own machine**:

```bash
ssh-keygen -t ed25519 -C "deploy@my-server"
```

Press enter through the prompts and it creates `~/.ssh/id_ed25519` (private) and `id_ed25519.pub` (public). Keep the private key on your machine, copy the public key to the server:

```bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub deploy@SERVER_IP
```

Enter the password once, and the public key lands in `~/.ssh/authorized_keys` on the server. Now test it:

```bash
ssh deploy@SERVER_IP
```

**If you get in without a password prompt, the key works.** Do not move on until you've confirmed this — the next step turns off password login and will lock you out too if the key isn't set up.

Once confirmed, turn password auth off:

```bash
sudo nano /etc/ssh/sshd_config
```

Find this line and set it to `no`:

```ini
PasswordAuthentication no
```

Save and restart SSH:

```bash
sudo systemctl restart ssh
```

From this point, only a machine holding the private key can get in. The password-guessing route is gone for good.

## Step 3: change the port (and be honest about what it does)

A lot of people treat "change the port" as a security measure. Let me be straight about it: **changing the port encrypts nothing and won't stop anyone who is actually targeting you.**

What it actually buys you:

1. It dodges the scanners that probe port 22 indiscriminately — your logs go quiet immediately.
2. It makes scripts that brute-force the default port miss completely.

Change `#Port 22` to whatever you like:

```bash
sudo sed -i 's/#Port 22/Port 2222/' /etc/ssh/sshd_config
sudo systemctl restart ssh
```

Afterwards, log in with an explicit port:

```bash
ssh -p 2222 deploy@SERVER_IP
```

> **The mainland-cloud gotcha**: Alibaba Cloud and Tencent Cloud wrap an extra "security group" firewall around the instance, on top of `ufw` inside the OS. If you change the port in the system but don't allow it in the security group, SSH still won't connect. Add an inbound rule for the new port in the console first — otherwise you'll lock yourself out.

## Step 4: disable direct root login

Now that you log in as `deploy` with a key, close the direct root entry:

```bash
sudo nano /etc/ssh/sshd_config
```

```ini
PermitRootLogin no
```

```bash
sudo systemctl restart ssh
```

Even if someone obtains the root password, they can no longer log in remotely — they'd have to get in as `deploy` first and then `sudo`. One more layer between them and full control.

## Step 5: fail2ban, automatic banning

The previous steps lock the door; fail2ban adds a tripwire that locks it automatically — an IP that fails a few times gets banned for a while.

```bash
sudo apt install fail2ban
```

Recent fail2ban ships with an `sshd` jail enabled out of the box, no extra config needed. Confirm it's running:

```bash
sudo systemctl enable --now fail2ban
sudo fail2ban-client status sshd
```

The count after `Currently banned` is the number of IPs being blocked right now.

One note: if you're on a fixed IP, whitelist it so a few accidental typos don't get you banned:

```bash
sudo nano /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
ignoreip = 127.0.0.1/8 YOUR_FIXED_IP
```

## The mistakes that almost locked me out

I've stepped on these, or watched others step on them, so here they are in order of importance:

1. **Order is non-negotiable**: set up and verify the key first, then touch `PasswordAuthentication`, `PermitRootLogin`, and `Port`. Reverse the order and one `restart` locks you out for good.
2. **Open the firewall before changing the port**: security group / `ufw` first, then the config, then restart.
3. **Always keep a live session open**: before editing `sshd_config`, open a second SSH connection and leave it hanging. If you fumble the first one, the second is your fallback.
4. **Run `sudo sshd -t` before restarting**: it validates the config syntax. A syntax error fails the restart but doesn't drop your current session.

## Checklist

Go through this when you're done:

- [ ] Logging in with a key only; `PasswordAuthentication no` is in effect
- [ ] `deploy` has sudo; you no longer use root day-to-day
- [ ] `PermitRootLogin no`
- [ ] Port changed, and the security group / firewall allows the new port
- [ ] fail2ban is running, and `status sshd` shows bans

After all this, your server goes from "anyone can come knocking" to "knocking is useless, and knocking too much gets you banned." It won't be unassailable — security has no finish line — but it has moved from wide open to fending off 99% of the drive-by attacks out there.

> Your server is your home in the digital world. Take the time to lock the door — it's worth it.
