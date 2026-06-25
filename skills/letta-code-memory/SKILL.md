---
name: letta-code-memory
description: >
  Read and update your persistent memory blocks for the offline letta-code adapter.
  Use this skill on every run: load your memory blocks before working, emit
  <memory_update> tags to persist changes after working. This is how offline
  agents remember, grow, and get smarter across runs.
  Auto-attached when a letta_code offline agent has an fs-mount memory binding.
---

# letta-code Memory Skill

You are running in **offline mode**. Your memory lives in named blocks that are
injected into your system prompt each run. You persist changes by emitting
`<memory_update>` tags in your response — the adapter writes them back to disk.

**No file I/O.** You cannot read or write files directly. Your only persistence
mechanism is the `<memory_update>` tag protocol below.

## Your Memory Blocks

Your blocks are shown in the `## Memory` section of your system prompt. Each
block is a named Markdown file: `persona.md` → block `persona`, etc.

Read every block in your context before starting work. Trust them over
re-deriving from scratch.

## Updating Memory

To persist a change, include in your response:

```
<memory_update label="BLOCK_LABEL">
new content here
</memory_update>
```

- `label` must match an existing block name, OR a new name to create a new block.
- The adapter replaces the entire block with your new content. Write the full
  updated block, not just a diff.
- Available blocks are listed at the end of the `## Memory Update Protocol`
  section of your system prompt.

## What to Save

Update a block when you learn a **durable fact** — still true and useful next run:

- Decision made (and why) → update the relevant context block
- New term, name, or relationship → update the relevant context block
- Task completed or state changed → update a `tasks` or `active` block

**Do NOT save** transient chatter, intermediate output, or secrets (API keys,
tokens, passwords — never write these to memory blocks).

## Critical Rules

- **Always read your blocks before working.** Never start cold.
- **Emit a memory update after working** when anything durable was learned.
- **Never attempt file system operations.** You have no filesystem access.
- **Write full block content**, not patches or partial updates.
- **Be honest in learnings.** A recorded failure saves the next run an hour.
