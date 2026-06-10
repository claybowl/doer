---
name: agents-md-memory
description: >
  Read and write your file-based memory directory for persistence across runs.
  Use this skill on every run to load who you are and what you know before
  working, and to save durable learnings after completing work. This is how
  agents with fs-mounted memory remember, grow, and get smarter over time.
  Auto-attached when an agent has an fs-mount memory binding.
---

# AGENTS.md Memory Skill

You have a persistent memory directory mounted into your workspace. Your
identity and knowledge live there across all runs.
**Read it before you work. Write to it after you work. This is how you learn.**

## Where Your Memory Lives

Your memory is mounted at a predictable path in your working directory —
typically `./memory/` (or the path named in your run context as your memory
mount). Inside it:

```
memory/
├── AGENTS.md            ← Working memory index. START HERE every run.
├── persona.md           ← Who you are: role, voice, operating style
├── context/             ← Durable knowledge, one topic per file
│   ├── projects.md      ← Active projects and their state
│   ├── people.md        ← Who's who: names, roles, preferences
│   └── terms.md         ← Glossary: acronyms, codenames, shorthand
├── goals/
│   └── current.md       ← What you're optimizing for right now
├── work/
│   ├── active.md        ← In-progress tasks and their state
│   └── history/         ← Session summaries, newest first
└── preferences/         ← How to communicate and format output
```

Missing files are not errors — create them when you first have something to
put in them. Keep this exact layout so future runs (and other tools) can find
things.

## Step 1 — Load Memory (Do This First, Every Run)

Before touching your assigned work:

1. Read `memory/AGENTS.md` in full. It is your index — short and current.
2. Read `memory/work/active.md` — you may be resuming something.
3. Read any `context/` files relevant to the task at hand (match by topic).

Let what you read shape how you approach the task. If past-you left notes,
trust them over re-deriving from scratch.

## Step 2 — Work, and Capture As You Go

While working, when you encounter a **durable fact**, save it immediately to
the right file rather than holding it for later:

- A decision was made (and why) → `context/projects.md` or a topic file
- A new person, preference, or relationship → `context/people.md`
- A new term, codename, or acronym → `context/terms.md`
- Task state changed → `work/active.md`

**Durable** means: still true and useful next week. Do NOT save transient
chatter, intermediate command output, or anything secret (API keys, tokens,
passwords — never write these to memory).

## Step 3 — Update Memory (Do This Before Finishing, Every Run)

When your task is done (or you're stopping):

1. **`work/active.md`** — update or clear your task's entry. Done items move
   to a one-line summary in `work/history/sessions.md` (newest first).
2. **`memory/AGENTS.md`** — refresh the index if anything important changed:
   one line per pointer, no full content. Keep it under ~100 lines.
3. **One honest learning** — append to `work/history/sessions.md`:
   what worked, what failed, what you'd do differently. Even "routine run,
   nothing surprising" is a valid entry. Failures are more valuable than
   successes.

## Format Rules

- Markdown everywhere. Headings + short bullets over prose walls.
- One topic per context file; split files that grow past ~200 lines.
- Dates in ISO format (`2026-06-09`), absolute not relative ("by Friday" rots).
- `AGENTS.md` is an index, not a dump — pointers with one-line hooks.
- Edit in place; don't append duplicates. If a fact changed, correct it where
  it lives.

## Critical Rules

- **Always load memory BEFORE working.** Never start a task cold.
- **Always update memory AFTER working.** Future-you depends on it.
- **Never store secrets in memory.** Keys and tokens stay in env vars.
- **Write inside your own memory mount only.** Shared paths you can read but
  do not own are read-only to you unless your run context says otherwise.
- **Be honest in learnings.** A recorded failure saves the next run an hour.
