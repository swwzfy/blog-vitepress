## Why

博客目前没有评论功能，读者无法与作者互动。需要添加评论系统，并支持敏感词过滤，防止不当内容出现。

## What Changes

- 集成 Waline 评论系统（自托管后端 + 前端组件）
- 在文章详情页底部显示评论区
- 配置敏感词过滤（Waline 内置支持 + 自定义敏感词库）
- 添加 Waline 前端依赖（`@waline/client`）
- 部署 Waline 后端服务（Vercel/LeanCloud）

## Capabilities

### New Capabilities

- `comment-system`: 评论功能 — Waline 前端集成、文章页评论区展示、评论管理
- `content-filter`: 敏感词过滤 — Waline 后端敏感词配置、自定义敏感词库、违规内容拦截

### Modified Capabilities

（无现有 capability 需修改）

## Impact

- **前端**: 新增 `Comment.vue` 组件，修改 `Layout.vue` 在 `#doc-after` 插槽中引入
- **依赖**: 新增 `@waline/client` 包
- **后端**: 需要部署 Waline 服务（推荐 Vercel + LeanCloud）
- **配置**: `.vitepress/config.mts` 中添加 Waline 服务地址配置
- **构建**: 无影响，纯前端组件 + 外部服务
