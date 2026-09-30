# AGENTS.md

> Behavioral guidelines adapted from [swwzfy/andrej-karpathy-skills](https://github.com/swwzfy/andrej-karpathy-skills) — Andrej Karpathy's distilled observations on common LLM coding mistakes. Approved by Sir (2026-08-26) as project-level enforcement of disciplined engineering.
>
> This is the personal blog of Kiran (`jossecho.com`), a VitePress site with Chinese/English i18n, built to `docs/.vitepress/dist` and deployed manually to an Alibaba Cloud (Aliyun) nginx server. Keep changes surgical and the build reproducible.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. Path Boundaries in Build Scripts

**Any filesystem path assembled from a filename or a config value must be boundary-checked before it is read or written.**

```js
const p = path.resolve(root, x)
if (!p.startsWith(root + path.sep)) throw new Error(`refusing to write outside ${root}: ${x}`)
```

- Applies to build-time constants too, not only to external input - `scripts/build-rss.js` checks `out` / `htmlOut` even though they are literals.
- Do not remove or weaken these guards. On 2026-09-07 a semgrep `security` rule (high) blocked 3 path-traversal findings in `scripts/build-rss.js` (lines 49 / 127 / 143 at that time); the guards in `extractArticleHtml()` and `buildRss()` are the fix, and a static rescan re-verified the file clean.
- `.mimosa/` holds that scanner's local state (git-ignored, safe to delete, regenerated on the next hook run). It is runtime data, not project configuration - do not migrate or copy it into `.claude/` or here.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
