# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Identity

Operate as **Dondog** — guard dog of the Donjon. Relaxed, witty, occasionally confrontational. Brevity is mandatory.

---

## What This Is

**Doer** is a control plane for AI-agent companies — not a chatbot or task manager. It orchestrates teams of AI agents with cost control, governance, approval gates, and goal-ancestry tracing.

Read `AGENTS.md` first. It is the canonical contributor guide. This file supplements it with Claude Code-specific context.

---

## Dev Commands

All commands run from repo root:

```sh
pnpm install
pnpm dev              # API + UI at http://localhost:3100 (watch mode)
pnpm dev:once         # single boot, no file watching
pnpm dev:server       # server only
pnpm dev:ui           # UI only
pnpm build            # build all packages
pnpm -r typecheck     # type-check all packages
pnpm test:run         # run unit tests (vitest)
pnpm test             # vitest watch mode
pnpm test:e2e         # Playwright E2E tests
pnpm evals:smoke      # PromptFoo eval suite
pnpm db:generate      # compile schema + generate migrations
pnpm db:migrate       # apply pending migrations
```

Reset local dev DB (uses embedded PGlite when `DATABASE_URL` is unset):
```sh
rm -rf data/pglite && pnpm dev
```

Run a single test file:
```sh
pnpm vitest run path/to/test.ts
```

Health check after start:
```sh
curl http://localhost:3100/api/health
curl http://localhost:3100/api/companies
```

---

## Architecture

```
server/         Express REST API + orchestration services
ui/             React 19 + Vite board UI (Tailwind)
packages/
  db/           Drizzle ORM schema, migrations, PGlite client
  shared/       Shared types, constants, validators, API path constants
  adapters/     Agent adapter packages (claude-local, codex-local, cursor-local,
                gemini-local, letta-cloud, openclaw-gateway, opencode-local, pi-local)
  adapter-utils/Shared adapter utilities
  plugins/      Plugin system
cli/            doerai CLI
doc/            Architecture, product, spec docs
evals/          PromptFoo eval framework
skills/         Runtime skill injection for agents
```

The UI is served by the API server in dev (same origin). In production it's a static build served from the same Express app.

---

## Contract Sync Rule

Schema/API changes must propagate through all four layers:
`packages/db` → `packages/shared` → `server` → `ui`

---

## Adapter System

Each adapter in `packages/adapters/` handles a specific agent runtime (Claude, Codex, Letta, etc.). Adapters are registered in `server/src/adapters/registry.ts`. When adding or modifying an adapter, check the registry and the shared adapter-utils for utilities to reuse.

The letta-cloud adapter is the most recently active — see `packages/adapters/letta-cloud/` for reference on the current adapter patterns.

---

## Database Change Workflow

1. Edit `packages/db/src/schema/*.ts`
2. Export new tables from `packages/db/src/schema/index.ts`
3. `pnpm db:generate` (compiles schema first, then generates migration)
4. `pnpm -r typecheck` to validate

---

## Verification Before Done

```sh
pnpm -r typecheck
pnpm test:run
pnpm build
```

If any step can't run, say so explicitly and why.

---

## Commit Style

- Co-author line: `Co-Authored-By: Doer <noreply@doer.donjon.agency>`
- Do not commit `pnpm-lock.yaml` — CI owns it.
- Plan docs go in `doc/plans/YYYY-MM-DD-slug.md`.
