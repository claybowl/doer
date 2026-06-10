# Capture the Magic — 0.1.0 Direction

_Date: 2026-06-09 · Status: Accepted (Clay, 2026-06-09) · Owner: Clay + #1_

## Context

The DonDog → Chef → Alfie → gremlins orchestration running on Letta Cloud is the proof
that Doer's thesis works. The magic lives in `~/.letta`: identity as markdown files
(persona, instructions, context trees), delegation as shared state (`dd_council_notes`,
`dd_kitchen_queue`, `dispatch_state`, gremlin results blocks), and a git-backed session
protocol (pull → work → commit → push). Nobody commands anybody — the chain is data
agents choose to read.

0.1.0's job: make that magic **visible, editable, and installable** inside Doer —
without turning agents into workflow scripts.

## Design Rule (governs every phase)

> **Users edit who an agent *is*; the agent decides what to *do*.**

- Identity (personas, context, preferences, goals) → editable surface.
- Behavior (delegation, dispatch choices, session cadence) → observable surface, never a DAG editor.
- Protocol (when to read/save memory, how to report) → taught via attached skills, not enforced by code.
- Existing governance (approval gates, budget hard-stops, activity log) remains the only control plane.

## Scope Decision

| Phase | Direction | Ships in |
| --- | --- | --- |
| 1 | **A — Memory as a first-class surface** | 0.1.0 |
| 2 | **B — .af import + Starter Teams** | 0.1.0 |
| 3 | **D-thin — Handoff trail (delegation observability)** | 0.1.0 |
| 4 | **C — Council plugin** | post-0.1.0 (next) |

Rationale: A is already specced with decisions locked
(`2026-06-03-agent-memory-substrate-and-skill-autoattach.md`) and is the substrate B
needs — imported agents must land in visible, predictable memory. B solves demo
population: preconfigured teams, user adds a few tasks for DonDog, the chain does the
rest. D-thin makes the chain legible in the sales demo. C is the biggest build with a
migration prerequisite (rewrite DonDog's autonomous-council memory blocks) and follows
cleanly once A+B exist.

---

## Phase 1 — Memory as a First-Class Surface (A)

Builds directly on the locked substrate plan. Steps 1–5 there are the foundation;
this phase adds the two surfaces that make memory *the product*.

### 1.1 Substrate + skill auto-attach (from 2026-06-03 plan, unchanged)

1. `agents-md-memory` skill (content only).
2. `MEMFS_STRATEGY_SKILL` map in `packages/shared/src/constants.ts`.
3. Union injection at `server/src/routes/agents.ts:636` (+ `listBindingsForAgent` helper).
4. Default **visible** `local-fs` root (e.g. `~/Doer/<org>/memory/`), org-scoped,
   user-pickable in org settings — replaces hidden `.letta-memory`.
5. Memory section in `AgentConfigForm.tsx` (Where / How / auto-attached-skill note).

### 1.2 Resolve the write path (blocker for everything demo-worthy)

`memfs_bindings` default `permission = "read"`. The "watch memory change" demo requires
agent writes landing. Decide and implement: default new bindings to `rw` for the agent's
own `pathPrefix` subtree, `ro` elsewhere. Surgical change in memfs service + binding
defaults. **Do this before the `agents-md-memory` skill teaches saving.**

### 1.3 Editable memory files in the UI

The Instructions-bundle editor already has the full pattern (file browser, inline
editor, save/delete, revisions). Extend the same pattern to memfs:

- `PUT /companies/:companyId/memfs/roots/:rootId/file` (write-through to root, honoring
  binding modes; activity-log every mutation — core invariant).
- Memory view in `AgentDetail` gains edit/save on text files (reuse Instructions editor
  component; keep the 512KB preview limit).
- Fernweh memory view stays read-only for now.

### 1.4 Memory history: "what did this agent learn?"

Memory roots are git-backed (proven pattern in `~/.letta`). Surface it:

- Server: `GET .../memfs/roots/:rootId/history?path=` → commit list;
  `GET .../history/:sha/diff` → unified diff. (If a root isn't a git repo, init one on
  root creation for `local-fs` kind; commit on agent session end + on UI saves.)
- UI: "History" tab in the agent Memory view — session-to-session diffs, human-readable
  ("+ Learned: Cortado call moved to Friday"). This is the demo moment.

### Acceptance (Phase 1)

- Fresh agent boots with visible memory dir at predictable path; `agents-md-memory` in
  desiredSkills when an `fs-mount` binding exists.
- User edits a persona/context file in the UI; agent's next run reflects it; mutation in
  activity log.
- After an agent run, the History tab shows a diff of what memory changed.
- `pnpm -r typecheck && pnpm test:run && pnpm build` green.

---

## Phase 2 — .af Import + Starter Teams (B)

Builds the designed-but-unbuilt `plugin-af-import`
(`2026-04-26-af-import-plugin.md`; fixtures already in
`packages/plugins/examples/plugin-af-import/__tests__/fixtures/` — tony.af, sleuth.af,
scribe.af, mr_solomons.af).

### 2.1 .af import core

- Parse `.af` → unpack memory blocks to the org's memfs root (Letta-Code file layout:
  `system/persona.md`, `context/*.md`, `goals/`, `work/`, `preferences/`).
- Create the Doer agent row (name, role, adapter config) + memfs binding under its
  `pathPrefix` + git init/commit "hired <name>".
- Secrets policy: `.af` files must not carry credentials; importer rejects/strips
  anything resembling a key and logs a warning. Env-var references stay references.
- Honor approval gates: import = hire → existing on-hire approval flow applies.

