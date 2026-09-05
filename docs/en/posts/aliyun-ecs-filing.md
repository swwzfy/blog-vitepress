---
title: "Alibaba Cloud ECS: Instance Selection & ICP Filing"
date: 2026-09-03
tags: [Server, Alibaba Cloud, ICP Filing, DevOps]
description: From instance selection, purchase, and ICP filing to going live — a full walkthrough of launching a personal server in mainland China, including the lesson learned from a filing rejection.
---

# Alibaba Cloud ECS: Instance Selection & ICP Filing

My blog used to run on pure static hosting — convenient, but no real control. This year I moved it onto my own Alibaba Cloud server, working through the domain, the ICP filing, and Nginx step by step. I got stuck once at the filing stage, and the lesson was expensive. This post records the two most painful parts — instance selection and ICP filing — for anyone trying to go live in mainland China.

<!-- more -->

## Why a mainland server

Let me state the choice up front: **mainland servers require ICP filing, overseas servers don't.** This single premise drives everything that follows.

I was stuck between two options:

| Option | Pros | Cons |
|--------|------|------|
| Overseas VPS (no filing) | No filing hassle, instant launch | Slow and unstable for mainland visitors |
| Mainland server + ICP filing | Fast, stable, compliant | Filing takes time; content is restricted |

Most of my readers are in mainland China, and a blog is a long-term commitment — slowness and jitter are unacceptable. So I went with mainland + filing. If you just need a temporary demo, an overseas box is the easier path.

## Instance selection: Lightweight Server vs ECS

Alibaba Cloud has two common options — don't jump straight to ECS:

- **Lightweight Application Server (Lighthouse)**: pre-installed OS + application images, cheap and hassle-free, ideal for low-load personal blogs.
- **ECS (Elastic Compute Service)**: flexible, scalable, any image you want, but more configuration knobs and a higher price.

For a personal blog, **the Lightweight Application Server is almost always the right pick** — 2 vCPU / 2 GB to start, more than enough for Nginx serving a static site. Save ECS for when you genuinely need load balancing or multiple instances.

> My actual choice: a mainland 2 vCPU / 2 GB instance, ¥68/year as a new-account first-year offer. The rule is simple: **buy the cheapest option and upgrade later** — scaling a cloud server up is far easier than scaling it down.

## ICP filing: the process is easy, the "content scope" is the trap

Instance selection and purchase take half an hour. The real grind is the filing. Roughly four steps:

1. Real-name verification of the domain (the registrant must be you)
2. Submit site info in Alibaba Cloud's filing system (bind server + domain)
3. Identity verification (these days mostly in-app facial recognition)
4. Provincial authority review — once approved, you get the ICP filing number and put it in the site footer

Review times vary by province: a few days at best, two or three weeks at worst. Plan accordingly.

### The trap: a personal filing is not "put whatever you want"

This is where I got rejected. Plenty of people assume a personal filing is just a formality, but **a personal ICP filing has hard boundaries on site content**.

By Alibaba Cloud's definition, content allowed under a personal filing is essentially "**personal content sharing**" — your own articles, work, and records. Real-time public UGC from visitors — comments, guestbooks, posting, registration — falls under the "forum / community" category, which a personal filing cannot do.

Trying to save effort, I added a comment feature to my blog early on, and the filing got stuck. After removing the comments and narrowing the site down to pure personal sharing (posts, updates, and friend links all self-controlled or shown only after review), it finally went through.

**The one-line lesson**: a personal filing equals one-way publishing by the site owner. If you want visitors posting content directly, either upgrade your entity qualification or don't do it at all.

## Going live

Once the filing passes, the rest is routine:

- Point the domain's DNS at the server IP
- Install Nginx and point the site root at your build output
- Get an SSL certificate and enable HTTPS

I already covered these in the previous post *Building a Personal Server from Scratch*, so I won't repeat them here. Worth noting: **don't forget the filing number or SSL** — the filing number must sit in the page footer (regulatory requirement), and HTTPS is basic courtesy.

## Cost (for reference)

Both the server and the domain were bought on Alibaba Cloud, on new-account / promotion discounts.

| Item | Price | Notes |
|------|-------|-------|
| Server (2 vCPU / 2 GB) | ¥68/year | New-account first-year offer |
| Domain | ¥77 | Promotional purchase |

About a hundred yuan a year in total — negligible for a personal blog. Note that these are first-year prices; **the renewal price is whatever Alibaba Cloud lists on its website at the time**, so keep an eye on it when renewal approaches.

## Takeaways

1. **In mainland China, ICP filing is the first gate you can't skip.** Figure out your content boundaries before you start, don't get rejected first and then scramble to change.
2. **Start with the cheapest instance.** A personal blog runs fine on a lightweight server; don't pay extra for a hypothetical "someday".
3. **The filing trap isn't the process, it's the content scope** — a personal filing equals personal sharing. Don't add public visitor UGC.

> Your server is your home in the digital world, and the filing is its household registration. Get both right, and you can sleep easy.
