# Wiki + Knowledge Graph Plugin — Technical Plan

**Status:** Draft for review
**Author:** Clay + #1
**Target:** V1 — `@doerai/plugin-wiki-graph`, mounted at `/:companyPrefix/wiki`
**Depends on:** memfs V1 (plan: `2026-04-17-memfs-memory.md`, shipped 2026-04-18)

---

## Overview

Doer's agents now have two durable surfaces:

- **memfs** — persistent agent memory at `~/.letta/agents/**` (mind)
- **gremlin outputs** — shipped issue work-product, delivered artifacts (hands)

These two surfaces are legible to humans only through disconnected primitives: memory files on disk, issue lists in the UI, delivered showcase pages. There is no view that shows *how agent thinking connects to agent work* across a company over time.

This plugin ships that view, as a portable Paperclip plugin, following two well-known patterns:

- **Karpathy's LLM Wiki** (gist 442a6bf5): a persistent, LLM-maintained collection of interlinked markdown (entities, concepts, summaries) with `index.md` + `log.md`. The LLM owns the wiki entirely; the human curates sources and asks questions.
- **Graphify** (safishamsi/graphify): multimodal extraction to a weighted knowledge graph (NetworkX + Leiden communities, tagged `EXTRACTED` / `INFERRED` / `AMBIGUOUS`), with an interactive vis.js HTML view, god-node / surprising-connection reporting, and a wiki/ output.

This plan implements both, TS-native, inside the Paperclip plugin system.

## Goals

1. **One navigable view** across memfs memory + gremlin outputs per company.
2. **Interactive knowledge graph** — click nodes, search, filter by community, jump to source page.
3. **Karpathy-style wiki** — interlinked entity / concept / agent / task pages; `index.md`, `log.md`; LLM-maintained.
4. **Derived cache** — wiki + graph are *regenerable* from memfs + outputs. Clay can nuke and rebuild.
5. **Optional promotion to memfs** — explicit action to publish the wiki into `~/.letta/agents/SHARED/Wiki/memory/`, joining Doer's agent memory conventions.
6. **Honest extraction** — every edge tagged `EXTRACTED` / `INFERRED` / `AMBIGUOUS`. No hallucinated structure hidden from the user.
7. **Company-scoped, governed, budgeted** — respects Doer's core invariants (company scope, budget hard-stop, activity log).

## Non-Goals (V1)

- **Not** a replacement for memfs or gremlin outputs. Pure read-and-derive layer.
- **Not** multi-company. One graph per company; no cross-company linking.
- **Not** real-time watch mode. V1 is manual-trigger + scheduled job; watch is V2.
- **Not** a code AST extractor. V1 treats code files as text (LLM pass only). Tree-sitter integration is V2 if signal warrants.
- **Not** a semantic search / vector index. V1 uses LLM + text-match over the graph.
- **Not** Neo4j / Cypher export. V1 emits `graph.json` and `graph.html` only. `--graphml` / `--svg` are V2.

---

## Architecture

### Three layers (Karpathy pattern, adapted)

| Layer | Path | Authority | Mutability |
|-------|------|-----------|------------|
| **Raw** | `~/.letta/agents/**/memory/*.md`, issue work-products, delivered artifacts | memfs + gremlins | Read-only from plugin's perspective |
| **Wiki** | `{pluginDataDir}/wiki/<companyId>/` | Plugin (LLM-maintained) | Plugin rewrites on every ingest |
| **Graph** | `{pluginDataDir}/graph/<companyId>/graph.json` + SHA256 cache | Plugin | Plugin rewrites; cache makes re-runs cheap |

**Optional promotion:** an explicit `publish-to-memfs` action copies `wiki/<companyId>/` into `~/.letta/agents/SHARED/Wiki/memory/` so Letta agents can see the wiki. Publication is one-way, timestamped, and logged. Clay triggers it when he wants; no auto-sync.

### Paperclip integration

