---
title: Rewriting My CLI Tool in Rust
date: 2026-06-12
tags: [Rust, CLI, Performance]
description: Why I rewrote a Python CLI tool in Rust, startup time dropped from 800ms to 12ms, single file 4.2MB with zero dependencies.
---

# Rewriting My CLI Tool in Rust

Why I decided to rewrite a working Python CLI tool in Rust, and what I learned along the way.

<!-- more -->

## Why Rewrite?

The Python version worked, but took 800ms to start. For a tool called hundreds of times a day, those 800ms add up to frustration.

My requirements were simple: fast, single-file distribution, cross-platform. Rust was practically the only choice.

## Development Process

The core logic wasn't complex — read config, parse arguments, make HTTP requests, format output. But Rust's ownership model made some things that were one line in Python require actual thought.

```rust
// Python: data = json.loads(resp.text)
// Rust:
let data: serde_json::Value = serde_json::from_str(&resp.text()?)?;
```

At first it felt verbose. After writing more, I realized the bugs the compiler catches save far more debugging time than the extra keystrokes cost.

## Results

Startup time dropped from 800ms to 12ms. Single binary file at 4.2MB, zero dependencies.

> Writing code isn't about proving which language is better — it's about picking the right tool for the job.
