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
- **Lockfile policy:** Do not **hand-edit** `pnpm-lock.yaml`. Let pnpm regenerate it.

- Dependency **version** bumps: run `pnpm install`, commit the resulting lockfile.
- If the lockfile changes for any reason, it ships in the **same commit** as the manifest change that caused it.

**Renaming or adding a workspace package is the exception that breaks the rule above.** A rename changes the
`workspace:*` specifier in every dependent `package.json`, and `Dockerfile` builds with
`pnpm install --frozen-lockfile` — which *cannot* self-heal. Every Docker and Release job fails with
`ERR_PNPM_OUTDATED_LOCKFILE`. For a package rename you MUST commit the regenerated lockfile, or run
`pnpm install --no-frozen-lockfile` and commit the result.

Verified failure mode: renaming `packages/adapters/letta-af-opencode` to `agent-file` without the
lockfile broke `Docker` and `Release`; adding the 17-line lockfile diff fixed it.

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
5. `pnpm-lock.yaml` is never hand-edited, and is committed alongside whatever manifest change caused it (see §5)

## 15. Commit Style

- Co-author line: `Co-Authored-By: Doer <noreply@doer.donjon.agency>`
- Do not hand-edit `pnpm-lock.yaml`; commit pnpm's regenerated output

## 16. Hard-Won Lessons

Lessons that cost real debugging time. Keep this section updated when you learn something the hard way.

### Packaged Electron app can't read Desktop paths

The packaged Electron app runs with `com.apple.provenance` xattr on its binary. macOS denies `fs.readdir()` on paths under `~/Desktop/` for such processes (EPERM). This means:
- Never hardcode `adapterConfig.memoryDir` to Desktop or Documents paths
- The `resolveOfflineMemoryDir()` fallback chain (`memoryDir` → `LETTA_MEMFS_DIR` → `DOER_AGENT_MEMORY_DIR`) should prefer paths outside macOS sandboxed directories
- If an agent needs filesystem access, use the memfs fs-mount system or paths under `~/.doer/`

### Dev server vs packaged app: different instances

| | Dev server | Packaged Electron app |
|---|---|---|
| Port | 3101 (default) | 3100 |
| Instance path | `~/.doer/instances/default/` | `~/Library/Application Support/@doer/desktop/instances/default/` |
| DB | Separate PGlite | Separate PGlite |

When debugging production issues, check which instance you're hitting. They do not share data.

### fs-mount symlink design

The memfs fs-mount strategy (`server/src/services/memfs/strategies/fs-mount.ts`) uses three-case logic when the symlink target already exists:
1. **Empty directory** → silently replace with symlink (safe, no data loss)
2. **Non-empty directory** → error with actionable message listing files and suggesting `mountAs` change
3. **Wrong symlink** → error with actionable message showing current vs expected target

The `agentWorkspaceService.ensure()` function accepts `skipSubdirs: string[]` so the heartbeat can skip directories managed by fs-mount bindings. This keeps the workspace service DB-free — the heartbeat queries memfs bindings and passes the list.

### Desktop release workflow

```sh
# 1. Bump version in desktop/package.json
# 2. Commit and push to master
git push origin main:master

# 3. Trigger CI pipelines
gh workflow run release.yml          # npm publish (needs NPM_TOKEN secret)
gh workflow run desktop-release.yml  # builds mac/win/linux + GitHub Release

# 4. Update release notes on GitHub
gh release edit vX.Y.Z -R claybowl/doer --notes-file releases/vYYYY.MDD.P.md
```

**Known gap:** `NPM_TOKEN` is not configured in GitHub repo secrets. The `publish_stable` job will fail until that's added. Desktop releases are unaffected.

### DonDog agent specifics

- Agent ID: `fcb51593-643f-42d6-861f-60df74c2726d`
- Company: "Donjon Sales Team" (`ba1dcf35-9204-4273-97ad-2791577351cb`)
- Memfs root: `/Users/clay/Doer/donjon-sales-team/memory` with `pathPrefix: "agents/dondog"`
- After the v0.1.9 fix, `adapterConfig.memoryDir` is `""` (falls through to env vars)
