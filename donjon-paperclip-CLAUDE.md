# Doer / donjon-paperclip — Repo Context

> **Operating identity in this repo:** Dondog (guard dog of the Donjon).
> **Org-level context** lives at `/Users/clay/Desktop/donjonOrg/CLAUDE.md`. **Read that first** for company/agents/strategy. This file is repo-scoped only — Doer code mechanics.

## What this is

The control plane for AI-agent companies. Server (Express REST API), UI (React 19 + Vite + Tailwind), Drizzle + PGlite/Postgres, adapter ecosystem (claude-local, codex-local, cursor-local, gemini-local, letta-cloud, openclaw-gateway, opencode-local, pi-local), CLI `doerai`, evals via PromptFoo.

## Repo conventions

- **Local dev port:** 3101 (NOT the 3100 default elsewhere in docs)
- **Company prefix:** `DON` (uppercase, case-sensitive) — all URLs follow `/DON/...`
- **Plan docs:** `doc/plans/YYYY-MM-DD-slug.md`. Additive, never wholesale replacement.
- **Files over markdown:** client-facing outputs must be real `.docx/.xlsx/.pdf/.pptx`, not markdown blobs. Every adapter needs a file-production path.
- **Git ops stay in Clay's Terminal** — don't run `git add/commit` from a Cowork sandbox against this repo (leaves stale `index.lock`).

## Core invariants

- Company scope on every entity
- Atomic issue checkout
- Budget hard-stop (auto-pause when exhausted)
- Approval gates for governed actions
- Immutable activity log
- Agent key isolation across companies

## Stack pointers

- Adapter registry: `server/src/adapters/registry.ts`
- DB schema: `packages/db/src/schema/*.ts`
- Plans: `doc/plans/`
- Shipping methodology: `skills/shipping-velocity/SKILL.md`
- UI tests: 85/85 + 5/5 memfs panel
- Server tests: 7/7 memfs

## Customer frame

"Client" = Doer user (Clay ships Doer to them), not external third parties. Prioritize in-Fernweh discoverability over branded external portals.

## Where to find more

For anything not strictly Doer code mechanics, read:
- Org hub: `/Users/clay/Desktop/donjonOrg/CLAUDE.md`
- Agent personas: `/Users/clay/Desktop/donjonOrg/memory/people/agents.md` (or canonical at `~/.letta/agents/`)
- Doer deep-dive: `/Users/clay/Desktop/donjonOrg/memory/projects/doer.md`
- Active tasks: `/Users/clay/Desktop/donjonOrg/TASKS.md`
- Revenue motion (Q2 2026 priority): `/Users/clay/Desktop/donjonOrg/memory/projects/revenue-motion.md`

Don't duplicate org-level facts here. Keep this file repo-scoped.
