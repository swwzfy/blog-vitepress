---
title: Adding a Spec Layer for AI — My OpenSpec Experience
date: 2026-06-26
tags: [AI, Engineering, OpenSpec, Dev Tools]
description: AI coding is powerful, but requirements only live in chat history. OpenSpec adds a lightweight spec layer between you and AI — align first, then build. Here's my hands-on experience.
---

# Adding a Spec Layer for AI — My OpenSpec Experience

AI coding tools are getting stronger, but you've probably been there: you chat with AI for half an hour, it writes a bunch of code, and it's not what you wanted. The problem? Requirements only live in chat history — never confirmed by both sides.

OpenSpec solves this by adding a lightweight spec layer between you and AI. Align on what to build first, then write code.

<!-- more -->

## What Is It

OpenSpec is a spec framework for AI coding assistants. It doesn't replace your AI tool — it wraps a structured workflow around it.

The core idea is simple:

```
You: I want dark mode
AI: Sure, let me write the code   ← Traditional approach, just do it

You: I want dark mode
AI: Let me check your project... I'd suggest CSS variables + system preference detection.
    Want me to scope it?           ← OpenSpec approach
```

Explore first, propose, then implement. Every step is documented, traceable by both human and AI.

## The Workflow

OpenSpec is driven by slash commands, split into phases:

### 1. Explore: `/opsx:explore`

Not sure how to do something? Let AI analyze first. It reads your code, compares options, gives recommendations. No structured output — just a conversation.

```
/opsx:explore
→ I want to add comments, but not sure which system
→ AI analyzes project structure, compares Giscus, Waline, Twikoo
→ Recommends Giscus — zero maintenance, based on GitHub Discussions
```

### 2. Propose: `/opsx:propose`

Once you know what you want, AI generates full planning docs:

- **proposal.md** — Why, what's changing
- **specs/** — Requirements and scenarios
- **design.md** — Technical approach
- **tasks.md** — Implementation checklist

These files live in `openspec/changes/<change-name>/`, viewable and editable anytime.

### 3. Implement: `/opsx:apply`

AI works through the task list item by item. Completed items get checked off. If it hits a problem, it pauses and asks you.

This phase is **fluid** — you can go back and update specs or design anytime, and AI adjusts. No rigid phase gates.

### 4. Archive: `/opsx:archive`

When done, archive it. Change history is preserved, specs merged into main docs.

## Hands-On Experience

I used OpenSpec to add Giscus comments to my blog. The full process:

**Explore phase**: AI read the project structure, found it's VitePress + Vue 3 custom theme, suggested adding the comment component in `Layout.vue`'s `#doc-after` slot.

**Propose phase**: Generated complete planning docs — requirements (show on article pages, hide on non-article pages, sensitive word filtering) and a 15-item task checklist.

**Implement phase**: AI executed item by item — install dependency, create component, fill config, verify build. Each completed item updates tasks.md.

**Archive phase**: All done, archived with full history preserved.

The biggest win: **traceability**. Every decision is recorded, every task has status. If you get interrupted, just check tasks.md to see where you left off.

## Why You Need It

Without OpenSpec, AI coding usually goes like:

1. You describe what you want
2. AI writes code directly
3. Not right, fix it
4. Still not right, fix again
5. Back and forth, eventually settle for "good enough"

The problem: requirements are vague, AI can only guess. Wrong guess = rework.

OpenSpec forces you to clarify requirements before writing code. Not for AI — for yourself. Have you really thought it through? What are the boundaries? What's explicitly out of scope?

This "think first" process is more valuable than any code AI writes.

## Who It's For

- **Solo developers**: Using AI for coding but tired of re-explaining context every session
- **Small teams**: Change logs beat verbal alignment when multiple people collaborate
- **Complex features**: Multi-file, multi-module changes need clear thinking first

Not ideal for: one-off scripts, rapid prototypes, or cases where you already know exactly what you need and just want AI to type faster.

## Installation

```bash
npm install -g @fission-ai/openspec@latest
cd your-project
openspec init
```

After init, it generates `.claude/skills/` (or equivalent for your AI tool). Your AI assistant auto-detects the slash commands.

## My Take

AI coding tools evolve fast, but "how humans and AI collaborate" is still unsolved. Most tools optimize for "how fast AI writes code." OpenSpec optimizes for "how efficiently human and AI align on requirements."

It's not flashy — just a bunch of markdown files. But those markdown files shift AI from "guessing what you want" to "execute after confirmation."

> The best tools don't make you faster. They make you more accurate.
