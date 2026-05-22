# doer_council Plugin — Design Spec

**Status:** Draft for review  
**Author:** Clay + DonDog  
**Target:** `@doerai/plugin-council`, mounted at `/:companyPrefix/council`  
**Depends on:** Plugin SDK (`@doerai/plugin-sdk`), Letta adapter system, `issueService`

---

## Overview

`doer_council` is an optional Doer plugin that orchestrates **multi-agent deliberation sessions** — structured meetings where a configured set of agents addresses a shared context, produces reasoning, and outputs Doer issues. It is the infrastructure version of what Clay has been running freely on Letta Cloud: DonDog briefs the council, Chef proposes topics, Alfie delegates — but now all of it is logged, configurable, and first-class inside Doer.

The plugin introduces three built-in session types (Full Council, 1:1 Interview, Bidding), a flexible session type protocol that supports custom types, and a Fernweh UI for viewing session transcripts and configuring councils.

**The north star:** capture what Clay's agents already do autonomously and build proper infrastructure around it — logging, config, scheduling, issue creation — so it can scale to other Doer users and companies.

---

## Goals

1. Orchestrate multi-agent council sessions with parallel or sequential invocation modes.
2. Ship three built-in session types: Full Council, 1:1 Interview, Bidding.
3. Log every session — context injected, each agent's address, orchestrator decision, issues created.
4. Create Doer issues as the primary output of every session.
5. Respect all Doer core invariants: company scope, budget hard-stop, activity log, agent key isolation.
6. Enable guest/specialist agent seats — ephemeral agents added to a single session.
7. Be fully optional — enable/disable per company, no impact on core Doer when disabled.

## Non-Goals (V1)

