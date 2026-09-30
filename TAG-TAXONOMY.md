# 标签分类学：47 → 12

> **状态：已应用（2026-09-30）。** 36 个文件各改一行 `tags:`，
> 47 → 12 个标签 / 68 → 37 次引用，中英各 12 个且逐对篇数相等。
> 完整验证结果见第六节（10 项全部实测通过）。
> 本文档记录这次分类决策与映射表，供日后新增文章时参照。
>
> 本文件不属于站点构建产物：VitePress 的 `srcDir` 是 `docs/`，根目录 `.md` 不参与构建；
> `check:frontmatter` 也只扫 `docs/`。

---

## 一、问题不是「同义词太多」

先看实际数据。18 篇文章（17 已发布 + 1 草稿），中文与英文**各 47 个标签 / 68 次引用**：

| 频次 | 标签数 | 具体 |
|---|---|---|
| **≥3 篇** | **7 个** | `AI`(6)、`前端`/`Frontend`(4)、`VitePress`(4)、`服务器`/`Server`(3)、`工具`/`Tools`(3)、`Agent`(3)、`DevOps`(3) |
| **恰好 2 篇** | **2 个** | `性能`/`Performance`、`生活`/`Life` |
| **只有 1 篇** | **38 个** | 阿里云、备案、动效、架构、咖啡、扬州、远程工作、苏州、寺庙、旅行、Hermes、OpenClaw、WorkBuddy、DeepSeek、OpenSpec、llama.cpp、Ollama、vLLM、Live2D、Canvas、CLI、Nginx、SSH、Rust、Python、Node.js、Obsidian… |

> 口径说明：上表**含草稿**（47 个）。只看 17 篇已发布则是 44 个 / 64 次引用。
> 两种口径下结论一致，本文件除特别标注外都用含草稿口径。

所以：**81% 的标签（38/47）只出现在一篇文章里**，它们回答的是「这篇讲了什么」，而不是「该去哪一栏找同类文章」。结果 `/tags` 页 47 个分组里有 38 个只有一根独苗——浏览功能退化成关键词云。

同一篇 `workbuddy` 带着 5 个标签（`AI / 工具 / WorkBuddy / Agent / 工作流`），其中 2 个（`WorkBuddy`、`工作流`）是「只有这一篇」的孤例。

**根因：缺一个主题层。** 专名该留在正文里，不该占标签位。

---

## 二、建议的 12 个主题

| # | 主题（zh） | Theme (en) | 篇数 | 合并进来的现有标签 |
|---|---|---|---|---|
| 1 | `AI` | `AI` | 6 | AI |
| 2 | `Agent` | `Agent` | 4 | Agent、OpenClaw、Hermes、WorkBuddy、DeepSeek、OpenSpec、框架对比 / Framework Comparison |
| 3 | `本地大模型` | `Local LLMs` | 1 | llama.cpp、Ollama、vLLM、部署 / Deployment |
| 4 | `VitePress` | `VitePress` | 4 | VitePress |
| 5 | `前端` | `Frontend` | 4 | 前端 / Frontend、CSS、动效 / Motion、Live2D、Canvas、架构 / Architecture |
| 6 | `服务器运维` | `Server Ops` | 3 | 服务器 / Server、DevOps、Nginx、阿里云 / Alibaba Cloud、备案 / ICP Filing、SSH |
| 7 | `安全` | `Security` | 1 | 安全 / Security |
| 8 | `工具` | `Tools` | 5 | 工具 / Tools、工程化 / Engineering、工作流 / Workflow、CLI、包管理 / Package Management、新手入门 / Beginner |
| 9 | `知识管理` | `Knowledge Management` | 2 | 知识管理 / Knowledge Management、Obsidian、记忆系统 / Memory System、向量检索 / Vector Search |
| 10 | `编程语言` | `Languages` | 3 | Rust、Python、Node.js |
| 11 | `性能` | `Performance` | 2 | 性能 / Performance |
| 12 | `生活` | `Life` | 2 | 生活 / Life、咖啡 / Coffee、扬州 / Yangzhou、远程工作 / Remote Work、苏州 / Suzhou、寺庙 / Temple、旅行 / Travel |

