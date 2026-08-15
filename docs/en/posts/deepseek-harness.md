---
title: "DeepSeek Harness: Installing the All-Plugins Agent Framework"
date: 2026-08-14
tags: [AI, Agent, DeepSeek, Node.js, Tooling]
description: "DeepSeek Harness is an open-source Agent runtime where every capability is a plugin. This guide covers Node.js setup and two ways to install the Agent (npx one-liner vs. source clone)."
---

# DeepSeek Harness: Installing the All-Plugins Agent Framework

DeepSeek open-sourced **Harness** in August 2026 — an Agent runtime that decomposes every capability into a swappable plugin. The official definition is one line:

> **Agent = Model + Harness**

The model is the soul; Harness is what gives it the ability to *understand the environment, use tools, and keep going in real scenarios*. That sounds abstract, but it solves one concrete problem: **how to stop Agent frameworks from being a ball of coupled code**.

This article is short on philosophy, long on commands. Two things only:

1. How to install Node.js (Harness is a Node app; nothing else matters if this fails)
2. How to install DeepSeek Harness (two ways: `npx` one-liner vs. source clone)

<!-- more -->

## What DeepSeek Harness Actually Is

The [deepseek.com/harness](https://www.deepseek.com/harness/) page puts it bluntly:

> Models, tools, skills, sessions, sandbox, storage, loops, scheduling, UI — every Agent capability is composed by plugins, freely replaceable and recombinable.

In engineering terms: **the Agent is no longer a fixed Python package; it's a runtime orchestration of plugins.**

Three design principles worth memorizing:

| Principle | Meaning |
|---|---|
| Everything is a plugin | Model, tools, skills, UI — none are hard-coded as "core" |
| Every run is traceable | Everything the LLM sees/produces is written to an append-only session log; replay and fork work |
| Multiple run modes | Standard / PTC / Minimal / Creative — switch by scenario

The lowest layer is a plugin kernel called **Cordis** ([github.com/cordiverse/cordis](https://github.com/cordiverse/cordis)). It only handles plugin load/unload and dependency resolution — **no concrete capabilities of its own**. Every capability comes from a plugin you install and a config you write.

This is also the biggest difference from LangChain, Agno, CrewAI: **those frameworks ship a full default toolkit; DeepSeek Harness ships an empty scaffold — you assemble everything yourself**.

---

## Step 1: Install Node.js

DeepSeek Harness is a Node app, requires Node 18+. Skip this section if `node -v` already prints 18+.

### Windows

Easiest path: [nvm-windows](https://github.com/coreybutler/nvm-windows).

```powershell
# Install nvm-windows (download nvm-setup.exe)
# https://github.com/coreybutler/nvm-windows/releases

# Install latest LTS
nvm install lts
nvm use lts

# Verify
node -v   # v22.x or newer
npm -v
```

Without nvm, just use the official installer:

1. Open https://nodejs.org/
2. Download Windows Installer (.msi), LTS version
3. Double-click to install, **check "Add to PATH"**
4. Restart your terminal, run `node -v` to verify

### macOS

```bash
# Option 1: official pkg (most stable)
# Open https://nodejs.org/ and download the macOS Installer (.pkg)

# Option 2: Homebrew
brew install node

# Option 3: nvm (recommended if you juggle versions)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install --lts
nvm use --lts

node -v
```

### Linux

```bash
# Debian/Ubuntu via NodeSource repo
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Or use nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install --lts
nvm use --lts

node -v
```

**Verification checklist:**

```bash
node -v      # >= v18, LTS v20/v22 recommended
npm -v       # >= 9
npx --version
```

If all three print versions, Node is done.

---

## Step 2: Install DeepSeek Harness

Two routes, pick based on intent.

### Option 1: npx one-liner (recommended for trying it)

No clone needed. One command starts the Web UI:

```bash
npx @deepseek-ai/dsh web
```

`npx` downloads `@deepseek-ai/dsh` to a temp directory, installs deps, and starts the server. First run downloads ~tens of MB and takes 1–2 minutes.

The server listens on localhost; the browser opens the Web UI automatically. First launch will ask for an API key (DeepSeek or any OpenAI-compatible endpoint works).

**Pros**: Zero residue — even `rm -rf` won't leave junk.

**Cons**: Re-downloads the package each launch; modifying source or installing community plugins is awkward.

### Option 2: Source clone (when you need to hack or install plugins)

```bash
git clone https://github.com/deepseek-ai/deepseek-harness
cd deepseek-harness

# Follow the repo README for deps and startup
npm install
npm run dev   # or whatever the repo's start script is
```

Source install is for when you want to:

- Read/modify the Harness kernel
- Install [community plugins](https://github.com/topics/dsh-plugin) (repos tagged `dsh-plugin`)
- Contribute to the Cordis kernel
- Customize run modes (use "Creative mode" to author presets)

For exact steps, follow the repo README — Harness is still in **developer preview** as of August 2026, so APIs and directory layout may shift.

---

## What You Get: Four Run Modes

After install, the Web UI prompts for a mode. This is one of Harness's core abstractions:

| Mode | Toolset | Use case |
|---|---|---|
| **Standard** | Full toolkit (file edit, Shell, file/web search, Skills, planning, goals, sub-agents, workflows) | Day-to-day coding Agent |
| **PTC** | All of Standard + Code Mode SDK (model writes a TypeScript program to chain multi-step ops) | Complex multi-step tasks — model writes code instead of repeated tool calls |
| **Minimal** | Only `bash` + `str_replace_editor` | Model capability benchmarks, minimum variables |
| **Creative** | All of Standard + runtime inspection + plugin experimentation + preset authoring guidance | Building custom Agent presets |

**How to choose:**

- First time → **Standard**
- Benchmarking different models → **Minimal**
- Building your own Agent preset (e.g. "RAG-only customer support Agent") → **Creative**
- Multi-step tasks that benefit from model-side orchestration → **PTC**

---

## Comparison with Other Agent Tools (Brief)

A quick side-by-side of DeepSeek Harness and three other Agent tools I've worked with recently:

| Tool | Core idea | Learning curve | Best for |
|---|---|---|---|
| **Claude Code** | Terminal-native CLI + MCP extension | Low (works out of the box) | Individual devs doing day-to-day coding tasks |
| **OpenClaw** | Plugin-driven orchestration, strong on external API/system integration | Medium | Plugging AI into existing SaaS or internal systems |
| **Hermes Agent** | Self-reflective learner, long-term memory + decision accumulation | Medium-high | Scenarios where AI needs to understand your business over time |
| **DeepSeek Harness** | Everything is a plugin + config-layer composition | **High** (need to grok the plugin system) | Developers who want to deeply customize Agents |

These four don't overlap much — they're more like divisions of labor:

- **Claude Code** — strongest solo operator. Zero config to write code, read files, run commands. Capability boundary = model + MCP servers; no plugin ecosystem to manage
- **OpenClaw** — strongest team/system integration. Rich plugins for CRM/ERP/internal APIs, but you own the permission surface
- **Hermes** — strongest long-term strategy accumulation. Gets smarter the more you use it; great for risk-control/advising where remembering *why* a decision was made matters
- **DeepSeek Harness** — strongest foundational framework. **Not meant to be used directly** — it's for *building* Agents. Every capability is visible and replaceable

DeepSeek Harness's bar is **noticeably the highest** — you need to read Cordis docs, configure plugins, understand the event stream. The payoff: **no nested abstractions; every capability sits in a config file**. If you just want an Agent that gets work done, the first three are far easier. If you want to *build* an Agent, those three all require you to reinvent some layer.

---

## References

- Official site: [deepseek.com/harness/](https://www.deepseek.com/harness/)
- GitHub: [github.com/deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)
- Developer docs: [deepseek-harness.github.io/deepseek-harness/guide/quickstart](https://deepseek-harness.github.io/deepseek-harness/guide/quickstart)
- Cordis kernel: [github.com/cordiverse/cordis](https://github.com/cordiverse/cordis)
- Cordis paper: [github.com/cordiverse/paper](https://github.com/cordiverse/paper)
- Community plugins: [github.com/topics/dsh-plugin](https://github.com/topics/dsh-plugin)

**Note**: DeepSeek Harness is currently in developer preview; core plugins and base APIs are still iterating. This article was written in August 2026; defer to the official repo README for the latest commands and details.