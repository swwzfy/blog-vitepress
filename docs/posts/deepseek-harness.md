---
title: DeepSeek Harness：一切皆插件的 Agent 框架怎么装
date: 2026-08-14
tags: [AI, Agent, DeepSeek, Node.js, 工具链]
description: DeepSeek Harness 是 DeepSeek 开源的 Agent 运行框架，核心思路是「一切皆插件」。本文覆盖 Node.js 安装与两种 Agent 安装方式（npx 一键启动 + 源码克隆）。
---

# DeepSeek Harness：一切皆插件的 Agent 框架怎么装

DeepSeek 在 2026 年 8 月开源了 **Harness**——一个把 Agent 拆成可插拔组件的运行框架。官方给的核心公式只有一行：

> **Agent = Model + Harness**

模型是灵魂，Harness 负责让模型「理解环境、使用工具，并在真实场景里持续工作」。听起来虚，但落地上它解决了一个具体问题：**怎么让 Agent 框架不再是一坨耦合的代码**。

本文不讲花活，只讲两件事：

1. Node.js 怎么装（Harness 是 Node 应用，跑不起来一切免谈）
2. DeepSeek Harness 怎么装（两种方式：npx 一键 vs. 源码）

<!-- more -->

## 先说 DeepSeek Harness 是什么

