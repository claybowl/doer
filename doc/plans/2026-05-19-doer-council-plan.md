# doer_council Plugin — Implementation Plan (Sub-project 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `doer_council` plugin — a Full Council session type that invokes multiple Letta agents in parallel, streams their responses, and creates Doer issues from the orchestrator's decision.

**Architecture:** Plugin-first — everything lives in `packages/plugins/council/`. Sessions stored as plugin entities via `ctx.entities`. Config stored via `ctx.state`. Agent invocation via `ctx.agents.sessions`. Real-time transcript streamed to UI via `ctx.streams`. No custom DB tables, no custom routes.

**Tech Stack:** TypeScript, `@doerai/plugin-sdk`, `@doerai/shared`, React 19 (plugin UI), Vitest

**Spec:** `doc/plans/2026-05-19-doer-council-design.md`

**Scope:** Sub-project 1 only — plugin scaffold + shared types + Full Council session type + sessions list + session detail UI. Interview and Bidding types are Sub-project 2.

---

## File Map

| File | New/Modify | Purpose |
|---|---|---|
| `packages/shared/src/council.ts` | Create | Council shared types (CouncilSessionContext, AgentAddress, IssueProposal, SessionDecision, SessionTypeId, CouncilConfig, CouncilSession, CouncilParticipant) |
| `packages/shared/src/index.ts` | Modify | Export council types |
| `packages/plugins/council/package.json` | Create | Plugin package config |
| `packages/plugins/council/tsconfig.json` | Create | TypeScript config |
| `packages/plugins/council/src/constants.ts` | Create | PLUGIN_ID, JOB_KEYS, STREAM_CHANNELS, DATA_KEYS, ACTION_KEYS, SLOT_IDS, EXPORT_NAMES |
| `packages/plugins/council/src/manifest.ts` | Create | PaperclipPluginManifestV1 declaration |
| `packages/plugins/council/src/session-store.ts` | Create | ctx.entities + ctx.state wrappers for sessions and config |
| `packages/plugins/council/src/parse-proposals.ts` | Create | Parse agent JSON output → IssueProposal[] |
| `packages/plugins/council/src/brief-builder.ts` | Create | buildBrief() — constructs council brief string |
| `packages/plugins/council/src/session-types/full-council.ts` | Create | Full Council handler (5 methods) |
| `packages/plugins/council/src/engine.ts` | Create | runSession() — the orchestration loop |
| `packages/plugins/council/src/worker.ts` | Create | definePlugin setup — data/action/job handlers |
| `packages/plugins/council/src/ui/index.tsx` | Create | Plugin UI entry + named exports |
| `packages/plugins/council/src/ui/CouncilPage.tsx` | Create | Sessions list page |
| `packages/plugins/council/src/ui/CouncilSessionDetail.tsx` | Create | Session detail with streaming transcript |
| `packages/plugins/council/tests/parse-proposals.test.ts` | Create | Unit tests for proposal parser |
| `packages/plugins/council/tests/brief-builder.test.ts` | Create | Unit tests for brief builder |
| `packages/plugins/council/tests/engine.test.ts` | Create | Integration test for engine loop |

---

## Task 1: Shared Types

**Files:**
- Create: `packages/shared/src/council.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Create `packages/shared/src/council.ts`**

```ts
// packages/shared/src/council.ts

export type SessionTypeId = "full_council" | "interview" | "bidding" | string;
export type SessionStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "completed_with_errors";
export type InvocationMode = "parallel" | "sequential";
export type ResolutionMode = "orchestrator" | "user_approval" | "auto";
export type AgentRole = "member" | "orchestrator" | "guest";

export interface IssueProposal {
  title: string;
  description?: string;
  priority?: "critical" | "high" | "medium" | "low";
  assigneeAgentId?: string;
  goalId?: string;
}

export interface AgentAddress {
  agentId: string;
  agentName: string;
  role: AgentRole;
  content: string;
  reasoning?: string;
  issueProposals: IssueProposal[];
  timestamp: string; // ISO 8601
  status: "completed" | "failed";
  error?: string;
}

export interface SessionDecision {
  summary: string;
  reasoning: string;
  issueProposals: IssueProposal[];
  orchestratorAgentId: string;
  timestamp: string; // ISO 8601
}

export interface CouncilParticipant {
  agentId: string;
  role: AgentRole;
}

export interface CouncilAgendaConfig {
  prompts: string[];
  perAgent: Record<string, string>; // agentId → directive
  outputConstraints: {
    minIssues: number;
    maxIssues: number;
  };
}

export interface CouncilConfig {
  companyId: string;
  enabledSessionTypes: SessionTypeId[];
  defaultSessionTypeId: SessionTypeId;
  invocationMode: InvocationMode;
  resolutionMode: ResolutionMode;
  schedule?: string; // cron, optional
  agenda: CouncilAgendaConfig;
  participants: Record<SessionTypeId, CouncilParticipant[]>; // per session type
}

export interface CouncilSession {
  id: string;
  companyId: string;
  sessionTypeId: SessionTypeId;
  status: SessionStatus;
  invocationMode: InvocationMode;
  resolutionMode: ResolutionMode;
  context: Record<string, unknown>;
  transcript: AgentAddress[];
  decision: SessionDecision | null;
  issuesCreated: string[];
  triggeredBy: "schedule" | "manual" | "api";
  error?: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}
```

- [ ] **Step 2: Export from `packages/shared/src/index.ts`**

Find the last `export { ... }` block in `packages/shared/src/index.ts` and append:

```ts
export type {
  SessionTypeId,
  SessionStatus,
  InvocationMode,
  ResolutionMode,
  AgentRole,
  IssueProposal,
  AgentAddress,
  SessionDecision,
  CouncilParticipant,
  CouncilAgendaConfig,
  CouncilConfig,
  CouncilSession,
} from "./council.js";
```

- [ ] **Step 3: Typecheck**

```sh
cd /path/to/repo && pnpm -r typecheck
```

Expected: PASS (no errors in packages/shared)

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/council.ts packages/shared/src/index.ts
git commit -m "feat(shared): add council protocol types

Co-Authored-By: Doer <noreply@doer.donjon.agency>"
```

---

## Task 2: Plugin Scaffold

**Files:**
- Create: `packages/plugins/council/package.json`
- Create: `packages/plugins/council/tsconfig.json`
- Create: `packages/plugins/council/src/constants.ts`
- Create: `packages/plugins/council/src/manifest.ts`

- [ ] **Step 1: Create `packages/plugins/council/package.json`**

Reference `packages/plugins/examples/plugin-kitchen-sink-example/package.json` for the exact format. The council plugin should look like:

```json
{
  "name": "@doerai/plugin-council",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./dist/worker.js",
  "exports": {
    ".": "./dist/worker.js",
    "./manifest": "./src/manifest.ts"
  },
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@doerai/plugin-sdk": "workspace:*",
    "@doerai/shared": "workspace:*"
  },
  "devDependencies": {
    "typescript": "catalog:",
    "vitest": "catalog:"
  }
}
```

- [ ] **Step 2: Create `packages/plugins/council/tsconfig.json`**

```json
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

- [ ] **Step 3: Create `packages/plugins/council/src/constants.ts`**

```ts
// packages/plugins/council/src/constants.ts

export const PLUGIN_ID = "doer.council";
export const PLUGIN_VERSION = "0.1.0";

export const JOB_KEYS = {
  heartbeat: "council:heartbeat",
  watchdog: "council:watchdog",
} as const;

