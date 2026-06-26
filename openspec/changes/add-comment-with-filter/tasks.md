## 1. Giscus 配置

- [x] 1.1 去 https://giscus.app/ 生成配置（选仓库、分类、获取 repoId 和 categoryId）
- [x] 1.2 在 GitHub 仓库 Settings → Discussions → Content reports 配置屏蔽词
- [x] 1.3 将 giscus.app 生成的配置填入 `Comment.vue` 的 `giscusConfig`

## 2. 前端依赖安装

- [x] 2.1 安装 `@giscus/vue` 依赖

## 3. Comment 组件开发

- [x] 3.1 创建 `docs/.vitepress/theme/components/Comment.vue` 组件
- [x] 3.2 组件内引入 Giscus，配置 repo/主题/语言
- [x] 3.3 添加评论区样式（与博客主题风格一致）
- [x] 3.4 在 `Layout.vue` 的 `#doc-after` 插槽中引入 Comment 组件（仅文章页显示）

## 4. 敏感词配置

- [x] 4.1 在 Comment.vue 中预留客户端敏感词过滤数组
- [x] 4.2 在 GitHub 仓库 Settings 中配置 Discussions 屏蔽词

## 5. 验证与测试

- [x] 5.1 本地运行 `npm run dev`，验证文章页评论区正常显示
- [x] 5.2 测试评论提交、GitHub 登录
- [x] 5.3 测试非文章页不显示评论区
- [x] 5.4 测试敏感词过滤（提交含屏蔽词的评论，验证被拦截）
- [x] 5.5 构建验证（`npm run build` 无报错）