```
packages/plugins/examples/plugin-wiki-graph/
├── package.json                     # @doerai/plugin-wiki-graph
├── tsconfig.json
├── scripts/build-ui.mjs             # esbuild for UI bundle (matches plugin-delivered)
├── README.md
└── src/
    ├── constants.ts                 # PLUGIN_ID, slots, data-keys, action-keys
    ├── manifest.ts                  # PaperclipPluginManifestV1
    ├── index.ts                     # re-exports
    ├── worker.ts                    # plugin worker — registers data + action handlers
    ├── memfs/
    │   ├── reader.ts                # walks ~/.letta (or MEMFS_ROOT), honors .lettaignore
    │   └── hasher.ts                # SHA256 cache key per file
    ├── extract/
    │   ├── llm.ts                   # concept/edge extraction prompts
    │   ├── links.ts                 # parse [[wiki-links]], markdown links, frontmatter
    │   └── budget.ts                # respects Doer budget hard-stop per invariants
    ├── graph/
    │   ├── build.ts                 # assemble nodes+edges, compute degrees + communities
    │   ├── community.ts             # Leiden in TS (graspologic-js OR port) or Louvain fallback
    │   └── report.ts                # GRAPH_REPORT.md: god nodes, surprising edges, questions
    ├── wiki/
    │   ├── render.ts                # generate entity/concept/agent/task pages + index.md + log.md
    │   └── publish.ts               # optional promote-to-memfs action
    └── ui/
        ├── index.tsx                # Page + Sidebar exports
        ├── GraphView.tsx            # vis.js wrapper
        ├── WikiBrowser.tsx          # page viewer with internal links
        └── IngestPanel.tsx          # trigger ingest / lint, show last-run stats
```

### Capabilities declared in manifest

```ts
capabilities: [
  "companies.read",
  "projects.read",
  "issues.read",
  "agents.read",
  "goals.read",
  "activity.log.write",     // log every ingest + publish
  "plugin.state.read",
  "plugin.state.write",     // persist last-run metadata, graph.json pointer
  "secrets.read-ref",       // LLM API key reference
  "http.outbound",          // LLM calls
  "ui.page.register",
  "ui.sidebar.register",
  "ui.action.register",     // trigger ingest / publish from UI
  "metrics.write",          // token spend per ingest
  "jobs.schedule",          // nightly lint pass
];
```

### Where memfs bytes actually come from — open architectural question

The plugin SDK **does not** currently expose a memfs read surface (`PluginContext` has no `memfs` client; see `packages/plugins/sdk/src/types.ts:1097`). Two paths:

- **Path A — Extend SDK with `ctx.memfs`:** add `PluginMemfsClient` to `PluginContext`, backed by the `memfs_roots` + `memfs_bindings` tables from memfs V1. Capability: `memfs.read`. Cleanest, sandboxed, reusable for future plugins (e.g. a PII lint plugin). Costs ~200–300 LOC in `packages/plugins/sdk` + `server/src/plugins/context-builder.ts` + a handful of tests.
- **Path B — Direct Node `fs` from the worker:** the plugin worker runs in Doer's server process; Node's `fs` is trivially available. Fast, zero SDK change. Downsides: escapes the plugin sandbox model, sets a precedent for other plugins to do the same, no capability gating, not portable to future out-of-process worker isolation.

**Recommendation:** Path A. It's the right bone to grow. Estimated add: 0.5 day of work; unblocks this plugin and any future memfs-reading plugin cleanly.

This plan assumes Path A.

---

## Data flow

### Ingest (manual-trigger or scheduled)

```
1. Plugin worker action: `ingest` (params: { companyId, scope? })
2. memfs reader walks ~/.letta/agents/** (honors .lettaignore) — per company binding
3. Doer services list completed issues + delivered artifacts for companyId
4. For each file/artifact:
     a. SHA256 hash → cache lookup; skip if unchanged
     b. Link-extract: [[wiki-links]], markdown links, frontmatter — these are FREE edges
     c. LLM concept-extract: produce candidate nodes (entities/concepts/people/agents/tasks)
        and candidate edges, each tagged EXTRACTED | INFERRED | AMBIGUOUS
        — budget-gated, batched, cached per SHA
5. Merge candidates into graph.json (stable node IDs by slug + type)
6. Compute:
     - Degrees (god nodes = top-N by weighted degree)
     - Communities (Leiden; fallback to Louvain if JS lib unavailable)
     - Surprising edges (composite score: cross-community + type-crossing + low prior)
7. Render wiki:
     - One .md per node (slugified, interlinked with [[links]])
     - index.md (category catalog)
     - log.md (append-only: `## [2026-04-21] ingest | 12 sources, 140 edges, 3.2k tokens`)
     - GRAPH_REPORT.md (god nodes, surprising connections, suggested questions)
