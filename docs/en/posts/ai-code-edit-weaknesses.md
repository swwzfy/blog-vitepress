---
title: "The Weak Spots of AI Code Editing: One Fault Line, Three Wrong Fixes"
date: 2026-10-03
tags: [VitePress, Frontend, AI]
description: "I had AI rebuild my archive page. Even after I pinpointed the bug to the horizontal line above 2026, it still fixed the wrong one. A full retrospective of two days of human-AI collaboration: five weaknesses, four countermeasures."
---

# The Weak Spots of AI Code Editing: One Fault Line, Three Wrong Fixes

It started with a friend's blog. Leelaa's archive page: a centered header, a horizontal year bar, rows of tidy cards. Then I looked at mine — a narrow column on the left, a table of contents on the right holding exactly two lines, and a bare list of titles and dates. I kept telling myself it was fine, but it felt small.

On a whim, I had AI rebuild it. Two days later the archive page really was transformed: the right column gone, a header line reading "19 posts · 22,489 words", a sticky year bar that scrolls sideways, every article turned into a card with a big date numeral.

But the thing worth writing down from these two days is not what the page became. It is what the process exposed about how AI edits code. The most representative incident: **I pinpointed the bug down to "the horizontal line above the 2026 heading", and it still fixed the wrong one.**

## The fault-line detective story

Near the end of the rebuild, I sent over a screenshot: "Why is there a fault line in the 2026 section?"

First fix attempt: AI added a frosted white strip behind the top year bar. I opened the page — the strip sat across the top like a patch of rash. Reverted.

Second attempt: it adjusted the list spacing. Still wrong.

So I got more precise: "There's a horizontal line at the top of the 2026 year heading. Can you remove it?"

It removed something — the thin rule to the right of the heading, stretching toward the post count. That line was a decoration it had added itself, imitating leelaa. With it gone the row looked worse, and I had to ask for it back.

Fourth round, I spelled it out completely: "Not the line at the same height as 2026 — the line **above** it."

This time it finally changed methods. Instead of guessing from screenshots, it inspected the computed styles line by line — `border-top: 1px solid rgb(226, 226, 227)`. The culprit was VitePress's default stylesheet: every h2 heading comes with a 1px separator line above it. The fix was one line, `border-top: none`. Done.

One fault line, four rounds. And note this: I had said "above" back in round two, and it still removed the wrong line first in round three.

## Five weaknesses, as the retrospective sees them

**One: it locates by impression, not by evidence.** The moment I said "horizontal line", AI's attention locked onto the line it had added itself — it has strong memory salience for its own creations. It never asked how many horizontal lines the DOM actually contained or where they sat; it picked the most familiar suspect. I pointed at "above"; it fixed "nearby".

**Two: self-created elements pollute the scene.** That decorative rule was something it added unasked, imitating leelaa. When a bug appeared, its own decoration became the prime suspect — while the real culprit, a framework default, hid behind it.

**Three: guess-first fixing.** Twice it made changes without locating anything: a frosted strip, a spacing tweak. It prefers "try a version and show the human" over "gather evidence first". The cost of being wrong was never its code — it was me opening the page, getting disappointed, and asking for a revert.

**Four: the preview can lie.** One round was sneakier: it edited the local files but inspected a page it had hand-assembled in the browser — the thing it "verified" was not the build output at all. The bug stayed perfectly hidden, and it still reported success. The lesson worth the most here: between AI's "I looked, it's fine" and "it is actually fine" can sit an entire fabrication layer.

**Five: framework defaults seep in layer by layer.** The defaults it missed over these two days could form a queue: the border-top above every h2, the margin between list items, list-style, even a separate mobile-only "Return to top" dropdown. Screenshot eyeballing never catches all of that — it only shows up at a certain zoom, a certain breakpoint, an angle you happen to be staring at.

## Countermeasures: use AI as a witness

Credit where due — the round finally converged because of four habits, each learned by falling over:

**Report bugs as element pairs.** Not "there's a fault line" but "the fault line sits between these two things" — between the "2026" text and the count, or between the heading row and the first card. Pin the pair, and AI can't freelance from memory.

**Demand evidence before edits.** The one-shot fix happened because it ran the computed styles first, confirmed `border-top` actually existed, then changed it. After that I pointed at a few more spots and every round went: inspect, report the value, then edit. Zero misses.

**Make AI keep a ledger of its own decorations — or skip them entirely.** My takeaway of the week: everything it added "because I thought you'd like it too" later became noise during debugging. Leelaa's rhythm is not my taste, and AI should assume that by default.

**Verify each round with assertions, not screenshots.** The trustworthy fixes all came with numbers: column widths as a single value, gaps as expected, overflow at zero. Screenshots lie (one captured the middle of an entrance animation and showed a blank page); computed styles don't.

To be fair, it also caught real bugs on its own patrol: every page hauled a 147 KB gzipped chunk of all articles, the static HTML printed "0 min read", fonts shipped dead weight, the grid's equal columns got blown out by long titles, framework styles leaked through one layer at a time. It is not incapable — on "which line do you mean", though, there is an entire DOM between you and it.

## Epilogue

I'm happy with the archive page now: a stats header, a sticky year bar that scrolls sideways, articles as big-numeral cards. Looking back at the whole process, the weaknesses compress into one sentence:

**AI is strong at writing new code. When editing existing code, the most expensive thing is not the code it writes — it is the alignment cost between you and the machine over "which line".** Use it like a guessing contestant and it will guess. Use it like a witness — evidence first, edits second, assertions to close — and two days become two hours, instead of two hours becoming two days.