### 2.2 Team manifests (the new piece)

A team is a manifest + a set of `.af` files:

```jsonc
// teams/donjon-core/team.json
{
  "id": "donjon-core",
  "name": "The Donjon Core",
  "description": "Orchestrator, task master, dispatcher — add goals, they do the rest.",
  "agents": [
    { "af": "dondog.af",  "role": "ceo",      "reportsTo": null },
    { "af": "chef.af",    "role": "executor", "reportsTo": "dondog" },
    { "af": "alfie.af",   "role": "executor", "reportsTo": "chef" }
  ],
  "sharedBlocks": ["council_notes", "kitchen_queue", "dispatch_state", "gremlin_results"],
  "packs": ["sales", "builder", "intel", "content"]   // compatible add-ons
}
```

- Importer hires agents in order, wires `reportsTo`, creates shared-block files under a
  `SHARED/` prefix in the org memory root, and rewrites cross-references (block IDs →
  this org's paths). Company-scope invariant: everything lands inside one company.
- Personas are sanitized exports of the real trio — Clay-specific context
  (`human.md`, Donjon business files) replaced with templated onboarding stubs the
  user's own context fills in.

### 2.3 Gremlin packs

Core trio always included. Packs are optional add-on manifests, 3–5 specialists each,
sourced from the 24-gremlin registry. Initial lineup **[Prototype Placeholder — Clay
curates final rosters]**:

| Pack | Gremlins | Purpose |
| --- | --- | --- |
| Sales | Closer, Prospector, Hunter | Pipeline → signatures |
| Builder | Gizmo, Maker, Mechanic | Automation & tooling |
| Intel | Sleuth, Scout, Spyglass | Research & recon |
| Content | Siren, Pitch, Scribe | Voice, decks, docs |

Each pack ships the gremlin `.af`s + a registry fragment that merges into Alfie's
`gremlin-registry.md` so dispatch triggers work day one.

### 2.4 "Hire a Team" UI

- New entry point beside "New Agent": **Hire a Team** — pick team, toggle packs,
  one approval, done. Org chart populates; DonDog's goals view says "give me a goal."
- Onboarding wizard offers it as the default path (blank-slate hire stays available).

### Acceptance (Phase 2)

- Fresh company → Hire a Team (core + one pack) → org chart shows the chain; every
  agent has populated persona/context visible in the Phase-1 memory surface.
- User adds one goal/issue for DonDog → chain runs on existing heartbeat/issue flow
  without manual wiring; budget hard-stops + approval gates verified intact.
- Import of all fixture `.af`s passes; secrets-strip test passes.

---

## Phase 3 — Handoff Trail (D-thin)

Read-only delegation observability built from data Doer already has.

- Derive a chain timeline per issue: assignment events, sub-issue creation, shared-block
  writes (now visible as memfs file mutations in the activity log), run starts/ends.
- UI: "Trail" panel on IssueDetail + agent dashboard — *DonDog decided → Chef queued →
  Alfie dispatched Closer → result landed*, each step linking to its run transcript.
- No new agent capabilities, no control surface. Watch, don't steer.

### Acceptance (Phase 3)

- For a goal executed by the starter team, the trail renders the full chain with
  working links to transcripts and memory diffs.

---

## Phase 4 — Council Plugin (C, post-0.1.0)

Per `2026-05-19-doer-council-design.md`, unchanged. Sequenced after A+B because:
council sessions read the same memory substrate, councils are demo-ready only when
teams are installable, and the migration prerequisite (archive DonDog's autonomous
council instructions) deserves its own careful pass.

---

## Build Order & Estimates

1. Phase 1.1–1.2 (substrate + write path) — small, mostly specced.
2. Phase 1.3 (memory editing) — small-medium; reuses Instructions editor.
3. Phase 2.1 (af-import core) — medium; plugin scaffold exists, fixtures exist.
4. Phase 2.2–2.3 (team manifests + packs) — medium; mostly content + import logic.
5. Phase 1.4 (memory history/diffs) — medium; biggest UI lift, highest demo value.
6. Phase 2.4 (Hire a Team UI) — small-medium.
7. Phase 3 (handoff trail) — small-medium; derives from activity log.

Each step lands behind `pnpm -r typecheck && pnpm test:run && pnpm build` green, with
plan-doc checkpoints. Recon → triage → surgical → verify → checkpoint.

## Risks & Mitigations

- **Write path scope creep** (1.2): keep it binding-mode defaults only; no new
  permission system. Existing approval gates govern.
- **Sanitizing the trio's personas**: real personas reference Clay's business
  everywhere. Mitigate with a template variable pass (`{{owner}}`, `{{company}}`) and a
  fixture test that greps exported `.af`s for Donjon-specific strings.
- **Seeded-team cost surprise**: a hired team with heartbeats on could burn budget
  idle. Teams import with conservative heartbeat intervals + the standard budget
  ceiling; DonDog's onboarding stub tells the user how to tune.
- **Cross-org leak via shared blocks**: shared blocks live under the org's root only;
  memory stays org-isolated (per locked 2026-06-03 decision).
- **Letta-cloud agents** keep `native-letta` strategy untouched — this plan must not
  regress the live Donjon chain.

## Open Questions

- Pack curation: final rosters and whether packs can be hired post-team (yes, ideally —
  same importer, additive manifest).
- Does 0.1.0 ship with teams beyond donjon-core (e.g. an oil-&-gas-flavored Intel/Sales
  combo for the /partners wedge)?
- History granularity: commit per run vs. per session vs. per file-save (start: per run
  + per UI save).
