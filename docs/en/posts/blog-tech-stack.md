---
title: How This Blog Is Built
date: 2026-09-20
tags: [VitePress, Frontend, Architecture]
description: A walkthrough of the tech stack, theme customization, i18n setup, why I built RSS from scratch, and the performance trade-offs behind every visual effect.
---

# How This Blog Is Built

Several months of iterating on VitePress, from the default theme to what you see now. Some bugs, some reusable patterns. This article lays out the whole architecture—why VitePress, how the theme inheritance works, why RSS is homegrown, and why deployment is still manual.

<!-- more -->

## Tech Stack

- **Framework**: VitePress 1.6.4 + Vue 3 + TypeScript
- **Styles**: Custom CSS, extending VitePress's CSS variable system (`--vp-c-*`)
- **Deployment**: Static site, `npm run build` outputs to `docs/.vitepress/dist`, manually rsync'd to an Alibaba Cloud nginx server

No backend. No database. No CMS. Content is Markdown files. At build time, Everything Is Static.

---

## Why VitePress

Tried a few alternatives:

- **Hexo**: Rich plugin ecosystem, but theme customization is deeply nested. Changing a layout means digging through five layers of inheritance. Build is slow, HMR is slower.
- **Next.js + MDX**: Flexible, but overkill for a blog. Deployment needs a Node runtime or Serverless. i18n routing after static export requires custom setup.
- **Astro**: Islands Architecture fits well, but the ecosystem was immature at 1.0 launch. VitePress's documentation experience was already polished.

VitePress's core advantage: **Vue components ARE the theme**. No template language to learn, no switching context between Markdown and HTML. Write `<script setup>` and `<template>` directly in Markdown, frontmatter is automatically injected as page data—zero switching cost for Vue developers.

---

## Theme Customization: Extend, Don't Fork

VitePress uses **extends**, not override. In `.vitepress/theme/index.ts`:

```ts
import DefaultTheme from 'vitepress/theme'

export default {
  extends: DefaultTheme,
  Layout,           // Custom layout, only changes what needs changing
  setup() { ... }   // Mount particles, glow, theme transitions
}
```

The Layout component uses Vue slots for precise insertion points:

- `#doc-before` — Article header (back button + meta + tags)
- `#doc-after` — Related posts
- `#not-found` — Custom 404
- `#layout-bottom` — Custom footer

Benefit: when VitePress upgrades, parts I didn't touch automatically inherit improvements. Cost: if VitePress renames a slot or changes structure, I need to manually adapt—but breaking changes like this are rare in minor versions.

---

## i18n: VitePress Locales + One Composable

VitePress has built-in i18n support via `locales` in `config.mts`:

```ts
locales: {
  root: { label: '中文', lang: 'zh-CN', themeConfig: { ... } },
  en:   { label: 'English', lang: 'en-US', themeConfig: { ... } }
}
```

Directory structure is mirrored: `/posts/*.md` and `/en/posts/*.md`, routes automatically get the `/en` prefix.

**Not using vue-i18n**. Reasons:

1. Blog copy is minimal—just a few buttons and labels in components
2. VitePress already detects the current language via `page.value.relativePath` prefix. I only need a lightweight `t()` function

Implementation is 30 lines (`composables/useLocale.ts`):

```ts
const dict = {
  back: { zh: '返回', en: 'Back' },
  relatedPosts: { zh: '相关文章', en: 'Related Posts' },
  // ...
}

function t(key) {
  return isEn.value ? dict[key].en : dict[key].zh
}
```

**Limitation**: no nested keys, no placeholders. If copy grows enough to need these, migrating to vue-i18n later is straightforward.

---

## Particles + Cursor Glow + Ambient Gradient: The Effects Are Cheap, the Traps Are in the Details

Three effects in `effects.js`, under 250 lines total. Mounted via `await import('./effects.js')` in `setup()`—not in the initial bundle, doesn't compete with content rendering.

### Particle Background

Full-screen canvas, 80 particles, auto-connect nearby ones, subtle attraction near the mouse cursor. Classic particles effect.

**One trap: DPR and CSS pixel confusion**.

The first version set canvas dimensions in physical pixels, particle coordinates in CSS pixels, mouse coordinates in yet another system. On standard screens it ran, but on 2x displays, particles collectively shrank and clustered in the top-left corner.

Correct approach: commit to CSS pixels throughout, convert physical pixels in exactly one place—`setTransform`:

```js
const dpr = Math.min(window.devicePixelRatio || 1, 2)
canvas.width = Math.floor(vw * dpr)   // Physical resolution
canvas.height = Math.floor(vh * dpr)
ctx.setTransform(dpr, 0, 0, dpr, 0, 0)  // Everything after this is CSS pixels
```

Second trap: connection performance. 80 particles means 6400 distance checks per frame. That's fine, but most are wasted—particles 120px apart don't need to be compared. Spatial hashing divides the screen into 120px cells, only comparing particles in the same and adjacent cells. Computation drops by an order of magnitude.

### Cursor Glow

JS only handles easing. All visuals are CSS:

```css
.cursor-glow {
  background: radial-gradient(circle, rgba(108, 92, 231, 0.2), transparent 70%);
  mix-blend-mode: screen;      /* Brighten on dark, multiply on light */
  filter: blur(25px);
  will-change: transform, opacity;
}
```

```js
glowX += (mouseX - glowX) * 0.08  // 8% per frame, trailing effect
glow.style.transform = `translate(${glowX}px, ${glowY}px) translate(-50%, -50%)`
```

Critical: use `transform` instead of `left/top`—compositor animation, no layout reflow.

### Ambient Gradient

**Version one was animated**: full-screen element with `background-position` animation, plus `hue-rotate` filter for "slow flow". Two problems emerged:

1. Full-screen per-frame repaint, GPU and battery continuously taxed for an effect almost no one notices
2. `hue-rotate` periodically shifts brand purple into green and blue—color discipline lost

Switched to static: two `radial-gradient` blobs, opacity capped at 0.15 and 0.1, sitting at the bottom layer. Atmosphere comes from layers, not motion.

---

## Reading Experience Components

### Article Header

Every article shows a back button, date, reading time, word count, and tags. Word count is computed dynamically—scans `.vp-doc`'s `textContent`, counts Chinese characters + English words, divides by 300 for minutes. Results cached in a Map to avoid re-scanning when switching back to the same article.

### Related Posts

`findRelated()` scores by tag intersection—more shared tags means higher rank, ties broken by date descending. Max 3 posts.

### 404 Page

VitePress's default 404 is bare. Custom version has floating stars and breathing animation, replacing via the `#not-found` slot.

---

## RSS: Why Homegrown

VitePress has `vitepress-plugin-rss`, but version 0.4.4 has a bug with the `locales` field—it doesn't split into separate `/en/feed.rss` files.

`build-rss.js` is 230 lines, uses the `feed` library for standard RSS 2.0 output, runs in the `buildEnd` hook.

Details:

- **Full content**: Extracts `<main>`-contained `vp-doc` HTML from the built `dist/posts/<slug>.html`, feeds it to `<content:encoded>`—subscribers see the full article, not just the excerpt
- **Draft filtering**: frontmatter `draft: true` articles are excluded from RSS AND from routes (`srcExclude`)
- **Path boundary checks**: slug paths are validated with `startsWith(distRoot)` before file access, preventing directory traversal
- **HTML preview**: Browsers display XML source when opening RSS directly. A `feed.html` static preview page solves this—Chinese characters display correctly via `<meta charset="utf-8">`

---

## Other Automation

### Sitemap

Generated in `buildEnd` using the `sitemap` library, based on VitePress's `siteConfig.pages`, with weekly changefreq.

### Dev Server Cleanup

On Windows, `npm run dev` kills any process occupying port 5173 before starting (`scripts/dev-fresh.js`). Linux/macOS netstat output format differs, so it's silently skipped there.

---

## Deployment

Output is pure static files in `docs/.vitepress/dist/`.

Deployment: rsync to Alibaba Cloud ECS nginx directory. No CI/CD, no GitHub Actions. Manual push, manual confirmation.

**Why no CI?** Blog update frequency is low (1-2 posts/month). The manual flow is sufficient. Adding CI means handling: automatic certificate renewal, Alibaba Cloud credential management, build caching—costs that currently exceed benefits.

---

## Performance Trade-offs

| Decision | Choice | Reason |
|---|---|---|
| Fonts | Only JetBrains Mono + LXGW WenKai loaded; Inter removed | 9 weights of Inter is pure dead weight; body text uses system font stack |
| Particle count | Dynamic by screen area, max 80 | Fewer on mobile, no explosion on 4K |
| Animation | `prefers-reduced-motion` disables all | Accessibility |
| Live2D | Disabled below 768px | Performance + touch devices don't need it |
| Cursor glow | `will-change: transform, opacity` | Compositor animation, no layout |
| Gradient | Static | Original version repainted every frame + hue-rotate broke brand color |
| Comments | Disabled | Giscus payload is heavy, not worth it currently |
| Search | VitePress local search | No external service needed, index generated at build |

---

## What's Not Done Yet

- **Image optimization**: No WebP auto-conversion, no lazy loading pipeline. Currently manually placed in `public/`, relies on browser `loading="lazy"`.
- **CDN**: Static assets all on Alibaba Cloud ECS, no CDN. Domestic access is acceptable, but images lack cache headers.
- **PWA**: No service worker, no offline support. Low priority for a blog.
- **Comment system**: Giscus code is still there, commented out. Will decide when content strategy is clearer.

---

## Summary

This blog's core philosophy: **static first, manual is enough when frequency is low, effects can cost money but performance cannot**.

Particles, glow, gradient—each effect is cheap, but each has traps. The traps aren't "how to implement" but "mixed unit systems causing coordinate drift", "animated color shifts breaking brand consistency", "per-frame repaint draining battery"—these are engineering decisions, not aesthetic ones.

If you're building a blog with VitePress, feel free to reach out.
