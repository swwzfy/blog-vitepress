# Kiran's Blog

基于 VitePress 的个人博客，紫粉配色，带按季节与实时天气换装的粒子背景、鼠标光晕，以及桌面端 live2D 看板娘。生产域名 `https://www.jossecho.com`。

## 技术栈

- **框架**: VitePress 1.6.4
- **语言**: TypeScript / Vue 3
- **字体**: 霞鹜文楷 Screen（标题展示字）+ JetBrains Mono（首页时钟），正文走系统字体栈
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
│   │   ├── page-transitions.js # 页面过渡（View Transitions）
│   │   ├── custom.css        # 自定义样式（配色、动画、光标）
│   │   ├── effects.js        # 粒子（季节+天气换装）+ 鼠标光晕 + 进度条/回到顶部/灯箱
│   │   ├── weather.js        # 访客实时天气共享源（服务端定位优先/直连回退/扬州兜底三级链，时钟卡与粒子换肤共用）
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
├── posts/                   # 中文文章目录（已发布 19 篇 + 草稿 2 篇，中英镜像；列表按 frontmatter 驱动，不在此逐一罗列）
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

> 注：中文与英文目录结构必须镜像对应。草稿文章通过 `config.mts` 的 `srcExclude` 排除路由，并在 `scripts/build-rss.js` 中按 `frontmatter.draft` 二次过滤（当前哪些在草稿以各文件 frontmatter 的 `draft: true` 为准）。

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

页面特效在 `effects.js` 中实现（`index.ts` 动态导入，重特效经 `requestIdleCallback` 延后，SSR 安全）：

1. **背景渐变** — 三色径向渐变 + 15s 流动动画
2. **粒子系统（季节 + 天气换装）** — Canvas 绘制，四季花历按月份自动切换：3-4 月樱花瓣（尖端缺刻）+ 桃花混飘、6-8 月亮色荷塘背景（荷叶摇曳 + 荷花呼吸 + 蜻蜓点水 + 落英漂水 + 双圈涟漪，暗色下流萤）、10-11 月红枫（手调锯齿轮廓 + 主脉五出）+ 银杏混飘、12-2 月晴日梅花 + 冰晶明灭（实际雪天切雪花，暗色纯白 / 亮色灰蓝）、5/9 月素净微粒 + 连线；深夜（23 点后）且暗色切为星空 + 流星；访客所在地实时天气（`weather.js` 共享模块，定位三级链：同源 `/api/weather`（stats 后端 ip2region 离线库）→ 浏览器直连 ipwho/geojs → 扬州兜底，全程免授权弹窗、失败逐级静默；30 分钟自刷）覆盖季节逻辑——雨系（含雷暴）切雨丝、雪系切雪，晴/多云/雾不干预；切换主题、天气刷新或回到前台时实时重估皮肤
3. **鼠标光晕** — 500px 径向渐变跟随鼠标，blur(40px)
4. **阅读进度条 / 回到顶部** — 滚动驱动
5. **卡片 Spotlight** — 指针相对坐标写入 CSS 变量，供卡片边框追光层使用
6. **图片灯箱** — 点击文章内图片全屏查看，Esc 或点击遮罩关闭
7. **live2D 看板娘** — 桌面端（≥768px）从 CDN 动态加载 tororo 白猫模型，移动端自动关闭
8. **路由过渡** — `page-transitions.js` 用 View Transitions API 包住 SPA 导航做 cross-fade，不支持的浏览器静默跳过
9. **文章页增强** — 构建期字数与阅读时长、相关文章推荐（按标签匹配，取前 3 篇）、上下篇导航
10. **自定义 404 页** — 星空动画 + 返回按钮

移动端（< 768px）关闭粒子和光晕；`prefers-reduced-motion: reduce` 下动效整体静态化。

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

阅读时长与字数由构建期 `scripts/build-posts-meta.js` 扫描正文生成 `posts-meta.json`，`Layout.vue` 直接取值（SSG 输出即非 0），无需手动填写。

### 添加英文页面

1. 在 `docs/en/` 下创建同名 `.md` 文件
2. 在 `config.mts` 的 `en.themeConfig.nav` 中添加导航项
3. 英文文章放 `docs/en/posts/`

**注意：中英文目录结构必须镜像对应。**

## 常用命令