8. Write activity-log entry: { companyId, kind: "wiki.ingest", files, tokens, cost }
9. Emit metric: tokens_spent_per_ingest, files_processed, edges_added
```

### Query

UI calls `ctx.data.get('wiki.search', { q })`. The worker:

1. Loads graph.json + wiki index.
2. Text-match + neighborhood expand (2-hop) for candidate pages.
3. Returns ranked list with citations → UI renders `WikiBrowser`.

Filed answers: user can click **"file this answer"** → a new wiki page gets appended + indexed, exactly like Karpathy describes.

### Lint (scheduled nightly job)

Asks the LLM, over a sampled slice of the wiki:

- Orphan pages (no inbound links)
- Contradictions across pages
- Stale claims (newer sources supersede)
- Suggested questions the graph is uniquely positioned to answer

Emits a **Wiki Health Report** page, appended to `log.md`.

---

## UI surfaces

- **Page** at `/:companyPrefix/wiki` — left nav: `Graph | Wiki | Inbox (lint findings) | Ingest`
- **Sidebar item** — "Wiki & Graph", badge shows pending lint findings
- **Graph view** — vis.js, dark mode first, communities colored, node click → wiki page in split pane
- **Wiki browser** — markdown renderer with `[[wiki-link]]` resolution, frontmatter chips, "file answer back" button
- **Ingest panel** — last-run stats, "Run now", "Run + publish to memfs", source toggle (memfs / outputs / both), token budget display
- **Graph report** drawer — god nodes, surprising connections, suggested questions, all clickable

### Visualization choice

vis.js (Graphify uses it; small, dark-mode friendly, zero backend). d3-force is richer but heavier for V1. Cytoscape.js is a V2 upgrade path if we need performance or layouts vis.js can't do.

---

## Schema changes

None to Doer core. All persistence lives in:

- **`ctx.state`** — per-plugin KV for small values (last-run timestamps, budget knobs)
- **`ctx.entities`** — plugin-owned rows for: `wiki_node`, `wiki_edge`, `wiki_page`, `ingest_run`. These are queryable from the UI via `ctx.data` handlers and visible in Doer's activity log.
- **Filesystem** — `{pluginDataDir}/wiki/<companyId>/*.md` + `graph/<companyId>/graph.json` + `cache/`

Plugin data dir resolved via `ctx.state` (writes land in Doer-managed storage, survives plugin upgrade).

---

## Budget + governance

- Every LLM call routed through Doer's model registry; budget hard-stop applies (invariant: agents auto-pause when budget exhausted — plugins must respect the same).
- **Ingest cost cap** declared in plugin config; UI shows live spend per run.
- **Publish-to-memfs** is gated by approval action (invariant: governed actions require approval).
- All mutations (`wiki.ingest`, `wiki.publish`, `wiki.lint`) write to activity log.

---

## Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| Plugin SDK has no memfs surface | Path A (extend SDK with `ctx.memfs`) is a 0.5-day prerequisite; ship it as part of this plan |
| LLM extraction non-deterministic → graph churn between runs | Stable slugs, SHA-cached per-source extractions, diff-based merges; never delete nodes with no inbound unless source is gone |
| Token cost unbounded | Per-run cap + per-company monthly cap; cache hit rate displayed in ingest panel |
| Leiden in JS is fiddly | Ship Louvain fallback (trivially portable); swap to graspologic-js or call out to a Python sidecar in V2 if community quality is weak |
| Writing wiki pages back to memfs could corrupt Letta agent memory | Publish is explicit + approval-gated; writes only under `SHARED/Wiki/`, never into individual agent dirs; dry-run mode previews diff |
| vis.js render perf at >2k nodes | Community-level aggregation; drill-down view per community |

---

## Rollout

**Phase 0 — SDK extension (0.5 day).** Add `ctx.memfs` + `memfs.read` capability.

**Phase 1 — Skeleton + link-only graph (1 day).** Scaffold package, implement link-only extraction, basic graph.json output, minimal vis.js page. Ship this first; validates the plumbing before spending LLM tokens.

**Phase 2 — LLM extraction + wiki render (2 days).** Add LLM concept extraction, SHA cache, Karpathy-style wiki generation, index.md/log.md.

**Phase 3 — Communities, god nodes, report (1 day).** Leiden/Louvain, GRAPH_REPORT.md, suggested questions.

**Phase 4 — Publish-to-memfs, lint, scheduled job (1 day).** Approval-gated publish action, nightly lint job.

**Phase 5 — Polish (0.5 day).** Token dashboard, ingest panel stats, activity-log entries formatted cleanly.

**Total: ~6 days of focused work.** Phase 1 alone is a demoable artifact.

---

## Verification gates (per CLAUDE.md)

Before claiming done at each phase:

```sh
pnpm -r typecheck
pnpm test:run
pnpm build
```

Add:
- `packages/plugins/examples/plugin-wiki-graph/test/` — unit tests for extractor, graph builder, wiki renderer
- E2E: Playwright smoke over `/:companyPrefix/wiki`, graph render, single page click

---

## References

- [Karpathy's LLM Wiki gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)
- [safishamsi/graphify](https://github.com/safishamsi/graphify)
- Doer memfs V1 plan: `doc/plans/2026-04-17-memfs-memory.md`
- Doer plugin SDK: `packages/plugins/sdk/src/types.ts`
- Closest prior-art plugin: `packages/plugins/examples/plugin-delivered`
