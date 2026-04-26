# @doerai/plugin-wiki-graph

**Karpathy-style LLM wiki + Graphify-style knowledge graph over Doer memfs memory and gremlin work outputs.** Mounted at `/:companyPrefix/wiki`.

Bridges the two durable surfaces of an agent company:

- **memfs** — agent memory at `~/.letta/agents/**` (minds)
- **gremlin outputs** — completed issues, delivered artifacts (hands)

Into one navigable view: an interactive graph and an interlinked markdown wiki, both LLM-maintained.

See [`doc/plans/2026-04-21-wiki-graph-plugin.md`](../../../../doc/plans/2026-04-21-wiki-graph-plugin.md) for the full technical plan.

---

## What it does

Three Karpathy-pattern operations, adapted to Paperclip's governance model:

### Ingest

Walks memfs memory + gremlin outputs for a company, SHA-caches each file, extracts nodes and edges (link-first for free, LLM for concepts and inferred relationships), and writes:

- `graph/<companyId>/graph.json` — persistent graph with tagged edges (`EXTRACTED`, `INFERRED`, `AMBIGUOUS`)
- `wiki/<companyId>/index.md` — catalog of all pages, by category
- `wiki/<companyId>/log.md` — chronological append-only log of every ingest / query / lint
- `wiki/<companyId>/<slug>.md` — one page per node, interlinked with `[[wiki-links]]`
- `wiki/<companyId>/GRAPH_REPORT.md` — god nodes, surprising connections, suggested questions

Every LLM call routes through Doer's model registry; the budget hard-stop applies. Every run writes to the activity log.

### Query

The UI surfaces a searchable wiki browser and an interactive graph view (vis.js). Click a node → read its wiki page. Answers the user files back into the wiki become new pages, so explorations compound.

### Lint

A scheduled nightly job asks the LLM to look for:

- Orphan pages (no inbound links)
- Contradictions between pages
- Stale claims that newer sources supersede
- Important concepts mentioned but lacking their own page
- Questions the graph is uniquely positioned to answer

Findings land in a **Wiki Health** inbox and get appended to `log.md`.

### Publish to memfs (optional, approval-gated)

The wiki lives in a plugin-owned derived cache by default — regenerable, disposable. When Clay wants the wiki available to Letta agents, an explicit action copies `wiki/<companyId>/` into `~/.letta/agents/SHARED/Wiki/memory/`. Approval-gated per Doer's governed-action invariant. One-way, timestamped, logged.

---

## Install

This plugin lives in the Paperclip monorepo. To enable it locally:

```sh
cd paperclip
pnpm install
pnpm --filter @doerai/plugin-wiki-graph build
# Register the plugin with Doer's plugin loader (see doc/plans for the specific
# install mechanism — typically via the plugins config or CLI).
pnpm dev
```

Then navigate to `http://localhost:3100/:companyPrefix/wiki`.

---

## Development

```sh
# From repo root
pnpm --filter @doerai/plugin-wiki-graph typecheck
pnpm --filter @doerai/plugin-wiki-graph build
pnpm --filter @doerai/plugin-wiki-graph clean
```

Per the Paperclip contract-sync rule, any data-shape change in this plugin must propagate through worker wire-format → UI types. The shared types live at the top of `src/worker.ts` and are mirrored in `src/ui/index.tsx`.

---

## Current status

**Phase 1 (skeleton)** — scaffolded:

- `package.json`, `tsconfig.json`, UI build script
- `src/manifest.ts` — capabilities declared, slots registered for page + sidebar
- `src/constants.ts` — stable IDs for data keys, action keys, edge tags
- `src/worker.ts` — full data + action surface registered with Phase-1 stub responses that write activity-log entries
- `src/ui/index.tsx` — dark-first page + sidebar with stat cards and empty-state

The skeleton typechecks against `@doerai/plugin-sdk`, follows `plugin-delivered` conventions, and exposes the complete action/data contract — so the extraction pipeline (Phase 2+) can be built incrementally without contract churn on the UI side.

**Next up (from the plan):**

- **Phase 0** — add `src/memfs/reader.ts` (direct Node `fs` over `~/.letta/agents/**`, honors `.lettaignore`, ~1 hr). SDK extension considered and rejected as premature; see plan doc "Where memfs bytes actually come from — resolved 2026-04-22."
- **Phase 1.5** — link-only extraction + minimal vis.js render (1 day, first demoable)
- **Phase 2** — LLM extraction + Karpathy wiki render (2 days)
- **Phase 3** — Leiden/Louvain communities + god-node report (1 day)
- **Phase 4** — approval-gated publish-to-memfs + nightly lint (1 day)
- **Phase 5** — polish (0.5 day)

---

## References

- [Karpathy's LLM Wiki gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)
- [safishamsi/graphify](https://github.com/safishamsi/graphify)
- memfs V1 plan: `doc/plans/2026-04-17-memfs-memory.md`
- Plan for this plugin: `doc/plans/2026-04-21-wiki-graph-plugin.md`
