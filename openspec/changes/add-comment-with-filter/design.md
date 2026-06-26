## Context

VitePress 静态博客，当前无评论功能。博客部署在 Vercel，使用 Vue 3 自定义主题。文章页通过 `Layout.vue` 的 `#doc-after` 插槽扩展内容区域。

Waline 是一款开源评论系统，支持 Markdown、Emoji、图片上传，内置敏感词过滤和评论管理后台。

## Goals / Non-Goals

**Goals:**
- 在每篇文章底部展示评论区
- 支持敏感词过滤（Waline 内置 + 自定义词库）
- 评论数据持久化（LeanCloud/数据库）
- 提供管理后台审核评论

**Non-Goals:**
- 不实现用户注册/登录系统（Waline 支持匿名评论 + 可选登录）
- 不做实时通知（邮件/Webhook 后续可选）
- 不自建后端，使用 Vercel 部署 Waline

## Decisions

### 1. 评论系统选型：Waline

**选择**: Waline
**理由**:
- 内置敏感词过滤（`SECURE_WORDS` 环境变量）
- 支持 Vercel 一键部署，与博客同平台
- 提供管理后台（评论审核、用户管理）
- 前端 `@waline/client` 体积小，支持 Vue 组件式集成
- 支持匿名评论，降低用户门槛

**备选方案**:
- Giscus：基于 GitHub Discussions，免费但敏感词过滤需额外实现
- Twikoo：轻量但管理后台功能较弱

### 2. 后端部署：Vercel + LeanCloud

**选择**: Vercel 部署 Waline 服务端，LeanCloud 作为数据库
**理由**:
- 博客已在 Vercel，同平台管理简单
- LeanCloud 免费额度足够个人博客使用
- Waline 官方文档有完整的 Vercel + LeanCloud 教程

### 3. 前端集成方式：Vue 组件 + VitePress 插槽

**选择**: 创建 `Comment.vue` 组件，通过 `Layout.vue` 的 `#doc-after` 插槽引入
**理由**:
- 与现有主题架构一致（参考 `RelatedPosts` 的集成方式）
- 仅在文章页显示（通过 `isArticle` 判断）
- 组件化便于维护和样式隔离

### 4. 敏感词过滤策略

**选择**: Waline `SECURE_WORDS` + 自定义敏感词文件
**理由**:
- Waline 后端原生支持 `SECURE_WORDS` 环境变量
- 可维护一个敏感词文件，部署时注入环境变量
- 命中敏感词的评论自动进入待审核状态，不会直接显示

## Risks / Trade-offs

- **[LeanCloud 免费额度限制]** → 个人博客流量小，免费额度够用；超出时升级或切换数据库
- **[Waline 服务可用性]** → Vercel 部署稳定性高；设置自定义域名提升可靠性
- **[敏感词覆盖不全]** → 定期更新敏感词库；结合人工审核兜底
- **[匿名评论垃圾信息]** → 开启评论频率限制 + 关键词过滤 + 人工审核
