---
title: "Modernizing This Blog: Noise, Spotlight, View Transitions & Bento"
date: 2026-09-27
tags: [VitePress, Frontend, CSS, Motion]
description: "A subtraction pass over three years of accumulated effects: film-grain noise, spotlight borders, native View Transitions, tighter display type, and a Bento home page. The traps were worth more than the effects — SPA navigation eating CSS transitions, :has specificity, and vp-doc global style pollution."
---

# Modernizing This Blog: Noise, Spotlight, View Transitions & Bento

This blog has plenty of accumulated effects: particle lines, a cursor glow, gradient buttons, a Live2D shiba inu. All of it belongs to the "cool effects" era of personal sites, roughly 2019 to 2021.

One day I stared at the home page and realized: those very effects are where the dated feel comes from. The modern look — Linear, Vercel, Apple's site — runs in the opposite direction: restraint and material detail. So instead of stacking more effects, this pass was about **subtracting and swapping in details**.

<!-- more -->

Five things landed: a global noise layer, native View Transitions, bigger display type with tighter tracking, spotlight card borders, and a Bento home page. Along the way I also card-ified the About page and ran a full zh/en content alignment. None of the effects are complicated; the traps are. As usual, this post is about the traps.

## 1. Noise texture: film grain for ten lines of CSS

Gradient backgrounds have an old problem: banding — faint rings inside large soft gradients. The industry-standard fix is a noise layer: cover the whole page with a 2–3% opacity grain and the banding gets shattered into texture. Suddenly the page feels printed instead of rendered.

No image assets needed — SVG's `feTurbulence` filter generates it on the fly, inlined as a data URI:

```css
body::after {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 2000;
  pointer-events: none;
  opacity: 0.03;
  background-image: url("data:image/svg+xml,%3Csvg ...%3E");
}
```

Two filter nodes inside the SVG: `feTurbulence` produces fractal noise, and `feColorMatrix type="saturate" values="0"` turns it grayscale — without that it's colored noise, which introduces a faint color cast on dark backgrounds. `opacity: 0.03` is the sweet spot; any higher and it reads as dirt.

It's a purely static layer: no animation, no JS, no repaints. The performance cost is effectively zero.

## 2. View Transitions: I expected one line of CSS, got a hook system

The plan looked trivially simple — native page transitions via:

```css
@view-transition {
  navigation: auto;
}
```

I added it, clicked a link, and nothing happened.

Reading up made it clear: **this CSS only applies to cross-document navigations**, where the browser fully loads a new HTML file. VitePress in-site clicks go through its client router — it fetches the next page's data and swaps the DOM in place. That's SPA navigation; the browser never sees a "document switch". The cross-document View Transition never gets a chance to run.

So it has to be the same-document path: wrap the DOM update in `document.startViewTransition()` manually. The question is how to hook the "before" and "after" moments. VitePress's router exposes exactly those two hooks:

```js
export function initPageTransitions(router) {
  if (typeof document.startViewTransition !== 'function') return

  let resolveNav = null
  router.onBeforeRouteChange = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // capture the old snapshot; the callback's Promise decides when to capture the new one
    document.startViewTransition(
      () => new Promise((resolve) => { resolveNav = resolve })
    )
    // fallback: force-resolve after 3s if the route is interrupted,
    // otherwise rendering stays frozen under a pending VT
    setTimeout(() => resolveNav?.(), 3000)
  }
  router.onAfterRouteChanged = () => {
    const resolve = resolveNav
    resolveNav = null
    resolve?.()
  }
}
```

Here's the flow: the moment `startViewTransition` is called, the browser captures the old snapshot; the Promise inside the callback decides when the new snapshot is taken. So `onBeforeRouteChange` starts the transition and stashes the resolver; when the router has finished swapping the DOM and `onAfterRouteChanged` fires, we resolve — the browser then captures the new snapshot and plays the cross-fade. The DOM update doesn't have to happen inside the callback; the callback only needs to say "done".

That 3-second fallback is not decoration: while a VT is pending, the browser suspends rendering. If the route errors out before the after-hook, the page stays frozen on the old snapshot forever. A lost transition is always better than a locked page.

The theme toggle got the same upgrade. The old "fullscreen gradient sweep" overlay is gone, replaced by the same native approach: intercept the first click in the capture phase, wrap the toggle in `startViewTransition`, and replay it:

```js
let replaying = false
document.addEventListener('click', (e) => {
  if (replaying) return                       // replayed events pass straight through
  const btn = e.target.closest?.('.VPSwitchAppearance')
  if (!btn) return
  e.preventDefault()
  e.stopPropagation()
  replaying = true
  document.startViewTransition(() => btn.click())
  setTimeout(() => { replaying = false }, 100)
}, true)
```

`stopPropagation` in the capture phase swallows the first click so Vue's toggle never sees it; inside the VT callback, `btn.click()` replays it — and this time the `replaying` flag lets it through the handler's front door. Without that flag: infinite recursion.

## 3. Spotlight borders: cards stop floating

`translateY(-4px)` on hover was my default card move for years. It's also part of the dated feel. It's now replaced by the Vercel / Linear **spotlight border**: a glow travels along the 1px border following the cursor while the card itself never moves.

Two halves. CSS draws the ring — an `::after` layer positioned with `inset: -1px` + `padding: 1px`, then a mask hollows out the middle so only the 1px edge catches light:

```css
.VPFeature::after {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  padding: 1px;
  background: radial-gradient(
    220px circle at var(--spot-x, 50%) var(--spot-y, 50%),
    rgba(162, 155, 254, 0.6),
    transparent 65%
  );
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 0.4s;
  pointer-events: none;
}
```

