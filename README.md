# Kiran's Blog

基于 VitePress 的个人博客，紫粉配色，带粒子背景、鼠标光晕、自定义光标，以及桌面端 live2D 看板娘。生产域名 `https://www.jossecho.com`。

## 技术栈

- **框架**: VitePress 1.6.4
- **语言**: TypeScript / Vue 3
- **字体**: Inter（正文） + JetBrains Mono（代码）
- **部署**: 静态站点，`npm run build` 输出到 `docs/.vitepress/dist`

## 项目结构

```
docs/
├── .vitepress/
│   ├── config.mts          # 站点配置（导航、i18n、插件、构建钩子）
│   ├── secure-words.txt    # 敏感词列表（评论功能未上线，当前未被引用，保留备用）
│   ├── theme/
│   │   ├── index.ts         # 主题入口（注册全局组件、加载特效）
│   │   ├── Layout.vue        # 自定义布局（文章头部、相关推荐、404、页脚、live2D）
│   │   ├── Tags.vue          # 标签页组件
│   │   ├── Archives.vue      # 归档页组件
│   │   ├── Stats.vue         # 统计组件（文章数、字数等）
│   │   ├── RecentPosts.vue   # 首页最近文章组件
│   │   ├── DateTimeWeather.vue # 首页日期天气组件
│   │   ├── LifeList.vue      # 生活页列表组件（位于 components/ 下）
│   │   ├── useTags.ts        # 标签数据加载
│   │   ├── theme-transition.js # 主题切换过渡
│   │   ├── custom.css        # 自定义样式（配色、动画、光标）
│   │   ├── effects.js        # 粒子系统 + 鼠标光晕 + 自定义光标
│   │   ├── composables/      # 组合式函数（useLocale 等）
│   │   ├── components/       # 页面级组件（LifeList.vue）
│   │   └── utils/            # 工具函数（posts、types、format）
│   ├── public/               # 静态资源（favicon、og 图、feed、二维码等）
│   └── dist/                 # 构建产物（部署用，不纳入版本管理）
├── index.md                 # 中文首页
├── about.md                 # 中文关于页
├── archives.md              # 中文文章归档
├── tags.md                  # 中文标签页
├── timeline.md              # 中文时间线
├── projects.md              # 中文项目展示
├── friends.md               # 中文友链
├── life.md                  # 中文生活页
├── posts/                   # 中文文章目录
│   ├── ai-memory.md
│   ├── deepseek-harness.md
│   ├── local-llm-deployment.md
│   ├── notes-evolution.md
│   ├── openclaw-vs-hermes.md
│   ├── openspec-review.md
│   ├── personal-server.md
│   ├── python-setup.md
│   ├── rust-cli.md
│   └── yangzhou-cafe.md
└── en/                      # 英文版本（镜像结构）
    ├── index.md
    ├── about.md
    ├── archives.md
    ├── tags.md
    ├── timeline.md
    ├── projects.md
    ├── friends.md
    ├── life.md
    └── posts/
```

> 注：中文与英文目录结构必须镜像对应。草稿文章通过 `config.mts` 的 `srcExclude` 排除路由，并在 `scripts/build-rss.js` 中按 `frontmatter.draft` 二次过滤（目前排除 `suzhou-hanshan-temple.md` 中英两版）。

## 配色方案

| 用途 | 色值 | 说明 |
|------|------|------|
| 主色 Brand-1 | `#6c5ce7` | 紫色，用于按钮、链接、粒子 |
| 副色 Brand-2 | `#a29bfe` | 淡紫色，光标、hover 态 |
| 强调色 Brand-3 | `#fd79a8` | 粉色，渐变点缀 |
| 辅助色 | `#00cec9` | 青色，背景渐变点缀 |

CSS 变量定义在 `custom.css`：
```css
:root {
  --vp-c-brand-1: #6c5ce7;
  --vp-c-brand-2: #a29bfe;
  --vp-c-brand-3: #fd79a8;
}
```

背景渐变使用 `radial-gradient` 三色叠加，配合 `hue-rotate` 动画流动。

## 视觉效果与交互

全部在 `effects.js` 中实现，通过 `index.ts` 的 `onMounted` 动态导入：

1. **背景渐变** — 三色径向渐变 + 15s 流动动画
2. **粒子系统** — Canvas 绘制，鼠标靠近时粒子被吸引，粒子间距 < 120px 时连线
3. **鼠标光晕** — 500px 径向渐变跟随鼠标，blur(40px)
4. **自定义光标** — 紫色光点 + 环形跟随，hover 链接时环放大，点击时涟漪扩散
5. **卡片 hover** — translateY(-4px) + 紫色边框 + 阴影
6. **页面过渡** — fadeIn 0.5s
7. **live2D 看板娘** — 桌面端（≥768px）从 CDN 动态加载 tororo 柴犬模型，移动端自动关闭
8. **文章页增强** — 自动计算阅读时长与字数、相关文章推荐（按标签匹配，取前 3 篇）
9. **自定义 404 页** — 星空动画 + 返回按钮

