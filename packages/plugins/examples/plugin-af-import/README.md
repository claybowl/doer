# @doerai/plugin-af-import

Import Letta `.af` agent files into the local filesystem (Letta-Code
layout) for use in Doer.

**Status:** 🟡 Scaffold (2026-04-26). Implementation across Sessions 2-3.
See `doc/plans/2026-04-26-af-import-plugin.md` for the full design + roadmap.

## What this is

A first-party Doer plugin that turns a Letta `.af` agent export into a
git-trackable directory of files. Once unpacked, the agent can be:

- Run directly via `letta-code start <dir>` (requires `npm install -g @letta-ai/letta-code`)
- Hired into Doer as a `letta_local` agent (future adapter)
- Forked, versioned, distributed via plugin marketplaces

## What's in the scaffold

```
src/
├── manifest.ts          # Plugin manifest — UI surfaces + capabilities
├── worker.ts            # Backend lifecycle (no-op until Session 2)
├── index.ts             # Public exports
├── af/
│   ├── types.ts         # TypeScript types for the .af schema
│   ├── parse.ts         # JSON parse + minimal validation
│   └── unpack.ts        # File-map builder (pure; caller writes to disk)
└── ui/
    └── index.tsx        # Dashboard widget placeholder
```

The parser and unpacker are **pure functions** — they take input, return
output, never touch disk or the network. That's deliberate so they're
trivially unit-testable AND so the UI can preview an unpack ("this will
write 12 files; here they are") before any actual write.

## Roadmap

| Session | Work |
|---|---|
| **Tonight** | This scaffold + design doc |
| **2** | `parse.ts` deeper validation; test unpack against a real exported `.af` |
| **3** | Worker `importAfFile` job; `ImportPanel` UI; wire end-to-end |
| **4** | `letta_local` adapter (separate task) — runs unpacked agents |
| **5+** | Drag-drop, progress events, "Hire pre-filled" CTA |

## Why a plugin, not a core adapter

`.af-import` answers "how does an agent get IN?" — different from an
adapter which answers "how does an agent run?". Plugins ship
independently of Doer's core, iterate without re-cutting Electron
releases, and can be distributed via marketplace. See the design doc
for the full architectural reasoning.

## Build

```sh
pnpm --filter @doerai/plugin-af-import build
pnpm --filter @doerai/plugin-af-import typecheck
```
