# AGENTS.md

Guidance for AI contributors working in the Doer repository.

## 1. Purpose

Doer is a control plane for AI-agent companies — not a chatbot or task manager. It orchestrates teams of AI agents with cost control, governance, approval gates, and goal-ancestry tracing.

The current implementation target is V1, defined in `doc/SPEC-implementation.md`. Long-horizon product context lives in `doc/SPEC.md`.

## 2. Read This First

Before making changes, read in this order:

1. `doc/GOAL.md` — vision and thesis
2. `doc/PRODUCT.md` — product definition, principles, user flows
3. `doc/SPEC-implementation.md` — concrete V1 build contract
4. `doc/DEVELOPING.md` — full dev guide, Docker, worktrees
5. `doc/DATABASE.md` — schema, migrations, DB modes

## 3. Repo Map

```
server/           Express REST API + orchestration services (@doerai/server)
ui/               React 19 + Vite board UI (@doerai/ui), served by API in dev
cli/              doerai CLI package
packages/
  db/             Drizzle ORM schema, migrations, PGlite client (@doerai/db)
  shared/         Shared types, constants, validators, API path constants
  adapters/       Agent adapter packages (claude-local, codex-local, cursor,
                  gemini-local, letta-cloud, openclaw-gateway, opencode-local, pi-local)
  adapter-utils/  Shared adapter utilities
  plugins/        Plugin system + example plugins
  plugin-sdk/     Plugin SDK (must be built before server typecheck)
desktop/          Electron desktop shell (separate release flow)
doc/              Architecture, product, spec docs
evals/            PromptFoo eval framework
skills/           Runtime skill injection for agents
```

**Adapter registry:** `server/src/adapters/registry.ts` — register new adapters here. The `letta-cloud` adapter is the most current reference pattern. Letta agents use `kimi-k2-5`, not Anthropic models.

## 4. Dev Commands

All commands run from repo root. pnpm 9.15.4 required. Node 20+.

```sh
pnpm install
pnpm dev              # API + UI watch mode, auto-restart on workspace changes
pnpm dev:once         # single boot, no file watching
pnpm dev:server       # server only
pnpm dev:ui           # UI only
pnpm build            # build all packages
pnpm -r typecheck     # type-check all packages
pnpm test:run         # run unit tests (vitest, non-interactive)
pnpm test             # vitest watch mode
pnpm test:e2e         # Playwright E2E tests
pnpm evals:smoke      # PromptFoo eval suite
pnpm db:generate      # compile schema + generate migration
pnpm db:migrate       # apply pending migrations
```

**Single test file:** `pnpm vitest run path/to/test.ts`

**Health check:**
```sh
curl http://localhost:3100/api/health
curl http://localhost:3100/api/companies
```

**Reset local dev DB (embedded PGlite):**
```sh
rm -rf data/pglite && pnpm dev
# or for the default instance:
rm -rf ~/.doer/instances/default/db && pnpm dev
```

**One-command bootstrap:** `pnpm doerai run` — auto-onboards, runs doctor, starts server.

**Docker quickstart:** `docker compose -f docker-compose.quickstart.yml up --build`

## 5. Monorepo Conventions

- **Package manager:** pnpm 9.15.4 (enforced via `packageManager` in root package.json)
- **Workspace:** `pnpm-workspace.yaml` covers `packages/*`, `packages/adapters/*`, `packages/plugins/*`, `packages/plugins/examples/*`, `server`, `ui`, `cli`
- **TypeScript:** `NodeNext` module resolution, `ES2023` target, `strict` enabled. `tsconfig.base.json` excludes `* 2.*`, `* 3.*`, `* copy.*` files.
- **Lockfile policy:** CI owns `pnpm-lock.yaml`. **Do not commit it in PRs.** PR CI blocks manual lockfile edits and validates dependency resolution when manifests change.

## 6. Database Change Workflow

When changing data model:

