---
title: "WorkBuddy: Turning AI from a Chat Box into a Workbench"
date: 2026-08-27
tags: [AI, Tools, WorkBuddy, Agent, Workflow]
description: After trying plenty of AI tools, what I really lacked wasn't a chattier model — it was an assistant that actually does the work. WorkBuddy feels like it wires the filesystem, the terminal, the browser, and multimodal generation into a single conversation.
---

# WorkBuddy: Turning AI from a Chat Box into a Workbench

I've written about [why I let AI manage my memory](/en/posts/ai-memory) and [the plugin philosophy behind DeepSeek Harness](/en/posts/deepseek-harness). Both trace back to the same obsession: I don't want a smarter chat box, I want a workbench that finishes the job for me.

<!-- more -->

## The Ceiling of Conversational AI

No matter how long the context window gets, a large model still lives in the "conversation" layer. It can give you answers, code, and advice — but the next step, actually writing that code into a file, running it, verifying it with a screenshot, and deploying it, is on you.

That was my real state for the past year: AI thinks, I do. The manual hand-off in between ate most of my energy.

## What WorkBuddy Is

In one line: **it's an AI workbench that wires the filesystem, the terminal, the browser, and multimodal generation into a single conversation.**

It's not another chatbot. Its agent loop goes: understand intent → pick a tool → take action → observe the result → continue, until the task is done.

In other words, it can read and write files in your project, run commands, spin up a local preview server, search the web, and finally drop the finished draft straight into your blog's `posts/` folder.

> This echoes the "everything is a plugin" idea I saw in [DeepSeek Harness](/en/posts/deepseek-harness) — except WorkBuddy ships capabilities like "read/write files", "run commands", and "generate images" as built-in tools out of the box, rather than an empty frame you have to assemble yourself.

## The Layers I Use Most

| Layer | What it does for me | Where it shows up on the blog |
|-------|---------------------|-------------------------------|
| Research & Writing | Verify facts online, organize material, produce drafts | Tech articles, reading notes |
| Data & Analysis | Process spreadsheets, chart, visualize | Project retrospectives |
| Building | Ship runnable websites / small tools directly | Adding the Live2D mascot |
| Multimodal | Generate images, video, 3D models | Cover art, illustrations |
| System Access | Read/write local files, run commands, preview | Local checks before deploy |
| Experts & Connectors | 100+ domain experts, external services / MCP | Asking domain questions |
| Skills & Automations | Freeze repeatable flows into skills, run on a schedule | Weekly reports, RSS sync |

## One Real Loop

Take this very post — WorkBuddy wrote it.

Roughly:

1. I said "write a post about WorkBuddy based on the existing blog content"
2. It read `config.mts`, a few old posts, and `posts.ts` to learn my writing format and how archives auto-collect entries
3. It generated the Chinese draft under `docs/posts/`, then mirrored an English copy to `docs/en/posts/`
4. I previewed, tweaked a few spots, and it revised from feedback

Note step 2: it **actually went and looked** at my frontmatter conventions, tag style, and collection logic. That's not "guessing from the prompt" — it genuinely stepped into the filesystem.

## What It Changed

Not "writing faster" — though it is faster.

What really changed is that **the boundary of what I can delegate got pushed out**. "Write a post and publish it" used to be a dozen manual steps; now I can describe it as a goal and go make coffee.

But to be honest: it isn't fully autonomous yet. On long tasks the agent loop occasionally drifts, generated content still needs your review, and for sensitive actions (deleting files, sending mail) it stops to ask. That's precisely why I trust it — **it has the power to act, and the restraint to hold back.**