export const STREAM_CHANNELS = {
  session: (sessionId: string) => `council:session:${sessionId}`,
} as const;

export const DATA_KEYS = {
  sessions: "council:sessions",
  session: "council:session",
  config: "council:config",
  agents: "council:agents",
} as const;

export const ACTION_KEYS = {
  trigger: "council:trigger",
  saveConfig: "council:saveConfig",
} as const;

export const SLOT_IDS = {
  page: "council-page",
  settingsPage: "council-settings",
} as const;

export const EXPORT_NAMES = {
  page: "CouncilPage",
  settingsPage: "CouncilSettingsPage",
} as const;

export const ENTITY_TYPE = "council-session" as const;
export const CONFIG_STATE_KEY = "council:config" as const;

export const DEFAULT_CONFIG = {
  enabledSessionTypes: ["full_council"],
  defaultSessionTypeId: "full_council",
  invocationMode: "parallel",
  resolutionMode: "orchestrator",
  agenda: {
    prompts: [
      "What is blocking progress on active goals?",
      "Where should we focus resources this week?",
      "What issues should be created to unblock the team?",
    ],
    perAgent: {},
    outputConstraints: { minIssues: 2, maxIssues: 6 },
  },
  participants: {
    full_council: [],
  },
} as const;
```

- [ ] **Step 4: Create `packages/plugins/council/src/manifest.ts`**

```ts
// packages/plugins/council/src/manifest.ts
import type { PaperclipPluginManifestV1 } from "@doerai/plugin-sdk";
import { EXPORT_NAMES, JOB_KEYS, PLUGIN_ID, PLUGIN_VERSION, SLOT_IDS } from "./constants.js";

const manifest: PaperclipPluginManifestV1 = {
  id: PLUGIN_ID,
  apiVersion: 1,
  version: PLUGIN_VERSION,
  displayName: "Council",
  description: "Orchestrate multi-agent council sessions. Agents deliberate, an orchestrator decides, issues are created.",
  author: "Donjon Intelligence Systems",
  categories: ["automation"],
  capabilities: [
    "companies.read",
    "issues.read",
    "issues.create",
    "agents.read",
    "agents.invoke",
    "agent.sessions.create",
    "agent.sessions.list",
    "agent.sessions.send",
    "agent.sessions.close",
    "goals.read",
    "activity.log.write",
    "plugin.state.read",
    "plugin.state.write",
    "jobs.schedule",
    "ui.page.register",
  ],
  entrypoints: {
    worker: "./dist/worker.js",
    ui: "./dist/ui",
  },
  jobs: [
    {
      jobKey: JOB_KEYS.heartbeat,
      displayName: "Council Heartbeat",
      description: "Fires scheduled council sessions.",
      schedule: "0 */6 * * *",
    },
    {
      jobKey: JOB_KEYS.watchdog,
      displayName: "Council Watchdog",
      description: "Resets stale running sessions to failed.",
      schedule: "*/15 * * * *",
    },
  ],
  ui: {
    slots: [
      {
        type: "page",
        id: SLOT_IDS.page,
        displayName: "Council",
        exportName: EXPORT_NAMES.page,
        routePath: "/council",
      },
      {
        type: "settingsPage",
        id: SLOT_IDS.settingsPage,
        displayName: "Council Settings",
        exportName: EXPORT_NAMES.settingsPage,
      },
    ],
  },
};

export default manifest;
```

- [ ] **Step 5: Typecheck**

```sh
pnpm -r typecheck
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/plugins/council/
git commit -m "feat(council): plugin scaffold — package, tsconfig, constants, manifest

Co-Authored-By: Doer <noreply@doer.donjon.agency>"
```

---

## Task 3: Session Store

**Files:**
- Create: `packages/plugins/council/src/session-store.ts`

Sessions are stored as plugin entities (`ctx.entities`). Config is stored in scoped state (`ctx.state`).

- [ ] **Step 1: Write the failing test**

Create `packages/plugins/council/tests/session-store.test.ts`:

```ts
// tests/session-store.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSessionStore } from "../src/session-store.js";
import type { CouncilSession, CouncilConfig } from "@doerai/shared";

