---
title: "Python Beginner's Guide: Environment Setup & First Project"
date: 2026-08-12
tags: [Python, Beginner, Package Management]
description: "From installing the interpreter to running your first project. Compares uv, poetry, and pip. Covers Windows, macOS, and Linux. Every command is copy-paste ready."
---

# Python Beginner's Guide: Environment Setup & First Project

First-time Python installation gets intimidating: interpreter, virtual env, pip, conda, uv, poetry...

This is the **plainest possible intro** — every step gives you commands you can copy and paste. If they work, they work; if not, come back and re-read.

<!-- more -->

> Every code block has a **Copy button** in the top-right corner. One click and it's on your clipboard.

---

## 1. Install the Python Interpreter

The interpreter is the program that reads `.py` files and runs them. Install one and move on.

### Windows

1. Open [python.org/downloads](https://www.python.org/downloads/)
2. Click **Python 3.12.x** or the latest stable release (don't grab anything older than 3.11)
3. Run the downloaded `.exe`. The **critical step**:

   - Check **Add python.exe to PATH** (this is the one most people forget)
   - Click **Install Now**
4. Open PowerShell and verify:

```powershell
python --version
# Expected: Python 3.12.x
```

> Seeing 3.12.x means you're good. 3.11 is also fine; anything below 3.10 is too old.

### macOS

macOS ships an old Python 3 that the system relies on — **don't touch it**. Install your own newer version:

```bash
# Recommended: use Homebrew
brew install python@3.12

# Point the new version to the front of PATH
echo 'export PATH="/opt/homebrew/opt/python@3.12/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

python3 --version
```

### Linux

Most distros ship a recent enough Python 3:

```bash
python3 --version
# Ubuntu 24.04 defaults to 3.12 — move on.
```

On older systems (Ubuntu 22.04 has 3.10), grab 3.12 from the deadsnakes PPA:

```bash
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt install python3.12 python3.12-venv
```

---

## 2. Pick a Package Manager

With an interpreter installed, the next step is installing third-party libraries. Python has three mainstream choices — **beginners, pick uv**.

### Why uv Comes First

| Tool | Speed | Learning Curve | Lockfile | Best For |
|---|---|---|---|---|
| **uv** ⭐ | ⚡ 10–100× faster than pip | Easy (commands resemble pip) | Automatic (`uv.lock`) | New projects from 2024+ |
| poetry | Medium | Medium (its own command grammar) | Automatic (`poetry.lock`) | Existing projects, complex deps |
| pip | Slow | Simplest | Manual (`pip freeze`) | Learning, throwaway scripts |

uv is written in Rust by [Astral](https://astral.sh). One binary handles package management, virtual environments, and even Python version management.

### Install uv

**Windows (PowerShell):**

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

**macOS / Linux:**

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Verify:

```bash
uv --version
# Expected: uv 0.4.x or newer
```

### Alternative: Install poetry

If you go down the poetry road:

```bash
# Recommended install (system-isolated, won't pollute)
curl -sSL https://install.python-poetry.org | python3 -

# Verify
poetry --version
```

### Skip It: Use pip

Python ships with pip. It works, it's slow, and dependencies clash after a while. Fine for throwaway scripts:

```bash
python -m pip install requests
```

> **Verdict**: If you can install uv, install uv. The rest of this guide uses uv.

---

## 3. Your First Project

### Create a project with uv

```bash
# Go to wherever you keep projects
mkdir hello-python
cd hello-python

# One-shot project setup (generates pyproject.toml + .gitignore + venv)
uv init

# Enter the auto-created virtual environment
uv venv

# Activate it (per platform)
# macOS / Linux:
source .venv/bin/activate
# Windows PowerShell:
.venv\Scripts\Activate.ps1

# Add your first third-party library (requests — for an HTTP smoke test)
uv add requests
```

### Write your first `.py` file

Inside `hello-python/`, create `main.py`:

```python
import requests

def fetch_quote() -> str:
    """Fetch a random quote and return as text"""
    resp = requests.get("https://api.quotable.io/random", timeout=5)
    resp.raise_for_status()
    data = resp.json()
    return f'"{data["content"]}" — {data["author"]}'

if __name__ == "__main__":
    print(fetch_quote())
```

### Run it

```bash
uv run python main.py
# Expected: prints a quote with its author
```

> `uv run` activates the venv automatically before running the command, so you don't need `source .venv/bin/activate`.

### With poetry (for comparison)

```bash
poetry new hello-python
cd hello-python
poetry add requests
poetry run python main.py
```

---

## 4. Editor Recommendation: VS Code

Download [VS Code](https://code.visualstudio.com/) and install two extensions — that's all you need:

| Extension | Purpose |
|---|---|
| **Python** (Microsoft official) | Syntax highlight, debugging, type checking |
| **Pylance** | Smart completions, go-to-definition |

Open the `hello-python/` folder in VS Code after installing the extensions — it'll auto-detect the virtual environment at `hello-python/.venv/`.

Hit **F5** to start debugging; it's more visual than `python main.py`.

---

## 5. Common Copy-Paste Gotchas

**Q: PowerShell error "running scripts is disabled on this system"**
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

**Q: uv installed but `command not found`**
Close and reopen your terminal — PATH hasn't refreshed yet.

**Q: `requests` installed but `ImportError` at runtime**
You ran it outside the virtual environment. Activate first (`source .venv/bin/activate`), or just use `uv run` from inside the project.

**Q: pip and uv fighting over the same project**
uv creates its own venv (`.venv/`); pip installs into the system — they will clash. **Pick one per project, stick with it.**

---

## Next Steps

- Want to scrape? Move from `requests` to `httpx` (async).
- Want a web app? Flask (light) or FastAPI (modern async).
- Want data work? pandas + Jupyter Notebook.
- Want AI / Agents? Install the `openai` or `anthropic` SDKs.

Each of these can become its own post.

---

> **Code isn't about proving which language is better. It's about picking the right tool for the job.**