```bash
npm run dev                # 本地开发（predev 自动 kill 旧 :5173 进程）
npm run build              # 构建静态文件 + sitemap + 双语 RSS + SEO 注入 + 字体剔除
npm run preview            # 预览构建结果
npm run check:frontmatter  # 校验文章 frontmatter 完整性
npm run typecheck          # TypeScript 类型检查
npm run lint               # ESLint 检查（lint:fix 自动修复）
npm run og                 # 重生成 OG 图（.agents/scripts/make-og.js）
```

## 插件与构建钩子

- **sitemap** — 构建时自动生成 `sitemap.xml`（draft 页面兜底排除）
- **rss** — 自写 `scripts/build-rss.js`（替代 `vitepress-plugin-rss`），输出中英两份 `feed.rss` 与 `en/feed.rss`，并在 `buildEnd` 钩子里镜像一份到 `docs/public/`（解决 dev 模式访问 404）
- **文章元信息** — `scripts/build-posts-meta.js` 挂在 `buildStart`（dev 下监听文章增删改），扫描中英 frontmatter 与字数生成 `posts-meta.json`，供列表与阅读时长使用
- **友链动态** — `scripts/build-friends-activity.js` 在 `buildStart` 聚合友链 RSS，24h 缓存 + 失败兜底
- **SEO 注入** — `scripts/build-seo.js` 在 `buildEnd` 逐页注入 og / canonical / hreflang
- **字体剔除** — `buildEnd` 删除默认主题无条件拷出的 Inter woff2（全站零引用），同步清理各页 preload 死链
- **自建访客统计** — 替代已移除的不蒜子：`server/` 纯标准库 Python + SQLite 服务（:8787，systemd 托管），提供页面打点、点赞、热榜、搜索热词、友链动态端点，以及访客天气 `/api/weather`（ip2region 离线 IP 定位 + Open-Meteo，按城市缓存）

## 评论与敏感词

- 评论组件依赖 `@giscus/vue` 已安装，但**评论功能当前已下线**（`Layout.vue` 中 `<Comment>` 已注释，未启用）。
- `docs/.vitepress/secure-words.txt` 为**敏感词列表**，原计划用于评论过滤；因评论未上线，当前未被引用，保留备用。

## RSS 订阅

支持中英双语 RSS Feed，自动生成预览页面：

- 中文 RSS: `https://your-domain/feed.rss` 和预览页 `https://your-domain/feed.html`
- 英文 RSS: `https://your-domain/en/feed.rss` 和预览页 `https://your-domain/en/feed.html`

RSS 逻辑由 `scripts/build-rss.js` 生成，`feed.html` 为浏览器友好的订阅预览页。

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

> 统计服务如有改动，另需覆盖服务器上的 `server/stats.py` 并 `systemctl restart stats`；天气定位还需 ip2region 数据文件（详见 `server/README.md`）。
>
> 当前为手动上传部署。如需「改完一键发布」，可后续增加 `rsync` / `scp` 脚本或 CI（如 GitHub Actions），尚未实现。

### Netlify / Vercel 部署配置

`_headers` 已配置正确的 Content-Type 和缓存策略，确保 RSS 和 HTML 文件以 UTF-8 编码传输。

## 最近改进

- ✅ 粒子背景四季花历 + 实时天气换装：樱花桃花 / 荷塘 / 枫叶银杏 / 梅花冰晶 / 雪 / 雨丝 / 深夜星空流星（雨雪由访客所在地实时天气驱动——定位三级链：stats 后端 ip2region → 浏览器直连 → 扬州兜底）
- ✅ 天气链路容错加固：天气模块运行时动态加载（chunk 缺失只降级、不拖垮其他特效）；顺修 rAF 停帧监听注册失效的历史 bug（visibilityWatchers 误用数组 .add）
- ✅ 自建访客统计替代不蒜子（`server/` 纯标准库 Python + SQLite），扩展点赞、热榜、搜索热词与友链动态服务端化
- ✅ 构建期文章元信息聚合：最大 JS 640KB → 48KB，dist 7.1M → 6.5M
- ✅ 归档页重设计、Bento 首页、View Transitions 路由过渡、全局噪点
- ✅ 标签分类学收敛 47 → 12（见 `TAG-TAXONOMY.md`）
- ✅ 桌面端 live2D 看板娘（tororo 白猫）、自定义 404 页（星空动画）
- ✅ 评论功能下线，保留组件代码与敏感词表备用
