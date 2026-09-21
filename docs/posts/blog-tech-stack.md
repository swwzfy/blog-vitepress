---
title: 我的博客是怎么搭的
date: 2026-09-20
tags: [VitePress, 前端, 架构]
description: 一篇讲清楚这个博客的技术选型、主题定制方式、i18n 方案、RSS 自建原因，以及几个性能取舍背后的逻辑。
---

# 我的博客是怎么搭的

用了几个月 VitePress，从默认主题一路改到现在这副样子，踩过一些坑，也攒了一些可复用的模式。这篇把整个架构摊开来讲一遍——从为什么选 VitePress，到自定义主题怎么继承，到 RSS 为什么不走插件，到部署为什么还是手动。

<!-- more -->

## 技术栈

- **框架**: VitePress 1.6.4 + Vue 3 + TypeScript
- **样式**: 自定义 CSS，继承 VitePress CSS 变量体系（`--vp-c-*`）
- **部署**: 静态站点，`npm run build` 输出到 `docs/.vitepress/dist`，手动 rsync 到阿里云 nginx

没有后端，没有数据库，没有 CMS。内容就是 Markdown 文件，构建时 Everything Is Static。

---

## 为什么选 VitePress

试过几个方案：

- **Hexo**: 插件生态丰富，但主题定制深度嵌套，改个布局要翻五层继承。构建慢，热更新更慢。
- **Next.js + MDX**: 灵活，但对纯博客来说是杀鸡用牛刀。部署需要 Node 运行时或 Serverless，静态导出后 i18n 路由要自己处理。
- **Astro**:  Islands Architecture 很适合，但 1.0 刚发布时生态还不成熟，VitePress 的文档体验已经打磨得很好了。

VitePress 的核心优势：**Vue 组件就是主题**。不用学一套模板语言，不用在 markdown 和 HTML 之间切上下文。markdown 里直接写 `<script setup>` 和 `<template>`，frontmatter 自动注入为 page data——这对习惯 Vue 的人来说是零成本切换。

---

## 主题定制：继承，不 fork

VitePress 的主题定制方式是 **extends**，不是覆盖。在 `.vitepress/theme/index.ts` 里：

```ts
import DefaultTheme from 'vitepress/theme'

export default {
  extends: DefaultTheme,
  Layout,           // 自定义布局，只改需要改的部分
  setup() { ... }   // 挂载粒子、光晕、主题过渡
}
```

Layout 组件用 Vue slot 精确控制插入位置：

- `#doc-before` — 文章头部（返回按钮 + 元信息 + 标签）
- `#doc-after` — 相关文章推荐
- `#not-found` — 自定义 404
- `#layout-bottom` — 自定义 Footer

好处是 VitePress 默认升级后，我没改的部分自动跟着升级。坏处是如果 VitePress 改了 slot 名字或结构，我需要手动适配——但这种破坏性变更在 minor 版本里很少见。

---

## i18n：VitePress locales + 一个 composable

VitePress 原生支持多语言，在 `config.mts` 里声明 `locales`：

```ts
locales: {
  root: { label: '中文', lang: 'zh-CN', themeConfig: { ... } },
  en:   { label: 'English', lang: 'en-US', themeConfig: { ... } }
}
```

目录结构是镜像的：`/posts/*.md` 和 `/en/posts/*.md`，路由自动加 `/en` 前缀。

**没有用 vue-i18n**。理由：

1. 博客文案少，主要就是组件里的几个按钮和标签
2. VitePress 已经通过 `page.value.relativePath` 的前缀判断了当前语言，我只需要一个轻量的 `t()` 函数

实现只有 30 行（`composables/useLocale.ts`）：

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

**局限**：不支持嵌套 key、不支持占位符。如果将来文案量增长到需要这些，再换 vue-i18n 也不迟。

---

## 粒子背景 + 光晕 + 渐变：效果很便宜，坑在细节

三个效果全在 `effects.js` 里，不到 250 行。挂载方式是在 `setup()` 里 `await import('./effects.js')`——不进首屏包，不抢正文渲染。

### 粒子背景

全屏 canvas，80 个粒子，距离近的自动连线，鼠标附近轻微吸引。

**一个坑：DPR 和 CSS 像素混用**。

最早把 canvas 宽高按物理像素设，粒子坐标按 CSS 像素算，鼠标坐标又是另一套。普通屏上凑合能跑，一到 2x 屏，粒子集体缩水、聚在左上角。

正确做法：全系统只认 CSS 像素，物理像素换算收敛到 `setTransform` 一处：

```js
const dpr = Math.min(window.devicePixelRatio || 1, 2)
canvas.width = Math.floor(vw * dpr)  // 物理分辨率
canvas.height = Math.floor(vh * dpr)
ctx.setTransform(dpr, 0, 0, dpr, 0, 0)  // 之后画什么都是 CSS 像素
```

第二个坑是连线性能。80 个粒子两两算距离是 6400 次/帧，其实还行，但大部分比较是白算的——120px 之外的粒子根本不用看。用空间网格把屏幕切成 120px 的格子，只比较同格和相邻格的粒子，计算量掉一个量级。

### 鼠标光晕

JS 只管缓动，视觉全在 CSS：

