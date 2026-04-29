# @doerai/plugin-delivered

Magazine-style showcase of shipped agent work. Portable successor to the
in-tree `/oversight` page — mounts as a Doer plugin at
`/:companyPrefix/delivered` and ships its own styles so the host doesn't need
to export a component kit.

## What it does

- Pulls `status === "done"` issues for the active company via the plugin SDK
  (`ctx.issues.list`).
- Joins each completed issue to its assignee agent and parent goal.
- Renders a hero card for the most recent completion plus a card grid for the
  rest, each with a per-agent accent color derived from the agent's UUID.
- Lets the operator filter by rolling window (1 / 3 / 7 / 14 / 30 / 90 days)
  and by agent.
- Adds a sidebar entry so the page is reachable from the company sidebar.

## Why it's a plugin

The core app used to carry a `/oversight` page that owned its own route,
types, routes, query keys, and sidebar entry (~11 touchpoints across
`server`, `ui`, `packages/shared`). Pulling it out into a plugin:

- Keeps the host lean and the contract boundary small.
- Lets Delivered ship, version, and install independently of Doer core.
- Forces the feature to live inside the documented SDK capability set
  (`issues.read`, `agents.read`, `goals.read`, `companies.read`,
  `ui.page.register`, `ui.sidebar.register`) — no secret host access.

## Files

```
src/
  constants.ts       # PLUGIN_ID, PAGE_ROUTE ("delivered"), slot + export names
  manifest.ts        # PaperclipPluginManifestV1 (page + sidebar slot)
  worker.ts          # definePlugin + single `completions` data handler
  index.ts           # re-exports manifest + worker
  ui/index.tsx       # DeliveredPage + DeliveredSidebarLink, inline CSS
scripts/
  build-ui.mjs       # esbuild for the browser UI bundle
package.json
tsconfig.json
```

## Install on a running Doer host

### 1. Build the plugin

From the repo root:

```sh
pnpm install                           # picks up the new package via workspace glob
pnpm --filter @doerai/plugin-sdk build # SDK must be built first
pnpm --filter @doerai/plugin-delivered build
pnpm --filter @doerai/plugin-delivered typecheck
```

Expected output: `dist/manifest.js`, `dist/worker.js`, `dist/ui/index.js`,
plus `.d.ts` / sourcemaps for each.

### 2. Register with the host

With Doer running locally (`pnpm dev`, port `3100`):

```sh
curl -X POST http://localhost:3100/api/plugins/install \
  -H "Content-Type: application/json" \
  -d "{\"packageName\":\"$(pwd)/packages/plugins/examples/plugin-delivered\",\"isLocalPath\":true}"
```

Replace the path with an absolute path to the plugin package directory.

### 3. Verify

- Reload the UI.
- Look for the **Delivered** entry in the sidebar (it renders into the
  plugin `sidebar` slot).
- Open `http://localhost:3100/:companyPrefix/delivered` — the magazine grid
  should load after selecting a company with `done` issues in window.

## Cleaning up the old `/oversight` code

The kill replaced the four core files that used to implement `/oversight`
with empty `export {};` stubs because the sandbox couldn't delete files on
your disk. You should `git rm` them on your next commit:

```sh
git rm \
  packages/shared/src/types/oversight.ts \
  server/src/routes/oversight.ts \
  ui/src/api/oversight.ts \
  ui/src/pages/Oversight.tsx
```

All plumbing touchpoints (`server/src/app.ts`, `ui/src/App.tsx`,
`ui/src/components/Sidebar.tsx`, `ui/src/lib/company-routes.ts`,
`ui/src/lib/queryKeys.ts`, `packages/shared/src/types/index.ts`,
`packages/shared/src/index.ts`) have already been reverted. Run
`pnpm -r typecheck` after the `git rm` to confirm the kill.

## Data shape

The worker exposes one bridge data key:

```ts
// ctx.data.register("completions", async ({ companyId, windowDays, agentId }) => {...})
type CompletionsResponse = {
  completions: Completion[]; // done issues sorted by completedAt desc
  agents: CompletionAgent[]; // only agents that shipped in-window
  windowDays: number;
  generatedAt: string;
};

type Completion = {
  id: string;
  artifactType: "issue";
  title: string;
  summary: string | null;
  url: null;
  agent: CompletionAgent | null;
  issue: { id: string; identifier: string; title: string };
  goal: { id: string; title: string; level: string } | null;
  completedAt: string | null;
  isPrimary: boolean;
};
```

## Capabilities

Declared in `manifest.ts`:

- `companies.read`
- `projects.read`
- `issues.read`
- `agents.read`
- `goals.read`
- `ui.page.register`
- `ui.sidebar.register`

No write capabilities — this is a read-only reporting surface.

## Future work

- Plug in issue `workProducts` (artifact URLs, filenames, revisions) once the
  plugin SDK exposes them.
- Add a `detailTab` slot on issues for inline "shipped from this issue"
  previews.
- Stream new completions into the page live via `ctx.streams` + SSE once the
  host wires up an `issue.completed` event.