移动端（< 768px）自动隐藏光标和光晕，并关闭 live2D。

## 国际化（i18n）

使用 VitePress 原生 locales 配置，支持中英文切换。导航项：首页 / 文章 / 项目 / 生活 / 标签 / 时间线 / 友链 / 关于（英文对应 `/en/*`）。

### 添加中文页面

1. 在 `docs/` 下创建 `.md` 文件
2. 在 `config.mts` 的 `root.themeConfig.nav` 中添加导航项
3. 文章放 `docs/posts/`，frontmatter 示例：

```yaml
---
title: 文章标题
date: 2026-06-14
tags: [标签1, 标签2]
description: 文章描述，用于 SEO
---
```

阅读时长与字数由 `Layout.vue` 自动计算，无需手动填写。

### 添加英文页面

1. 在 `docs/en/` 下创建同名 `.md` 文件
2. 在 `config.mts` 的 `en.themeConfig.nav` 中添加导航项
3. 英文文章放 `docs/en/posts/`

**注意：中英文目录结构必须镜像对应。**

## 常用命令

```bash
npm run dev      # 本地开发（predev 自动 kill 旧 :5173 进程）
npm run build    # 构建静态文件 + sitemap + 双语 RSS
npm run preview  # 预览构建结果
npm run lint     # ESLint 检查
npm run og       # 重生成 OG 图（依赖 .agents/scripts/make-og.js，该文件当前未包含在仓库中，命令暂不可用）
```

## 插件

- **sitemap** — 构建时自动生成 `sitemap.xml`
- **rss** — 自写 `scripts/build-rss.js`（替代 `vitepress-plugin-rss`），输出中英两份 `feed.rss` 与 `en/feed.rss`，并在 `buildEnd` 钩子里镜像一份到 `docs/public/`（解决 dev 模式访问 404）
- **busuanzi** — 不蒜子站点/页面访问统计，已在 `config.mts` head 与 `Layout.vue` 页脚接入

## 评论与敏感词

- 评论组件依赖 `@giscus/vue` 已安装，但**评论功能当前已下线**（`Layout.vue` 中 `<Comment>` 已注释，未启用）。
- `docs/.vitepress/secure-words.txt` 为**敏感词列表**，原计划用于评论过滤；因评论未上线，当前未被引用，保留备用。

## RSS 订阅

支持中英双语 RSS Feed，自动生成预览页面：

- 中文 RSS: `https://your-domain/feed.rss` 和预览页 `https://your-domain/feed-preview.html`
- 英文 RSS: `https://your-domain/en/feed.rss` 和预览页 `https://your-domain/en/feed-preview.html`

RSS 逻辑由 `scripts/build-rss.js` 生成，包含完整的 HTML 预览和可视化 XSL 样式表。

## 部署

### 部署前

确认 `config.mts` 中的 `hostname` 为真实域名（当前已设为 `https://www.jossecho.com`）：
```ts
const hostname = 'https://www.jossecho.com'
```

### 构建并部署

```bash
npm run build       # 生成静态文件到 docs/.vitepress/dist
```

**打包规则：不压缩，直接上传 `docs/.vitepress/dist` 目录**
- 上传整个 `docs/.vitepress/dist` 文件夹到阿里云服务器
- 使用 nginx 指向该目录
- 或上传到 CDN / 静态站点托管服务
- 不需要压缩成 zip / tar.gz

> 当前为手动上传部署。如需「改完一键发布」，可后续增加 `rsync` / `scp` 脚本或 CI（如 GitHub Actions），尚未实现。

### Netlify / Vercel 部署配置

`_headers` 已配置正确的 Content-Type 和缓存策略，确保 RSS 和 HTML 文件以 UTF-8 编码传输。

## 最近改进

- ✅ 新增生活（life）页与 `LifeList.vue` 组件
- ✅ 接入 busuanzi 访问统计（站点 UV / PV、文章阅读量）
- ✅ 桌面端 live2D 看板娘（tororo 柴犬）
- ✅ 文章页自动阅读时长 / 字数统计 + 相关文章推荐
- ✅ 自定义 404 页（星空动画）
- ✅ 评论功能下线，保留组件代码与敏感词表备用
- ✅ 修复 RSS 预览页中文乱码（UTF-8 编码 + 正确的 HTTP 响应头）
- ✅ 项目结构整洁化，移除临时测试文件
