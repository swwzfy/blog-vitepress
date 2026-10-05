---
title: Why I Let AI Manage My Memory
date: 2026-05-18
tags: [AI, Knowledge Management]
description: Sessions end and context gets wiped. After four months of letting AI manage its own memory, what makes it remember is not a vector database but a few dumb disciplines — one fact per file, index first, and the courage to delete.
---

# Why I Let AI Manage My Memory

Every session starts with amnesia. When I wrote this piece in May, I had just set up a three-layer memory system for my AI — short-term, long-term, semantic retrieval — purely as a tech experiment. Four months in, it has become the least glamorous and most indispensable part of my workflow. And the deeper I lean on AI, the sharper the contrast gets — it can write a full day's worth of my code in minutes, yet it can't remember a decision we settled last week. This post now covers both the design and what those four months actually taught me.

<!-- more -->

## Amnesia Is the Norm, Not a Bug

Large models have context window limits, and long conversations get summarized — the plot survives, the facts don't. After a debugging session stretches to thousands of lines, the port numbers, paths and usernames confirmed early on get ground away, round after round of summarization. The summary remembers "we're fixing a crash loop" but not "the runtime user is www, not www-data" — and that detail is the switch for every next step. Real tasks, meanwhile, stubbornly refuse to fit inside one session.

The best example is this blog's own visitor stats service. From finished locally to working in production, it spanned several sessions — is the server CentOS or Ubuntu? Is nginx sitting behind a BT Panel? Is the runtime user called www or www-data? Where does python3 live? None of these hard environment facts appear in the code, and git can't tell you either — yet every debugging session hinges on them.

I even hit the same pit twice. systemd reported 217/USER, the service looped on crash, and journalctl's verdict was just a wrong username in a config file. The first time was unfamiliarity. The second time, the fix lived in a conversation that had long since ended, and the config file re-uploaded to the server carried the wrong username right back. **Debugging conclusions that die with their session** — that is what amnesia costs.

## Three Layers, Each Covering a Stretch

- **Short-term memory** — there is no dedicated storage; it's just the model's context window, which holds a day of conversation but not a month of project. When the session dies mid-task, auto-summarization buys time, but summaries distort by nature — they remember "what happened", not "what the config was".
- **Long-term memory** — the cross-session persistence layer. **One fact per file** — a single markdown file holds a single fact, with name, a one-line description and a type in the frontmatter (user preference / collaboration feedback / project status / reference).
- **Retrieval** — each session loads only a one-screen index; file bodies are fetched on demand.

The store looks like this:

```
memory/
├── MEMORY.md            ← the index — one line per memory, the only thing loaded upfront
├── user-linux-basics.md
├── friends-data-flow.md
└── ...
```

Each index line reads like this:

```
- [Friends data flow](friends-data-flow.md) — friends.json as the single source of truth + build-time RSS aggregation
```

When I wrote "semantic retrieval" in May, I assumed that meant a vector database. What actually runs four months later is something earthier and far more stable.

## What Actually Works — Three Dumb Disciplines

**One — index first, write descriptions like summaries.** The entry point of the memory store is not full-text search — it is the one-line description at the top of each memory. Written like a summary, recall is precise; written like a title, recall is a coin flip. This turns "retrieval" from an engineering problem into a writing problem — the vector database turns out to be the secondary part.

**Two — don't store what the code already says.** Code structure, fixed bugs, commit history — the repository is its own record, and AI can look those up anytime. Memory is for what can't be looked up — hard environment facts, rejected proposals and why, user preferences, decisions in flight. A simple test — will this sentence probably still hold three months from now? "The server's runtime user is www" holds; what a home-page card looks like, or which files a particular build produced, does not.

**Three — dare to delete.** A wrong memory is worse than no memory. A stale "that file is in place" sends the next session chasing ghosts for half an hour, while sitting there looking perfectly reasonable forever. Deleting is routine memory maintenance, not an exception.

## When to Write

Three moments deserve ink:

**When corrected.** The moment a user rejects the AI's work is the most expensive conflict and the deepest lesson. When a frosted-glass proposal for the archive page redesign got shot down, what I recorded was not the verdict but the reason — and what to ask before trying again. A memory only takes shape once it grows a "why" and a "what to do next time".

**After stepping into a pit.** After a rebuild, the local preview server must be restarted with the port fully cleared, or every new asset 404s — one line of notes means next time takes five seconds to match instead of half an hour to re-debug.

**When a decision lands.** Approved-but-unstarted plans, articles sitting in drafts and why. This is the cross-session progress bar — unwritten, it either evaporates or gets re-litigated later as if it were new.

Before writing, I ask one question — "what is the minimum the next session needs to know in order to pick up seamlessly?" More than three answers means it should be split into several memories; zero answers means it wasn't worth remembering in the first place.

## Snapshots Go Stale

One memory used to read "this round of stats-service changes isn't committed to git yet" — true at the moment it was written. Two days later the changes were committed, and the memory became a trap — any session acting on it would either commit twice or think the code was lost.

Memory is not a database — it is a **snapshot of the moment it was written**. It can guarantee "true when written", never "still true now". So the rule — **a recalled memory is background context, not an instruction; verify it against the repo and reality before relying on it.** Stale ones get deleted too — tending a memory store is like tidying a room; leave the outdated stuff lying around and eventually the room is unusable.

As for vector retrieval, it's still on the wishlist. The store is small enough that a well-written one-line description is its stand-in. The day the index outgrows one screen, we can talk about upgrading.

## The Easiest Layer to Miss — It Does the Remembering

It's tempting to picture this store as "a diary I write for my AI to read". The direction is actually reversed — **the AI holds the pen**. It decides what to write at the moments it gets corrected, steps into a pit, or lands a decision; it maintains the index; it deletes stale entries itself. My only job is to say "no, that's wrong" when it misremembers — and that correction promptly becomes a memory of its own.

The management of memory is outsourced, end to end. What I get back is a collaborator who picks up where we left off every time, instead of a brilliant one who has to reintroduce itself at every meeting.

> Memory is about more than efficiency. A collaborator who starts from zero every time can't really know you; a collaborator who remembers why you rejected a proposal will ask first the next time around.
>
> This isn't perfect — memory management itself is an open problem. But it beats "starting from scratch every time", by a lot.