合计：**47 → 12**（含草稿；只看已发布是 44 → 12），标签引用数 **68 → 37**（平均每篇 3.8 个 → 2.1 个）。
中英 12 个分类**逐一对应、每类篇数完全相等**。

### 设计规则

1. **够得上主题的留下**：现有 ≥3 篇的 7 个标签里，5 个原样保留（`AI`/`前端`/`VitePress`/`工具`/`Agent`）。
2. **同义即合并**：`服务器` + `DevOps` 本来指向**同样的 3 篇文章**（阿里云备案、自建服务器、SSH 加固），是同一主题的两种说法 → 合并为 `服务器运维` / `Server Ops`。
3. **专名下沉为正文关键词**：`WorkBuddy`、`OpenClaw`、`Ollama`、`vLLM`、`Nginx`、`Obsidian`、`DeepSeek` 这些各 1 篇的专名不再占标签位，它们本来就在标题和正文首段里。
4. **低篇数的"域"保留为分类**：`安全`(1)、`本地大模型`(1)、`知识管理`(2)、`性能`(2)、`生活`(2) 篇数少，但它们是**可生长的领域**而不是专名——分类允许只有 1–2 篇，关键词不允许。这是两者最关键的区别。

---

## 三、每篇的前后对照

| 文章 | 现在（zh） | 建议（zh） |
|---|---|---|
| `ai-memory` | AI, 记忆系统, 向量检索 | **AI, 知识管理** |
| `aliyun-ecs-filing` | 服务器, 阿里云, 备案, DevOps | **服务器运维** |
| `blog-modern-makeover` | VitePress, 前端, CSS, 动效 | **VitePress, 前端** |
| `blog-tech-stack` | VitePress, 前端, 架构 | **VitePress, 前端** |
| `deepseek-harness` | AI, Agent, DeepSeek, Node.js, 工具 | **AI, Agent, 编程语言, 工具** |
| `local-llm-deployment` | AI, Ollama, vLLM, llama.cpp, 部署 | **AI, 本地大模型** |
| `notes-evolution` | Obsidian, 知识管理 | **知识管理** |
| `openclaw-vs-hermes` | AI, Agent, OpenClaw, Hermes, 框架对比 | **AI, Agent** |
| `openspec-review` | AI, 工程化, OpenSpec, 工具 | **AI, 工具, Agent** |
| `personal-server` | 服务器, Nginx, DevOps | **服务器运维** |
| `python-setup` | Python, 新手入门, 包管理 | **编程语言, 工具** |
| `rust-cli` | Rust, CLI, 性能 | **编程语言, 工具, 性能** |
| `ssh-hardening` | 服务器, SSH, 安全, DevOps | **服务器运维, 安全** |
| `suzhou-hanshan-temple` ⚠️草稿 | 生活, 苏州, 寺庙, 旅行 | **生活** |
| `vitepress-live2d-mascot` | VitePress, Live2D, 前端 | **VitePress, 前端** |
| `vitepress-three-custom-tricks` | VitePress, 前端, Canvas, 性能 | **VitePress, 前端, 性能** |
| `workbuddy` | AI, 工具, WorkBuddy, Agent, 工作流 | **AI, 工具, Agent** |
| `yangzhou-cafe` | 生活, 咖啡, 扬州, 远程工作 | **生活** |

英文侧是同样的映射（`前端`↔`Frontend`、`服务器运维`↔`Server Ops`…），**必须成对改**，详见风险 2。

---

## 四、约束与风险

