# Agent Memory: Substrate + Skill Auto-Attach

_Date: 2026-06-03 · Status: Proposed · Owner: Clay_

## Problem

The memfs / project-folder / Letta memory infrastructure *feels* over-complicated
and Letta-centric. In practice:

- Memory lands in hidden config paths (`.../instances/default/workspaces/agents/<uuid>/.letta-memory`).
- Not every agent has predictable access to it.
- The system was built around Letta Cloud agents, which we use less often than expected.
- An agent has the *files* but no *instructions* on when to read, what to save, or what format to use.

What we actually want:

1. A dedicated memory filesystem attached to each agent in a **predictable place**.
2. The **user decides where** their memory lives.
3. When a memory type is chosen in agent config, the agent is **also taught how to use it**
   via an attached skill (loaded at runtime).
4. Two starting options: **memfs in an accessible location**, and a simple **AGENTS.md memory** system.

## Core Principle: Substrate + Protocol

Memory has two separable layers. Conflating them is the source of the "too complicated" feeling.

| Layer         | Question it answers                          | Owned by                          |
| ------------- | -------------------------------------------- | --------------------------------- |
| **Substrate** | Where do the bytes live? How do they reach the agent at runtime? | memfs root (kind) + strategy (mount) |
| **Protocol**  | When to read? What to save? What format?     | An attached **skill**             |

The user's hypothesis — *"any memory design works so long as a skill teaches the agent
how to use it"* — is **correct but incomplete**. The skill (protocol) is necessary but
not sufficient: it only works if the substrate guarantees the files are actually present
at a predictable path at boot. Always **substrate + skill**, paired.

## Good News: The Bones Already Exist

This is a UX/defaults change, **not a rearchitecture**. The generality is already in the schema;
V1 only surfaced the Letta path in a hidden location, which is why it reads as Letta-centric.

| Capability | Where it lives today |
| --- | --- |
| **Where memory lives** (axis) | `MEMFS_ROOT_KINDS = ["local-fs", "mcp", "git-hosted"]` — `packages/shared/src/constants.ts`. `memfs_roots` table. |
| **How it's ingested** (axis) | `MEMFS_STRATEGIES = ["native-letta", "fs-mount", "mcp-server", "tool-callable", "system-prompt-inject", "none"]`. Pluggable registry: `server/src/services/memfs/strategies/index.ts`. |
| **Per-agent binding** | `memfs_bindings` (agent → root → pathPrefix → strategy → `mountAs`). The `mountAs` field is "the predictable place." |
| **Adapter capability** | `AdapterMemfsCapability { supported, default }` — adapters declare which strategies they support. |
| **Skill injection at runtime** | `packages/adapter-utils/src/server-utils.ts` resolves + mounts desired skills per agent. |
| **Desired-skill union** | `server/src/routes/agents.ts:636` — `desiredSkills = requiredSkills ∪ resolvedRequestedSkills`. |

Only `native-letta` and `fs-mount` strategies are implemented in V1; the rest are
declared and forward-compatible.

## The One Missing Mechanism

Skill attachment exists. Binding creation exists. **They are not linked.**

When a user picks a memory type (strategy) for an agent, nothing currently ensures the
matching teaching skill is attached. That is the only net-new wiring.

## Recommendation

**Do not introduce a new "memory type" concept.** Collapse the agent-config UI to the two
axes that already exist, plus auto-skill:

1. **Where** → root kind + path. Default to a *visible* `local-fs` root, not hidden `.letta-memory`.
2. **How** → strategy.
3. **Protocol** → a skill auto-attached, keyed to the (kind, strategy) pair.

### Default for most agents

`local-fs` root at a **visible, user-chosen path** + `fs-mount` strategy + an **`agents-md-memory`** skill.

Letta stops being the center of gravity — it becomes one option:
`git-hosted` root + `native-letta` strategy + the existing `letta-memory` skill.

This directly fixes "far away in hidden config, not every agent has access."

---

## Spec: Strategy → Skill Auto-Attach

### 1. The mapping

A single source-of-truth map from memfs strategy to the teaching skill it requires.

```ts
// packages/shared/src/constants.ts  (new export)
export const MEMFS_STRATEGY_SKILL: Partial<Record<MemfsStrategy, string>> = {
  "fs-mount": "agents-md-memory",     // new skill (see §3)
  "native-letta": "letta-memory",     // already exists
  "system-prompt-inject": "",         // inline — no skill needed
  "mcp-server": "",                   // TBD when implemented
  "tool-callable": "",                // TBD when implemented
  "none": "",
};
```

> Note: `fs-mount` can carry different protocols (AGENTS.md-style vs. a richer memory layout).
> If we need that distinction, key the map on `(strategy, rootKind)` or add a `protocol`
> column to `memfs_bindings` rather than overloading strategy. Start with strategy-only;
> upgrade only if a second `fs-mount` protocol actually appears. (Karpathy rule 2.)

### 2. The injection point

`desiredSkills` is computed as a union at `server/src/routes/agents.ts:636`:

```ts
const desiredSkills = Array.from(new Set([...requiredSkills, ...resolvedRequestedSkills]));
```

Add the memory-protocol skills as a third set in this union, derived from the agent's
memfs bindings:

