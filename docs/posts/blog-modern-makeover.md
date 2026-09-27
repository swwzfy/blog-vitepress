---
title: 博客现代化改造：噪点、追光、View Transitions 与 Bento
date: 2026-09-27
tags: [VitePress, 前端, CSS, 动效]
description: 给三年攒下的"效果存量"做一次减法：噪点纹理、边框追光、原生 View Transitions、大标题紧字距、Bento 首页。坑都比效果本身值钱——SPA 导航吃掉 CSS 过渡、:has 特异性、vp-doc 全局样式污染。
---

# 博客现代化改造：噪点、追光、View Transitions 与 Bento

这篇博客的效果存量其实不少：粒子连线、鼠标光晕、渐变按钮、Live2D 柴犬。都是 2019 到 2021 年间个人站流行的那套"炫酷风"。

有天盯着首页突然意识到：这些特效恰恰是"年代感"的来源。2024 年之后的现代感——Linear、Vercel、Apple 官网那种——方向完全相反，来自克制和细节质感。所以这次改造的思路不是继续叠特效，而是**做减法、换细节**。

<!-- more -->

最终落地五件事：全局噪点、原生 View Transitions、大标题紧字距、卡片边框追光、Bento 首页。顺手把 about 页名片化，还做了一次全站中英文内容对齐。效果都不复杂，坑倒是踩了不少，这篇照旧把坑摊开讲。

## 一、噪点纹理：十行 CSS 买来的胶片感

渐变背景有个老毛病：颜色过渡的区域会出现色带（banding），一大块渐变里隐约一圈一圈的。噪点是业界通用解法——一层 2~3% 透明度的噪声盖在全页上，色带被颗粒打碎，整个页面瞬间有"印刷品"的质感。

不用引任何图片，SVG 的 `feTurbulence` 滤镜现场生成，data URI 直接写进 CSS：

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

SVG 里两个滤镜节点：`feTurbulence` 产生分形噪声，`feColorMatrix type="saturate" values="0"` 转成灰度——不转的话是彩色噪点，会在暗色背景上引入轻微的彩斑。`opacity: 0.03` 是甜点位，再高就脏了。

它是纯静态层，没有动画、没有 JS、不参与重绘，性能开销约等于零。

## 二、View Transitions：我以为一行 CSS，实际是一套钩子

原计划是全站页面切换换成浏览器原生过渡，方案看起来极简：

```css
@view-transition {
  navigation: auto;
}
```

写完一测——站内点链接，毫无反应。

查了才明白：**这条 CSS 只对"跨文档导航"生效**，也就是浏览器完整加载一个新 HTML 的场景。而 VitePress 站内点击走的是 client router——fetch 新页面的数据、原地换 DOM，本质是 SPA 导航，浏览器根本不认为发生了一次"文档切换"。跨文档 View Transition 永远等不到出场机会。

所以只能走同文档路线：用 `document.startViewTransition()` 手动包住 DOM 更新。问题是怎么拿到"更新前"和"更新后"两个时机。VitePress 的 router 提供了两个钩子，正好是一前一后：

```js
export function initPageTransitions(router) {
  if (typeof document.startViewTransition !== 'function') return

  let resolveNav = null
  router.onBeforeRouteChange = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // 拍旧快照；callback 返回的 Promise 决定"何时拍新快照"
    document.startViewTransition(
      () => new Promise((resolve) => { resolveNav = resolve })
    )
    // 兜底：路由中断时 3s 强制放行，避免渲染被 VT 挂起冻结
    setTimeout(() => resolveNav?.(), 3000)
  }
  router.onAfterRouteChanged = () => {
    const resolve = resolveNav
    resolveNav = null
    resolve?.()
  }
}
```

原理捋一下：`startViewTransition` 调用的瞬间浏览器拍旧快照；callback 里的 Promise 决定新快照的时机——所以我让 `onBeforeRouteChange` 开启过渡、把 resolve 存起来，等 router 把 DOM 换完、`onAfterRouteChanged` 触发时再 resolve，浏览器这时候拍新快照、播 cross-fade。DOM 更新可以发生在 callback 外面，callback 只负责说"好了"。