官方页面 [deepseek.com/harness](https://www.deepseek.com/harness/) 给的定义很直白：

> 模型、工具、技能、会话、沙箱、存储、循环、调度、UI 等所有 Agent 能力均由插件组合而成，可以自由替换和灵活重组。

翻译成工程语言：**Agent 不再是一个写死的 Python 包，而是一组插件的运行时编排**。

三个设计原则值得记：

| 原则 | 含义 |
|---|---|
| 一切皆插件 | 模型、工具、技能、UI 都是插件，没有一个是「核心」写死的 |
| 运行有迹可循 | 所有 LLM 看到/产生的内容都进追加式会话日志，可回放可分叉 |
| 多种运行模式 | 标准 / PTC / 极简 / 创造 四种预设，按场景切换 |

最底层是一个叫 **Cordis** 的插件内核（[github.com/cordiverse/cordis](https://github.com/cordiverse/cordis)），只负责插件的加载、卸载和依赖关系，**不承载任何具体能力**。所有能力都得你自己装插件、自己写配置。

这也是它和 LangChain、Agno、CrewAI 这类框架最大的区别——**那些框架给你一套默认全家桶，DeepSeek Harness 给你一个空架子，所有部件都得自己拼**。

---

## 第一步：装 Node.js

DeepSeek Harness 是 Node 应用，依赖 Node 18+。如果你已经有 `node -v` 能跑出 18 以上，这段可以跳过。

### Windows

最省事的方式是用 [nvm-windows](https://github.com/coreybutler/nvm-windows)：

```powershell
# 安装 nvm-windows（下载 nvm-setup.exe）
# https://github.com/coreybutler/nvm-windows/releases

# 装最新 LTS
nvm install lts
nvm use lts

# 验证
node -v   # v22.x 或更新
npm -v
```

不用 nvm 也可以直接装 LTS：

1. 打开 https://nodejs.org/
2. 下载 Windows Installer (.msi) LTS 版本
3. 双击安装，**勾选 "Add to PATH"**
4. 重开终端，`node -v` 验证

### macOS

```bash
# 方式一：官方 pkg（最稳）
# 打开 https://nodejs.org/ 下载 macOS Installer (.pkg)

# 方式二：Homebrew
brew install node

# 方式三：nvm（推荐，要管理多版本时）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install --lts
nvm use --lts

node -v
```

### Linux

```bash
# Debian/Ubuntu 用 NodeSource 仓库
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# 或者用 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install --lts
nvm use --lts

node -v
```

**验证清单：**

```bash
node -v      # >= v18，推荐 v20/v22 LTS
npm -v       # >= 9
npx --version
```

三个都有版本号，Node 这块就 OK 了。

---

## 第二步：装 DeepSeek Harness

两种方式，按需选。

### 方式一：npx 一键启动（推荐试水）

不需要 clone 任何东西，一行命令直接拉起 Web UI：

```bash
npx @deepseek-ai/dsh web
```

`npx` 会自动下载 `@deepseek-ai/dsh` 包到临时目录、装依赖、起服务。首次运行会下载几十 MB，耐心等一两分钟。

跑起来之后默认监听本地端口，浏览器会自动打开 Web UI。第一次会让你配 API Key（DeepSeek 或其他兼容 OpenAI 协议的 endpoint 都行）。

**优点**：零残留，不想用 `rm -rf` 都不会留垃圾。

**缺点**：每次启动要重新拉包；想改源码/装社区插件不方便。

### 方式二：源码克隆（要魔改/装插件时用）

```bash
git clone https://github.com/deepseek-ai/deepseek-harness
cd deepseek-harness

# 按仓库 README 装依赖并启动
npm install
npm run dev   # 或仓库里写的启动脚本
```

源码安装的用途是：

- 阅读/修改 Harness 内核
- 装[社区插件](https://github.com/topics/dsh-plugin)（带 `dsh-plugin` topic 的仓库）
- 给 Cordis 内核贡献代码
- 自定义运行模式（在「创造模式」里做 preset）

具体步骤以仓库 README 为准——Harness 还在**开发者预览版**（截止 2026 年 8 月），API 和目录结构可能还会调整。

---

## 装完能干啥：四种运行模式

装好后 Web UI 里会让你选模式，这是 DeepSeek Harness 的核心抽象之一：

| 模式 | 工具集 | 用途 |
|---|---|---|
| **标准模式** | 完整工具链（文件编辑、Shell、文件检索、网页检索、Skills、计划、目标、子代理、工作流） | 日常编码 Agent |
| **PTC 模式** | 标准模式全部 + Code Mode SDK（用 TypeScript 程序组合多步操作） | 复杂多步任务，模型写代码代替反复工具调用 |
| **极简模式** | 仅 bash + str_replace_editor 两个工具 | 模型能力基准测试，最小变量 |
| **创造模式** | 标准模式全部 + 运行时检查 + 插件实验 + preset 创作指导 | 自定义 Agent preset |

**怎么选**：

- 第一次用 → **标准模式**
- 跑基准测试对比不同模型 → **极简模式**
- 想自己攒一套 Agent（比如「只用 RAG 不写代码」的客服 Agent）→ **创造模式**
- 任务多步且需要模型自己编排 → **PTC 模式**

---

## 和其他 Agent 工具的对比（简评）

把 DeepSeek Harness 和最近接触较多的几个 Agent 工具摆一起看：

| 工具 | 核心思路 | 学习曲线 | 适合谁 |
|---|---|---|---|
| **Claude Code** | 终端原生 CLI + MCP 扩展 | 低（开箱即用） | 个人开发者的日常编码任务 |
| **OpenClaw** | 插件化调度，强在对接外部 API/系统 | 中 | 想把 AI 塞进现有 SaaS/内部系统 |
| **Hermes Agent** | 自省学习型，长期记忆 + 决策沉淀 | 中高 | 业务需要 AI 越用越懂你的场景 |
| **DeepSeek Harness** | 一切皆插件 + 配置层组合 | **高**（要懂插件系统） | 想深度定制 Agent 的开发者 |

四个工具定位**不重叠**，更像分工：

- **Claude Code** — 单兵作战最强，零配置就能写代码、读文件、跑命令。能力边界 = 模型能力 + MCP server，不搞插件生态
- **OpenClaw** — 团队/系统集成强，插件丰富适合接 CRM/ERP/内部 API，但权限管理要自己兜底
- **Hermes** — 长期策略沉淀强，越用越聪明，适合风控/投顾这种要 AI 记住「上次为什么这么选」
- **DeepSeek Harness** — 底层框架最强，**不是直接拿来用的**，是用来搭 Agent 的——所有能力都看得见、换得了

DeepSeek Harness 的门槛**明显最高**——你得愿意读 Cordis 文档、配插件、理解事件流。回报是：**没有一层套一层的抽象，能力来源都在配置里**。如果只是想跑 Agent 干活，前三个更省心；如果想造 Agent，前面三条路都得重新搭一套。

---

## 参考

- 官网：[deepseek.com/harness/](https://www.deepseek.com/harness/)
- GitHub：[github.com/deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)
- 开发者文档：[deepseek-harness.github.io/deepseek-harness/guide/quickstart](https://deepseek-harness.github.io/deepseek-harness/guide/quickstart)
- Cordis 内核：[github.com/cordiverse/cordis](https://github.com/cordiverse/cordis)
- Cordis 论文：[github.com/cordiverse/paper](https://github.com/cordiverse/paper)
- 社区插件：[github.com/topics/dsh-plugin](https://github.com/topics/dsh-plugin)

**注意**：DeepSeek Harness 当前为开发者预览版，核心插件和基础 API 仍在迭代。本文写于 2026 年 8 月，命令和细节以官方仓库 README 为准。