```ts
const memorySkills = (await memfs.listBindingsForAgent(companyId, agentId))
  .map((b) => MEMFS_STRATEGY_SKILL[b.strategy])
  .filter((k): k is string => Boolean(k));

const desiredSkills = Array.from(
  new Set([...requiredSkills, ...resolvedRequestedSkills, ...memorySkills]),
);
```

This keeps auto-attach **declarative and idempotent**: it is recomputed from current
bindings on every config resolve, so removing a binding naturally drops its skill (unless
the user also requested it explicitly).

### 3. New skill: `agents-md-memory`

A bundled Doer skill (sibling to the existing `letta-memory` skill) that teaches an agent
the AGENTS.md-style protocol:

- **Where**: read/write memory at the mounted path (`mountAs`, e.g. `./memory/` or `./AGENTS.md`).
- **When to read**: at task start, before answering questions about people/projects/terms.
- **What to save**: durable facts (decisions, glossary, people, project state) — not transient chatter.
- **Format**: the `CLAUDE.md`-style working-memory layout (Me / People / Terms / Projects / Preferences),
  with deeper files under `memory/`.

Reuse the structure already proven in the productivity + memory-init skills.

### 4. Config-form surface

In `ui/src/components/AgentConfigForm.tsx`, expose a **Memory** section:

- **Where** select → root kind (`local-fs` default) + a path picker for `local-fs`.
- **How** select → strategy, filtered to the adapter's `AdapterMemfsCapability.supported`,
  defaulting to `AdapterMemfsCapability.default`.
- A read-only note: *"This will attach the **{skill}** skill so the agent knows how to use this memory."*
- On save → create/update the `memfs_binding`; the auto-attach (§2) handles the skill.

### 5. Binding-create safety net (optional, V2)

The §2 union recomputes skills on config resolve, which covers runtime. If we want the
skill to appear in the agent's listed skills *immediately* on binding creation (not just at
next resolve), have `memfs-service.createBinding` also nudge `desiredSkills`. Defer unless
the lag is user-visible — the resolve-time union is the simpler, single-source path.

---

## Build Order

1. **New `agents-md-memory` skill** (skill content only; no code). → verify: an agent with the
   skill attached can describe its own memory protocol.
2. **`MEMFS_STRATEGY_SKILL` map** in shared constants. → verify: `pnpm -r typecheck`.
3. **Union injection** at `agents.ts:636` + `listBindingsForAgent` helper if missing. →
   verify: create an `fs-mount` binding, resolve agent config, assert `agents-md-memory` ∈ desiredSkills.
4. **Default visible `local-fs` root** for new companies/agents (replace hidden `.letta-memory` default).
   → verify: a fresh agent boots with a memory dir at a predictable, visible path.
5. **Config-form Memory section** in `AgentConfigForm.tsx`. → verify: pick where/how, save,
   confirm binding + auto-attached skill in the agent view.

Steps 1–3 are the core and are small. 4 is the UX win. 5 makes it usable without API calls.

## Memory Location: Org-Scoped, User-Pickable (RESOLVED 2026-06-03)

Decisions locked after review:

- **Location is org-scoped, not per-agent.** This already matches the schema:
  `memfs_roots.companyId` + `rootPath`. One root per org owns one location; every agent
  in that org binds under it via `memfs_bindings.pathPrefix` (which namespaces each agent
  into its own subfolder). Users pick the *org's* location, not each agent's.

  ```
  Org (company)
    └── memfs_root   (ONE user-pickable rootPath)
          ├── <agent-a>/   (pathPrefix)
          ├── <agent-b>/
          └── <dondog>/
  ```

- **Default location is visible + user-pickable.** Replace the hidden `~/.letta`-style
  default with a visible path, e.g. `~/Doer/<org-name>/memory/`, editable in org settings.
  The only missing build is UI to set/change `memfs_roots.rootPath` — additive.

- **This is an `fs-mount`-only concern.** `native-letta` agents keep their memory in
  `.letta` (Letta owns reads/writes); the agent is taught the path via pointer-instructions
  in its system prompt, as today. **Letta agents need no user-pickable location** and are
  out of scope for the location picker. The picker applies only to `local-fs` / `fs-mount`.

- **Memory is org-isolated by default — keep it that way.** A persona that works in two
  orgs is two agent rows (company-scope is a core invariant), each binding to its own org's
  root. Their memories cannot see each other. This is the correct, secure default — cross-org
  memory bleed is a data-leak vector. If a persona ever genuinely needs to remember across
  orgs, model it as a separate, **explicit opt-in** user/personal-scoped root (owned by the
  user, deliberately flagged as crossing org boundaries) — never the default.

- **Future generalization (note only, out of scope here):** the same "org picks its base
  location" pattern extends to outputs/deliverables later (one org base dir, subpaths for
  `memory/`, `outputs/`, etc.). Keep this change scoped to memory for now.

## Open Questions

- **Single vs. multi protocol on `fs-mount`**: do we ever need two different `fs-mount`
  protocols at once? If yes, promote `protocol` to a first-class field on the binding.
- **read vs. read-write**: bindings default to `permission = "read"` (writes are V2). The
  `agents-md-memory` skill should teach saving — confirm write path lands before/with the skill,
  or scope the skill to read-only until V2.
