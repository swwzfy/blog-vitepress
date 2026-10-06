---
title: "Particle Skins: How My Blog Background Knows It's Raining Where You Are"
date: 2026-10-06
tags: [VitePress, Frontend]
description: "The background particles first dressed by season, then followed the real-time weather, and finally geolocation moved onto my own server. The crashes taught more than the feature: a TypeError swallowed by requestIdleCallback, a static import that let one 404 kill every effect on the site, and a 502 that was not a bug."
---

# Particle Skins: How My Blog Background Knows It's Raining Where You Are

My blog background is a canvas particle layer: purple specks drifting and connecting with lines — the classic particles.js look I copied when the site was born. It has one problem: it looks the same 365 days a year. No blossoms in March, no snow in December, and when a thunderstorm hits the visitor's window, the page stays serene.

This post chronicles giving it skins: first by season, then by real-time weather, until even the question of where the visitor is moved onto my own server. One day of tinkering — and the crashes taught me more than the feature did.

<!-- more -->

## Layer one: skins by season — a four-season floral calendar

The season logic lives in one function that picks a skin by month, theme and hour:

```js
function pickSkin() {
  if (isNight() && isDark()) return 'stars'; // after 23:00 in dark mode: starry sky
  const w = weatherSkin(weatherCode);        // real-time rain/snow (a later layer)
  if (w) return w;
  const m = new Date().getMonth() + 1;
  if (m >= 3 && m <= 4) return 'sakura';     // cherry blossoms
  if (m >= 6 && m <= 8) return isDark() ? 'firefly' : 'lotus';
  if (m >= 10 && m <= 11) return 'foliage';  // maple + ginkgo
  if (m === 12 || m <= 2) return 'winter';   // plum + ice crystals
  return 'plain';                            // plain specks in May and September
}
```