```css
.cursor-glow {
  background: radial-gradient(circle, rgba(108, 92, 231, 0.2), transparent 70%);
  mix-blend-mode: screen;      /* 暗色提亮，亮色用 multiply */
  filter: blur(25px);
  will-change: transform, opacity;
}
```

```js
glowX += (mouseX - glowX) * 0.08  // 每帧靠近 8%，拖尾感
glow.style.transform = `translate(${glowX}px, ${glowY}px) translate(-50%, -50%)`
```

关键：用 `transform` 不用 `left/top`——合成层动画，不触发布局重排。

### 氛围渐变

**第一版是动的**：全屏元素跑 `background-position` 动画，叠一层 `hue-rotate` 色相旋转。跑起来发现两个问题：

1. 全屏逐帧重绘，GPU 和电量持续消耗
2. `hue-rotate` 周期性把品牌紫漂成绿色/蓝色，色彩纪律失守

后来改成静态：两团 `radial-gradient`，透明度压到 0.15 和 0.1，垫在最底层。效果靠层次，不是运动。

---

## 阅读体验组件

### 文章头部

每篇文章顶部显示返回按钮、日期、阅读时长、字数统计、标签。字数统计是动态计算的——扫 `.vp-doc` 的 `textContent`，中文字数 + 英文单词数，除以 300 得到分钟数。结果缓存到 Map，避免每次切回同一篇文章都重新扫文。

### 相关文章推荐

`findRelated()` 按标签交集打分，同标签越多排名越靠前，平分时按日期倒序。最多取 3 篇。

### 404 页面

VitePress 默认 404 太素。自定义了一个带浮动星星和呼吸动画的版本，用 `#not-found` slot 替换。

---

## RSS：为什么自建

VitePress 生态里有 `vitepress-plugin-rss`，但 0.4.4 版本的 `locales` 字段有 bug——不会拆出独立的 `/en/feed.rss`。

自己写 `build-rss.js` 只有 230 行，用 `feed` 库生成标准 RSS 2.0，`buildEnd` 钩子里执行。

几个细节：

- **完整正文**：从构建产物 `dist/posts/<slug>.html` 里提取 `<main>` 内的 `vp-doc` HTML，喂给 `<content:encoded>`——订阅器里能看到完整文章，不只是摘要
- **Draft 过滤**：frontmatter 里 `draft: true` 的文章不进 RSS，也不进路由（`srcExclude`）
- **路径边界校验**：slug 拼接路径前校验 `startsWith(distRoot)`，防止路径穿越
- **HTML 预览**：浏览器直接打开 RSS 会显示 XML 源码，加一个 `feed.html` 静态预览页，中文用 `<meta charset="utf-8">` 不会乱码

---

## 其他自动化

### Sitemap

`buildEnd` 钩子里用 `sitemap` 库生成，基于 VitePress 的 `siteConfig.pages`，每周更新频率。

### Dev Server 清理

Windows 上 `npm run dev` 前先杀占着 5173 端口的旧实例（`scripts/dev-fresh.js`），否则端口被占报错。Linux/Mac 上 netstat 输出格式不同，直接跳过。

---

## 部署

输出是纯静态文件，`docs/.vitepress/dist/`。

部署方式：rsync 推到阿里云 ECS 的 nginx 目录。没有 CI/CD，没有 GitHub Actions——手动推，手动确认。

**为什么不加 CI？** 因为博客更新频率低（一个月 1-2 篇），手动流程已经足够。加 CI 要处理：域名证书自动续签、阿里云密钥管理、构建缓存——这些成本现在大于收益。

---

## 性能取舍清单

| 决策 | 选择 | 原因 |
|---|---|---|
| 字体 | 只加载 JetBrains Mono + 霞鹜文楷，Inter 移除 | 9 个字重的 Inter 纯死重，正文用系统栈 |
| 粒子数量 | 按屏幕面积动态算，上限 80 | 移动端少画，4K 屏不爆 |
| 动画 | `prefers-reduced-motion` 全关 | 无障碍 |
| Live2D | 移动端 `< 768px` 关闭 | 性能 + 触摸无意义 |
| 光晕 | `will-change: transform, opacity` | 合成层动画，不触布局 |
| 渐变 | 静态化 | 原版逐帧重绘 + hue-rotate 漂色 |
| 评论 | 已下线 | Giscus 加载重，当前不值得 |
| 搜索 | VitePress 本地搜索 | 不需要外部服务，build 时生成索引 |

---

## 还有哪些没做

- **图片优化**：没有 WebP 自动转换，没有懒加载 pipeline。现在手动放到 `public/`，靠浏览器 `loading="lazy"`。
- **CDN**：静态资源全在阿里云 ECS 上，没有 CDN。国内访问速度还行，但图片没做缓存策略。
- **PWA**：没有 service worker，离线不可用。博客场景下优先级不高。
- **评论系统**：Giscus 代码还在，注释掉了。等想好内容策略再决定要不要开。

---

## 总结

这个博客的核心思路是：**静态优先，手动够用就够，效果可以花钱但性能不能**。

粒子、光晕、渐变——效果都很便宜，但每个都踩过坑。踩坑的地方不是"怎么实现"，而是"单位混用导致坐标错位"、"动画色彩漂移破坏品牌一致性"、"逐帧重绘持续耗电"——这些是工程决策，不是审美选择。

如果你也在用 VitePress 做博客，欢迎交流。
