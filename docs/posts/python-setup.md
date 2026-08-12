---
title: Python 新手入门：环境搭建与第一个项目
date: 2026-08-12
tags: [Python, 新手入门, 包管理]
description: 从安装解释器到跑起第一个项目，uv/poetry/pip 三个包管理器对照，Windows/macOS/Linux 三平台覆盖。每个命令都能复制粘贴直接跑。
---

# Python 新手入门：环境搭建与第一个项目

第一次装 Python 的人会被一堆名词劝退：解释器、虚拟环境、pip、conda、uv、poetry……

这篇是**最朴素的入门**——每一步都给可复制粘贴的命令，跑通就跑通，卡了就回来看一眼。

<!-- more -->

> 所有代码块右上角都有 **复制按钮**，点一下就能粘贴到你终端。

---

## 1. 安装 Python 解释器

解释器就是"读 .py 文件并执行"的程序。装一个就够，别折腾。

### Windows

1. 打开 [python.org/downloads](https://www.python.org/downloads/)
2. 点 **Python 3.12.x** 或最新稳定版（**不要下 3.13 之前的旧版**）
3. 跑下载的 `.exe`，**关键步骤**：

   - 勾选 **Add python.exe to PATH**（这是最常被忘的一步）
   - 点 **Install Now**
4. 装完打开 PowerShell，验证：

```powershell
python --version
# 期望：Python 3.12.x
```

> 看到 3.12.x 就对了。3.11 也行，3.10 以下太老不建议。

### macOS

macOS 自带一个老的 Python 3（系统要用，**别动它**），装自己的新版：

```bash
# 推荐：用 Homebrew
brew install python@3.12

# 装完后指向 brew 版本
echo 'export PATH="/opt/homebrew/opt/python@3.12/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

python3 --version
```

### Linux

大多数发行版自带 Python 3，版本够用直接用：

```bash
python3 --version
# Ubuntu 24.04 默认 3.12，直接进下一步
```

旧版系统（Ubuntu 22.04 是 3.10）想升 3.12，加 deadsnakes PPA：

```bash
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt install python3.12 python3.12-venv
```

---

## 2. 选个包管理器

装好解释器，下一步是装第三方库。Python 有三个主流选择，**新手选 uv**。

### 为什么 uv 排第一

| 工具 | 速度 | 上手难度 | 锁文件 | 适合场景 |
|---|---|---|---|---|
| **uv** ⭐ | ⚡ 比 pip 快 10-100 倍 | 易（命令近似 pip） | 自动（`uv.lock`） | 2024+ 新项目首选 |
| poetry | 中 | 中（有自己的命令体系） | 自动（`poetry.lock`） | 已有项目、复杂依赖 |
| pip | 慢 | 最简单 | 需 `pip freeze` 手维护 | 学习/临时脚本 |

uv 是 [Astral](https://astral.sh) 用 Rust 写的，一个二进制搞定包管理 + 虚拟环境 + Python 版本管理。

### 装 uv

**Windows（PowerShell）：**

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

**macOS / Linux：**

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

验证：

```bash
uv --version
# 期望：uv 0.4.x 或更新
```

### 备选：装 poetry

如果你选了 poetry 老路线：

```bash
# 官方推荐方式（系统隔离，避免污染）
curl -sSL https://install.python-poetry.org | python3 -

# 验证
poetry --version
```

### 不装也行：直接用 pip

Python 自带 pip，能用就是慢、装多了依赖冲突。临时写脚本可以：

```bash
python -m pip install requests
```

> **结论**：能装 uv 就装 uv。下面以 uv 为例演示完整流程。

---

## 3. 第一个项目

### 用 uv 创建项目

```bash
# 进入想放项目的目录
mkdir hello-python
cd hello-python

# 一键创建项目（生成 pyproject.toml + .gitignore + 虚拟环境）
uv init

# 进入自动创建的虚拟环境
uv venv

# 激活虚拟环境（不同平台命令不同）
# macOS / Linux:
source .venv/bin/activate
# Windows PowerShell:
.venv\Scripts\Activate.ps1

# 加第一个第三方库（用 requests 测一下网络）
uv add requests
```

### 写第一个 .py 文件

在 `hello-python/` 下新建 `main.py`：

```python
import requests

def fetch_quote() -> str:
    """抓一条随机名言，返回文本"""
    resp = requests.get("https://api.quotable.io/random", timeout=5)
    resp.raise_for_status()
    data = resp.json()
    return f'"{data["content"]}" — {data["author"]}'

if __name__ == "__main__":
    print(fetch_quote())
```

### 跑

```bash
uv run python main.py
# 期望：输出一句带作者的中英文名言
```

> `uv run` 会自动激活虚拟环境再跑命令，省去手动 `source .venv/bin/activate`。

### 用 poetry 也行（对照）

```bash
poetry new hello-python
cd hello-python
poetry add requests
poetry run python main.py
```

---

## 4. 编辑器推荐：VS Code

下载 [VS Code](https://code.visualstudio.com/)，装两个插件就够：

| 插件 | 作用 |
|---|---|
| **Python** (Microsoft 官方) | 语法高亮、调试、类型检查 |
| **Pylance** | 智能补全、跳转定义 |

装完插件，VS Code 打开 `hello-python/` 文件夹，会自动识别虚拟环境（`hello-python/.venv/`）。

按 **F5** 启动调试，比 `python main.py` 直观。

---

## 5. 复制粘贴常见卡点

**Q: PowerShell 报错"无法加载脚本，因为在此系统上禁止运行脚本"**
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

**Q: `uv` 装了但 `command not found`**
关掉终端重开一次，PATH 没刷新。

**Q: `requests` 装上了但 `ImportError`**
没在虚拟环境里跑。先 `source .venv/bin/activate`（或在项目目录用 `uv run`）。

**Q: pip 和 uv 抢同一个项目**
uv 默认建独立虚拟环境（`.venv/`），pip 又在系统里装了一份——会冲突。**项目里只用其中一个**。

---

## 下一步

- 想做爬虫：从 `requests` 到 `httpx` 异步版
- 想做 Web：Flask（轻）或 FastAPI（现代异步）
- 想做数据：pandas + Jupyter Notebook
- 想做 AI/Agent：装 `openai` / `anthropic` SDK

每条都能展开成下一篇。

---

> **写代码不是为了证明什么语言更好，是选对工具做对事。**
