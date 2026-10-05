---
title: VitePress 瘦身实录：一个 640KB 的 chunk 是怎么消失的
date: 2026-10-05
tags: [VitePress, 性能]
description: 本来只想修爬虫眼里的「字数 0」，顺藤摸出一个 640KB 的巨型 chunk——全站文章的编译产物，只为拿几 KB 的 frontmatter。把元信息搬进构建期后，最大 JS 降到 48KB，dist 顺带瘦了半兆。
---

# VitePress 瘦身实录：一个 640KB 的 chunk 是怎么消失的

这件事的起点小得不能再小——文章页的阅读时长和字数，在预渲染的 HTML 里永远是 0。爬虫看到 0，搜索引擎快照里也是 0，只有真人打开页面的那一瞬间，才变出「6 分钟阅读 · 1657 字」。

对静态站生成来说，这几乎算丑闻：都 SSG 了，页面上还藏着一块内容是浏览器现场算的。

<!-- more -->

## 症状：SSG 输出里的 0

文章头部的元信息行（阅读时长 · 字数）原来是这么算的：`onMounted` 之后扫一遍 `.vp-doc` 的 DOM 数字符。`onMounted` 只在浏览器里跑，VitePress 预渲染时根本不执行，所以静态 HTML 里这个位置永远是 0。

修复的第一版还是栽在同一个地方：想着在 `onMounted` 里改成读现成的变量——变量是有了，可它出现在客户端，SSR 依然拿不到。正确的姿势从头到尾只有一个字：**早**。数据要在构建期就备好，渲染时用 `computed` 直接取。

而顺着「谁在提供这些数据」往下查，就查到了真正的大头。

## 病灶：一个只为拿名片的 640KB chunk

文章列表（归档、首页最近文章、标签页）的数据源，是 `theme/utils/posts.ts` 里的 `import.meta.glob` eager 模式——把 `docs/posts` 下所有 `.md` 页面模块**同步**拉进 bundle，再从模块导出里读 frontmatter 的标题、日期、标签。

问题在于 VitePress 会把每个 markdown 文件编译成一个 JS 页面模块，正文、渲染函数全在里面。列表只需要几 KB 的「名片」，eager 却把中英两边的**全部正文编译产物**背在身上，合成一个 640KB（gzip 后 147KB）的 chunk。更糟的是它进了模块图，被每一页 modulepreload——访客还没点开任何一篇文章，首页就把全站正文下载了一遍。

## 修法：元信息搬进构建期

思路一句话：**列表要的从来不是文章本体，是文章的名片。名片在构建期就能印好。**

新增 `scripts/build-posts-meta.js`，六十来行：

- `gray-matter` 扫 `docs/posts` 与 `docs/en/posts` 的 frontmatter；
- 按与页面显示一致的口径数好字数（中文字符数 + 英文单词数），阅读时长（字数 ÷ 300 向上取整）一并锁定；
- `draft: true` 在生成期直接排除，比路由层排除多一道保险；
- 产物按路径排序写入 `docs/.vitepress/posts-meta.json`——**17KB**，连续两次构建 diff 零噪音。

config.mts 里挂一个几行的小插件：`buildStart` 时刷新 JSON；dev 下监听文章的增删改随时重写，即时性与原来的 glob 对齐。`posts.ts` 从「import 全站页面模块」变成「import 一个 JSON」，列表组件一行没改——数据形状没变，只是来源换了。

Layout 侧把字数与阅读时长改成 `computed`，从构建期生成的 `wordsByRoutePath` 里取。SSG 输出当场非 0：爬虫拿到的 HTML 里就写着「6 分钟阅读 · 1657 字」。

> 顺带一提：VitePress 自带的 `createContentLoader` 也能在构建期出列表，但字数统计和中英双目录的口径都得自己补——既然要写，不如六十行全管到底。

## 第二笔死重：从没人听到过的 Inter

体积这事一旦开了头就停不下来。顺着 `buildEnd` 又摸到一笔：VitePress 默认主题把 Inter 的 `@font-face` 无条件打进产物 CSS，并拷出 **14 个 woff2，约 500KB**。而这个站的主字体栈是系统字体，展示字是霞鹜文楷——Inter 全站零引用，纯粹是「默认主题有什么就带什么」的死重。

处理分三步：

1. `buildEnd` 把 `dist/assets` 里的 `inter-*.woff2` 全部剔除；
2. 同步剥掉各页 head 里的 preload 死链——文件删了，`<link rel="preload">` 还挂在 **57 个页面**上，每个访客的控制台都会多一条字体 404；
3. `tokens.css` 覆盖 `--vp-font-family-base`，把 Inter 挡在引用之外。

**Windows 坑必须记一笔**：`siteConfig.outDir` 在 Windows 上是正斜杠风格，路径守卫比较前如果不先 `resolve` 归一化，守卫恒为 false、静默跳过。守卫存在却形同虚设，比没有守卫更危险。

## 结果

| 指标 | 之前 | 之后 |
| --- | --- | --- |
| 最大 JS chunk | 640KB（gzip 147KB） | 48KB |
| dist 总体积 | 7.1M | 6.5M |
| 每页 modulepreload | 全站文章编译产物 | 一个 17KB 的 JSON |
| 爬虫看到的字数 | 0 | 「6 分钟阅读 · 1657 字」 |

还有一个不体现在数字里的收益：页面渲染从此和文章数据解耦。改一篇旧文章的错别字，不再牵动全站列表 chunk 的哈希；列表页的变化只落在一个 17KB 的 JSON 上。

## 一条原则

**构建期能算的，别进运行时 bundle。**

文章的字数、标题、标签，在 markdown 落盘的那一刻就确定了，没有理由让每个访客的浏览器打开页面后再算一遍。静态站生成的「静态」两个字，最大的价值就是让该提前的事提前做——bundle 里只该留下真正需要交互的东西。