那个 3 秒兜底不是 decorative：VT 挂起期间浏览器会暂停渲染，万一路由因为异常没走到 after 钩子，页面就永久冻结在旧快照上了。宁可过渡消失，不能把用户锁在半路。

主题切换也顺手升级了。原来那套"全屏渐变盖层扫过一遍"的过渡删掉，换成同款原生方案：capture 阶段拦下切换按钮的第一次点击，包进 `startViewTransition` 再重放：

```js
let replaying = false
document.addEventListener('click', (e) => {
  if (replaying) return                       // 重放的事件直接放行，否则无限递归
  const btn = e.target.closest?.('.VPSwitchAppearance')
  if (!btn) return
  e.preventDefault()
  e.stopPropagation()
  replaying = true
  document.startViewTransition(() => btn.click())
  setTimeout(() => { replaying = false }, 100)
}, true)
```

capture 阶段 `stopPropagation` 掉第一次点击，Vue 的 toggle 收不到；VT 的 callback 里 `btn.click()` 重放，这次带着 `replaying` 标记从处理器最前面直接放行。旧文件删掉，主题切换从"糊一层光"变成真正的整页 cross-fade。

## 三、边框追光：卡片不再上浮

卡片 hover 上浮 `translateY(-4px)` 是我写了很多年的默认动作，现在看也是年代感的一部分。换成了 Vercel / Linear 那种**边框追光**：光斑沿 1px 边框亮起，跟随鼠标移动，卡片本身纹丝不动。

实现分两半。CSS 负责那圈光——一个 `::after` 环形层，`inset: -1px` + `padding: 1px` 撑出边框位置，再用 mask 把中间挖空，只留 1px 的边受光：

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

`mask-composite: exclude` 这套组合值得记下来——"只露出边框宽度的环形区域"全靠它，不用额外 DOM，不用 box-shadow 硬凑。

JS 只管喂坐标，委托到 `document` 上，Teleport 动态注入的卡片也能命中：

```js
document.addEventListener('pointermove', (e) => {
  const card = e.target.closest?.('.VPFeature, .related-card, .bento-card, .about-card')
  if (!card) return
  const rect = card.getBoundingClientRect()
  card.style.setProperty('--spot-x', `${e.clientX - rect.left}px`)
  card.style.setProperty('--spot-y', `${e.clientY - rect.top}px`)
})
```

光斑位置 = `radial-gradient` 的圆心吃 CSS 变量，鼠标到哪光到哪。移动端没有 hover 无所谓，`pointer-events: none` 保证这层永远不挡交互。

## 四、大标题 + 紧字距：最便宜的排版信号

这条没什么技术含量，但性价比最高：标题放大、字距收紧，是最直接的"现代排版"信号。

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

一个意外收获：`clamp()` 让手机端的文章标题从默认 39px 收到了 32px——大标题在手机上其实很笨重，缩一点反而精致。负字距对中文宽字符也安全，-0.02em 是显挤之前的甜点位。

## 五、Bento 首页：Teleport 与 :has 的接力

首页原来的结构是"三张等宽特性卡 + 一张时钟卡"的规整一行。改成 Bento 不等宽网格：时钟卡跨 2 列做视觉锚点，新增一张订阅卡，第二行生活卡和订阅卡各跨 2 列。

难点在 VitePress 的实现方式：`.VPFeatures` 里 `.item` 的宽度是 scoped 样式，而时钟卡是用 `<Teleport defer>` 注入的节点，scoped 的 data 属性根本打不到它。解法是全量接管——在全局 CSS 里用 `:has()` 当锚点，只要网格里有注入卡就重写整组宽度：