1. Edit `packages/db/src/schema/*.ts`
2. Export new tables from `packages/db/src/schema/index.ts`
3. `pnpm db:generate` — this **compiles packages/db first** (drizzle.config.ts reads `dist/schema/*.js`), then generates migration
4. `pnpm -r typecheck` to validate

**Key note:** `packages/db/drizzle.config.ts` reads compiled schema from `dist/schema/*.js`. `pnpm db:generate` handles the compile step, but if you run drizzle-kit directly, ensure the package is built first.

## 7. Contract Sync Rule

Schema/API changes must propagate through all four layers:

```
packages/db  →  packages/shared  →  server  →  ui
```

When modifying:
- **DB layer:** schema, migrations, exports
- **Shared layer:** types, constants, validators, API path constants
- **Server layer:** routes, services, auth checks
- **UI layer:** API clients, pages, company-scoped components

## 8. Core Engineering Rules

1. **Company-scoped everything.** Every domain entity belongs to a company. Routes and services must enforce company boundaries. Agent API keys must not access other companies.

2. **Preserve control-plane invariants:**
   - Single-assignee task model with atomic issue checkout
   - Approval gates for governed actions (hires, CEO strategy)
   - Budget hard-stop auto-pause when limits are hit
   - Activity logging for all mutating actions
   - Agent keys hashed at rest, scoped to their company

3. **Do not replace strategic docs wholesale.** Prefer additive updates. Keep `doc/SPEC.md` and `doc/SPEC-implementation.md` aligned.

4. **Plan docs dated and centralized.** New plans go in `doc/plans/YYYY-MM-DD-slug.md`.

## 9. API and Auth Expectations

- Base path: `/api`
- Board access = full-control operator context
- Agent access = bearer API keys (`agent_api_keys`), hashed at rest
- When adding endpoints:
  - Apply company access checks
  - Enforce actor permissions (board vs agent)
  - Write activity log entries for mutations
  - Return consistent HTTP errors (`400/401/403/404/409/422/500`)

## 10. UI Expectations

- Keep routes and nav aligned with available API surface
- Use company selection context for company-scoped pages
- Surface failures clearly; do not silently ignore API errors
- The UI is served by the API server in dev (same origin). In production it's a static build served from Express.

## 11. Verification Before Hand-off

Run this full check before claiming done:

```sh
pnpm -r typecheck
pnpm test:run
pnpm build
```

If anything cannot be run, explicitly report what was not run and why.

**CI runs:** typecheck → test → build → release canary dry-run (on PRs). E2E runs separately with `DOER_E2E_SKIP_LLM=true`.

## 12. Release Model

- **Calendar versioning:** `YYYY.MDD.P` (stable), `YYYY.MDD.P-canary.N` (canary)
- **Canaries:** auto-published on every push to `master` via GitHub Actions
- **Stables:** manually promoted from a chosen commit via `workflow_dispatch`
- **Release notes:** `releases/vYYYY.MDD.P.md` (stable only)
- **Desktop:** separate Electron release flow in `desktop/`, published to S3 + auto-updater

## 13. Worktree Development

When working from multiple git worktrees, use isolated Doer instances to avoid DB collisions:

```sh
pnpm doerai worktree init
# or combined:
pnpm doerai worktree:make <branch-name>
```

This creates an isolated instance under `~/.doer-worktrees/instances/<worktree-id>/` with a free app port and embedded PG port. Normal commands like `pnpm dev` auto-scope to the worktree instance when inside one.

## 14. Definition of Done

A change is done when all are true:

1. Behavior matches `doc/SPEC-implementation.md`
2. Typecheck, tests, and build pass (or explicitly noted why not)
3. Contracts are synced across db/shared/server/ui
4. Docs updated when behavior or commands change
5. No `pnpm-lock.yaml` committed (CI owns it)

## 15. Commit Style

- Co-author line: `Co-Authored-By: Doer <noreply@doer.donjon.agency>`
- Do not commit `pnpm-lock.yaml`
