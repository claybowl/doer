# .af-import — Letta Agent File Importer (plugin)

**Plan date:** 2026-04-26
**Owner:** #1 (with Clay)
**Status:** 🟡 Design + scaffold — multi-session implementation
**Estimated implementation:** 2-3 focused sessions after scaffold

---

## TL;DR

Build a Doer **plugin** (not a core adapter) that imports Letta `.af`
agent files into the local filesystem in the Letta-Code (LeCo) layout,
optionally `git init`s the result, and surfaces a "hire as agent" CTA so
the unpacked agent can run inside Doer.

Why this matters strategically: **portability is the killer feature.**
Letta agents are locked into Letta Cloud's UI by default. .af-import
turns them into git-tracked filesystem artifacts that can be forked,
versioned, audited, distributed via plugin marketplaces, and re-imported
into other Doer instances. Once this ships, "ship me your agent" becomes
"send me your .af" — a real distribution moment.

---

## Why a plugin (not a core adapter)

This was Clay's first question and the answer shapes everything that follows.

**Adapters** answer *"how does this agent run?"* (claude_local runs the
Claude CLI; letta_cloud talks to the Letta API).

**Plugins** extend the platform with new tools, surfaces, or workflows.

.af-import answers *"how does an agent get IN to Doer?"* — a different
concern. The unpacked agent is then run through whichever adapter is
appropriate (a future `letta_local` adapter, OR re-import to letta_cloud
via Letta's API). So .af-import is fundamentally a **conversion utility**,
which makes it a plugin.

### Electron implications (good ones)

Building this as a plugin is **better** for the Electron port, not worse:

- **Plugins load at runtime, not at compile time.** Electron ships
  Doer + bundled first-party plugins; .af-import iterates without
  re-cutting Electron releases.
- **Bundle hygiene.** Users who don't import Letta agents don't pay
  the cost. Those who do can install via plugin marketplace.
- **Update story.** When Letta's .af format changes, ship a plugin
  update — no Electron re-release required.
- **Optional native deps.** If .af-import grows to depend on Letta
  Code CLI, the plugin can either bundle it or PATH-resolve to a
  user install. Plugin abstraction handles either path.

### What this plugin will NOT do

- Run unpacked agents itself (that's an adapter's job)
- Parse .af files for editing inside Doer (that's a Wave-D feature)
- Sync changes back to Letta Cloud (that's the future `letta_local` adapter's bidirectional sync)

---

## Letta .af file format (research notes)

Based on Letta's published .af spec and observation of exported agents.
The .af file is a JSON archive containing the full state of one agent:

```json
{
  "agent": {
    "name": "Drafter",
    "system": "...full system prompt...",
    "model": "groq/kimi-k2-instruct-0905",
    "embedding": "...",
    "agent_type": "memgpt",
    "tags": ["doer", "worker"],
    "metadata": { ... }
  },
  "memory_blocks": [
    {
      "label": "system/persona",
      "value": "I am Drafter...",
      "read_only": false,
      "limit": 5000
    },
    ...
  ],
  "tools": [
    {
      "name": "produce_deliverable",
      "source_code": "def produce_deliverable(...) -> dict: ...",
      "source_type": "python",
      "args_json_schema": { ... },
      "tags": ["doer", "deliverable"]
    },
    ...
  ],
  "archival_memory": [
    { "text": "...", "metadata": {...} },
    ...
  ],
  "messages": [ ... ]   // optional, can be excluded for privacy
}
```

**Key properties:**
- Self-contained — no external references
- Human-readable JSON
- Letta tracks .af spec versions; plugin must declare which versions it supports
- Files can be large (multi-MB if archival memory + history included)

---

## Letta-Code (LeCo) filesystem layout (target)

Letta Code expects an agent's state spread across files in a directory.
Roughly:

```
my-agent/
├── .letta/
│   ├── agent.json              # name, model, embedding, tags, metadata
│   ├── system.md               # the system prompt
│   ├── memory/
│   │   ├── system_persona.md   # one file per memory block (label sluggified)
│   │   ├── system_human.md
│   │   ├── df_journal.md
│   │   └── ...
│   ├── tools/
│   │   ├── produce_deliverable.py
│   │   └── ...
│   └── archival/
│       └── 0001.json           # archival memory entries (one file per chunk)
├── README.md                   # auto-generated from agent metadata
└── .gitignore                  # exclude session/run artifacts
```

The plugin produces this layout from the .af input. After unpacking,
the directory is ready for `git init` + a future `letta_local` adapter
to run.

---

## Plugin architecture

```
packages/plugins/examples/plugin-af-import/
├── package.json
├── tsconfig.json
├── README.md
└── src/
    ├── index.ts              # public exports
    ├── manifest.ts           # plugin manifest (UI surfaces, capabilities)
    ├── worker.ts             # backend lifecycle hooks + import job
    ├── af/
    │   ├── types.ts          # TypeScript types for the .af schema
    │   ├── parse.ts          # parse + validate .af JSON
    │   └── unpack.ts         # write LeCo layout to disk
    └── ui/
        ├── index.tsx         # UI entry point (export registry)
        └── ImportPanel.tsx   # the actual upload/configure/run UI
```

### Manifest surfaces

```ts
{
  id: "doer.af-import",
  capabilities: [
    "ui.dashboardWidget.register",
    "ui.commandPalette.register",
    "fs.write",                     // writes unpacked agent to user-chosen dir
    "shell.exec",                   // optional: runs `git init` post-unpack
  ],
  entrypoints: { worker, ui },
  ui: {
    slots: [
      {
        type: "commandPaletteAction",
        id: "af-import-action",
        label: "Import Letta agent (.af)",
        exportName: "ImportPanelAction",
      },
      {
        type: "dashboardWidget",
        id: "af-import-widget",
        displayName: "Letta Agent Importer",
        exportName: "ImportPanelWidget",
      },
    ],
  },
}
```

### Worker job (server-side)

The worker exposes one main job: `importAfFile(input)`:

```ts
interface AfImportJobInput {
  afContent: string;          // the .af file as JSON text
  targetDirectory: string;    // absolute path; must be empty or non-existent
  options?: {
    initGit?: boolean;        // default true
    excludeMessages?: boolean;// default true (privacy)
    overwrite?: boolean;      // default false
  };
}

interface AfImportJobResult {
  success: boolean;
  unpackedTo: string;
  fileCount: number;
  warnings: string[];
  agentMetadata: { name: string; model: string; toolCount: number; blockCount: number };
}
```

Pipeline:
1. Validate the .af content (parse JSON, check required fields, version)
2. Resolve and validate target directory
3. Build the LeCo layout in memory (file map: path → content)
4. Write files to disk
5. Optionally `git init` + initial commit
6. Return result

### UI surface

A simple panel (modal or full-page):
- File picker / drag-drop / paste-path for .af input
- Target directory chooser (with auto-suggest based on agent name)
- Options checkboxes (init git, exclude messages, overwrite)
- "Import" button → triggers worker job → shows progress → success state with directory path + "Open in Finder" + "Hire as agent" CTAs

For the MVP, the "Hire as agent" CTA links to the existing FernwehNewAgent
flow (#40). Future: pre-fill the new-agent form with the unpacked
agent's metadata.

---

## Implementation roadmap

| Phase | Deliverable | Effort | Blocker |
|---|---|---|---|
| **Tonight** | Plugin scaffold (compiles, has manifest, stubs for parse/unpack) + this design doc | ~30 min | None |
| **Session 2** | `parse.ts` + `unpack.ts` working end-to-end on a real Letta .af file | ~3 hr | Need a real .af export to test against |
| **Session 3** | Worker job wired + ImportPanel UI shipped | ~3 hr | Plugin SDK has the surfaces we need |
| **Session 4** | `letta_local` adapter that runs unpacked agents (separate task) | ~1 day | `letta-code` CLI semantics + bidirectional sync design |
| **Session 5+** | Polish: drag-drop, progress events, "hire pre-filled" CTA wire-up, error handling | iterative | — |

**MVP definition (Sessions 1-3):**
A user drops a .af file in the import panel, picks a directory, clicks
Import. The agent is unpacked + git-init'd. They see success + a path
to where it lives. They can manually run `letta-code start <dir>` to
launch it. Hiring through Doer is Session 4.

---

## Open questions

1. **Letta .af spec versioning.** Does the spec carry a version field?
   How do we handle older/newer formats gracefully?
2. **Where do unpacked agents live by default?** `~/Documents/letta-agents/<name>/`?
   `~/.doer/imported-agents/`? Project root?
3. **`letta-code` CLI dependency** — bundle, document install, or both?
4. **Bidirectional sync** (out of scope for MVP) — when an unpacked
   agent's files change, can it push back to a re-imported letta_cloud
   instance? Probably yes, but design is a separate task.
5. **Tool source code parsing** — what if a tool references symbols
   that aren't standard Python? Letta uses sandboxed Python with
   specific imports available. Need to document the runtime contract.
6. **Plugin marketplace listing** — once shipped, where does it live?
   Doer's first-party plugin registry? Public marketplace?

---

## Why this is "build to last"

`.af-import` is small in scope but huge in implication:
- Today: "I have a Letta agent, I want to use it in Doer"
- Tomorrow: "Here's a .af, fork it / git-clone it / version it"
- Eventually: an open ecosystem of portable Doer-compatible agents

Build the plugin abstraction right, keep the parse/unpack pure (no I/O
in the parser, file map → disk in unpack), and the surface lasts.

---

## References

- Plugin scaffold: `packages/plugins/examples/plugin-af-import/` (this commit)
- Reference plugins: `plugin-hello-world-example`, `plugin-wiki-graph`,
  `plugin-delivered`
- Plugin SDK: `packages/plugins/sdk/`
- Letta .af spec: https://docs.letta.com (verify before parser implementation)
- Letta Code: `@letta-ai/letta-code` (npm)
- Closes (will close, after Sessions 2-3): task #44.
