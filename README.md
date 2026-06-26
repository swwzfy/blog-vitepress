# Kiran's Blog

基于 VitePress 的个人博客，紫粉配色，带粒子背景和鼠标光晕效果。

## 技术栈

- **框架**: VitePress 1.6.4
- **语言**: TypeScript / Vue 3
- **字体**: Inter（正文） + JetBrains Mono（代码）
- **部署**: 静态站点，`npm run build` 输出到 `docs/.vitepress/dist`

## 项目结构

```
docs/
├── .vitepress/
│   ├── config.mts          # 站点配置（导航、i18n、插件）
│   └── theme/
│       ├── index.ts         # 主题入口
│       ├── Layout.vue       # 自定义布局（文章头部、相关推荐、404）
│       ├── Tags.vue         # 标签页组件
│       ├── useTags.ts       # 标签数据加载
│       ├── custom.css       # 自定义样式（配色、动画、光标）
│       └── effects.js       # 粒子系统 + 鼠标光晕 + 自定义光标
├── index.md                 # 中文首页
├── about.md                 # 中文关于页
├── archives.md              # 中文文章归档
├── tags.md                  # 中文标签页
├── timeline.md              # 中文时间线
├── projects.md              # 中文项目展示
├── friends.md               # 中文友链
├── posts/                   # 中文文章目录
│   ├── rust-cli.md
│   ├── indie-dev-first-year.md
│   ├── notes-evolution.md
│   ├── ai-memory.md
│   ├── shanghai-cafe.md
│   └── personal-server.md
└── en/                      # 英文版本（镜像结构）
    ├── index.md
    ├── about.md
    ├── archives.md
    ├── tags.md
    ├── timeline.md
    ├── projects.md
    ├── friends.md
    └── posts/
```

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

## 视觉效果

全部在 `effects.js` 中实现，通过 `index.ts` 的 `onMounted` 动态导入：

1. **背景渐变** — 三色径向渐变 + 15s 流动动画
2. **粒子系统** — Canvas 绘制，鼠标靠近时粒子被吸引，粒子间距 < 120px 时连线
3. **鼠标光晕** — 500px 径向渐变跟随鼠标，blur(40px)
4. **自定义光标** — 紫色光点 + 环形跟随，hover 链接时环放大，点击时涟漪扩散
5. **卡片 hover** — translateY(-4px) + 紫色边框 + 阴影
6. **页面过渡** — fadeIn 0.5s

移动端（< 768px）自动隐藏光标和光晕。

## 国际化（i18n）

使用 VitePress 原生 locales 配置，支持中英文切换。

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

### 添加英文页面

1. 在 `docs/en/` 下创建同名 `.md` 文件
2. 在 `config.mts` 的 `en.themeConfig.nav` 中添加导航项
3. 英文文章放 `docs/en/posts/`

**注意：中英文目录结构必须镜像对应。**

## 常用命令

```bash
npm run dev      # 本地开发 http://localhost:5173
npm run build    # 构建静态文件
npm run preview  # 预览构建结果
```

## 插件

- **sitemap** — 自动生成 `sitemap.xml`
- **rss** — 自动生成 `feed.rss`

## 部署前

修改 `config.mts` 中的 `hostname` 为真实域名：
```ts
const hostname = 'https://your-domain.com'
```
