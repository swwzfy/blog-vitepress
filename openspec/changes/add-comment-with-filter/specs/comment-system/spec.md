## ADDED Requirements

### Requirement: 文章页显示评论区
每篇文章底部 SHALL 显示 Waline 评论组件，读者可查看和发表评论。

#### Scenario: 文章页加载评论
- **WHEN** 读者访问任意文章页
- **THEN** 页面底部显示评论区，包含评论列表和发表评论的输入框

#### Scenario: 非文章页不显示评论
- **WHEN** 读者访问首页、标签页、关于页等非文章页面
- **THEN** 不显示评论区

### Requirement: 评论数据持久化
评论数据 SHALL 通过 Waline 后端持久化存储，支持跨会话保留。

#### Scenario: 评论提交成功
- **WHEN** 读者填写昵称、邮箱（可选）和评论内容后点击提交
- **THEN** 评论保存到数据库，刷新后仍可见

#### Scenario: 评论显示已有的评论
- **WHEN** 读者打开已有评论的文章
- **THEN** 按时间倒序显示所有已审核通过的评论

### Requirement: 评论支持 Markdown 语法
评论输入框 SHALL 支持 Markdown 语法渲染。

#### Scenario: Markdown 评论渲染
- **WHEN** 读者输入包含 Markdown 语法的评论（如加粗、链接）
- **THEN** 评论显示时正确渲染 Markdown 格式

### Requirement: 评论管理后台
作者 SHALL 通过 Waline 管理后台审核、删除、管理评论。

#### Scenario: 管理员审核评论
- **WHEN** 作者登录 Waline 管理后台
- **THEN** 可查看待审核评论列表，执行通过、删除、编辑操作

#### Scenario: 评论状态管理
- **WHEN** 新评论提交
- **THEN** 默认进入待审核状态，管理员审核后才对公众可见