```css
@media (min-width: 960px) {
  .VPFeatures .items:has(.datetime-weather-item) .item {
    width: calc(100% / 4);
  }
  /* 跨列卡必须同特异性且声明在后，否则被上面的规则压回去 */
  .VPFeatures .items:has(.datetime-weather-item) .datetime-weather-item {
    width: 50%;
  }
}
```

这里踩了本次改造最典型的坑：**选择器特异性**。我最初给跨列卡写 `.datetime-weather-item { width: 50% }`，单类 (0,1,0) 完全打不过 `:has(...) .item` 的 (0,4,0)，页面上时钟卡纹丝不动。跨列规则提到同特异性、声明在后面，才压得回去。

第二个坑：**`:nth-child` 是 DOM 序不是显示序**。时钟卡靠 `order: -1` 显示在最前面，但 DOM 上它是 Teleport append 到末尾的第 4 个子元素。首屏入场动画的错峰 delay 是按 `:nth-child` 写的，不改的话动画顺序和视觉顺序对不上——显示第一张的卡要写 `nth-child(4)`。

时钟卡跨成宽卡之后，内部布局也要跟着变：窄卡时时间竖排，宽卡时横排（问候居左、大时钟居中、天气靠右）。这里用了容器查询而不是媒体查询：

```css
@container (min-width: 480px) {
  .info-row {
    flex-direction: row;
    justify-content: space-between;
  }
}
```

原因是这个时钟组件在英文首页还有另一个部署位（hero 右侧的 280px 窄卡）——媒体查询按视口判断会一杆子打翻两个部署位，容器查询只看自己所在的卡有多宽，窄卡部署位天然不受影响。（这次顺手把英文首页也改造成了同样的 Bento，两个部署位合并成了一个，容器查询就算白买了，但下一个相似场景一定用得上。）

## 踩坑清单

改造全程的特异性坑有点密集，单独拉个清单：

| 坑 | 现象 | 原因 | 解法 |
|---|---|---|---|
| `:has` 锚点 | 跨列卡的 `width: 50%` 不生效 | 单类 (0,1,0) 打不过 `:has(...) .item` (0,4,0) | 同特异性 + 声明在后 |
| `vp-doc img` | about 页头像跑到卡片中间 | 全局 `.vp-doc img { margin: auto }` (0,1,1) 压过单类 | 规则加 `.vp-doc` 前缀 |
| `vp-doc a` | 胶囊按钮带下划线、变链接色 | 同上，`.vp-doc a` 特异性更高 | 同上 |
| h2/h3 装饰线 | 卡片标题长出紫色小竖条 | `.vp-doc h2::before` 的装饰线 | `::before { display: none }` |
| HMR | 改了 CSS 页面没反应 | dev 的热更新偶发丢 CSS | 强刷（Ctrl+Shift+R） |

规律其实就一句话：**在 VitePress 的 `.vp-doc` 体系里写页面级样式，凡是和全局规则撞车的，一律带 `.vp-doc` 前缀起手**，别信单类。

## 顺手做的：about 名片化与全站对齐

about 页原来是纯文档流，顺手升级成和首页同语言的版式：渐变名片头部（logo 盒 + 文楷大字 + 梵语 tagline）、三张带追光的兴趣卡、联系方式胶囊按钮 + 二维码卡。Markdown 正文一个字没动，只是外面套了带 class 的 HTML 容器。

另一件是全站中英文对齐体检：文章 17 篇两边一一对应没问题，但时间线英文版多出 4 条对不上的经历、友链一边是真实站点一边是 8 个占位假名、英文首页布局和中文不同构。按"以真实内容为准"逐一对齐了。i18n 站点最怕的不是缺翻译，是两边各自生长——定期 diff 一遍很有必要。

## 结语

这次改造没写一行新的"特效代码"，粒子、光晕都还在，只是全部退到了氛围位。真正花力气的是三件事：让 View Transitions 在 SPA 里跑起来、用 mask 画出会发光的边框、和 `.vp-doc` 的特异性体系搏斗。

如果只让我留一句经验：**现代感不是加出来的，是删出来的。**先决定什么不该动，剩下的自然就现代了。
