---
title: Three VitePress Customization Tricks
date: 2026-09-12
tags: [VitePress, Frontend, Canvas, Performance]
description: "Adding a particle background, a cursor glow, and an ambient gradient to VitePress. The effects themselves are cheap — the traps hide in details: DPR, compositing layers, and learning not to animate."
---

# Three VitePress Customization Tricks

The default VitePress theme works great — and looks exactly like every other VitePress blog out there.

This post records three small visual effects I added to this blog: a particle background, a cursor glow, and an ambient gradient. None of them touch the theme source; one `effects.js` plus a chunk of CSS holds everything. The effects themselves are cheap. What's worth writing down are the traps behind each one.

<!-- more -->

## First: how to mount them without fighting the theme

All the effects live in a single `effects.js`, wired in with one line:

```ts
// docs/.vitepress/theme/index.ts
setup() {
  onMounted(async () => {
    await import('./effects.js')
  })
}
```

Two deliberate choices:

- **Dynamic `import()`**: the effect code stays out of the initial bundle and loads after `onMounted`, so it never competes with first render.
- **One shared container**: every effect element goes into a single fullscreen `#effects-layer` with `pointer-events: none` — the effects are painted *on* the page, and can never block clicks or text selection.

## Trick one: the particle background is just one canvas

The effect: small dots drifting across a fullscreen canvas, nearby ones connected by lines, particles near your mouse getting gently pulled toward it. The classic particles effect.

The skeleton is simple: make a fullscreen `canvas`, scatter some particles, update and redraw every frame.

The trap is in the coordinates. **I originally mixed physical pixels and CSS pixels**: the canvas backing store sized in physical pixels, particle positions in CSS pixels, mouse coordinates in yet another unit. On a standard display it happened to work; on a high-DPI screen the particles shrank and huddled in the top-left corner, and it took me a while to realize the units simply didn't agree.

The fix: the whole system speaks one coordinate language (CSS pixels), and the physical-pixel conversion collapses into a single place:

```js
const dpr = Math.min(window.devicePixelRatio || 1, 2) // cap at 2 so 4K screens don't inflate the canvas

function resize() {
  vw = window.innerWidth          // every coordinate from here on is a CSS pixel
  vh = window.innerHeight
  canvas.style.width = vw + 'px'
  canvas.style.height = vh + 'px'
  canvas.width  = Math.floor(vw * dpr)   // physical backing resolution
  canvas.height = Math.floor(vh * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0) // the conversion happens only here
}
```

After `setTransform`, everything keeps drawing in CSS pixels and the scaling is the transform matrix's problem. Crisp on retina, and not a single stray `* dpr` left in the logic.

The second trap is the connecting lines. The naive approach measures every pair of particles — 80 particles means 6,400 distance checks per frame. Tolerable, but mostly wasted work: particles more than 120px apart don't need to know about each other. Split the screen into a 120px grid and only compare particles within the same or neighboring cells; the cost drops by an order of magnitude.

Then a few house rules about **not running animation nobody can see**:

```js
// skip drawing while the tab is in the background
if (!isPageVisible) { requestAnimationFrame(animate); return }

// particle count follows screen area — don't hardcode it
const count = Math.min(80, Math.floor(innerWidth * innerHeight / 15000))
```

Plus: users with `prefers-reduced-motion` never get it initialized, and mobile skips it entirely (see the checklist below). That's the particle system, stable.

## Trick two: the cursor glow — visuals in CSS, JS only eases

The effect: a soft orb of light trailing the mouse, slightly late, as if the light were thrown behind the cursor.

The right division of labor here: **all the visuals live in CSS, and JS does exactly one thing**.

```css
.cursor-glow {
  position: fixed;
  width: 500px;
  height: 500px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(108, 92, 231, 0.2), transparent 70%);
  mix-blend-mode: screen;   /* brightening blend for the dark theme */
  filter: blur(25px);
  pointer-events: none;
  will-change: transform, opacity;
}
```

On the JS side it's one easing line per frame:

```js
glowX += (mouseX - glowX) * 0.08
glow.style.transform = `translate(${glowX}px, ${glowY}px) translate(-50%, -50%)`
```

Moving 8% toward the target each frame is all the "trailing glow" is. Smaller coefficient, longer trail.

Three details worth the text:

| Detail | Why |
|---|---|
| Move with `transform`, not `left/top` | `left/top` triggers layout reflow every frame; `transform` runs on the compositor, on the GPU |
| Theme-aware `mix-blend-mode` | `screen` to brighten on dark, `multiply` on light — otherwise the glow turns muddy gray on white |
| Fade `opacity` to 0 on `mouseleave` | Otherwise a blob of light freezes at the edge of the screen forever |

On mobile it's `display: none` — on a device with no mouse, the effect means nothing.

## Trick three: the ambient gradient, and why I made it static

The counterexample in this section is me.

The first version of the background moved: a fullscreen element animating `background-position`, layered with a `hue-rotate` spin for a slow "flowing" mood. Once it ran, two problems showed up:

1. The fullscreen element repainted every frame — GPU and battery paying continuously for an effect almost nobody would notice;
2. `hue-rotate` periodically dragged the brand purple into green, into blue — the entire color discipline gone.

So I made it static: two `radial-gradient` blobs, one purple, one pink, opacity dialed down to 0.15 and 0.1, sitting at the very bottom of the page as atmosphere.

```css
.bg-gradient {
  background:
    radial-gradient(ellipse 80% 50% at 20% 40%, rgba(108, 92, 231, 0.15), transparent),
    radial-gradient(ellipse 60% 40% at 80% 60%, rgba(253, 121, 168, 0.1), transparent);
}
```

Zero per-frame cost. The moving parts are the particles and the glow; the static gradient just sets the floor. **Atmosphere comes from layering, not from motion.**

Sometimes the best performance optimization is deleting an animation.

## The checklist

All three effects together are under 250 lines. To wrap up:

| Effect | Performance notes | Mobile |
|---|---|---|
| Particle background | DPR conversion in one place (`setTransform`), grid-accelerated lines, paused in background tabs | Off |
| Cursor glow | `transform` compositor layer, eased follow, `pointer-events: none` | Off |
| Ambient gradient | Static, zero per-frame cost | On |

Before adding any of this, ask: on what device, at what cost, for whom? The animation you can't answer that for — not building it is the optimal solution.
