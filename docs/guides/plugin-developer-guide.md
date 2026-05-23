# Doer Plugin Developer Guide

> **Who this is for:** You've shipped things with AI-assisted coding (Cursor, Claude, Lovable, etc.), you're comfortable reading and tweaking code even if you didn't write it from scratch, and you want to extend Doer with new capabilities. This guide explains the *why* behind every decision, not just the *what*.

---

## Table of Contents

1. [What Is a Plugin, Actually?](#1-what-is-a-plugin-actually)
2. [The Two Halves of Every Plugin](#2-the-two-halves-of-every-plugin)
3. [Scaffold Your First Plugin in 2 Minutes](#3-scaffold-your-first-plugin-in-2-minutes)
4. [The Plugin Context: Your API Into Doer](#4-the-plugin-context-your-api-into-doer)
5. [Give Your Agents a New Tool](#5-give-your-agents-a-new-tool)
6. [Add a Dashboard Widget](#6-add-a-dashboard-widget)
7. [Read Doer Data (Issues, Agents, Goals)](#7-read-doer-data-issues-agents-goals)
8. [React to Events](#8-react-to-events)
9. [Schedule Recurring Jobs](#9-schedule-recurring-jobs)
10. [Installing & Testing Locally](#10-installing--testing-locally)
11. [Capabilities Reference](#11-capabilities-reference)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. What Is a Plugin, Actually?

**Concept**

Doer runs companies made of AI agents. Those agents work on issues, use tools, and report back. A plugin is a self-contained program that *adds* to this picture — it can give agents new tools to call, add pages or widgets to the dashboard, listen to what's happening in the system, or connect Doer to external services like Slack, Notion, or a custom API.

The key mental model: **a plugin is a separate process that talks to Doer through a well-defined API.** It doesn't live inside Doer's codebase. It runs alongside it, gets activated when Doer starts, and communicates through a set of contracts called *capabilities*.

Why a separate process? Because it means a buggy plugin can't crash Doer, and it means plugins can be installed or uninstalled without restarting the whole system.

**The big picture — how the pieces connect:**

```
Your Plugin
├── manifest.ts   ← tells Doer what your plugin IS and what it needs
├── worker.ts     ← the brain: runs server-side, registers tools/jobs/events
└── ui/index.tsx  ← (optional) adds panels or widgets to the Doer dashboard

        ↕ communicates through @doerai/plugin-sdk

Doer Host
├── Plugin Registry  ← knows which plugins are installed
├── Plugin Loader    ← activates/deactivates plugins
└── Plugin Worker    ← runs your worker.ts in a sandbox
```

---

## 2. The Two Halves of Every Plugin

**Concept**

Every plugin has exactly two required pieces: a **manifest** and a **worker**.

The **manifest** is a static declaration — it doesn't run, it just describes. It answers: *What is this plugin called? What does it need permission to do? Where are its entry points?* Doer reads the manifest before activating anything, which lets it validate the plugin and show it in the plugin manager UI without executing any of your code.

The **worker** is where your logic actually runs. It's a Node.js process that Doer spawns when it activates your plugin. The worker receives a `ctx` object (the Plugin Context) that gives it access to everything it declared in the manifest.

**Why they're separate:** It's the difference between a job description and actually doing the job. The manifest is the job description — readable at a glance, no side effects. The worker is the person in the role.

**Manifest — the minimum viable version:**

```typescript
// src/manifest.ts
import type { PaperclipPluginManifestV1 } from "@doerai/plugin-sdk";

const manifest: PaperclipPluginManifestV1 = {
  id: "yourname.my-first-plugin",   // globally unique — use your name as prefix
  apiVersion: 1,
  version: "0.1.0",
  displayName: "My First Plugin",
  description: "Does something useful",
  author: "Your Name",
  categories: ["automation"],
  capabilities: [],                  // what Doer gives you access to — start empty
  entrypoints: {
    worker: "./dist/worker.js",
  },
};

export default manifest;
```

**Worker — the minimum viable version:**

```typescript
// src/worker.ts
import { definePlugin, runWorker } from "@doerai/plugin-sdk";

const plugin = definePlugin({
  async setup(ctx) {
    // This runs once when Doer activates your plugin.
    // ctx is your API into Doer — more on this in Section 4.
    ctx.logger.info("My first plugin is alive!");
  },

  async onHealth() {
    // Doer pings this to check if your plugin is running.
    // Always return { status: "ok" } when things are fine.
    return { status: "ok", message: "Ready" };
  },
});

export default plugin;
runWorker(plugin, import.meta.url); // ← this line starts the process
```

✅ **You'll know these are wired correctly when:** Doer shows your plugin as "Active" in the plugin manager and your log line appears in the server output.

---

## 3. Scaffold Your First Plugin in 2 Minutes

**Concept**

Rather than creating files by hand, Doer ships a scaffolding tool that generates a complete, working plugin structure for you. Think of it like `create-react-app` but for Doer plugins.

**Step 1 — Build the scaffolding tool (one-time setup inside the Doer repo):**

```bash
pnpm --filter @doerai/create-doer-plugin build
```

**Step 2 — Generate your plugin:**

```bash
# Inside the Doer repo (adds to the examples folder):
node packages/plugins/create-doer-plugin/dist/index.js @yourname/my-plugin \
  --output ./packages/plugins/examples \
  --display-name "My Plugin" \
  --description "My first Doer plugin" \
  --author "Your Name"

# Outside the Doer repo (standalone plugin project):
node /path/to/doer/packages/plugins/create-doer-plugin/dist/index.js @yourname/my-plugin \
  --output /wherever/you/keep/projects \
  --sdk-path /path/to/doer/packages/plugins/sdk
```

**Step 3 — Install and run:**

```bash
cd packages/plugins/examples/@yourname/my-plugin   # or wherever it was generated
pnpm install
pnpm typecheck    # should pass with zero errors
pnpm test         # should pass
pnpm build        # compiles to dist/
```

**What the scaffold generates:**

```
@yourname/my-plugin/
├── package.json          ← declares the plugin entry points under "paperclipPlugin"
├── src/
│   ├── manifest.ts       ← plugin identity + capabilities declaration
│   ├── worker.ts         ← your server-side logic
│   └── ui/
│       └── index.tsx     ← a starter dashboard widget
├── tests/
│   └── plugin.spec.ts    ← pre-wired test using @doerai/plugin-sdk/testing
├── esbuild.config.mjs    ← bundles worker.ts → dist/worker.js
└── rollup.config.mjs     ← bundles ui/ → dist/ui/
```

✅ **You'll know it worked when:** `pnpm build` completes and you see `dist/worker.js`, `dist/manifest.js`, and `dist/ui/` appear.

---

## 4. The Plugin Context: Your API Into Doer

**Concept**

The `ctx` object passed to your `setup()` function is your entire interface to Doer. Every interaction — reading data, registering tools, logging, listening to events — goes through `ctx`. Think of it as the plugin's control panel.

Here's what's on it and what each piece does:

| `ctx.___` | What it does | Example use |
|---|---|---|
| `logger` | Structured logging | `ctx.logger.info("msg", { key: val })` |
| `tools` | Register agent-callable tools | Give agents new abilities |
| `events` | Subscribe to / emit domain events | React when an issue is created |
| `jobs` | Register scheduled recurring work | Run something every hour |
| `data` | Register data handlers for the UI to query | Power your dashboard widgets |
| `actions` | Register action handlers the UI can trigger | Button clicks in your widget |
| `state` | Key-value store scoped to your plugin | Remember things between restarts |
| `issues` | Read and update issues | `ctx.issues.list({ companyId })` |
| `agents` | Read agents and their sessions | `ctx.agents.list({ companyId })` |
| `goals` | Read goals | `ctx.goals.list({ companyId })` |
| `companies` | Read company info | `ctx.companies.get(id)` |
| `projects` | Read projects | `ctx.projects.list({ companyId })` |
| `http` | Make outbound HTTP requests | Call external APIs |
| `secrets` | Resolve secret references from config | Read API keys safely |
| `streams` | Push real-time updates to your UI | Live data in widgets |
| `entities` | Store plugin-owned records in the DB | Your plugin's own data model |
| `config` | Read config values set by the user | User-provided settings |

**The important rule:** You can only use what you declared in your manifest's `capabilities` array. If you try to call `ctx.issues.list()` but didn't declare `"issues.read"` in capabilities, Doer will throw. This is intentional — it forces plugins to be explicit about their permissions upfront, so users know exactly what a plugin does before installing it.

**Mini-exercise:** Open `src/manifest.ts` and add `"issues.read"` to the capabilities array. Then in `src/worker.ts`, inside `setup()`, add:

```typescript
const issues = await ctx.issues.list({ companyId: "test" });
ctx.logger.info(`Found ${issues.length} issues`);
```

Rebuild and reinstall. Check the server logs.

✅ **You'll know it works when:** You see the log line with a count (even if it's zero).

---

## 5. Give Your Agents a New Tool

**Concept**

This is one of the most powerful things a plugin can do. When you register a tool, every agent in the system gains the ability to call it. The agent decides *when* to use the tool based on its description — so write good descriptions.

A tool is just a function with a name, a description, and a JSON schema that defines what parameters it accepts. When an agent calls your tool, Doer routes the call to your worker and passes back whatever you return.

**Step 1 — Declare the tool in your manifest:**

```typescript
// src/manifest.ts
capabilities: ["agent.tools.register"],
tools: [
  {
    key: "fetch-weather",
    displayName: "Fetch Weather",
    description: "Gets the current weather for a given city. Use this when an issue mentions weather or location-based conditions.",
    parametersSchema: {
      type: "object",
      required: ["city"],
      properties: {
        city: {
          type: "string",
          description: "The city name, e.g. 'Tulsa, OK'"
        }
      }
    }
  }
]
```

**Step 2 — Implement the tool in your worker:**

```typescript
// src/worker.ts
async setup(ctx) {
  ctx.tools.register(
    "fetch-weather",
    {
      displayName: "Fetch Weather",
      description: "Gets the current weather for a given city.",
      parametersSchema: {
        type: "object",
        required: ["city"],
        properties: {
          city: { type: "string", description: "City name" }
        }
      }
    },
    async (params, runCtx) => {
      // params is typed based on your parametersSchema
      const { city } = params as { city: string };

      // Make an outbound HTTP request (requires "http.outbound" capability)
      const response = await ctx.http.fetch(
        `https://wttr.in/${encodeURIComponent(city)}?format=3`
      );
      const weather = await response.text();

      return {
        content: weather,  // what the agent sees
        metadata: { city } // optional extra data
      };
    }
  );
}
```

**Step 3 — Add the required capabilities:**

```typescript
capabilities: ["agent.tools.register", "http.outbound"]
```

✅ **You'll know it works when:** The tool appears in the agent's available tools list in the Doer UI, and an agent can call it and get back a weather string.

**Tip:** The `description` field is how agents decide when to use your tool. Be specific about *when* an agent should reach for it — not just what it does.

---

## 6. Add a Dashboard Widget

**Concept**

Plugins can contribute UI to Doer's dashboard. The UI runs as a React component inside the Doer app — same origin, same page. Your component communicates with your worker through three hooks: `usePluginData` (fetch data), `usePluginAction` (trigger something), and `usePluginStream` (receive real-time updates).

The connection: your UI calls `usePluginData("my-key")` → Doer routes that to your worker's `ctx.data` handler for `"my-key"` → the response comes back to the UI. This means your UI never has direct database access — it always goes through your worker, which enforces capabilities.

**Step 1 — Register a data handler in your worker:**

```typescript
// src/worker.ts — inside setup(ctx)
ctx.data.register("issue-summary", async (params, runCtx) => {
  const issues = await ctx.issues.list({
    companyId: runCtx.companyId,
    limit: 5,
  });

  return {
    total: issues.length,
    recent: issues.map(i => ({ id: i.id, title: i.title, status: i.status })),
  };
});
```

Add `"issues.read"` to your capabilities.

**Step 2 — Build the widget UI:**

```tsx
// src/ui/index.tsx
import { usePluginData } from "@doerai/plugin-sdk/ui";
import type { PluginWidgetProps } from "@doerai/plugin-sdk/ui";

export function MyDashboardWidget({ context }: PluginWidgetProps) {
  const { data, loading, error } = usePluginData("issue-summary");

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <section>
      <h3>Recent Issues ({data?.total ?? 0} total)</h3>
      <ul>
        {data?.recent?.map((issue: any) => (
          <li key={issue.id}>
            <strong>{issue.title}</strong> — {issue.status}
          </li>
        ))}
      </ul>
    </section>
  );
}
```

**Step 3 — Register the widget slot in your manifest:**

```typescript
// src/manifest.ts
capabilities: ["issues.read", "ui.dashboardWidget.register"],
entrypoints: {
  worker: "./dist/worker.js",
  ui: "./dist/ui",
},
ui: {
  slots: [
    {
      type: "dashboardWidget",
      id: "my-issue-summary-widget",
      displayName: "Issue Summary",
      exportName: "MyDashboardWidget",   // must match the export name above
    }
  ]
}
```

✅ **You'll know it works when:** The widget appears on the Doer dashboard and shows real issue data after you rebuild and reinstall the plugin.

---

## 7. Read Doer Data (Issues, Agents, Goals)

**Concept**

Your worker has read access to the core Doer domain objects — the same data you see in the UI. This lets you build integrations that react to what's happening inside Doer (e.g., sync issues to Notion, generate reports, analyze agent performance).

The pattern is always: declare the capability in the manifest → use it via `ctx` in the worker.

**Reading issues:**

```typescript
// Capability required: "issues.read"
const issues = await ctx.issues.list({
  companyId: runCtx.companyId,
  projectId: "optional-project-filter",
  limit: 50,
});

// Get a single issue:
const issue = await ctx.issues.get({ issueId: "issue-id-here" });

// Read comments on an issue:
const comments = await ctx.issues.listComments({ issueId: issue.id });
```

**Reading agents:**

```typescript
// Capability required: "agents.read"
const agents = await ctx.agents.list({ companyId: runCtx.companyId });

// Each agent has: id, name, adapterKey, status, currentBudget, etc.
```

**Reading goals:**

```typescript
// Capability required: "goals.read"
const goals = await ctx.goals.list({ companyId: runCtx.companyId });
```

**Mini-exercise:** Register a data handler that returns a count of open vs. closed issues. Wire it to a widget that shows two numbers side by side.

✅ **You'll know it works when:** Your widget displays live counts that change when you open or close issues in Doer.

---

## 8. React to Events

**Concept**

Doer emits domain events whenever something meaningful happens — an issue is created, an agent completes work, a goal status changes. Your plugin can subscribe to these and run code in response. This is how you build integrations that *feel alive* — they react in real time rather than polling on a schedule.

Events arrive in your worker. You subscribe in `setup()` using `ctx.events.on()`.

**Step 1 — Declare the capability:**

```typescript
// src/manifest.ts
capabilities: ["events.subscribe", "issues.read"]
```

**Step 2 — Subscribe in your worker:**

```typescript
// src/worker.ts — inside setup(ctx)
ctx.events.on("issue.created", async (event) => {
  ctx.logger.info("New issue created", {
    issueId: event.payload.issueId,
    companyId: event.companyId,
  });

  // Do something useful — e.g., post to Slack, update an external tracker, etc.
  // await ctx.http.fetch("https://hooks.slack.com/...", { method: "POST", ... })
});

ctx.events.on("issue.completed", async (event) => {
  ctx.logger.info("Issue completed", { issueId: event.payload.issueId });
});
```

**Common event types:**

| Event | When it fires |
|---|---|
| `issue.created` | A new issue is added to a project |
| `issue.updated` | An issue's status, title, or fields change |
| `issue.completed` | An issue is marked done |
| `issue.assigned` | An agent is assigned to an issue |
| `agent.session.started` | An agent begins working |
| `agent.session.completed` | An agent finishes a session |
| `goal.status.changed` | A goal's status changes |

✅ **You'll know it works when:** Your log line appears immediately after you create an issue in Doer — no delay, no polling.

---

## 9. Schedule Recurring Jobs

**Concept**

Sometimes you need to run code on a schedule rather than in response to an event — generate a weekly report, sync data every hour, clean up stale records nightly. Doer's job system lets you register named jobs that run automatically.

Jobs are declared and registered, not cron strings. You give the job a key and a handler function. The schedule is configured by the user when they install your plugin (or you can provide defaults via config).

**Step 1 — Declare the capability:**

```typescript
// src/manifest.ts
capabilities: ["jobs.schedule", "issues.read"]
```

**Step 2 — Register the job in your worker:**

```typescript
// src/worker.ts — inside setup(ctx)
ctx.jobs.register("weekly-summary", async (jobCtx) => {
  const issues = await ctx.issues.list({
    companyId: jobCtx.companyId,
    limit: 100,
  });

  const completed = issues.filter(i => i.status === "completed").length;
  const open = issues.filter(i => i.status === "open").length;

  ctx.logger.info("Weekly summary generated", { completed, open });

  // You could also write to plugin state, emit an event, or call an external API
  await ctx.state.set(
    { scope: "company", scopeId: jobCtx.companyId, key: "last-weekly-summary" },
    { completed, open, generatedAt: new Date().toISOString() }
  );
});
```

✅ **You'll know it works when:** The job appears in the Doer plugin settings panel and you can trigger it manually to verify the logic before relying on the schedule.

---

## 10. Installing & Testing Locally

**Concept**

You don't need to publish your plugin to an npm registry to use it. Doer supports local filesystem installs — point it at an absolute path on your machine, and it will watch for changes and automatically reload your worker when you rebuild.

**Install your plugin into a running Doer instance:**

```bash
# Make sure Doer is running first (pnpm dev from the Doer repo)

curl -X POST http://localhost:3101/api/plugins/install \
  -H "Content-Type: application/json" \
  -d '{"packageName":"/absolute/path/to/your-plugin","isLocalPath":true}'
```

**Development loop:**

```bash
# Terminal 1 — Doer running
pnpm dev

# Terminal 2 — Your plugin, watching for changes
cd /path/to/your-plugin
pnpm dev   # rebuilds worker + UI on file save, Doer auto-reloads
```

**Running your tests:**

```bash
pnpm test           # vitest, uses @doerai/plugin-sdk/testing
pnpm typecheck      # TypeScript validation — run this often
```

**The test harness** from `@doerai/plugin-sdk/testing` gives you a mock context so you can test your worker logic without needing a running Doer instance:

```typescript
// tests/plugin.spec.ts
import { createTestContext } from "@doerai/plugin-sdk/testing";
import { describe, it, expect } from "vitest";
import plugin from "../src/worker";

describe("my plugin", () => {
  it("sets up without errors", async () => {
    const ctx = createTestContext();
    await plugin.setup(ctx);
    expect(ctx.logger.infoCalls).toContain("my plugin is alive!");
  });
});
```

✅ **You'll know your dev loop is working when:** You edit `src/worker.ts`, save, and Doer's console shows the plugin reloading without you doing anything manually.

---

## 11. Capabilities Reference

Declare these strings in your manifest's `capabilities` array to unlock the corresponding `ctx` methods in your worker.

**Data access (read):**
- `companies.read` — `ctx.companies.get()`
- `projects.read` — `ctx.projects.list()`
- `issues.read` — `ctx.issues.list()`, `ctx.issues.get()`, `ctx.issues.listComments()`
- `agents.read` — `ctx.agents.list()`
- `goals.read` — `ctx.goals.list()`

**Data mutations:**
- `issues.create` — `ctx.issues.create()`
- `issues.update` — `ctx.issues.update()`
- `issue.comments.create` — `ctx.issues.createComment()`
- `issue.documents.write` — write documents attached to issues

**Integration:**
- `events.subscribe` — `ctx.events.on()`
- `events.emit` — `ctx.events.emit()`
- `jobs.schedule` — `ctx.jobs.register()`
- `agent.tools.register` — `ctx.tools.register()`
- `webhooks.handle` — receive inbound webhooks
- `http.outbound` — `ctx.http.fetch()`
- `secrets.read-ref` — `ctx.secrets.resolve()`
- `plugin.state.read` / `plugin.state.write` — `ctx.state.get()` / `ctx.state.set()`

**UI:**
- `ui.dashboardWidget.register` — add widgets to the main dashboard
- `ui.page.register` — add full-page routes to the Doer UI
- `ui.sidebar.register` — add items to the sidebar navigation

---

## 12. Troubleshooting

**Plugin won't activate / stays "Pending"**

Check that `dist/worker.js` exists. Run `pnpm build` in your plugin directory. The worker entrypoint in `package.json` under `paperclipPlugin.worker` must match the actual output file path.

**`ctx.issues.list` throws a capabilities error**

You called a method without declaring the matching capability in `manifest.ts`. Add it to the `capabilities` array, rebuild, and reinstall. Doer re-reads the manifest on install.

**UI widget doesn't appear on dashboard**

Make sure `dist/ui/` exists (check your build output). Verify the `exportName` in your manifest's `ui.slots` exactly matches the named export in your `ui/index.tsx`. Casing matters.

**`usePluginData` returns empty / never resolves**

Your worker must have a registered `ctx.data` handler with a key that matches what you passed to `usePluginData`. Double-check the key string — it's case-sensitive.

**Worker crashes silently on startup**

Add a try/catch around your `setup()` body and log the error explicitly. Silent crashes usually mean an unhandled promise rejection during setup.

**"Workspace still starting" when calling the install endpoint**

Doer's API server isn't up yet. Wait a few seconds and retry. Check `pnpm dev` output for the "Server listening" line.

**Changes to my worker aren't being picked up**

Make sure you're running `pnpm dev` in your plugin directory (not just `pnpm build` once). The dev server watches files and rebuilds; Doer watches the output for changes.

---

## Where to Go From Here

- **`doc/plugins/PLUGIN_SPEC.md`** — the full spec including future capabilities not yet in alpha
- **`packages/plugins/examples/plugin-delivered`** — a complete real plugin with UI pages, sidebar nav, and data querying
- **`packages/plugins/examples/plugin-kitchen-sink-example`** — demonstrates every capability in one place
- **`packages/plugins/sdk/src/types.ts`** — the authoritative TypeScript definitions for all ctx methods

---

*Guide written for Doer — the agent orchestration control plane by Donjon Intelligence Systems.*
*Build to last. Progress to stay.*
