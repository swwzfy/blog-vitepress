---
title: How a 640KB Chunk Disappeared from My VitePress Blog
date: 2026-10-05
tags: [VitePress, Performance]
description: A zero word count in prerendered HTML led me to a 640KB mega chunk — every post compiled into JS just to read a few KB of frontmatter. Moving metadata to build time cut the largest JS bundle to 48KB and shaved half a megabyte off dist.
---

# How a 640KB Chunk Disappeared from My VitePress Blog

This whole thing started with something tiny — the reading time and word count on post pages were always 0 in the prerendered HTML. Crawlers saw 0, search engine snapshots showed 0, and only when a real person opened the page did it suddenly turn into "6 min read · 1,657 characters".

For a static site generator, that is close to a scandal: fully SSG'd, yet a piece of the page was still being computed live in the browser.

<!-- more -->

## The Symptom — 0 in the SSG Output

The meta line at the top of each post (reading time · word count) used to be computed like this — after `onMounted`, scan the `.vp-doc` DOM and count characters. `onMounted` only runs in the browser; during VitePress prerendering it never executes, so the static HTML always showed 0 there.

My first fix attempt fell into the exact same trap — switching `onMounted` to read a ready-made variable. The variable existed, but it only existed on the client, so SSR still couldn't see it. The correct approach boils down to one word — **earlier**. The data must be prepared at build time and read via `computed` at render.

Following the thread of "who actually provides this data" led to the real whale.

## The Root Cause — a 640KB Chunk That Only Wanted a Business Card

The data source for post lists (archives, recent posts on the home page, tag pages) was `import.meta.glob` with `eager: true` in `theme/utils/posts.ts` — synchronously pulling every `.md` page module under `docs/posts` into the bundle, then reading frontmatter titles, dates and tags from the module exports.

The catch — VitePress compiles every markdown file into a JS page module, with the full body and render function inside. A list only needs a few KB of "business cards", but eager mode carried the **compiled bodies of every post in both languages**, merged into a single 640KB chunk (147KB gzipped). Worse, since it was part of the module graph, every page modulepreload'd it — a visitor's browser downloaded the entire site's post bodies from the home page before opening a single article.

## The Fix — Move Metadata to Build Time

The idea in one sentence — **a list never wants the post itself, only the post's business card. And business cards can be printed at build time.**

I added `scripts/build-posts-meta.js`, about sixty lines:

- `gray-matter` scans frontmatter in `docs/posts` and `docs/en/posts`;
- word counts are computed with the same convention the pages display (Chinese characters + English words), locking in reading time (words ÷ 300, rounded up);
- `draft: true` is excluded at generation time — a second line of defense beyond route-level exclusion;
- output is sorted by path into `docs/.vitepress/posts-meta.json` — **17KB**, with zero diff noise across consecutive builds.

A small plugin in config.mts refreshes the JSON at `buildStart`, and in dev mode watches for posts being added, changed or deleted — matching the immediacy of the old glob. `posts.ts` went from "import every page module on the site" to "import one JSON file", and the list components did not change by a single line — the data shape stayed the same, only the source moved.

On the Layout side, word count and reading time became `computed` values read from the build-time `wordsByRoutePath` map. SSG output was non-zero immediately — the HTML crawlers receive says "6 min read · 1,657 characters" outright.

> By the way — VitePress's built-in `createContentLoader` can also build lists at build time, but word counting and the two-language directory convention would still be on me. If I had to write it anyway, sixty lines covering everything felt simpler.

## The Second Dead Weight — Inter, Which Nobody Ever Heard

Once the weight-loss ball started rolling, it would not stop. Following the trail into `buildEnd`, I found another one — the VitePress default theme unconditionally ships Inter's `@font-face` in the bundle CSS and copies out **14 woff2 files, about 500KB**. This site's base font stack is system fonts and its display face is LXGW WenKai — Inter has zero references anywhere. Pure "the default theme ships it, so we ship it" dead weight.

Three steps to deal with it:

1. `buildEnd` deletes every `inter-*.woff2` from `dist/assets`;
2. preload dead links are stripped from page heads at the same time — the files are gone, but `<link rel="preload">` tags still hung on **57 pages**, putting a font 404 into every visitor's console;
3. `tokens.css` overrides `--vp-font-family-base`, keeping Inter locked out for good.

**The Windows pitfall deserves a note** — `siteConfig.outDir` is in forward-slash style on Windows, so a path guard that compares without `resolve`-normalizing first is always false and silently skips. A guard that exists but never fires is more dangerous than no guard at all.

## The Result

| Metric | Before | After |
| --- | --- | --- |
| Largest JS chunk | 640KB (147KB gz) | 48KB |
| dist size | 7.1M | 6.5M |
| modulepreload on every page | every post compiled | one 17KB JSON |
| Word count seen by crawlers | 0 | "6 min read · 1,657 characters" |

One benefit that does not show up in numbers — page rendering is now decoupled from post data. Fixing a typo in an old post no longer busts the hash of a site-wide list chunk; list changes land in a 17KB JSON and nowhere else.

## One Principle

**If it can be computed at build time, keep it out of the runtime bundle.**

A post's word count, title and tags are settled the moment the markdown file hits the disk. There is no reason to make every visitor's browser compute them again after the page opens. The "static" in static site generation is at its most valuable when it pushes everything forward that can be pushed forward — the bundle should only carry what genuinely needs interactivity.