Worth committing to memory: the `mask-composite: exclude` combo is how you get a ring exactly one border wide — no extra DOM, no faked box-shadows.

JS only feeds coordinates, delegated on `document` so Teleport-injected cards are covered too:

```js
document.addEventListener('pointermove', (e) => {
  const card = e.target.closest?.('.VPFeature, .related-card, .bento-card, .about-card')
  if (!card) return
  const rect = card.getBoundingClientRect()
  card.style.setProperty('--spot-x', `${e.clientX - rect.left}px`)
  card.style.setProperty('--spot-y', `${e.clientY - rect.top}px`)
})
```

The glow position is just the `radial-gradient` center reading CSS variables. Touch devices have no hover — fine; `pointer-events: none` guarantees the layer never intercepts anything.

## 4. Display type + tight tracking: the cheapest typography signal

Nothing clever here, just the highest ROI move in the whole pass: bigger titles, tighter letter-spacing.

```css
.VPHero .name {
  font-size: clamp(2.75rem, 6vw, 4rem);
  letter-spacing: -0.02em;
}

.vp-doc h1 {
  font-size: clamp(2rem, 3.5vw, 2.6rem);
  letter-spacing: -0.02em;
}
```

An accidental win: `clamp()` brought mobile article titles down from the default 39px to 32px. Huge titles are clumsy on phones; slightly smaller reads more refined. And -0.02em is safe for full-width CJK characters — it tightens before it crowds.

## 5. The Bento home page: Teleport + :has relay

The home page used to be a tidy row of three equal feature cards plus a clock card. It's now a Bento grid: the clock card spans 2 columns as the visual anchor, a subscribe card joins, and Life + Subscribe each span 2 columns on the second row.

The hard part is how VitePress is built: `.VPFeatures` sizes its `.item`s with scoped styles, and the clock card is injected via `<Teleport defer>` — the scoped data attributes never reach it. The fix is a full takeover in global CSS, using `:has()` as the anchor: whenever the grid contains an injected card, rewrite the whole set of widths:

```css
@media (min-width: 960px) {
  .VPFeatures .items:has(.datetime-weather-item) .item {
    width: calc(100% / 4);
  }
  /* the spanning card must match specificity and come later, or it gets pushed back */
  .VPFeatures .items:has(.datetime-weather-item) .datetime-weather-item {
    width: 50%;
  }
}
```

This is where I hit the most characteristic trap of the whole pass: **selector specificity**. My first attempt was `.datetime-weather-item { width: 50% }` — a single class (0,1,0), completely dominated by `:has(...) .item` (0,4,0). The clock card didn't move a pixel. The spanning rule needed the same specificity and a later position in the file.

Second trap: **`:nth-child` follows DOM order, not visual order**. The clock card displays first thanks to `order: -1`, but in the DOM it's the 4th child — Teleport appends it at the end. The staggered entrance delays were written against `:nth-child`, so the first card you see had to be styled as `nth-child(4)`.

With the clock card now wide, its internal layout adapts too: stacked vertically when narrow, horizontal when wide (greeting left, big clock center, weather right). That's a container query, not a media query:

```css
@container (min-width: 480px) {
  .info-row {
    flex-direction: row;
    justify-content: space-between;
  }
}
```

The reason: this component used to have a second deployment on the English home page — a narrow 280px card beside the hero. A media query judges by viewport and would hit both deployments at once; a container query only asks how wide its own card is. (This round also gave the English home page the same Bento, so the two deployments merged into one and the container query became redundant — but I'd reach for it again in a heartbeat.)

## Trap list

Specificity bites were dense enough to deserve their own table:

| Trap | Symptom | Cause | Fix |
|---|---|---|---|
| `:has` anchor | card's `width: 50%` ignored | single class (0,1,0) loses to `:has(...) .item` (0,4,0) | match specificity, declare later |
| `vp-doc img` | About avatar centered in card | global `.vp-doc img { margin: auto }` (0,1,1) beats the single class | prefix with `.vp-doc` |
| `vp-doc a` | pill buttons underlined, link-colored | same, `.vp-doc a` is more specific | same |
| h2/h3 markers | purple tick before card titles | `.vp-doc h2::before` decoration | `::before { display: none }` |
| HMR | CSS edits not showing up | dev HMR occasionally drops CSS | hard refresh |

The rule of thumb: **inside VitePress's `.vp-doc` system, any page-level style that collides with a global rule should be prefixed with `.vp-doc` from the start.** Don't trust the bare class.

## Side quests: the About card and full i18n alignment

The About page was plain document flow. It now shares the home page's design language: a gradient card header (logo box, display type, Sanskrit tagline), three spotlight-enabled interest cards, pill contact links, and a QR card. The Markdown body didn't change a word — just wrapped in classed HTML containers.

The other side quest was a zh/en content audit: all 17 posts line up one-to-one, but the English timeline had four extra entries that matched nothing, the friends pages disagreed (one real link vs eight placeholder names), and the English home page wasn't layout-isomorphic with the Chinese one. All aligned to the real content. What kills i18n sites isn't missing translations — it's the two sides growing apart. Diff them regularly.

## Closing

Not a single line of new "effect code" came out of this pass. The particles and the glow are all still there — demoted to atmosphere. The real effort went into three things: getting View Transitions running inside an SPA, drawing a glowing border with a mask, and wrestling the `.vp-doc` specificity system.

If I keep only one lesson: **a modern feel is subtracted, not added.** Decide what shouldn't move; the rest starts looking modern on its own.
