---
title: Adding a Live2D Mascot to a VitePress Blog
date: 2026-08-18
tags: [VitePress, Live2D, Frontend]
description: How I wired a Live2D model into this VitePress blog, plus the five traps I fell into — webpack split-bundle order, tap_body key naming, VitePress Layout slot limitations, and more.
---

# Adding a Live2D Mascot to a VitePress Blog

The blog felt a bit empty after a while. Putting something that moves in the bottom-left corner beats static decoration. This post records how I integrated a Live2D model into VitePress, plus a few traps along the way.

<!-- more -->

## Picking the stack

Four candidates:

| Option | Pros | Cons |
|--------|------|------|
| **CSS / hand-drawn SVG** | Lightweight, controllable | Looks ugly unless you can draw |
| **Lottie animation** | Designer-friendly | Requires a designer |
| **live2d-widget** | 30+ ready-made models, CDN-friendly | webpack split-bundle is weird |
| **Cubism custom modeling** | Fully custom | 5–7 days of work |

For just adding a touch of motion, **live2d-widget wins on cost-benefit** — the npm registry has 30+ models (cats, dogs, anime characters), ready to plug in.

## Implementation

### 1. CDN script injection

Skip the npm bundle (saves ~250KB) and inject dynamically:

```ts
function loadLive2d() {
  if (l2dLoaded) return
  const main = document.createElement('script')
  main.src = 'https://unpkg.com/live2d-widget@3.1.4/lib/L2Dwidget.min.js'
  main.async = false
  document.body.appendChild(main)
}
```

Call it from `onMounted` in `Layout.vue`.

### 2. Initialize the model

```ts
L2Dwidget.init({
  model: { jsonPath: 'https://unpkg.com/live2d-widget-model-tororo@1.0.5/assets/tororo.model.json' },
  display: { position: 'left', width: 150, height: 200, vOffset: -20 },
  mobile: { show: false },
  react: { opacityDefault: 1, opacityOnhover: 0.3 }
})
```

`display.position` is `left` or `right` — no arbitrary coordinates. Fine-tune with `hOffset` / `vOffset`.

## Five traps

### Trap 1: webpack split-bundle order

`live2d-widget@3.x` splits into two files:
- `L2Dwidget.min.js` — contains the webpack runtime
- `L2Dwidget.0.min.js` — the async chunk manifest

The `globalwebpackJsonp` variable is established by the former; the latter needs it to execute.

**Wrong order**: `0.min.js` first, then `min.js` → `webpackJsonp is not defined`.
**Correct order**: `min.js` first, then `0.min.js`.

Many tutorials (CSDN, cnblogs, etc.) get this backwards — follow them and you'll hit a wall.

### Trap 2: `dialog.script` keys are snake_case

In the L2Dwidget@3.x source, the dialog key is **`tap_body`** — not `'tap body'` (space-separated) as many docs and tutorials suggest.

With the spaced version, nothing fires. I spent a while convinced it was a model issue before checking the actual source.

### Trap 3: model hit_areas constraints

Not every body part is clickable. Check `hit_areas` in `model.json`:

```json
"hit_areas": [
  { "name": "body", "id": "D_REF.PT_SOBA_01" }
]
```

The `wanko` model has only a `body` hit area. Configuring `tap_face` or `tap_head` does nothing — the model simply doesn't have those regions.

Write interaction scripts to match what the model actually supports.

### Trap 4: VitePress Layout ignores non-slot children

Trying to mount a component as a `<Layout>` child doesn't work — its setup never runs:

```vue
<template>
  <Layout>
    <template #doc-before>...</template>
    <!-- <MyComponent /> here is silently dropped -->
  </Layout>
</template>
```

VitePress's `<Layout>` only recognizes `<template #slot>`-style children. Everything else is ignored.

**Fix**: in `Layout.vue`'s `onMounted`, manually `createElement` + `appendChild`, bypassing Vue's component instantiation.

### Trap 5: `<Teleport>` not recognized inside SFC templates

Trying to force-mount via Teleport:

```vue
<Teleport to="body">
  <div>...</div>
</Teleport>
```

Vue's compiler throws `Element is missing end tag`. Vue 3.5+ should support the camelCase form, but the project's compiler config doesn't seem to allow it.

**Workaround**: drop Teleport, fall back to Trap 4's `appendChild` approach.

## Model choice

`live2d-widget-model-*` has 30+ packages on npm:

| Category | Recommendations |
|----------|-----------------|
| Real cats | `hijiki` (black cat, yellow eyes), `tororo` (white cat, blue eyes) |
| Real animals | `wanko` (Shiba Inu) |
| Anime characters | haru, chitose, koharu, etc. (30+ options) |

**Watch out for IP risk** — `miku` (Hatsune Miku), `rem` (Re:Zero), `luoxiaohei` (罗小黑战记) are all fan-made. Commercial or long-term personal use could be problematic.

## Performance

- Model assets: 1–5MB (slow first load, cached after)
- CPU usage: ~2–5% idle
- Mobile: disable via `mobile: { show: false }`

That's the gist. A white cat is now sitting in the bottom-left corner of this blog — blue eyes, blinks every few seconds, lifts her head when poked.