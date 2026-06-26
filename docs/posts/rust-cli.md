---
title: 用 Rust 重写我的命令行工具
date: 2026-06-12
tags: [Rust, CLI, 性能]
description: 为什么用 Rust 重写 Python CLI 工具，启动时间从 800ms 降到 12ms，单文件 4.2MB 无依赖。
---

# 用 Rust 重写我的命令行工具

为什么我决定用 Rust 重写一个已经能用的 Python CLI 工具，以及整个过程中的收获与踩坑。

<!-- more -->

## 为什么要重写？

原来的 Python 版本能用，但每次启动要 800ms。对于一个一天可能调用上百次的工具来说，这 800ms 积少成多，足够让人烦躁。

我的需求很简单：快、单文件分发、跨平台。Rust 几乎是唯一选择。

## 开发过程

核心逻辑不复杂——读配置、解析参数、发 HTTP 请求、格式化输出。但 Rust 的所有权机制让一些 Python 里一行搞定的事情变得需要思考。

```rust
// Python: data = json.loads(resp.text)
// Rust:
let data: serde_json::Value = serde_json::from_str(&resp.text()?)?;
```

一开始觉得啰嗦，写多了之后发现编译器帮你挡住的那些 bug，省下的调试时间远超多打的那些字符。

## 结果

启动时间从 800ms 降到 12ms。单个二进制文件 4.2MB，无依赖。

> 写代码不是为了证明什么语言更好，而是选对工具做对事。