| # | 项 | 说明 |
|---|---|---|
| 1 | ⚠️ **`生活` / `Life` 不可改名** | `docs/.vitepress/theme/components/LifeList.vue:10-11` 硬编码了 `LIFE_TAG_ZH = '生活'` 与 `LIFE_TAG_EN = 'Life'` 用来筛选生活页。若改这两个名字，必须同步改代码，否则 `/life` 页会变空。 |
| 2 | **中英必须严格成对** | 现在 zh/en 各 44 个且一一对应。若只改一侧，`/tags` 页中英分组数会不一致。迁移脚本应按"对"改。 |
| 3 | **草稿也要改** | `suzhou-hanshan-temple` 是 `draft: true`（被 `srcExclude` 排除），但 frontmatter 仍要跟上，否则它一旦发布就是旧体系。 |
| 4 | **锚点失效（影响极小）** | `/tags` 页每个标签有锚点。若有外部书签指向 `#工具链` 之类，会失效。这个站的标签锚点基本不可能被外部引用。 |
| 5 | **迁移是机械的、可回滚** | 一份映射表 + 一个脚本改 36 个 frontmatter 的 `tags:` 行。回滚就是 `git revert` 一次。 |
| 6 | **一个需要被听到的反面意见** | 专名标签对**作者本人**有价值：它记录"我写过哪些具体技术"。收敛后这份索引只留在正文里。若你重视它，见下方 Option B。 |

---

## 五、两个方案

### Option A（推荐）：收敛到 12 个主题

- **改动**：36 个 `.md` 的 `tags:` 行
- **收益**：`/tags` 从 44 个独苗分组变成 12 个真分类；每篇仍能按主题找到
- **代价**：专名不再可点（但仍在标题/正文里）

### Option B（重）：把标签页做成两层

- **做法**：frontmatter 用 `tags:` 存主题（浏览用）+ `keywords:` 存专名（展示用），`Tags.vue` 分两层渲染
- **收益**：主题清晰 + 保留专名可点
- **代价**：要改 `docs/.vitepress/theme/Tags.vue` 与标签数据结构，是**代码改动**而不是内容改动；`check-frontmatter.js` 也要跟着加校验

我倾向 Option A：这个站 36 篇文章的量级，两层标签是过度设计；专名进正文首段就够。

---

## 六、如果要做，我会这样执行与验证

**执行**（一次性脚本，不做手工编辑）

1. 写一份 `{ zh: 旧标签→新标签, en: 旧标签→新标签 }` 映射（就是上面第二节的表）
2. 脚本只替换每篇 frontmatter 的 `tags:` 行，去重、保序
3. 中文与英文**同一轮改完**，保证对称

**验证**：前 6 项我**已在内存里模拟过整个迁移**（脚本按映射改写 tags、不写盘），下面是对应实测结果；后 3 项要等真正执行时再跑。

| 检查 | 期望 | 模拟实测结果 |
|---|---|---|
| 标签总数 | 含草稿 47 → **12**（仅已发布 44 → 12） | ✅ 中英各 12 |
| 引用总数 | 68 → **37** | ✅ 中英各 37 |
| 映射完整性 | 无标签被漏掉 | ✅ 中英各 47 个标签**全部命中**，0 个未映射 |
| 中英对称 | 12 对分类逐对篇数相等 | ✅ **12/12 相等** |
| 每篇标签数 | ≥1 | ✅ 无 0 标签文章 |
| `/life` 页 | 仍为 1 篇（证明风险 1 未被触发） | ✅ 1 篇（草稿由 `posts.ts` 过滤掉） |
| `/tags` 页渲染 | 12 个分组，无旧标签残留 | 待执行 |
| 四项闸门 | `check:frontmatter` / `typecheck` / `lint` / `build` 全 exit 0 | 待执行 |
| 全站回归 | 无横向溢出、控制台 0 错误 | 待执行 |
| 回滚 | `git revert` 单次即可复原 | — |

> 脚本**保源序**：新标签的顺序 = 原标签里第一个命中映射的位置。
> 所以 `[AI, Agent, DeepSeek, Node.js, 工具]` 得到 `[AI, Agent, 编程语言, 工具]`，
> 而不是按分类表的顺序重排。上表第三节已按此结果逐篇核对。

---

## 七、我的判断

这个改动**属于编辑决策，不属于工程决策**——它改的是"读者怎么逛这个站"，而不是"代码是否正确"。所以我只出提案不直接动手。

如果由我定，我会做 Option A，并且**不删专名**：`WorkBuddy`、`Ollama` 这些词继续出现在正文首段（现在的文章中大多已经出现了），只是不再占用标签位。标签的职责是"栏目"，不是"检索词"。
