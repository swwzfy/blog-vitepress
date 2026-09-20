---
title: 三个 VitePress 定制技巧
date: 2026-09-12
tags: [VitePress, 前端, Canvas, 性能]
description: 给 VitePress 加粒子背景、鼠标光晕和氛围渐变。效果本身很便宜，坑都藏在细节里——DPR、合成层，以及学会不做动画。
---

# 三个 VitePress 定制技巧

VitePress 默认主题很好用，但也太常见了——每个用 VitePress 的博客长着同一张脸。

这篇记录我给博客加的三个视觉小效果：粒子背景、鼠标光晕、氛围渐变。不动主题源码，一个 `effects.js` 加一段 CSS 就装下了。效果本身都很便宜，真正值得写下来的是每个效果背后踩过的坑。

<!-- more -->

## 前置：怎么挂载，才不干扰主题

所有效果集中在一个 `effects.js` 里，挂载入口只有一句：

```ts
// docs/.vitepress/theme/index.ts
setup() {
  onMounted(async () => {
    await import('./effects.js')
  })
}
```

两个用意：

- **动态 `import()`**：效果代码不进首屏包，`onMounted` 之后再加载，不抢正文渲染的路。
- **统一容器**：所有效果元素都挂在一个全屏的 `#effects-layer` 里，`pointer-events: none`——效果只是"画"在页面上，永远不挡点击、不挡选中文字。

## 技巧一：粒子背景，一块 canvas 的事

效果：全屏随机漂浮的小圆点，距离近的粒子之间自动连线，鼠标附近的粒子还会被轻微吸引。就是那个很经典的 particles 效果。

骨架很简单：造一个全屏 `canvas`，撒几十个粒子，每帧更新位置、重画。

坑在坐标上。**我最早把物理像素和 CSS 像素混着用**：canvas 的宽高按物理像素设，粒子坐标按 CSS 像素算，鼠标坐标又是另一套。在普通屏幕上凑巧能跑，一到高缩放屏，粒子全体缩水、聚在左上角，查了半天才发现是单位没统一。

正确做法是全系统只认一种坐标（CSS 像素），物理像素的换算收敛到一处：

```js
const dpr = Math.min(window.devicePixelRatio || 1, 2) // 上限 2，防 4K 屏画布过大

function resize() {
  vw = window.innerWidth          // 之后所有坐标都是 CSS 像素
  vh = window.innerHeight
  canvas.style.width = vw + 'px'
  canvas.style.height = vh + 'px'
  canvas.width  = Math.floor(vw * dpr)   // 画布物理分辨率
  canvas.height = Math.floor(vh * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0) // 换算只发生在这里
}
```

`setTransform` 之后，画任何东西都继续用 CSS 像素，缩放交给 transform 矩阵。高屏上清晰了，代码里也没有任何一处 `* dpr` 散落在业务逻辑里。

第二个坑是连线。朴素写法是所有粒子两两算距离，80 个粒子每帧 6400 次——其实还行，但它是白算的：120px 之外的粒子根本不用看。把屏幕切成 120px 的网格，每帧只比较同格和相邻格的粒子，计算量掉一个量级。

最后是几条"让看不见的动画别跑"的规矩：

```js
// 页面切到后台就跳过绘制
if (!isPageVisible) { requestAnimationFrame(animate); return }

// 粒子数量跟着屏幕面积走，别拍脑袋定死
const count = Math.min(80, Math.floor(innerWidth * innerHeight / 15000))
```

加上 `prefers-reduced-motion` 的用户直接不初始化、移动端不开启（下文的检查表），粒子这块就稳了。

## 技巧二：鼠标光晕，视觉给 CSS，JS 只管缓动

效果：一团柔光跟着鼠标走，带一点拖尾延迟，像光甩在了身后。

这个效果的正确分工是：**视觉全在 CSS，JS 只干一件事**。

```css
.cursor-glow {
  position: fixed;
  width: 500px;
  height: 500px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(108, 92, 231, 0.2), transparent 70%);
  mix-blend-mode: screen;   /* 暗色主题下用提亮混合 */
  filter: blur(25px);
  pointer-events: none;
  will-change: transform, opacity;
}
```

JS 侧是每帧一句缓动：

```js
glowX += (mouseX - glowX) * 0.08
glow.style.transform = `translate(${glowX}px, ${glowY}px) translate(-50%, -50%)`
```

每帧向目标靠近 8%，就有了拖尾感。系数越小，拖得越长。

三个细节：

| 细节 | 为什么 |
|---|---|
| 移动用 `transform`，不用 `left/top` | `left/top` 每帧触发布局重排；`transform` 走合成层，GPU 的事 |
| `mix-blend-mode` 分主题 | 暗色用 `screen` 提亮，亮色用 `multiply`，否则白底上光晕发灰 |
| 鼠标离开窗口时 `opacity` 过渡到 0 | 否则一团光僵死在屏幕边缘 |

移动端直接 `display: none`——没有鼠标的设备，这个效果毫无意义。

## 技巧三：氛围渐变，以及我为什么把它改成了静态

这节的反面教材是我自己。

第一版背景是动的：全屏元素上跑 `background-position` 动画，再叠一层 `hue-rotate` 色相旋转，营造"缓慢流动"的氛围。跑起来才发现两个问题：

1. 全屏元素逐帧重绘，GPU 和电量在为一个几乎没人注意的效果持续买单；
2. `hue-rotate` 会周期性地把品牌紫漂成绿色、蓝色——色彩纪律全线失守。

后来干脆改成静态：两团 `radial-gradient`，紫一团粉一团，透明度压到 0.15 和 0.1，垫在页面最底层当氛围。

```css
.bg-gradient {
  background:
    radial-gradient(ellipse 80% 50% at 20% 40%, rgba(108, 92, 231, 0.15), transparent),
    radial-gradient(ellipse 60% 40% at 80% 60%, rgba(253, 121, 168, 0.1), transparent);
}
```

零每帧成本。动态的部分交给粒子和光晕，静态渐变负责打底——**氛围感靠的是层次，不是运动**。

有时候最好的性能优化，是砍掉一个动画。

## 检查表

三个效果合起来不到 250 行。收个尾：

| 效果 | 性能要点 | 移动端 |
|---|---|---|
| 粒子背景 | DPR 换算收敛到 `setTransform`、空间网格连线、后台页暂停 | 关闭 |
| 鼠标光晕 | `transform` 合成层、缓动跟随、`pointer-events: none` | 关闭 |
| 氛围渐变 | 静态化，零每帧成本 | 保留 |

动手之前先想清楚：这个效果在什么设备上、以什么代价、给谁看。想不清楚的动画，不做就是最优解。