function makeMockCtx() {
  const entities = new Map<string, Record<string, unknown>>();
  const state = new Map<string, unknown>();

  return {
    entities: {
      upsert: vi.fn(async (input: Record<string, unknown>) => {
        const id = (input.externalId as string) || "test-id";
        const record = { id, ...input, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        entities.set(id, record);
        return record;
      }),
      list: vi.fn(async ({ scopeId }: { scopeId?: string }) => {
        return [...entities.values()].filter(
          (e) => !scopeId || e.scopeId === scopeId
        );
      }),
    },
    state: {
      set: vi.fn(async ({ stateKey }: { stateKey: string }, value: unknown) => {
        state.set(stateKey, value);
      }),
      get: vi.fn(async ({ stateKey }: { stateKey: string }) => {
        return state.get(stateKey) ?? null;
      }),
    },
  };
}

describe("session-store", () => {
  let ctx: ReturnType<typeof makeMockCtx>;
  let store: ReturnType<typeof createSessionStore>;

  beforeEach(() => {
    ctx = makeMockCtx();
    store = createSessionStore(ctx as never);
  });

  it("creates a session and retrieves it", async () => {
    const session = await store.createSession({
      companyId: "co-1",
      sessionTypeId: "full_council",
      invocationMode: "parallel",
      resolutionMode: "orchestrator",
      triggeredBy: "manual",
    });

    expect(session.companyId).toBe("co-1");
    expect(session.sessionTypeId).toBe("full_council");
    expect(session.status).toBe("pending");

    const retrieved = await store.getSession(session.id, "co-1");
    expect(retrieved?.id).toBe(session.id);
  });

  it("updates session status", async () => {
    const session = await store.createSession({
      companyId: "co-1",
      sessionTypeId: "full_council",
      invocationMode: "parallel",
      resolutionMode: "orchestrator",
      triggeredBy: "manual",
    });

    await store.updateSession(session.id, "co-1", { status: "running" });
    const updated = await store.getSession(session.id, "co-1");
    expect(updated?.status).toBe("running");
  });

  it("saves and loads config", async () => {
    const config = {
      companyId: "co-1",
      enabledSessionTypes: ["full_council"] as const,
      defaultSessionTypeId: "full_council",
      invocationMode: "parallel" as const,
      resolutionMode: "orchestrator" as const,
      agenda: {
        prompts: ["What needs doing?"],
        perAgent: {},
        outputConstraints: { minIssues: 1, maxIssues: 5 },
      },
      participants: { full_council: [] },
    } satisfies CouncilConfig;

    await store.saveConfig("co-1", config);
    const loaded = await store.getConfig("co-1");
    expect(loaded?.participants).toEqual({ full_council: [] });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```sh
pnpm vitest run packages/plugins/council/tests/session-store.test.ts
```

Expected: FAIL — `createSessionStore` not defined

- [ ] **Step 3: Create `packages/plugins/council/src/session-store.ts`**

```ts
// packages/plugins/council/src/session-store.ts
import { randomUUID } from "node:crypto";
import type { PluginContext } from "@doerai/plugin-sdk";
import type {
  CouncilConfig,
  CouncilSession,
  InvocationMode,
  ResolutionMode,
  SessionStatus,
  SessionTypeId,
  AgentAddress,
  SessionDecision,
} from "@doerai/shared";
import { CONFIG_STATE_KEY, DEFAULT_CONFIG, ENTITY_TYPE } from "./constants.js";

type CreateSessionInput = {
  companyId: string;
  sessionTypeId: SessionTypeId;
  invocationMode: InvocationMode;
  resolutionMode: ResolutionMode;
  triggeredBy: "schedule" | "manual" | "api";
};

type UpdateSessionInput = Partial<
  Pick<
    CouncilSession,
    | "status"
    | "context"
    | "transcript"
    | "decision"
    | "issuesCreated"
    | "error"
    | "startedAt"
    | "completedAt"
  >
>;

function entityToSession(entity: { data: Record<string, unknown> }): CouncilSession {
  return entity.data as unknown as CouncilSession;
}

export function createSessionStore(ctx: PluginContext) {
  return {
    async createSession(input: CreateSessionInput): Promise<CouncilSession> {
      const id = randomUUID();
      const now = new Date().toISOString();
      const session: CouncilSession = {
        id,
        companyId: input.companyId,
        sessionTypeId: input.sessionTypeId,
        status: "pending",
        invocationMode: input.invocationMode,
        resolutionMode: input.resolutionMode,
        context: {},
        transcript: [],
        decision: null,
        issuesCreated: [],
        triggeredBy: input.triggeredBy,
        startedAt: null,
        completedAt: null,
        createdAt: now,
      };

      await ctx.entities.upsert({
        entityType: ENTITY_TYPE,
        scopeKind: "company",
        scopeId: input.companyId,
        externalId: id,
        title: `${input.sessionTypeId} — ${now.slice(0, 10)}`,
        status: "pending",
        data: session as unknown as Record<string, unknown>,
      });

      return session;
    },

    async getSession(sessionId: string, companyId: string): Promise<CouncilSession | null> {
      const records = await ctx.entities.list({
        entityType: ENTITY_TYPE,
        scopeKind: "company",
        scopeId: companyId,
        externalId: sessionId,
        limit: 1,
        offset: 0,
      });
      if (records.length === 0) return null;
      return entityToSession(records[0]!);
    },

    async listSessions(companyId: string, limit = 50): Promise<CouncilSession[]> {
      const records = await ctx.entities.list({
        entityType: ENTITY_TYPE,
        scopeKind: "company",
        scopeId: companyId,
        limit,
        offset: 0,
      });
      return records.map(entityToSession);
    },

    async updateSession(
      sessionId: string,
      companyId: string,
      patch: UpdateSessionInput,
    ): Promise<CouncilSession> {
      const existing = await this.getSession(sessionId, companyId);
      if (!existing) throw new Error(`Session not found: ${sessionId}`);
      const updated: CouncilSession = { ...existing, ...patch };
      await ctx.entities.upsert({
        entityType: ENTITY_TYPE,
        scopeKind: "company",
        scopeId: companyId,
        externalId: sessionId,
        title: `${updated.sessionTypeId} — ${updated.createdAt.slice(0, 10)}`,
        status: updated.status,
        data: updated as unknown as Record<string, unknown>,
      });
      return updated;
    },

    async appendTranscriptEntry(
      sessionId: string,
      companyId: string,
      entry: AgentAddress,
    ): Promise<void> {
      const session = await this.getSession(sessionId, companyId);
      if (!session) throw new Error(`Session not found: ${sessionId}`);
      await this.updateSession(sessionId, companyId, {
        transcript: [...session.transcript, entry],
      });
    },

    async getConfig(companyId: string): Promise<CouncilConfig | null> {
      const stored = await ctx.state.get({
        scopeKind: "company",
        scopeId: companyId,
        stateKey: CONFIG_STATE_KEY,
      });
      if (!stored) return null;
      return stored as CouncilConfig;
    },

    async saveConfig(companyId: string, config: CouncilConfig): Promise<void> {
      await ctx.state.set(
        { scopeKind: "company", scopeId: companyId, stateKey: CONFIG_STATE_KEY },
        config,
      );
    },

    async getOrDefaultConfig(companyId: string): Promise<CouncilConfig> {
      const stored = await this.getConfig(companyId);
      if (stored) return stored;
      return {
        companyId,
        ...DEFAULT_CONFIG,
        agenda: { ...DEFAULT_CONFIG.agenda },
        participants: { full_council: [] },
      };
    },

    async findStaleRunningSessions(): Promise<CouncilSession[]> {
      // Returns sessions stuck in "running" for more than 15 minutes
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      // Note: entities.list doesn't support date filtering — we filter in-memory
      // This is acceptable for MVP; production would need an index
      const allRunning = await ctx.entities.list({
        entityType: ENTITY_TYPE,
        limit: 200,
        offset: 0,
      });
      return allRunning
        .map(entityToSession)
        .filter(
          (s) =>
            s.status === "running" &&
            s.startedAt !== null &&
            s.startedAt < fifteenMinutesAgo,
        );
    },
  };
}

export type SessionStore = ReturnType<typeof createSessionStore>;
```

- [ ] **Step 4: Run tests to verify they pass**

```sh
pnpm vitest run packages/plugins/council/tests/session-store.test.ts
```

Expected: PASS (all 3 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/council/src/session-store.ts packages/plugins/council/tests/session-store.test.ts
git commit -m "feat(council): session store — entity + state persistence wrappers

Co-Authored-By: Doer <noreply@doer.donjon.agency>"
```

---

## Task 4: Proposal Parser + Brief Builder

**Files:**
- Create: `packages/plugins/council/src/parse-proposals.ts`
- Create: `packages/plugins/council/src/brief-builder.ts`
- Create: `packages/plugins/council/tests/parse-proposals.test.ts`
- Create: `packages/plugins/council/tests/brief-builder.test.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/plugins/council/tests/parse-proposals.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseProposals } from "../src/parse-proposals.js";

describe("parseProposals", () => {
  it("extracts JSON proposals from agent response", () => {
    const response = `Here are my issue proposals:

\`\`\`json
[
  {"title": "Fix auth bug", "description": "Token refresh fails", "priority": "high"},
  {"title": "Add pagination", "priority": "medium"}
]
\`\`\`

That's what I recommend.`;

    const proposals = parseProposals(response);
    expect(proposals).toHaveLength(2);
    expect(proposals[0]!.title).toBe("Fix auth bug");
    expect(proposals[0]!.priority).toBe("high");
    expect(proposals[1]!.title).toBe("Add pagination");
  });

  it("returns empty array when no JSON block", () => {
    expect(parseProposals("No structured output here")).toEqual([]);
  });

  it("returns empty array on invalid JSON", () => {
    expect(parseProposals("```json\nnot valid\n```")).toEqual([]);
  });

  it("filters out entries with no title", () => {
    const response = '```json\n[{"title": "Good one"}, {"description": "no title"}]\n```';
    const proposals = parseProposals(response);
    expect(proposals).toHaveLength(1);
    expect(proposals[0]!.title).toBe("Good one");
  });
});
```

Create `packages/plugins/council/tests/brief-builder.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildBrief } from "../src/brief-builder.js";
import type { CouncilSessionContext, CouncilConfig, CouncilAgendaConfig } from "@doerai/shared";
import type { Agent } from "@doerai/plugin-sdk";

const mockAgent = {
  id: "agent-1",
  name: "Chef",
  role: "executor",
} as unknown as Agent;

const mockContext: CouncilSessionContext = {
  companyId: "co-1",
  sessionTypeId: "full_council",
  activeGoals: [{ id: "g-1", title: "Ship v1", level: "company" }],
  openIssueCount: 12,
  recentActivity: ["Issue closed: Fix login bug"],
  budgetRemaining: 25.50,
  agenda: ["What is blocking progress on active goals?"],
  customContext: {},
};

const mockAgenda: CouncilAgendaConfig = {
  prompts: ["What is blocking progress?"],
  perAgent: { "agent-1": "Focus on backend blockers." },
  outputConstraints: { minIssues: 2, maxIssues: 5 },
};

const mockConfig = {
  agenda: mockAgenda,
} as unknown as CouncilConfig;

describe("buildBrief", () => {
  it("includes session context in brief", () => {
    const brief = buildBrief(mockContext, mockAgent, mockConfig, "member");
    expect(brief).toContain("Ship v1");
    expect(brief).toContain("12");
    expect(brief).toContain("25.50");
  });

  it("includes perAgent directive", () => {
    const brief = buildBrief(mockContext, mockAgent, mockConfig, "member");
    expect(brief).toContain("Focus on backend blockers.");
  });

  it("includes agenda prompts", () => {
    const brief = buildBrief(mockContext, mockAgent, mockConfig, "member");
    expect(brief).toContain("What is blocking progress?");
  });

  it("includes output format instruction", () => {
    const brief = buildBrief(mockContext, mockAgent, mockConfig, "member");
    expect(brief).toContain("```json");
    expect(brief).toContain("title");
  });

  it("uses orchestrator role label when role is orchestrator", () => {
    const brief = buildBrief(mockContext, mockAgent, mockConfig, "orchestrator");
    expect(brief.toLowerCase()).toContain("orchestrator");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```sh
pnpm vitest run packages/plugins/council/tests/parse-proposals.test.ts packages/plugins/council/tests/brief-builder.test.ts
```

Expected: FAIL — modules not found

- [ ] **Step 3: Create `packages/plugins/council/src/parse-proposals.ts`**

```ts
// packages/plugins/council/src/parse-proposals.ts
import type { IssueProposal } from "@doerai/shared";

/**
 * Extracts structured issue proposals from an agent's response.
 *
 * Agents are instructed to output proposals in a fenced ```json block.
 * This parser finds the last such block and attempts to parse it as
 * IssueProposal[]. Returns [] on any failure so the session degrades
 * gracefully rather than erroring.
 */
export function parseProposals(response: string): IssueProposal[] {
  const blocks = [...response.matchAll(/```json\s*([\s\S]*?)```/g)];
  if (blocks.length === 0) return [];

  const lastBlock = blocks[blocks.length - 1]!;
  const raw = lastBlock[1]?.trim() ?? "";

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  const valid: IssueProposal[] = [];
  for (const item of parsed) {
    if (typeof item === "object" && item !== null && typeof (item as Record<string, unknown>).title === "string") {
      const entry = item as Record<string, unknown>;
      valid.push({
        title: entry.title as string,
        description: typeof entry.description === "string" ? entry.description : undefined,
        priority: ["critical", "high", "medium", "low"].includes(String(entry.priority))
          ? (entry.priority as IssueProposal["priority"])
          : undefined,
        assigneeAgentId: typeof entry.assigneeAgentId === "string" ? entry.assigneeAgentId : undefined,
        goalId: typeof entry.goalId === "string" ? entry.goalId : undefined,
      });
    }
  }
  return valid;
}
```

- [ ] **Step 4: Create `packages/plugins/council/src/brief-builder.ts`**

```ts
// packages/plugins/council/src/brief-builder.ts
import type { Agent } from "@doerai/plugin-sdk";
import type { CouncilConfig, CouncilSessionContext, AgentRole } from "@doerai/shared";

/**
 * Builds the council brief string sent to each agent.
 *
 * The brief is the agent's full context for the session:
 * - What the session is about (goals, issue count, budget)
 * - What questions to address (agenda prompts)
 * - Agent-specific directive (perAgent config)
 * - Expected output format (JSON proposals)
 */
export function buildBrief(
  context: CouncilSessionContext,
  agent: Agent,
  config: CouncilConfig,
  role: AgentRole,
): string {
  const { agenda } = config;
  const perAgentDirective = agenda.perAgent[agent.id] ?? "";
  const { minIssues, maxIssues } = agenda.outputConstraints;

  const goalList =
    context.activeGoals.length > 0
      ? context.activeGoals.map((g) => `  - [${g.level}] ${g.title}`).join("\n")
      : "  (none)";

  const recentActivityList =
    context.recentActivity.length > 0
      ? context.recentActivity.map((a) => `  - ${a}`).join("\n")
      : "  (none)";

  const promptList = agenda.prompts
    .map((p, i) => `${i + 1}. ${p}`)
    .join("\n");

  return `You are attending a Full Council session as a ${role}.

== SESSION CONTEXT ==
Active goals:
${goalList}

Open issues: ${context.openIssueCount}
Budget remaining: $${context.budgetRemaining.toFixed(2)}
Recent activity:
${recentActivityList}

== YOUR AGENDA ==
Address the following:
${promptList}
${perAgentDirective ? `\nYour specific focus: ${perAgentDirective}` : ""}

== YOUR ROLE ==
You are a ${role}. After your reasoning, produce ${minIssues}–${maxIssues} concrete
issue proposals in a fenced JSON block at the END of your response:

\`\`\`json
[
  {
    "title": "Issue title (required)",
    "description": "Optional description",
    "priority": "critical | high | medium | low",
    "assigneeAgentId": "optional agent UUID"
  }
]
\`\`\`

Address the council now.`;
}
```

- [ ] **Step 5: Run tests to verify they pass**

```sh
pnpm vitest run packages/plugins/council/tests/parse-proposals.test.ts packages/plugins/council/tests/brief-builder.test.ts
```

Expected: PASS (all tests)

- [ ] **Step 6: Commit**

```bash
git add packages/plugins/council/src/parse-proposals.ts packages/plugins/council/src/brief-builder.ts packages/plugins/council/tests/parse-proposals.test.ts packages/plugins/council/tests/brief-builder.test.ts
git commit -m "feat(council): proposal parser + brief builder

Co-Authored-By: Doer <noreply@doer.donjon.agency>"
```

---

## Task 5: Full Council Session Type + Engine

**Files:**
- Create: `packages/plugins/council/src/session-types/full-council.ts`
- Create: `packages/plugins/council/src/engine.ts`
- Create: `packages/plugins/council/tests/engine.test.ts`

- [ ] **Step 1: Write the failing engine test**

Create `packages/plugins/council/tests/engine.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CouncilConfig, CouncilSession } from "@doerai/shared";

// Mock the engine's dependencies
vi.mock("../src/session-types/full-council.js", () => ({
  fullCouncilHandler: {
    buildContext: vi.fn(async () => ({
      companyId: "co-1",
      sessionTypeId: "full_council",
      activeGoals: [],
      openIssueCount: 0,
      recentActivity: [],
      budgetRemaining: 100,
      agenda: ["What needs doing?"],
      customContext: {},
    })),
    buildBrief: vi.fn(() => "Council brief here"),
    invoke: vi.fn(async () => [
      {
        agentId: "ag-1",
        agentName: "Chef",
        role: "member",
        content: "My address\n```json\n[{\"title\":\"Fix login\"}]\n```",
        issueProposals: [{ title: "Fix login" }],
        timestamp: new Date().toISOString(),
        status: "completed",
      },
    ]),
    resolve: vi.fn(async () => ({
      summary: "Council decision",
      reasoning: "Based on member input",
      issueProposals: [{ title: "Fix login", priority: "high" }],
      orchestratorAgentId: "ag-2",
      timestamp: new Date().toISOString(),
    })),
    apply: vi.fn(async () => [{ id: "issue-1", title: "Fix login" }]),
  },
}));

describe("runSession", () => {
  it("runs a full session from pending to completed and creates issues", async () => {
    const { runSession } = await import("../src/engine.js");

    const sessions = new Map<string, CouncilSession>();
    const issues: string[] = [];

    const mockStore = {
      getSession: vi.fn(async (id: string) => sessions.get(id) ?? null),
      updateSession: vi.fn(async (id: string, _: string, patch: Partial<CouncilSession>) => {
        const existing = sessions.get(id)!;
        const updated = { ...existing, ...patch };
        sessions.set(id, updated);
        return updated;
      }),
      appendTranscriptEntry: vi.fn(),
      getOrDefaultConfig: vi.fn(async (): Promise<CouncilConfig> => ({
        companyId: "co-1",
        enabledSessionTypes: ["full_council"],
        defaultSessionTypeId: "full_council",
        invocationMode: "parallel",
        resolutionMode: "orchestrator",
        agenda: {
          prompts: ["What needs doing?"],
          perAgent: {},
          outputConstraints: { minIssues: 1, maxIssues: 5 },
        },
        participants: {
          full_council: [
            { agentId: "ag-1", role: "member" },
            { agentId: "ag-2", role: "orchestrator" },
          ],
        },
      })),
    };

    const initialSession: CouncilSession = {
      id: "session-1",
      companyId: "co-1",
      sessionTypeId: "full_council",
      status: "pending",
      invocationMode: "parallel",
      resolutionMode: "orchestrator",
      context: {},
      transcript: [],
      decision: null,
      issuesCreated: [],
      triggeredBy: "manual",
      startedAt: null,
      completedAt: null,
      createdAt: new Date().toISOString(),
    };
    sessions.set("session-1", initialSession);

    const mockCtx = {
      agents: {
        get: vi.fn(async (id: string) => ({ id, name: id === "ag-1" ? "Chef" : "DonDog", role: "executor", status: "active" })),
        list: vi.fn(async () => []),
      },
      activity: {
        log: vi.fn(async () => undefined),
      },
      streams: {
        open: vi.fn(),
        emit: vi.fn(),
        close: vi.fn(),
      },
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      },
    };

    await runSession("session-1", "co-1", mockStore as never, mockCtx as never);

    // Session should be completed
    const finalSession = sessions.get("session-1")!;
    expect(finalSession.status).toBe("completed");
    expect(finalSession.issuesCreated).toContain("issue-1");
    expect(mockCtx.activity.log).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```sh
pnpm vitest run packages/plugins/council/tests/engine.test.ts
```

Expected: FAIL — engine module not found

- [ ] **Step 3: Create `packages/plugins/council/src/session-types/full-council.ts`**

```ts
// packages/plugins/council/src/session-types/full-council.ts
import type { PluginContext, Agent } from "@doerai/plugin-sdk";
import type {
  AgentAddress,
  CouncilConfig,
  CouncilSession,
  CouncilSessionContext,
  IssueProposal,
  SessionDecision,
} from "@doerai/shared";
import { buildBrief } from "../brief-builder.js";
import { parseProposals } from "../parse-proposals.js";

async function invokeOneAgent(
  ctx: PluginContext,
  agent: Agent,
  session: CouncilSession,
  brief: string,
  config: CouncilConfig,
  role: "member" | "orchestrator" | "guest",
): Promise<AgentAddress> {
  const agentSession = await ctx.agents.sessions.create(agent.id, session.companyId, {
    taskKey: `council:${session.id}`,
    reason: `Council session ${session.sessionTypeId}`,
  });

  let content = "";

  try {
    await ctx.agents.sessions.sendMessage(agentSession.sessionId, session.companyId, {
      prompt: brief,
      reason: "Council brief",
      onEvent: (event) => {
        if (event.eventType === "chunk" && event.message) {
          content += event.message;
          // Stream each chunk to the UI
          ctx.streams.emit(`council:session:${session.id}`, {
            type: "transcript:chunk",
            agentId: agent.id,
            agentName: agent.name,
            chunk: event.message,
          });
        }
      },
    });
  } catch (err) {
    await ctx.agents.sessions.close(agentSession.sessionId, session.companyId).catch(() => undefined);
    return {
      agentId: agent.id,
      agentName: agent.name,
      role,
      content: "",
      issueProposals: [],
      timestamp: new Date().toISOString(),
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
    };
  }

  await ctx.agents.sessions.close(agentSession.sessionId, session.companyId).catch(() => undefined);

  const issueProposals = parseProposals(content);

  return {
    agentId: agent.id,
    agentName: agent.name,
    role,
    content,
    issueProposals,
    timestamp: new Date().toISOString(),
    status: "completed",
  };
}

export const fullCouncilHandler = {
  async buildContext(
    { session, config }: { session: CouncilSession; config: CouncilConfig },
    ctx: PluginContext,
  ): Promise<CouncilSessionContext> {
    const [goals, issues] = await Promise.all([
      ctx.goals.list({ companyId: session.companyId, status: "active", limit: 20, offset: 0 }),
      ctx.issues.list({ companyId: session.companyId, limit: 1, offset: 0 }),
    ]);

    return {
      companyId: session.companyId,
      sessionTypeId: session.sessionTypeId,
      activeGoals: goals.map((g) => ({ id: g.id, title: g.title, level: g.level })),
      openIssueCount: issues.length, // approximation for MVP
      recentActivity: [],
      budgetRemaining: 0, // MVP: no budget API yet, safe default
      agenda: config.agenda.prompts,
      customContext: {},
    };
  },

  async invoke(
    session: CouncilSession,
    agents: Agent[],
    config: CouncilConfig,
    ctx: PluginContext,
  ): Promise<AgentAddress[]> {
    const participants = config.participants["full_council"] ?? [];
    const orchestratorId = participants.find((p) => p.role === "orchestrator")?.agentId;
    const members = agents.filter((a) => a.id !== orchestratorId);

    ctx.streams.open(`council:session:${session.id}`, session.companyId);

    const addresses: AgentAddress[] = [];

    if (session.invocationMode === "parallel") {
      const results = await Promise.allSettled(
        members.map(async (agent) => {
          const participant = participants.find((p) => p.agentId === agent.id);
          const role = participant?.role ?? "member";
          const brief = buildBrief(
            session.context as unknown as CouncilSessionContext,
            agent,
            config,
            role,
          );
          return invokeOneAgent(ctx, agent, session, brief, config, role === "orchestrator" ? "orchestrator" : "member");
        }),
      );
      for (const result of results) {
        if (result.status === "fulfilled") addresses.push(result.value);
      }
    } else {
      // sequential
      for (const agent of members) {
        const participant = participants.find((p) => p.agentId === agent.id);
        const role = participant?.role ?? "member";
        const brief = buildBrief(
          session.context as unknown as CouncilSessionContext,
          agent,
          config,
          role,
        );
        addresses.push(
          await invokeOneAgent(ctx, agent, session, brief, config, role === "orchestrator" ? "orchestrator" : "member"),
        );
      }
    }

    return addresses;
  },

  async resolve(
    addresses: AgentAddress[],
    orchestrator: Agent,
    config: CouncilConfig,
    ctx: PluginContext,
    session: CouncilSession,
  ): Promise<SessionDecision> {
    // Build a synthesis prompt for the orchestrator
    const transcriptText = addresses
      .map((a) => `=== ${a.agentName} (${a.role}) ===\n${a.content}`)
      .join("\n\n");

    const resolutionBrief = `You are the orchestrator of a council session. Read the following addresses from council members, then synthesize a decision.

${transcriptText}

Your task:
1. Summarize the key themes and proposals across all addresses.
2. Select and refine the most important ${config.agenda.outputConstraints.minIssues}–${config.agenda.outputConstraints.maxIssues} issues.
3. Output your final decision:
   - A 2–3 sentence summary
   - The refined issue list as a fenced JSON block

\`\`\`json
[
  {
    "title": "Issue title",
    "description": "Description",
    "priority": "critical | high | medium | low",
    "assigneeAgentId": "optional agent UUID"
  }
]
\`\`\``;

    const oSession = await ctx.agents.sessions.create(orchestrator.id, session.companyId, {
      taskKey: `council:${session.id}:resolution`,
      reason: "Council resolution",
    });

    let responseText = "";
    try {
      await ctx.agents.sessions.sendMessage(oSession.sessionId, session.companyId, {
        prompt: resolutionBrief,
        reason: "Council resolution",
        onEvent: (event) => {
          if (event.eventType === "chunk" && event.message) {
            responseText += event.message;
          }
        },
      });
    } finally {
      await ctx.agents.sessions.close(oSession.sessionId, session.companyId).catch(() => undefined);
      ctx.streams.close(`council:session:${session.id}`);
    }

    const issueProposals = parseProposals(responseText);

    // Extract summary: everything before the first ```json block
    const summaryMatch = responseText.split("```json")[0]?.trim() ?? responseText.trim();

    return {
      summary: summaryMatch.slice(0, 500),
      reasoning: responseText,
      issueProposals,
      orchestratorAgentId: orchestrator.id,
      timestamp: new Date().toISOString(),
    };
  },

  async apply(
    decision: SessionDecision,
    companyId: string,
    ctx: PluginContext,
  ): Promise<Array<{ id: string; title: string }>> {
    const created: Array<{ id: string; title: string }> = [];
    for (const proposal of decision.issueProposals) {
      try {
        const issue = await ctx.issues.create({
          companyId,
          title: proposal.title,
          description: proposal.description,
          priority: proposal.priority,
          assigneeAgentId: proposal.assigneeAgentId,
          goalId: proposal.goalId,
        });
        created.push({ id: issue.id, title: issue.title });
      } catch (err) {
        // Individual issue creation failure doesn't abort the whole apply
        // The session will be marked completed_with_errors
      }
    }
    return created;
  },
};
```

- [ ] **Step 4: Create `packages/plugins/council/src/engine.ts`**

```ts
// packages/plugins/council/src/engine.ts
import type { PluginContext } from "@doerai/plugin-sdk";
import type { SessionStore } from "./session-store.js";
import { fullCouncilHandler } from "./session-types/full-council.js";

const SESSION_TYPE_HANDLERS: Record<string, typeof fullCouncilHandler> = {
  full_council: fullCouncilHandler,
};

export async function runSession(
  sessionId: string,
  companyId: string,
  store: SessionStore,
  ctx: PluginContext,
): Promise<void> {
  const session = await store.getSession(sessionId, companyId);
  if (!session) throw new Error(`Session not found: ${sessionId}`);

  const config = await store.getOrDefaultConfig(companyId);
  const handler = SESSION_TYPE_HANDLERS[session.sessionTypeId];

  if (!handler) {
    await store.updateSession(sessionId, companyId, {
      status: "failed",
      error: `Unknown session type: ${session.sessionTypeId}`,
      completedAt: new Date().toISOString(),
    });
    return;
  }

  await store.updateSession(sessionId, companyId, {
    status: "running",
    startedAt: new Date().toISOString(),
  });

  try {
    // 1. Build context
    const context = await handler.buildContext({ session, config }, ctx);
    await store.updateSession(sessionId, companyId, { context: context as unknown as Record<string, unknown> });

    // 2. Load agents
    const participants = config.participants[session.sessionTypeId] ?? [];
    const agents = (
      await Promise.all(
        participants.map(async (p) => {
          try {
            return await ctx.agents.get(p.agentId, companyId);
          } catch {
            return null;
          }
        }),
      )
    ).filter(Boolean) as Awaited<ReturnType<typeof ctx.agents.get>>[];

    if (agents.length === 0) {
      throw new Error("No agents available for council session");
    }

    // 3. Invoke members (non-orchestrators)
    const updatedSession = { ...session, context: context as unknown as Record<string, unknown> };
    const addresses = await handler.invoke(updatedSession, agents as never, config, ctx);
    await store.updateSession(sessionId, companyId, { transcript: addresses });

    // 4. Find orchestrator
    const orchestratorId = participants.find((p) => p.role === "orchestrator")?.agentId;
    const orchestrator = orchestratorId
      ? agents.find((a) => a?.id === orchestratorId) ?? agents[agents.length - 1]
      : agents[agents.length - 1];

    if (!orchestrator) throw new Error("No orchestrator agent found");

    // 5. Resolve
    const fullSession = { ...updatedSession, transcript: addresses };
    const decision = await handler.resolve(addresses, orchestrator, config, ctx, fullSession as never);

    // 6. Apply
    const createdIssues = await handler.apply(decision, companyId, ctx);
    const hasErrors = createdIssues.length < decision.issueProposals.length;

    await store.updateSession(sessionId, companyId, {
      status: hasErrors ? "completed_with_errors" : "completed",
      decision,
      issuesCreated: createdIssues.map((i) => i.id),
      completedAt: new Date().toISOString(),
    });

    // 7. Activity log
    await ctx.activity.log({
      companyId,
      message: `Council session completed: ${decision.summary.slice(0, 120)}`,
      entityType: "council-session",
      entityId: sessionId,
      metadata: {
        sessionTypeId: session.sessionTypeId,
        issuesCreated: createdIssues.length,
      },
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    ctx.logger.error("Council session failed", { sessionId, error });
    await store.updateSession(sessionId, companyId, {
      status: "failed",
      error,
      completedAt: new Date().toISOString(),
    });
    await ctx.activity.log({
      companyId,
      message: `Council session failed: ${error}`,
      entityType: "council-session",
      entityId: sessionId,
    });
  }
}

export async function runWatchdog(store: SessionStore, ctx: PluginContext): Promise<void> {
  const stale = await store.findStaleRunningSessions();
  for (const session of stale) {
    ctx.logger.warn("Watchdog: resetting stale session", { sessionId: session.id });
    await store.updateSession(session.id, session.companyId, {
      status: "failed",
      error: "Watchdog: session exceeded 15 minute runtime limit",
      completedAt: new Date().toISOString(),
    });
  }
}
```

- [ ] **Step 5: Run test**

```sh
pnpm vitest run packages/plugins/council/tests/engine.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/plugins/council/src/session-types/ packages/plugins/council/src/engine.ts packages/plugins/council/tests/engine.test.ts
git commit -m "feat(council): Full Council handler + engine loop

Co-Authored-By: Doer <noreply@doer.donjon.agency>"
```

---

## Task 6: Worker (Data + Action + Job Handlers)

**Files:**
- Create: `packages/plugins/council/src/worker.ts`

- [ ] **Step 1: Create `packages/plugins/council/src/worker.ts`**

```ts
// packages/plugins/council/src/worker.ts
import { definePlugin, runWorker } from "@doerai/plugin-sdk";
import type { PluginJobContext } from "@doerai/plugin-sdk";
import type { CouncilConfig } from "@doerai/shared";
import { ACTION_KEYS, DATA_KEYS, DEFAULT_CONFIG, JOB_KEYS, PLUGIN_ID } from "./constants.js";
import { runSession, runWatchdog } from "./engine.js";
import { createSessionStore } from "./session-store.js";

const plugin = definePlugin({
  async setup(ctx) {
    const store = createSessionStore(ctx);

    // ── DATA HANDLERS ──────────────────────────────────────────────────────

    ctx.data.register(DATA_KEYS.sessions, async (params) => {
      const companyId = String(params.companyId ?? "");
      if (!companyId) return [];
      return store.listSessions(companyId);
    });

    ctx.data.register(DATA_KEYS.session, async (params) => {
      const sessionId = String(params.sessionId ?? "");
      const companyId = String(params.companyId ?? "");
      if (!sessionId || !companyId) return null;
      return store.getSession(sessionId, companyId);
    });

    ctx.data.register(DATA_KEYS.config, async (params) => {
      const companyId = String(params.companyId ?? "");
      if (!companyId) return null;
      return store.getOrDefaultConfig(companyId);
    });

    ctx.data.register(DATA_KEYS.agents, async (params) => {
      const companyId = String(params.companyId ?? "");
      if (!companyId) return [];
      return ctx.agents.list({ companyId, limit: 50, offset: 0 });
    });

    // ── ACTION HANDLERS ────────────────────────────────────────────────────

    ctx.actions.register(ACTION_KEYS.trigger, async (params) => {
      const companyId = String(params.companyId ?? "");
      const sessionTypeId = String(params.sessionTypeId ?? "full_council");
      const triggeredBy = (params.triggeredBy as "manual" | "api") ?? "manual";

      if (!companyId) throw new Error("companyId is required");

      const config = await store.getOrDefaultConfig(companyId);
      const session = await store.createSession({
        companyId,
        sessionTypeId,
        invocationMode: config.invocationMode,
        resolutionMode: config.resolutionMode,
        triggeredBy,
      });

      // Run async — don't await, return immediately
      void runSession(session.id, companyId, store, ctx).catch((err) => {
        ctx.logger.error("Session runner error", {
          sessionId: session.id,
          error: err instanceof Error ? err.message : String(err),
        });
      });

      ctx.logger.info("Council session triggered", { sessionId: session.id, sessionTypeId });
      return { sessionId: session.id, status: "pending" };
    });

    ctx.actions.register(ACTION_KEYS.saveConfig, async (params) => {
      const companyId = String(params.companyId ?? "");
      if (!companyId) throw new Error("companyId is required");

      // Merge incoming partial config with defaults
      const existing = await store.getOrDefaultConfig(companyId);
      const incoming = params as Partial<CouncilConfig>;
      const merged: CouncilConfig = {
        ...existing,
        ...incoming,
        companyId,
        agenda: {
          ...existing.agenda,
          ...(incoming.agenda ?? {}),
          outputConstraints: {
            ...existing.agenda.outputConstraints,
            ...(incoming.agenda?.outputConstraints ?? {}),
          },
        },
      };
      await store.saveConfig(companyId, merged);
      return { ok: true };
    });

    // ── JOB HANDLERS ───────────────────────────────────────────────────────

    ctx.jobs.register(JOB_KEYS.heartbeat, async (job: PluginJobContext) => {
      ctx.logger.info("Council heartbeat fired", { runId: job.runId });
      const companies = await ctx.companies.list({ limit: 100, offset: 0 });

      for (const company of companies) {
        const config = await store.getOrDefaultConfig(company.id);
        if (!config.schedule) continue; // only run for companies with a schedule enabled

        const session = await store.createSession({
          companyId: company.id,
          sessionTypeId: config.defaultSessionTypeId,
          invocationMode: config.invocationMode,
          resolutionMode: config.resolutionMode,
          triggeredBy: "schedule",
        });

        void runSession(session.id, company.id, store, ctx).catch((err) => {
          ctx.logger.error("Scheduled session failed", {
            sessionId: session.id,
            error: err instanceof Error ? err.message : String(err),
          });
        });
      }
    });

    ctx.jobs.register(JOB_KEYS.watchdog, async () => {
      await runWatchdog(store, ctx);
    });

    ctx.logger.info("Council plugin ready", { pluginId: PLUGIN_ID });
  },

  async onHealth() {
    return { status: "ok" as const, message: "Council plugin operational" };
  },

  async onValidateConfig(config) {
    const errors: string[] = [];
    const typed = config as Partial<CouncilConfig>;
    if (typed.invocationMode && !["parallel", "sequential"].includes(typed.invocationMode)) {
      errors.push("invocationMode must be 'parallel' or 'sequential'");
    }
    if (typed.resolutionMode && !["orchestrator", "user_approval", "auto"].includes(typed.resolutionMode)) {
      errors.push("resolutionMode must be 'orchestrator', 'user_approval', or 'auto'");
    }
    return { ok: errors.length === 0, errors };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
```

- [ ] **Step 2: Typecheck**

```sh
pnpm -r typecheck
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add packages/plugins/council/src/worker.ts
git commit -m "feat(council): worker — data/action/job handlers

Co-Authored-By: Doer <noreply@doer.donjon.agency>"
```

---

## Task 7: Plugin UI

**Files:**
- Create: `packages/plugins/council/src/ui/index.tsx`
- Create: `packages/plugins/council/src/ui/CouncilPage.tsx`
- Create: `packages/plugins/council/src/ui/CouncilSessionDetail.tsx`

The plugin UI uses `usePluginData` and `usePluginAction` hooks from `@doerai/plugin-sdk/ui`. Check `packages/plugins/examples/plugin-kitchen-sink-example/src/ui/index.tsx` for the exact import paths before implementing.

- [ ] **Step 1: Read the kitchen sink UI for import patterns**

```sh
cat packages/plugins/examples/plugin-kitchen-sink-example/src/ui/index.tsx
```

Note the exact import for `usePluginData`, `usePluginAction`, `usePluginStream` — use those same paths.

- [ ] **Step 2: Create `packages/plugins/council/src/ui/index.tsx`**

```tsx
// packages/plugins/council/src/ui/index.tsx
export { CouncilPage } from "./CouncilPage.js";
export { CouncilPage as CouncilSettingsPage } from "./CouncilPage.js"; // placeholder for settings
```

- [ ] **Step 3: Create `packages/plugins/council/src/ui/CouncilPage.tsx`**

```tsx
// packages/plugins/council/src/ui/CouncilPage.tsx
import * as React from "react";
// Import usePluginData and usePluginAction from the actual SDK UI path
// (verify the exact path from the kitchen-sink example)
import { usePluginData, usePluginAction } from "@doerai/plugin-sdk/ui";
import type { CouncilSession } from "@doerai/shared";
import { DATA_KEYS, ACTION_KEYS } from "../constants.js";

const STATUS_COLOR: Record<string, string> = {
  pending: "var(--ink-dim)",
  running: "var(--pulse)",
  completed: "var(--accent)",
  failed: "var(--danger)",
  completed_with_errors: "var(--warn)",
};

function SessionRow({
  session,
  onSelect,
}: {
  session: CouncilSession;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      onClick={() => onSelect(session.id)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 14px",
        borderBottom: "1px solid var(--line-soft)",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 14, color: "var(--ink)" }}>
          {session.sessionTypeId.replace(/_/g, " ")}
        </span>
        <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>
          {session.createdAt.slice(0, 16).replace("T", " ")} · {session.triggeredBy}
        </span>
      </div>
      <span
        className="fw-chip"
        style={{ color: STATUS_COLOR[session.status] ?? "var(--ink-dim)", fontSize: 11 }}
      >
        {session.status}
      </span>
    </div>
  );
}

export function CouncilPage({ companyId }: { companyId: string }) {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const { data: sessions, isLoading } = usePluginData<CouncilSession[]>(
    DATA_KEYS.sessions,
    { companyId },
  );
  const { mutate: trigger, isPending } = usePluginAction(ACTION_KEYS.trigger);

  if (isLoading) {
    return (
      <div style={{ padding: 24, color: "var(--ink-faint)" }}>Loading sessions…</div>
    );
  }

  const sessionList = sessions ?? [];

  if (selectedId) {
    return (
      <CouncilSessionDetailInline
        sessionId={selectedId}
        companyId={companyId}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>
          Council Sessions
        </span>
        <button
          onClick={() => trigger({ companyId, sessionTypeId: "full_council", triggeredBy: "manual" })}
          disabled={isPending}
          className="fw-chip pulse"
          style={{
            cursor: isPending ? "not-allowed" : "pointer",
            padding: "6px 14px",
            fontSize: 13,
            opacity: isPending ? 0.6 : 1,
          }}
        >
          {isPending ? "Starting…" : "Start Session"}
        </button>
      </div>

      {sessionList.length === 0 ? (
        <div
          className="fw-card"
          style={{ padding: 32, textAlign: "center", color: "var(--ink-faint)" }}
        >
          No sessions yet. Start one above.
        </div>
      ) : (
        <div className="fw-card" style={{ overflow: "hidden" }}>
          {sessionList.map((s) => (
            <SessionRow key={s.id} session={s} onSelect={setSelectedId} />
          ))}
        </div>
      )}
    </div>
  );
}

// Inline session detail — avoids a separate route for MVP
function CouncilSessionDetailInline({
  sessionId,
  companyId,
  onBack,
}: {
  sessionId: string;
  companyId: string;
  onBack: () => void;
}) {
  // Poll while session is pending/running; stop once it settles
  const [shouldPoll, setShouldPoll] = React.useState(true);
  const { data: session, isLoading } = usePluginData<CouncilSession>(
    DATA_KEYS.session,
    { sessionId, companyId },
    { refetchInterval: shouldPoll ? 2000 : false },
  );
  React.useEffect(() => {
    if (session && session.status !== "pending" && session.status !== "running") {
      setShouldPoll(false);
    }
  }, [session?.status]);

  if (isLoading || !session) {
    return <div style={{ padding: 24, color: "var(--ink-faint)" }}>Loading…</div>;
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px" }}>
      <button
        onClick={onBack}
        style={{
          background: "none",
          border: "none",
          color: "var(--ink-dim)",
          fontSize: 13,
          cursor: "pointer",
          marginBottom: 16,
        }}
      >
        ← Sessions
      </button>

      <div className="fw-card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <span className="fw-chip fw-uc" style={{ fontSize: 11 }}>
            {session.sessionTypeId.replace(/_/g, " ")}
          </span>
          <span
            className="fw-chip"
            style={{
              color: STATUS_COLOR[session.status] ?? "var(--ink-dim)",
              fontSize: 11,
            }}
          >
            {session.status}
          </span>
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>
          {session.createdAt.slice(0, 16).replace("T", " ")} · triggered by {session.triggeredBy}
        </div>
      </div>

      {/* Transcript */}
      <div style={{ marginBottom: 16 }}>
        <div className="fw-uc" style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 8 }}>
          Transcript ({session.transcript.length} addresses)
        </div>
        {session.transcript.map((addr, i) => (
          <div key={i} className="fw-card" style={{ padding: 14, marginBottom: 8 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 13 }}>{addr.agentName}</span>
              <span className="fw-chip" style={{ fontSize: 11 }}>
                {addr.role}
              </span>
            </div>
            <pre
              style={{
                fontSize: 12,
                color: "var(--ink-dim)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                margin: 0,
                fontFamily: "inherit",
              }}
            >
              {addr.content.slice(0, 800)}
              {addr.content.length > 800 ? "…" : ""}
            </pre>
            {addr.issueProposals.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 12, color: "var(--ink-faint)" }}>
                {addr.issueProposals.length} proposal{addr.issueProposals.length !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Decision + Issues */}
      {session.decision && (
        <div>
          <div className="fw-uc" style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 8 }}>
            Decision
          </div>
          <div className="fw-card" style={{ padding: 14, marginBottom: 12 }}>
            <p style={{ fontSize: 13, color: "var(--ink)", margin: 0 }}>
              {session.decision.summary}
            </p>
          </div>
          <div className="fw-uc" style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 8 }}>
            Issues Created ({session.issuesCreated.length})
          </div>
          {session.decision.issueProposals.map((p, i) => (
            <div key={i} className="fw-card" style={{ padding: "10px 14px", marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: "var(--ink)" }}>{p.title}</span>
              {p.priority && (
                <span
                  className="fw-chip"
                  style={{ marginLeft: 8, fontSize: 11, color: "var(--ink-faint)" }}
                >
                  {p.priority}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

```sh
pnpm -r typecheck
```

Expected: PASS (fix any import path issues based on what you found in Step 1)

- [ ] **Step 5: Commit**

```bash
git add packages/plugins/council/src/ui/
git commit -m "feat(council): plugin UI — sessions list + detail

Co-Authored-By: Doer <noreply@doer.donjon.agency>"
```

---

## Task 8: Full Verification

- [ ] **Step 1: Run all tests**

```sh
pnpm test:run
```

Expected: PASS — all council tests pass, no other tests broken

- [ ] **Step 2: Typecheck all packages**

```sh
pnpm -r typecheck
```

Expected: PASS

- [ ] **Step 3: Build**

```sh
pnpm build
```

Expected: PASS

- [ ] **Step 4: Smoke test (dev server)**

```sh
pnpm dev
```

Then:
```sh
curl http://localhost:3101/api/health
```

Expected: `{ "ok": true }`

Check that the council plugin appears in plugin list:
```sh
curl http://localhost:3101/api/plugins
```

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat(council): doer_council plugin — sub-project 1 complete

Full Council session type with parallel/sequential invocation, streaming
transcript, issue creation, and sessions list UI.

Co-Authored-By: Doer <noreply@doer.donjon.agency>"
```

---

## DonDog Memory Update (Manual Prerequisite)

Before enabling the plugin on Clay's company (`DON`), update DonDog's Letta memory blocks:

1. Find memory blocks containing autonomous council instructions:
   ```sh
   # Via Letta API:
   GET https://api.letta.com/v1/agents/{dondog_agent_id}/core-memory
   ```
2. Locate any block containing text like "run the council", "council sessions", "dispatch agents for council"
3. Update or archive that block — replace with: "Council sessions are now orchestrated by Doer via the `doer_council` plugin. Attend when summoned via a council brief message. Do not initiate council sessions independently."
4. Verify DonDog's behavior is unchanged for non-council tasks.

---

## Sub-project 2 Preview

The next plan (`2026-05-19-doer-council-plan-2.md`) covers:
- **Interview session type** — 1:1 with orchestrator + `POST /respond` endpoint
- **Bidding session type** — blank issues created in buildContext, agents bid
- **Configure UI page** — agenda editor, participant management, schedule toggle
- **Guest seat support** — `guestAgents` param in trigger action