- Real-time agent-to-agent conversation (agents don't respond to each other mid-session; they each address the shared brief independently).
- Custom session type builder in the UI — power users define types in code via `defineSessionType()`.
- Multi-company councils.
- Replacing the existing agent heartbeat/wakeup system — councils are additive.

---

## Migration Prerequisite

**Before enabling `doer_council` on Clay's company:** DonDog's Letta memory blocks contain instructions for running council sessions autonomously on Letta Cloud. These must be updated to reflect the new model — DonDog attends councils when summoned by Doer; he does not orchestrate them independently.

Action required: locate the relevant memory blocks via the Letta API, archive or replace the autonomous council instructions, and update DonDog's context to reference Doer as the council orchestrator. This is a one-time operational step before the plugin goes live.

---

## Shared Types (`packages/shared`)

The session type protocol is defined in `packages/shared/src/council.ts` as pure TypeScript interfaces. Core Doer doesn't use them, but they're part of the contract so the data shape is stable across plugin versions.

```ts
export type SessionTypeId = 'full_council' | 'interview' | 'bidding' | string;
export type SessionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'completed_with_errors';
export type InvocationMode = 'parallel' | 'sequential';
export type ResolutionMode = 'orchestrator' | 'user_approval' | 'auto';
export type AgentRole = 'member' | 'orchestrator' | 'guest';

export interface CouncilSessionContext {
  companyId: string;
  sessionTypeId: SessionTypeId;
  activeGoals: { id: string; title: string; level: string }[];
  openIssueCount: number;
  recentActivity: string[];
  budgetRemaining: number;
  agenda: string[];
  customContext?: Record<string, unknown>;
}

export interface AgentAddress {
  agentId: string;
  agentName: string;
  role: AgentRole;
  content: string;
  reasoning?: string;
  issueProposals?: IssueProposal[];
  timestamp: Date;
  status: 'completed' | 'failed';
  error?: string;
}

export interface IssueProposal {
  title: string;
  description?: string;
  priority?: string;
  assigneeAgentId?: string;
  goalId?: string;
}

export interface SessionDecision {
  summary: string;
  reasoning: string;
  issueProposals: IssueProposal[];
  orchestratorAgentId: string;
  timestamp: Date;
}

// ContextInput: raw trigger payload (sessionTypeId, companyId, guestAgents, overrides)
// CouncilConfig: row from council_configs joined with council_participants
// CouncilSession: row from council_sessions (mutable during engine run)
// Agent, Db, Issue: from @doerai/shared and @doerai/db respectively

export interface CouncilSessionTypeHandler {
  id: SessionTypeId;
  buildContext(input: ContextInput, db: Db): Promise<CouncilSessionContext>;
  buildBrief(context: CouncilSessionContext, agent: Agent, config: CouncilConfig): string;
  invoke(session: CouncilSession, agents: Agent[], db: Db): Promise<AgentAddress[]>;
  resolve(addresses: AgentAddress[], orchestrator: Agent, db: Db): Promise<SessionDecision>;
  apply(decision: SessionDecision, companyId: string, db: Db): Promise<Issue[]>;
}
```

---

## Data Model

Three tables in the plugin's own migration (`packages/plugins/council/src/db/schema.ts`). No changes to core Doer schema.

### `council_sessions`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `companyId` | uuid FK → companies | |
| `sessionTypeId` | text | `full_council` \| `interview` \| `bidding` \| custom |
| `status` | text | `pending` → `running` → `completed` \| `failed` \| `completed_with_errors` |
| `invocationMode` | text | `parallel` \| `sequential` |
| `resolutionMode` | text | `orchestrator` \| `user_approval` \| `auto` |
| `context` | jsonb | `CouncilSessionContext` snapshot at session start |
| `transcript` | jsonb | `AgentAddress[]` — grows as agents respond |
| `decision` | jsonb | `SessionDecision` — null until resolution completes |
| `issuesCreated` | uuid[] | Issue IDs created by `apply()` |
| `triggeredBy` | text | `schedule` \| `manual` \| `api` |
| `error` | text | Failure reason if status is `failed` |
| `startedAt` | timestamptz | |
| `completedAt` | timestamptz | |
| `createdAt` | timestamptz | |

### `council_configs`

One row per company. Stores which session types are enabled and their default configuration.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `companyId` | uuid FK → companies | unique |
| `enabledSessionTypes` | text[] | Which session type IDs are active |
| `schedule` | text | Cron expression for auto-fire (nullable = disabled) |
| `defaultSessionTypeId` | text | Which type fires on schedule |
| `agenda` | jsonb | `{ prompts: string[], perAgent: Record<agentId, string>, outputConstraints: { minIssues, maxIssues, format } }` |
| `createdAt` | timestamptz | |
| `updatedAt` | timestamptz | |

### `council_participants`

Maps agents to council configs with a role. Guest seats are added per-session (stored in the session's context, not here).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `configId` | uuid FK → council_configs | |
| `agentId` | uuid FK → agents | |
| `role` | text | `member` \| `orchestrator` \| `guest` |
| `sessionTypeId` | text | Which session type this participant belongs to (null = all) |

---

## Plugin Structure

```
packages/plugins/council/
  src/
    index.ts                  — definePlugin() entry point
    engine.ts                 — session runner: the five-step loop
    brief-builder.ts          — constructs council brief from config + context
    watchdog.ts               — resets stale `running` sessions to `failed`
    session-types/
      index.ts                — session type registry
      full-council.ts         — Full Council handler
      interview.ts            — 1:1 Interview handler
      bidding.ts              — Bidding Session handler
    db/
      schema.ts               — council_sessions, council_configs, council_participants
      migrations/
        0001_council_init.sql
    api/
      sessions.ts             — GET /council/sessions, POST /council/sessions/trigger,
                                 GET /council/sessions/:id
      config.ts               — GET /council/config, PUT /council/config
  package.json
  tsconfig.json
```

**UI additions** (main `ui/` package, Fernweh-style pages):

```
ui/src/fernweh/
  FernwehCouncil.tsx          — sessions list
  FernwehCouncilDetail.tsx    — session detail: transcript, decision, issues created
  FernwehCouncilConfig.tsx    — configure session types, participants, agenda, schedule
ui/src/api/council.ts         — API client module
```

**Plugin registration:**

```ts
export default definePlugin({
  id: 'doer_council',
  name: 'Council',
  version: '0.1.0',
  setup(ctx) {
    ctx.db.migrate(migrations);
    ctx.router.mount('/council', councilRouter);
    ctx.jobs.register('council:run-session', runSessionJob);
    ctx.jobs.register('council:watchdog', watchdogJob);
    ctx.nav.add({ label: 'Council', icon: 'users', path: '/council' });
    ctx.schedule.register('council:heartbeat', {
      handler: triggerScheduledCouncil,
    });
  },
});
```

---

## Three Built-in Session Types

### Full Council

The primary session type. Mirrors the existing DonDog→Chef→Alfie pipeline.

- **buildContext:** pulls active goals, open/in-progress issues, budget remaining, recent activity log entries.
- **buildBrief:** shared context + agent's specific `perAgent` directive from config. Each agent gets the same context but different role instructions.
- **invoke:** parallel or sequential per config. Each agent receives the brief, responds with reasoning and issue proposals.
- **resolve:** orchestrator (typically DonDog) reads the full transcript, synthesizes decisions, selects/merges/rejects proposals, writes `SessionDecision`.
- **apply:** creates issues via `issueService.create()` for each confirmed proposal, assigns agents per orchestrator's recommendation.

### 1:1 Interview

Orchestrator interviews Clay with structured questions. Feeds issues from the answers.

- **buildContext:** pulls goals, current blocks (issues marked `blocked`), budget state, recent unresolved decisions.
- **buildBrief:** interview-mode prompt with a question bank drawn from `config.agenda.prompts`. Orchestrator picks from the bank based on context.
- **invoke:** sequential — orchestrator sends one question at a time to the `interview` response endpoint; Clay answers via the UI. Session stays open until Clay ends it or the question bank is exhausted.
- **resolve:** orchestrator synthesizes answers into a `SessionDecision` with issue proposals that map directly to Clay's stated priorities and blockers.
- **apply:** creates issues tagged with `source: interview`, including a note that links back to the session.

*Note: The 1:1 Interview requires a UI-facing response endpoint — `POST /council/sessions/:id/respond` — so Clay can submit answers from the `FernwehCouncilDetail` page. The session stays in `running` status between questions. This is the only session type with a human in the invocation loop.*

### Bidding Session

Orchestrator creates blank issues first; agents claim them.

- **buildContext:** pulls current goals, identifies gaps in the issue backlog, and creates N blank issues (title + description, no assignee) via `issueService.create()`. The blank issue IDs are included in the returned context.
- **buildBrief:** agents receive the list of blank issue IDs/titles and instructions to submit bids (claim + one-sentence reasoning per issue they want).
- **invoke:** parallel — all agents receive the brief simultaneously and return their bid lists.
- **resolve:** orchestrator evaluates bids, assigns each issue to the highest-confidence bidder. In case of conflict (two agents bid the same issue), orchestrator breaks the tie.
- **apply:** updates existing blank issues with `assigneeAgentId` and `status: todo`. Does not create new issues.

---

## Guest / Specialist Seats

Any registered Doer agent can be added as a guest seat on a per-session basis via the trigger API:

```ts
POST /council/sessions/trigger
{
  "sessionTypeId": "full_council",
  "guestAgents": [{ "agentId": "conference-expert-id", "role": "guest" }]
}
```

Guest agents receive the same council brief as members but their contribution is tagged `role: guest` in the transcript. The orchestrator explicitly considers guest input in the resolution step.

For ephemeral specialists (an agent that doesn't exist yet), the trigger API accepts a `guestPrompt` field — the engine spins up a one-shot Letta agent with that system prompt, runs it for the session, then discards it.

---

## Session Execution Flow

```
Trigger (schedule | manual UI | POST /trigger)
  → Create council_sessions row (status: pending)
  → Enqueue council:run-session job
  → Return session ID immediately (async)

Job: council:run-session
  1. Load config, participants, orchestrator
  2. buildContext() — goals, issues, budget, activity
  3. SET status: running
  4. CHECK budget hard-stop → if exhausted: fail session
  5. For each agent (per invocationMode):
       a. buildBrief(context, agent, config)
       b. Send to Letta via existing adapter (sendMessage)
       c. Await structured response
       d. Append AgentAddress to session.transcript
       e. CHECK budget after each invocation
  6. resolve() — orchestrator synthesizes transcript → SessionDecision
  7. apply() — issueService.create() for each proposal
  8. SET status: completed, write issuesCreated[], completedAt
  9. Write to activity log (immutable, required)

UI polls GET /council/sessions/:id every 3s while status === 'running'
Transcript renders incrementally as entries appear
```

---

## Council Brief Structure

The brief is constructed by `brief-builder.ts` from config + context at runtime. Example output:

```
You are attending a Full Council session as [role].

== SESSION CONTEXT ==
Active goals: [goal titles]
Open issues: [count] open, [count] in progress
Budget remaining: $[amount]
Recent activity: [last 3 activity log entries]

== YOUR AGENDA ==
Address the following:
- [prompt 1 from config.agenda.prompts]
- [prompt 2]
- [perAgent directive for this agent]

== YOUR ROLE ==
You are a [member | orchestrator | guest]. Produce [minIssues]–[maxIssues] concrete
issue proposals in the format: { title, description, priority, assigneeAgentId? }.
```

---

## Error Handling

| Failure | Behavior |
|---|---|
| Single agent times out or errors | Mark that `AgentAddress` as `failed`, continue with remaining agents. Session still completes. |
| Budget exhausted mid-session | Hard stop. `status: failed`, `error: budget_exhausted`. Partial transcript preserved. No issues created. |
| Orchestrator resolution fails | `status: failed`. Full transcript preserved. No issues created. |
| Issue creation partially fails | `status: completed_with_errors`. Successful issues tracked in `issuesCreated[]`. Failed proposals stored in `decision` for manual review. |
| Job crashes mid-run | Session stuck in `running`. Watchdog resets any session running > 15 min to `failed`. |

---

## Testing

- **Unit (vitest):** Each session type handler's five methods (`buildContext`, `buildBrief`, `invoke`, `resolve`, `apply`) tested in isolation with mock context and mock Letta adapter responses.
- **Integration:** Full engine loop with stubbed adapter. Verifies `pending → running → completed` transition, transcript population, and issue creation in DB.
- **Manual smoke:** Trigger a council session via `POST /council/sessions/trigger` in local dev, inspect the session record, verify issues appear in the board.

No new test infrastructure required — all tests run under `pnpm test:run`.

---

## Rollout Order

1. **Prerequisite:** Update DonDog's Letta memory blocks — remove autonomous council instructions.
2. **Sub-project 1:** DB schema + plugin scaffold + session runner (engine, Full Council type only) + minimal sessions list UI.
3. **Sub-project 2:** Interview and Bidding session types + Configure screen + guest seat support.
4. **Sub-project 3:** Scheduling, watchdog, ephemeral specialist agents, `defineSessionType()` extensibility API.

---

*Generated: 2026-05-19 — Clay + DonDog brainstorming session*