Every skin is drawn live with canvas 2D, zero images, and together they form a four-season floral calendar (this layer went through two more rounds of tinkering after launch — what's written here is the current state): spring sakura, summer lotus, autumn maple and ginkgo, winter plum —

- **Spring (Mar–Apr) sakura**: pointed ellipse petals pieced from two Bézier curves, swaying as they fall;
- **Summer (Jun–Aug) lotus pond**: in light mode a living pond — two clusters of translucent leaves at the bottom edges (notched ellipses with radial veins, swaying in the wind), one or two lotus flowers breathing open, double-ring ripples every second or two, a dragonfly hopping between the leaves ("on the tip of the tender lotus, a dragonfly has come to rest"), and the occasional petal drifting across the water; fireflies take over in dark mode;
- **Autumn (Oct–Nov) maple + ginkgo**: five-lobed maple leaves in two reds tumbling down, mixed 6:4 with golden ginkgo fans (wide sway, slow descent, veins and stems) — crimson against gold, the two best cards of autumn, no need to pick just one;
- **Winter (Dec–Feb) plum + ice crystals**: on sunny days whole five-petal blossoms drift down sparse and slow (near-white pink, one size smaller and paler than sakura) while four-point star glints twinkle in place — plum blossoms defying the snow; actual snowfall switches to the snow skin via the real-time weather layer, snow is snow and flowers are flowers;
- Deep night (after 23:00) in dark mode turns to starry sky with meteors; May and September fall back to plain specks.

All falling skins share a `Faller` base class — sinusoidal sway + steady descent + wrap-around at the edges; subclasses only decide what they look like. A few polish spots that are easy to miss:

- The hero already has a pink gradient, so petal lightness is clamped to 56–66 or they melt into the background;
- Snow turns gray-blue in light mode — white dots on white are invisible;
- The pond lives only at the page edges, leaving the middle blank for content, its translucent green clamped at 0.16 — decoration doesn't fight the text for space;
- The ice crystals' four-point star geometry is lifted straight from the logo's ✦ marks, quietly unifying the brand language;
- Particle count scales with screen area, with per-skin caps tuned by visual weight: 40–120 rain streaks, 30–90 snowflakes, only 8–26 fireflies;
- Switching theme, returning to the tab, or crossing 23:00 re-evaluates the skin on the spot (a MutationObserver watches the `<html>` class);
- Mobile (≤768px) and `prefers-reduced-motion` users get none of it — motion is for those who don't mind it.

Two old debts before moving on, both from the particle system itself:

**Pit one: mixing physical pixels with CSS pixels.** The canvas was sized in physical pixels while drawing coordinates used CSS pixels, so on high-DPI screens every particle crowded into the top-left quadrant. The fix: coordinates are always CSS pixels, the mapping to physical pixels is delegated to `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)`, and dpr is capped at 2 to keep 4K screens from inflating the buffer. Lesson one of canvas 2D, and people trip on it every year.

**Pit two: the TypeError swallowed by requestIdleCallback.** This one was the sneakiest. To save battery I added frame-halting when the page hides (a `visibilityWatchers` registry) — and declared it as an array while registrants call `.add()`. Arrays have no `.add`, so a TypeError fired immediately, but it fired inside a `requestIdleCallback` callback, got buried by the async timing, and the rest of the page kept running. The result: frame-halting and theme re-evaluation were **silently dead from the day they shipped**, until the weather layer work flushed them out. The fix is one word: array → Set.

> Lesson: initialization code parked in idle callbacks doesn't cry when it breaks. Wherever a failure would go unnoticed, leave a comment stating the invariant — such as "Set, not array: registrants use .add".

## Layer two: follow the real weather

The day the seasonal version shipped, something felt off: a calendar knows the month, not the weather. On a rainy October afternoon the background happily showers autumn leaves — tolerable, but missing something.

The fix maps Open-Meteo's `weather_code` to a skin intent: rain family (drizzle 51–57 / rain 61–67 / showers 80–82 / thunderstorm 95+) swaps in rain streaks, snow family (71–77 / 85–86) swaps in snow; clear, cloudy and fog leave the background alone — it shouldn't report every nuance of the sky. Frost has no weather_code, so per an early decision it's not done. Priority: night sky > real-time precipitation > season.

Rain is the only new skin: thin line segments falling fast along a fixed wind direction, no sway. The segment points along its velocity — tail = head − unit velocity × length — with separate light/dark colors. Thanks to the shared `Faller` base class, the new skin is about thirty lines.

The weather request also became a shared module, `weather.js`: the clock card's weather capsule and the particles consume the same data, the whole site issues one request that refreshes every 30 minutes, and failures are silent with each consumer falling back on its own (capsule hides / particles revert to seasonal).

## The incident: blast radius of one 404

The night it deployed, the weather chunk started flickering on production — flipping between 200 and 404 within the same minute, while other chunks from the same build held a steady 200. The root cause lives server-side; the suspect list includes the upload tool skipping files, the BT panel's anti-tamper deleting new files, and a scheduled sync restoring an old snapshot. No smoking gun so far.

But the collateral damage on the frontend was certain: `weather.js` was **statically imported** by the effects module. When it 404'd, the entire effects module failed to load — particles, cursor glow, reading progress bar and image lightbox all died, route transitions stopped initializing, and the clock card's static dependency would break the component registration chain further down `enhanceApp`. The blast radius of one decorative chunk was half the site.

The fix, at both call sites, is a runtime `import('./weather.js')` with a `catch` that degrades silently: worst case is "no weather" — the capsule hides, particles fall back to seasonal logic. The weather chunk became free to die.

> A lesson worth its own paragraph: **the deployment boundary must equal the failure boundary.** Static imports weld two modules into the same chunk graph, so one missing file takes the whole line hostage; dynamic imports put the failure in a solitary cell, and the catch decides how to degrade.

## The weather should follow the visitor, not the blogger

Once the pipeline was stable, a more fundamental problem surfaced: the weather was for Yangzhou — where I live. When it snows in Yangzhou, a visitor in Beijing gets snowflakes over a sunny window. Skinning is about the visitor's immersion, yet the data was computed from the blogger's coordinates.

Two ways to locate a visitor:

- The browser geolocation API: accurate, but it fronts a scary permission dialog — not worth it for particle skins;
- IP geolocation: city-level precision, plenty for "is it raining", and completely invisible.

IP it is. Primary ipwho.is, fallback geojs.io, results cached in sessionStorage for 6 hours (one lookup per session), with Yangzhou as the last-resort fallback. The weather capsule then shows the city name — visitors need to see "this is the weather where I am" for the feature to land.

## Geolocation, moved in-house

Free IP APIs belong to someone else: rate limits, outages, terms that may change, plus one extra hop. Meanwhile I already run my own stats service (see "Self-Hosting Visitor Stats"), where adding an endpoint costs nearly nothing — so `/api/weather` moved in:

1. nginx puts the visitor IP into `X-Real-IP`;
2. the ip2region offline database resolves the city: both v3 xdb files (v4 11MB + v6 37MB) are loaded whole into memory — no file handles during lookups, naturally thread-safe, no locks; the query logic is an inline zero-dependency implementation — a vector index pins the segment, binary search within it, and the v4 index is little-endian so comparisons reverse the bytes (v6 is plain big-endian);
3. it only answers for Chinese cities: non-Chinese IPs, private ranges and unknowns get a 502 and are handed back to the browser-direct chain — international libraries judge overseas IPs better; when the city field is missing it falls back to the province, stripping the 市/省 suffix before querying;
4. city → coordinates goes through Open-Meteo geocoding, cached in-process forever; weather is cached per city for 30 minutes. Every visitor shares these caches, so upstream pressure is negligible.

The frontend became a three-tier chain, each tier failing silently into the next:

| Tier | What it does | On failure |
| --- | --- | --- |
| 1 · same-origin /api/weather | ip2region + Open-Meteo, cached per city | falls to 2 |
| 2 · browser-direct | ipwho.is → geojs.io (cached 6h) + Open-Meteo | falls to 3 |
| 3 · Yangzhou fallback | the blogger's city coordinates | nothing pushes; status quo until the next tick heals it |

Eight spoofed IPs tested locally (v4 / v6 / private / overseas / province fallback / cache hit at 37ms) all passed.

**Pit three: a 502 on loopback is not a bug.** Curling the server directly returned 502 "no cn city" — by design: loopback requests carry no X-Real-IP, and the server only answers for Chinese public IPs. The valid test spoofs one:

```bash
curl -s -H 'X-Real-IP: 114.114.114.114' http://127.0.0.1:8787/api/weather
```

> By the way: the xdb data files are not in the repository — download them from the ip2region repo's data/ directory into `/var/lib/site-stats/`. A missing file only takes down this one endpoint; the stats service itself keeps running.

## One principle

**The engineering bar for decoration is not "impressive" — it is "nobody notices when it breaks".**

Every layer of this skin system closes against that bar: weather fails → seasonal; geolocation fails → Yangzhou; the weather chunk fails → no weather layer; the particle system itself fails → the background is simply quiet. At every level of failure the page stays whole: content reads, features work. The first requirement of an effect is that the page still stands with it switched off — only with that discipline in place is it safe to keep adding things.
