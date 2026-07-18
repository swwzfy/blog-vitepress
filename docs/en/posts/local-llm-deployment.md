---
title: Local LLM Deployment — From PC to Self-Hosted Server, Five Paths Side by Side
date: 2026-07-16
tags: [AI, Ollama, vLLM, llama.cpp, Deployment]
description: Five typical paths for running models on your own hardware — desktop apps to production inference frameworks, matched to your situation.
---

# Local LLM Deployment — From PC to Self-Hosted Server, Five Paths Side by Side

LLMs got cheap enough that "running one locally" stopped being a hard-core enthusiast thing. I've used a few of the desktop tools myself — MacBook to PC, up to 30B-class models. The server-side options below are mostly from reading docs and community write-ups, not from running a real cluster. My biggest takeaway: **there's no "best" setup, only the one that matches your situation**.

Here's a side-by-side look at five typical paths. Start by checking what hardware you have and how many people you're serving — that lands you in the right tier fast.

<!-- more -->

## Three questions before you pick

Before choosing a stack, nail down three things:

- **Who uses it?** Just you / a few friends / a whole team
- **How often?** Occasionally / daily / 24/7
- **How big?** 7B / 14B / 70B / 100B+

Different answers send you to wildly different setups.

There are essentially three layers:

- **Desktop apps** — GUI tools installed on Mac or PC: LM Studio, Jan, GPT4All
- **Local services** — background services exposing HTTP APIs: Ollama, llama.cpp server
- **Production servers** — dedicated GPU boxes with inference frameworks: vLLM, TGI, SGLang

## 1. Desktop apps (easiest on-boarding)

LM Studio, Jan, GPT4All — the "click and chat" tier.

**Strengths:**
- Fully GUI: download models, browse, chat, tweak params — no terminal
- Built-in model hubs with common quantization versions
- Low barrier for non-developers

**Weaknesses:**
- Usually single-user, no public API exposed
- Live in your menu bar / task tray and compete for resources with other apps
- Larger models (30B+) hit a hard ceiling on consumer hardware

**Fit**: first-timers, occasional use, "let me see what this is about."

## 2. Local services (most practical)

Ollama is the headline here. llama.cpp server is the lower-level sibling.

**Ollama**
- One command pulls the model and serves it: `ollama run qwen3:14b`
- Defaults to port 11434, OpenAI-compatible API out of the box
- Modelfile supports custom prompts and parameters
- Large model registry, very active community

**llama.cpp server**
- Closer to the metal than Ollama
- Falls back to CPU when VRAM is tight, offloads parts to GPU
- Comes with OpenAI-compatible endpoints and a minimal web UI

**Strengths:**
- One local service, many clients (CLI, editor plugins, personal scripts)
- Easy to swap models
- Fully offline — no network dependency

**Weaknesses:**
- Single GPU / single machine — high concurrency will choke it
- You're on your own picking the right quantization version

**Fit**: individuals + small teams running internal use cases.

## 3. Production servers (serious tier)

I haven't actually run this tier myself. What's below is mainly a summary of official docs, community feedback, and public benchmarks — treat it as reference material, not a runbook, and always cross-check the latest docs before going to production.

The "real users depend on it" tier. vLLM, TGI, SGLang as the big three.

**vLLM**
- The flagship inference framework, originated PagedAttention
- High throughput, low latency, continuous batching
- De facto standard for production deployments

**TGI (Hugging Face Text Generation Inference)**
- Written in Rust — generally more stable under load
- Strong multi-GPU support, broad model compatibility
- Tight integration with the HF ecosystem

**SGLang**
- Newer entrant, designed for complex LLM programs (multi-turn, tool use, structured output)
- Strong academic resources, detailed perf-tuning docs

**Strengths:**
- Optimized VRAM utilization (vLLM's PagedAttention solves KV cache fragmentation)
- Real concurrency handling
- Mature deployment / monitoring / logging tooling

**Weaknesses:**
- Steep learning curve — Python-first, no friendly GUI
- Hardware bar is high (start at 80GB VRAM)
- Startup knobs are considerably fiddlier than Ollama

**Fit**: real users, performance- and cost-sensitive workloads.

## 4. Quantization: everyone deals with it

Whichever layer you pick, you can't avoid quantization. Raw checkpoints are dozens of GB.

Common tiers:

- **Q4_K_M** — OK quality, ~1/4 size, the workhorse
- **Q5_K_M** — slightly better quality, slightly larger
- **Q8_0** — near-lossless, half size
- **FP16 / BF16** — original precision, server-grade only

Rules of thumb:

- Desktop with ≥ 24GB VRAM → 30B Q4, 14B Q8
- Single 80GB card → 70B Q4, 30B FP16
- Multi-GPU / 80GB+ → 70B FP16, 100B+ as the wallet allows

## 5. Which to pick when

| Scenario | Pick | Why |
| --- | --- | --- |
| Trying it out | LM Studio / Jan | GUI only, zero terminal |
| Daily personal use | Ollama | One-command service, big ecosystem |
| Low-VRAM tinkering | llama.cpp | CPU/GPU offloading |
| Small team internal | Ollama + Docker | Simple, isolated environments |
| High concurrency | vLLM | PagedAttention handles load |
| HuggingFace model fit | TGI | HF models plug right in |
| Complex LLM programs | SGLang | Multi-turn / tool use friendly |

## 6. General recommendations

1. **Don't chase the biggest model on day one.** Most public benchmarks and qualitative reports put the gap between 14B Q4 and 70B Q4 narrower than you'd expect — the smaller one typically runs 3–4× faster.
2. **Don't trust quantization leaderboards blindly.** Look at download counts and community feedback.
3. **Desktop apps and server frameworks are different worlds.** Same hardware, different tool — resource scheduling, memory management, context utilization can all diverge. Check each project's documentation for specifics.
4. **Models above 50GB justify an SSD.** Loading from a spinning disk will be painfully slow; time-to-first-token takes a serious hit.
5. **Before exposing Ollama or vLLM to the public internet, add token auth and rate limits.** Out of the box they're open — without protection the endpoint is reachable by anyone.

## A closer

Local deployment isn't really about saving API costs — that math rarely pencils out. The real wins are **data never leaves your machine, models you can customize, latency you control**. When those three matter more, you'll naturally walk from "cloud API" to "local instance."

> Tools serve the requirement, not the other way around. Figure out what you need to solve first, then pick what fits.
