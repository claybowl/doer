# Memfs Memory — Technical Plan

**Status:** Draft for review
**Author:** Clay + #1
**Target:** V1 — adapter-agnostic memfs memory surface in Paperclip

---

## Overview

Paperclip agents need a shared memory substrate that transcends the adapter they run under. Today, memory on a Letta-Cloud agent lives as core-memory blocks (streamed into the agent config tab) and, increasingly, as memfs files on disk at `~/.letta`. Agents running under other adapters (`claude-local`, `codex-local`, `cursor-local`, etc.) have no first-class way to consume that same memory.

This plan introduces a **first-class memfs layer at the agent level**, with each adapter declaring *how* it ingests memory via a pluggable strategy. `~/.letta` remains the filesystem source of truth. Paperclip owns bindings, display, and strategy routing; it does not own the content.

## Key V1 Decisions

1. **`~/.letta` is the source of truth.** Paperclip does not host a git repo, object store, or Postgres-backed content store. A `MemfsStore` interface wraps the filesystem; `LocalFsStore` is the only V1 implementation.
2. **Strategy pattern at the adapter layer.** Each adapter declares a `AdapterMemfsCapability` with supported strategies and a default. Per-agent bindings can override the default.
3. **V1 ships two strategies only:** `native-letta` (read-only passthrough for Letta Cloud) and `fs-mount` (symlink per-agent memory into the adapter's working directory, for Claude/Codex/Cursor/OpenCode).
4. **Postgres stores bindings, not content.** Two new tables: `memfs_bindings` and `memfs_roots`.
5. **Read-only MVP.** Writes are deferred to V2. Letta writes via its native tools; Doer displays and routes.
6. **Existing core-memory block streaming is preserved.** Blocks = working memory, memfs = persistent memory. Different UI section.
7. **Existing `SHARED/<name>/memory/.git` convention is preserved.** V1 reads from it; V2 will commit on write.

## Non-Goals (V1)

- **Not** a document store or CMS.
- **Not** a replacement for Letta core-memory blocks.
- **Not** a vector index / semantic search layer (deferred to V2).
- **Not** a knowledge graph.
- **Not** a multi-tenant cloud-hosted memory service. Runs against a local filesystem path only.
- **Not** cross-agent write coordination. Reads only in V1.
- **Not** writes from Paperclip MCP or REST surface. Letta remains the writer.

---

## Source of Truth: `~/.letta` Layout

Observed layout on Clay's filesystem:

```
~/.letta/
  agents/
    agent-<uuid>/memory/*.md           # per-agent persistent memory (flat markdown)
    SHARED/<name>/memory/*.md          # shared memory, already git-versioned
    SHARED/<name>/sync/{linear,notion} # external sync (out of V1 scope)
    SHARED/<name>/src/tasks            # code/tasks (out of V1 scope)
    <Named-Agent>/                     # reserved; optional override of agent-<uuid> convention
  .lettaignore                         # path ignore rules, honored by MemfsStore
  .lettasettings                       # out of V1 scope
```

**V1 addressable paths:**
- Per-agent: `agents/<agent-id>/memory/**`
- Shared: `agents/SHARED/<name>/memory/**`

**Everything else in `~/.letta/` is out of V1 scope** (skills, projects, plans, transcripts, sync, src, viewers, logs, migrations).

The root path is configurable via env var `MEMFS_ROOT` (defaults to `~/.letta`).

---

## Strategy Taxonomy

```ts
// packages/shared/src/memfs.ts

export type MemfsStrategy =
  | "native-letta"          // Letta's own memory runtime owns read/write; Paperclip observes
  | "fs-mount"              // Symlink agent memory path into adapter working dir
  | "mcp-server"            // [V2] Paperclip exposes memfs as MCP; agent connects
  | "tool-callable"         // [V3] Paperclip exposes REST; adapter registers as custom tool
  | "system-prompt-inject"  // [V3] Stuff memory into boot prompt (for light adapters)
  | "none";

export interface AdapterMemfsCapability {
  supported: MemfsStrategy[];
  default: MemfsStrategy;
}
```

### V1 adapter capability assignments

| Adapter            | Default strategy   | Supported (V1)                        | Notes                                              |
|--------------------|--------------------|---------------------------------------|----------------------------------------------------|
| `letta-cloud`      | `native-letta`     | `native-letta`, `none`                | Letta runtime reads `~/.letta` directly            |
| `claude-local`     | `fs-mount`         | `fs-mount`, `none`                    | Claude Code has native Read/Write file tools       |
| `codex-local`      | `fs-mount`         | `fs-mount`, `none`                    | Codex CLI has file tools                           |
| `cursor-local`     | `fs-mount`         | `fs-mount`, `none`                    | Cursor agent has file tools                        |
| `opencode-local`   | `fs-mount`         | `fs-mount`, `none`                    | OpenCode has file tools                            |
| `gemini-local`     | `none`             | `fs-mount`, `none`                    | Verify Gemini CLI file-tool behavior before enable |
| `openclaw-gateway` | `none`             | `none`                                | V3 target (`system-prompt-inject` or `tool-callable`)|
| `pi-local`         | `none`             | `none`                                | V3 target                                          |

### Strategy semantics

- **`native-letta`** — Paperclip reads from `~/.letta/agents/<id>/memory/**` for display and audit; Letta's own runtime handles reads/writes during agent execution. No filesystem manipulation from Paperclip.
- **`fs-mount`** — At agent execution start, Paperclip's `ExecutionWorkspaceService` creates a symlink from `~/.letta/agents/<agent-id>/memory/` into a known path inside the adapter's working directory (e.g., `.memory/`). The adapter's agent reads/writes normally via its own file tools. Symlink is scoped to the agent's own memory plus any SHARED paths bound to the agent.
- **`none`** — No binding. Adapter ignores memfs.
- **Deferred strategies** (`mcp-server`, `tool-callable`, `system-prompt-inject`) — spec only in V1; no implementation.

---

## Schema

Two new tables in `packages/db/src/schema/`:

### `memfs_roots.ts`

Represents a configured memfs root. Scoped per company. V1 will have exactly one row per company pointing at the local `~/.letta` path.

```ts
import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

export const memfsRoots = pgTable(
  "memfs_roots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    kind: text("kind").notNull().default("local-fs"),   // 'local-fs' | future 'mcp' | 'git-hosted'
    rootPath: text("root_path").notNull(),              // e.g. '/Users/clay/.letta'
    label: text("label").notNull().default("letta"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyIdx: index("memfs_roots_company_idx").on(table.companyId),
  }),
);
```

### `memfs_bindings.ts`

Binds a path prefix (relative to a root) to an agent, with a strategy.

```ts
import { pgTable, uuid, text, timestamp, index, unique } from "drizzle-orm/pg-core";
import { agents } from "./agents.js";
import { memfsRoots } from "./memfs_roots.js";

export const memfsBindings = pgTable(
  "memfs_bindings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
    rootId: uuid("root_id").notNull().references(() => memfsRoots.id, { onDelete: "cascade" }),
    pathPrefix: text("path_prefix").notNull(),          // e.g. 'agents/<id>/memory' or 'agents/SHARED/THE-TOWER/memory'
    strategy: text("strategy").notNull().default("fs-mount"), // MemfsStrategy
    permission: text("permission").notNull().default("read"), // 'read' | 'read-write' (V1: 'read' only)
    mountAs: text("mount_as"),                          // optional override for fs-mount symlink name
    label: text("label"),                               // human-readable, e.g. 'own-memory' | 'THE-TOWER'
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    agentIdx: index("memfs_bindings_agent_idx").on(table.agentId),
    rootIdx: index("memfs_bindings_root_idx").on(table.rootId),
    uniqueAgentPath: unique("memfs_bindings_agent_path_uniq").on(table.agentId, table.rootId, table.pathPrefix),
  }),
);
```

Export both from `packages/db/src/schema/index.ts` and run `pnpm db:generate`.

---

## Shared Types & Interfaces

### `packages/shared/src/memfs.ts`

```ts
export type MemfsStrategy =
  | "native-letta"
  | "fs-mount"
  | "mcp-server"
  | "tool-callable"
  | "system-prompt-inject"
  | "none";

export type MemfsPermission = "read" | "read-write";

export interface AdapterMemfsCapability {
  supported: MemfsStrategy[];
  default: MemfsStrategy;
}

export interface MemfsFileEntry {
  path: string;            // relative to the root
  size: number;
  modifiedAt: string;      // ISO
  isDirectory: boolean;
}

export interface MemfsBindingDTO {
  id: string;
  agentId: string;
  rootId: string;
  pathPrefix: string;
  strategy: MemfsStrategy;
  permission: MemfsPermission;
  mountAs: string | null;
  label: string | null;
}
```

### `MemfsStore` interface (server)

Lives in `server/src/services/memfs/store.ts`.

```ts
export interface MemfsStore {
  list(prefix: string): Promise<MemfsFileEntry[]>;
  read(path: string): Promise<Buffer>;
  exists(path: string): Promise<boolean>;
  stat(path: string): Promise<MemfsFileEntry | null>;
  // V2: write, remove, watch
}

export class LocalFsStore implements MemfsStore {
  constructor(private readonly rootPath: string) {}
  // Honors .lettaignore. Refuses paths that escape rootPath (no ..).
}
```

---

## Server Services

New module: `server/src/services/memfs/`.

```
server/src/services/memfs/
├── index.ts
├── store.ts                 # MemfsStore interface + LocalFsStore
├── memfs-service.ts         # Company-scoped CRUD for roots + bindings
├── binding-resolver.ts      # resolve effective strategy for (agent, path)
└── strategies/
    ├── index.ts
    ├── native-letta.ts      # no-op mount logic; Paperclip only observes
    └── fs-mount.ts          # symlink provisioning at execution start
```

### Endpoints (REST)

All under `/api/companies/:companyId/memfs/`.

| Method | Path                              | Purpose                                       |
|--------|-----------------------------------|-----------------------------------------------|
| GET    | `/roots`                          | List memfs roots for company                  |
| POST   | `/roots`                          | Create a root                                 |
| GET    | `/bindings?agentId=<id>`          | List bindings for an agent                    |
| POST   | `/bindings`                       | Create a binding                              |
| DELETE | `/bindings/:id`                   | Remove a binding                              |
| GET    | `/files?bindingId=<id>&prefix=`   | List files inside a binding's path            |
| GET    | `/files/:bindingId/:path*`        | Read a file's contents (for UI preview)       |

All routes enforce company scoping and reject path escapes (`..`, symlink traversal).

### Execution integration

`server/src/services/execution/workspace-service.ts` (or equivalent) invokes the strategy:

```ts
// pseudocode at execution start
const bindings = await memfsService.getBindingsForAgent(agentId);
for (const binding of bindings) {
  const strategy = resolveStrategy(agent.adapterType, binding.strategy);
  await strategy.mount({ binding, workspace });
}
```

For V1:
- `native-letta.mount` → no-op.
- `fs-mount.mount` → create symlink `${workspace}/${binding.mountAs ?? '.memory'}/${binding.label}` → `${root.rootPath}/${binding.pathPrefix}`. Permission `read` is enforced at the filesystem layer via mount flags where possible, and at the strategy layer as a soft guard (V1 does not yet write from Paperclip).

---

## UI Plan

New tab on agent config panel: **"Memory"**.

### Layout

1. **Working Memory** (existing)
   - Keep current core-memory block streaming for `letta-cloud` agents.
   - Unchanged in V1.

2. **Persistent Memory** (new)
   - Lists bindings with: label, path prefix, strategy (dropdown), permission, quick "View files" action.
   - "Add binding" modal:
     - Pick root (V1: only `~/.letta`).
     - Pick path prefix from a filesystem-scoped picker (agents/\<id\>/memory, agents/SHARED/\<name\>/memory).
     - Pick strategy (filtered by adapter's `AdapterMemfsCapability.supported`).
     - Permission (`read` forced in V1).
   - File viewer: tree + markdown preview (read-only).

3. **Cross-references**
   - Agent detail header shows a small "N memory bindings" badge linking to the tab.

### Component tree

```
ui/src/features/memfs/
├── MemfsTab.tsx
├── BindingList.tsx
├── AddBindingDialog.tsx
├── MemfsFileBrowser.tsx
├── MemfsFileViewer.tsx
└── hooks/
    ├── useMemfsBindings.ts
    └── useMemfsFiles.ts
```

---

## Phase Table

| Phase | Scope                                                                                          | Unlocks                                              |
|-------|------------------------------------------------------------------------------------------------|------------------------------------------------------|
| **P1** | `LocalFsStore`, `memfs_roots` + `memfs_bindings` schema, REST endpoints, UI Memory tab, `native-letta` and `fs-mount` strategies wired through execution workspace, `letta-cloud` + one `fs-mount` adapter (claude-local) verified end-to-end | Cross-adapter shared memory; Letta memfs visible in Doer for every agent |
| **P2** | Writes (`MemfsStore.write`, optimistic-concurrency or advisory locks), git commit on write for SHARED paths, `mcp-server` strategy, `memory.search` via vector index (embeddings + pgvector or local index) | Two-way sync; agents write persistent memory via Doer; semantic search |
| **P3** | `tool-callable` + `system-prompt-inject` strategies, remote deployment path (Doer server ≠ Clay's machine), hosted git backend as alt `memfs_roots.kind`, multi-user | Production-ready, remote, multi-tenant |

---

## Open Questions

1. **Symlink vs. bind-mount vs. copy** for `fs-mount`. Symlinks are simplest and match how `SHARED/<name>/memory/.git` already works, but some adapters' sandboxes may restrict symlink traversal. Need to verify against each local adapter's workspace setup (`packages/adapters/*/src/server/execute.ts`).
2. **Windows support.** `fs-mount` via symlinks requires dev-mode on Windows or admin privileges. Fallback: per-run copy-then-rsync-back. Out of V1 scope but document.
3. **What happens to bindings when an agent is deleted?** `ON DELETE CASCADE` on `agentId` — decided in schema. Confirm this matches the pattern elsewhere (compare to `agent_api_keys`, `agent_config_revisions`).
4. **Permission granularity.** Is `read` vs. `read-write` enough, or do we need `read-own / read-shared / write-own`? V1 lands `read` only; defer.
5. **Does `native-letta` need to render anything?** Proposal: yes — the Memory tab's file viewer uses `MemfsStore.read()` regardless of strategy, so Clay can see the same content Letta sees. Visibility is independent of write authority.
6. **Multi-root per company.** V1 supports the table shape but UI only exposes one. When does a second root enter the picture? (Likely when Clay adopts hosted git or moves a machine.)
7. **Budget/audit.** Should memfs reads/writes emit `activity_log` events? Recommend **yes for writes (V2)**, no for reads.
8. **Testing.** PromptFoo eval for "agent successfully references a bound memfs file in its response" — proves the loop end-to-end.

---

## Acceptance Criteria (V1)

- [ ] Schema generated and applied (`pnpm db:generate`, `pnpm db:migrate` on a fresh PGlite).
- [ ] A Letta-Cloud agent appears in the Memory tab with its `~/.letta/agents/<id>/memory/` files listed, strategy `native-letta`.
- [ ] A `claude-local` agent can be given an `fs-mount` binding for its own memory path, and on next run, that memory appears under `.memory/` in its working directory.
- [ ] A `claude-local` agent with a SHARED binding (e.g. `agents/SHARED/THE-TOWER/memory`) sees those markdown files in its workspace and references them in-task.
- [ ] Attempting path traversal (`../../../etc/passwd`) via the REST endpoint or binding dialog is rejected.
- [ ] `pnpm -r typecheck` and `pnpm test:run` pass.
- [ ] Existing core-memory block streaming for Letta agents remains functional and unchanged.
- [ ] Plan doc is referenced from the implementing PR; `AGENTS.md` gets a one-line entry pointing at memfs.

---

## Rollout

1. Merge schema + `MemfsStore` + `memfs-service` + REST endpoints (no UI).
2. Merge UI Memory tab reading from the above.
3. Merge `fs-mount` strategy integration into execution workspace for one adapter (`claude-local`).
4. Verify end-to-end against a Letta + a claude-local agent on Clay's machine.
5. Roll to remaining `fs-mount`-supporting adapters (`codex-local`, `cursor-local`, `opencode-local`).
6. Close V1. Open V2 plan doc.

---

## Contract Sync Checklist

Per `AGENTS.md` / `DEVELOPING.md`:

- [ ] `packages/db` — new schema, exports from `index.ts`, migration generated.
- [ ] `packages/shared` — `MemfsStrategy`, `AdapterMemfsCapability`, `MemfsBindingDTO`, API path constants.
- [ ] `packages/adapters/*` — each adapter's `index.ts` (or capability module) exports `memfsCapability: AdapterMemfsCapability`.
- [ ] `server` — routes, service, strategy implementations, execution-workspace integration.
- [ ] `ui` — Memory tab, hooks, file viewer.
- [ ] `evals` — smoke eval: "agent reads from a bound memfs path and cites it."
