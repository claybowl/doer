# Doer PRD: v0.1.0 — Agent Workspace, Observability & Goal-Driven Operations

**Version**: 0.1.0  
**Owner**: Clayton Christian (Clay)  
**Co-Author**: DonDog  
**Stakeholders**: DonDog (orchestrator), Chef (executor), Alfie (consigliere), Gremlin Army, End Users  
**Target Release**: Doer Desktop v0.1.0  
**Status**: DRAFT — awaiting Clay approval  
**Source PRDs**: Enhanced Agent Interaction & Observability (Clay/Hermes), Goals Everywhere (DonDog), Message Bus Plan (DonDog, deferred to v0.2.0)

---

## 1. Overview

Doer v0.1.0 is the release that transforms the platform from a task queue into a true **agent operating system** — one where users can converse with agents, observe their internals, run goal-driven operations at every level of the organization, and (for the first time) run Letta agents natively within Doer's own managed runtime.

Four areas of work, one coherent release:

1. **In-App Agent Chat** — Talk to any Letta agent directly from Doer without leaving the app
2. **HQ Observability** — See inside agents: state, tool calls, memory, goal progress in real time
3. **Goals Everywhere** — Goals become the organizing principle of all work at every level (company → team → agent → task)
4. **Letta Agent Workspace Migration** — Bring the Letta runtime inside Doer, eliminating the split-brain between Doer's orchestration plane and Letta Cloud's agent state

The message bus (agent-to-agent pub/sub) is scoped to v0.2.0. The HQ observability in this release uses Letta API polling rather than a real-time event bus — simpler, still powerful, and sets the right foundation.

---

## 2. Goals

1. **User-Agent Conversation**: Allow users to send/receive messages to any Letta agent via a chat UI embedded in Doer, without switching to Letta Cloud console or external tools.
2. **Agent Observability**: Replace the current opaque progress view in HQ with a mission-control dashboard that exposes agent state, tool calls, memory, and goal hierarchy.
3. **Goal-Driven Operations**: Make goals the organizing principle of everything that happens in Doer — not just a UI field. Every issue, every agent cycle, every council session is tied to a goal.
4. **Letta Runtime Integration**: Bring the Letta runtime into Doer so agent lifecycle, memory, runs, and tool calls are all managed and logged within Doer's database — eliminating the split-brain.
5. **Memory Continuity**: Guarantee each agent's Letta memory (memfs) is reliably bound and accessible across adapters.
6. **Developer Ergonomics**: Reuse existing infrastructure (Letta API, existing WebSocket layer, goals API, memfs bindings). Maintain backward compatibility throughout.

---

## 3. Non-Goals (v0.1.0)

- **Agent-to-agent message bus / pub-sub** — deferred to v0.2.0
- **Adapter-side pause/resume hooks** — requires message bus; deferred
- **Multi-user chat** — chat is 1:1, user to agent
- **Real-time video/streaming of agent screen**
- **Persisting chat transcripts outside Letta** — chat history remains in Letta Cloud
- **Full adapter rebuild** — adapters stay as-is; Letta-native agents bypass the adapter layer

---

## 4. Features

---

### 4.1 In-App Letta Agent Chat

**Description**: A persistent chat pane embedded in Doer that connects directly to any Letta agent's conversation endpoint. Users select an agent and converse in real time without leaving the app.

**UI**:
- New "Chat" tab on the agent detail view
- Chat pane styled consistently with Doer's existing comment/activity UI
- Agent selector defaults to the currently focused agent in HQ

**Backend**:
- Doer server exposes a proxy endpoint: `POST /api/agents/:agentId/chat`
- Proxy forwards to Letta Cloud API (`POST /v1/agents/{agentId}/messages`) with agent's stored API key
- API key stored **encrypted at rest** (AES-256, encryption key in Doer server env vars) — not hashed
- Responses streamed back to the UI via server-sent events or chunked HTTP
- One active chat session per agent at a time (concurrency lock) to prevent race conditions

**Local adapter fallback**:
- If agent uses a non-Letta adapter (opencode_local, claude_local, etc.), chat tab shows a clear UI hint: "This agent uses a local adapter. Chat is available for Letta-native agents only."

**Acceptance Criteria**:
- [ ] User can open a chat with any Letta Cloud agent and send/receive messages without leaving Doer
- [ ] Chat history persists in Letta (standard Letta behavior — Doer does not store a copy)
- [ ] Sending a message triggers the agent's normal LLM processing pipeline (tools, memory recall, etc.)
- [ ] API key encrypted at rest; never exposed to the browser client
- [ ] Errors (agent offline, invalid key, rate limit) displayed inline in the chat UI
- [ ] Works for both Letta Cloud agents and Letta-native agents (section 4.4)

---

### 4.2 HQ Agent Work Display Redesign

**Description**: Replace the current minimal log + progress bar view with a rich real-time dashboard exposing agent internals.

**Panels**:

1. **Agent State Indicator** — Color-coded badge: IDLE (gray) / THINKING (blue) / ACTING (green) / WAITING (yellow) / ERROR (red). Tooltip shows current subgoal or active issue title.

2. **Goal Hierarchy Tree** — Collapsible view of the agent's goal stack pulled from the Goals API. Shows:
   - Company goal (root)
   - Team goal (sprint-level)
   - Agent goal (this agent's current cycle objective)
   - Linked task/issue (leaf)
   - Status and start time at each level
   - Data source: `GET /goals/:id/progress` (see section 4.3)

3. **Tool Call Log** — Paginated list of recent tool invocations (most recent at top). Each entry shows:
   - Tool name and icon
   - Input (truncatable JSON)
   - Output or error (truncatable)
   - Start → end timestamp and duration
   - Click to expand full details
   - Data source: Letta API (`GET /v1/agents/{agentId}/messages`, filtered for tool call events) — polling at 2-second intervals

4. **Memory Inspector** — Tabs for Persona, Human Context, Active Goal. Shows current content of each key memory block.
   - For Letta Cloud agents: fetched via `GET /v1/agents/{agentId}/core-memory/blocks` on demand, cached 30s
   - For Letta-native agents: read directly from memfs-bound files

5. **Performance Sidebar** — Total tool calls this session, average latency, error count, active since timestamp.

6. **Control Bar** (v0.1.0 scope):
   - **View Full Logs** — opens raw Letta run log
   - **Open Chat** — jumps to the Chat tab for this agent
   - **Nudge** — sends a one-off message to the agent via the chat proxy (same as Chat tab but inline)
   - Pause/Resume deferred to v0.2.0 (requires message bus adapter hooks)

**Data Sources**:
- Agent state: Doer's existing `agent.status` live event + Letta API polling fallback
- Tool calls + memory: Letta API polling (2s interval, cached)
- Goal hierarchy: Doer Goals API (same DB, no polling needed — read on demand)

**Acceptance Criteria**:
- [ ] HQ view updates within 2 seconds of an agent completing a tool call
- [ ] Users can see the input/output of the last 10 tool calls
- [ ] Goal Hierarchy Tree shows the full company → team → agent → task stack for the current agent
- [ ] Memory inspector shows current persona and human context as stored in Letta
- [ ] View degrades gracefully (falls back to existing log view) if Letta API is unreachable
- [ ] Nudge sends a message and the agent's response appears in the tool call log within the polling interval

---

### 4.3 Goals Everywhere — Goal-Driven Operations

**Description**: Goals become the organizing principle of all work in Doer — not just a UI feature. Every issue is tied to a goal. Every agent cycle is tied to a goal. Every council session reviews goals.

#### Goal Hierarchy

```
COMPANY  (Clay sets, DonDog co-creates)
    └── TEAM  (Chef + DonDog set per project/sprint)
            └── AGENT  (Alfie sets per gremlin per cycle)
                    └── TASK  (auto-linked from issues)
```

| Level | Who Sets It | Timeframe | Example |
|-------|-------------|-----------|---------|
| `company` | Clay (DonDog co-creates) | Quarterly / ongoing | "Ship Doer to first paying customer" |
| `team` | Chef + DonDog | Per project sprint (1-2 weeks) | "Complete auth system + landing page" |
| `agent` | Alfie | Per dispatch cycle (1-3 days) | "Scribe: draft all 3 client templates" |
| `task` | Auto-linked | Per issue | issue → goal ref |

#### API Changes

**New endpoints**:

```
GET /goals/:id/progress
→ { issueCount, doneCount, inProgressCount, todoCount, percentComplete, childGoalCount, childGoalsAchieved }

GET /companies/:companyId/goals?level=team&status=active
→ filtered goal list (add level + status query params to existing endpoint)
```

**Issue creation**:
- Add server-side warning (not hard block) when `goalId` is null and company has active goals
- All Chef and Alfie issue creation must include `goalId`

#### Agent Tooling

New tools added to DonDog, Chef, and Alfie's Letta adapter tool manifests:

| Tool | Description |
|------|-------------|
| `read_goals(level?, status?)` | List goals with optional filters |
| `create_goal(title, description, level, parentId?)` | Create a new goal |
| `update_goal_status(goalId, status)` | Mark achieved / cancelled |

#### Goal-Driven Council Flow (DonDog behavior change)

1. Read active company goals
2. Check team goals — active, stuck, recently completed
3. Check queue health through the goal lens
4. Decide tasks tied explicitly to company goals
5. Signal Chef with goal context (`goalId` included in queue fill request)
6. Update goal statuses (mark achieved, cancel stale)
7. Record goal progress snapshot in council notes

Council decision JSON gains `goal_review` block:
```json
{
  "goal_review": {
    "company_goals_checked": ["goal-id-1"],
    "progress_notes": "Auth goal: 3/5 team goals achieved. On track.",
    "stale_goals": [],
    "proposed_new_goals": []
  }
}
```

#### Sprint Rituals

- **Chef sprint ritual**: Create team goal before creating issues for a project. Every issue gets `goalId`.
- **Alfie dispatch ritual**: Create agent goal before waking a gremlin. Pass `goalId` to all sub-issues.

#### UI Changes

- **Goals Dashboard** — new page showing full hierarchy with progress bars (company → team → agent)
- **Goal selector** on issue create/edit (pre-populates from project's active team goal)
- **Goal progress** on goal detail page
- **HQ Goal Hierarchy Tree** — feeds from Goals API (see section 4.2)

**Acceptance Criteria**:
- [ ] Every active issue has a `goalId` — zero orphan issues within 2 weeks of launch
- [ ] Every council decision includes `goal_review` block
- [ ] No goal stuck in `active` for >14 days without issue progress
- [ ] Clay can see "what are we working toward?" in 10 seconds from Doer UI
- [ ] Goal Hierarchy Tree in HQ shows correct stack for each agent

---

### 4.4 Letta Agent Workspace Migration

**Description**: Move beyond chatting with Letta agents — run them natively within Doer's orchestration plane. Doer becomes the primary workspace for Letta agent lifecycle, memory, and execution, eliminating the split-brain between Doer's orchestration layer and Letta Cloud's agent state.

**Rationale**: Currently, Letta agents live in Letta Cloud and Doer orchestrates them via adapters. This creates a split-brain where agent state (memory, runs, tool calls) is partially outside Doer's view. By embedding the Letta runtime (or tightly integrating via Letta SDK), we gain:
- Single source of truth for agent state within Doer's database
- Deeper pause/inspect/modify capability than adapter commands allow
- Simplified deployment — agents created, updated, deleted entirely via Doer's API
- Full observability — every token, tool call, and memory read/write captured in Doer's logs
- Potential cost savings by running Letta open-source runtime on user infrastructure

**Electron Architecture Constraint**: Doer Desktop is an Electron app that spawns the Express server as a child process (see `desktop/src/server-process.ts`). Any Letta runtime integration must fit this model — no Docker dependency for end users, no bundled Python runtime in v0.1.0.

**Implementation Approach — v0.1.0 (Electron-compatible)**:

Use `@letta-ai/letta-client` (TypeScript/Node.js SDK — Electron native) to manage agent lifecycle via the Letta Cloud API OR a locally configured Letta backend. Doer logs all interactions to its own DB on top of whatever Letta backend is configured.

- Letta Cloud remains the default backend (existing behavior, zero changes to packaging)
- "Letta-native" agent type in Doer v0.1.0 means: Doer owns the agent lifecycle (create/update/delete via Letta SDK), and **logs every run, tool call, and memory operation to Doer's DB** — giving full HQ observability regardless of where Letta runs
- The `@letta-ai/letta-client` SDK is a Node.js package — bundles cleanly into Electron with zero issues
- No Python, no Docker, no bundled binary required for v0.1.0

**Electron child process pattern** (same as `server-process.ts`):
```
Doer Electron main process
  └── spawns Doer Express server (existing)
        └── Letta SDK (Node.js) runs inside Express process
              → connects to Letta Cloud (default)
              → OR connects to local Letta server if LETTA_BASE_URL overridden
```

**v0.2.0 — Local Runtime (Offline Mode)**:
Spawn a local Letta server as a second child process using the same `server-process.ts` pattern. This is when true offline/local execution ships. Deferred to keep v0.1.0 packaging clean.

**Backward compatibility**: Adapter system retained for non-Letta agents (OpenCode, Claude Code, Gemini, etc.). Letta-native agents bypass the adapter layer entirely.

**Agent Creation Flow (Letta-native)**:
```
User creates agent in Doer UI
    → Doer provisions Letta agent via @letta-ai/letta-client SDK
    → Stores Letta agent ID mapped to Doer agent record
    → Configures memfs binding for agent's memory directory
    → Agent appears in HQ alongside adapter-based agents
    → Every run, tool call, memory op intercepted and logged to Doer DB
```

**Memory**:
- Memfs bindings work identically for Letta-native agents
- Memory directory exposed to agent tools via local filesystem mount
- Memory changes synced to Letta's internal store

**Acceptance Criteria**:
- [ ] Users can create a "Letta-native" agent in Doer that runs entirely within Doer's managed Letta runtime
- [ ] In-app chat (section 4.1) works for Letta-native agents with lower latency than Letta Cloud round-trip
- [ ] Agent runs, tool calls, and memory updates are logged and queryable in Doer's database
- [ ] HQ observability (section 4.2) works for Letta-native agents — tool call log and memory inspector populated from Doer's own DB (no polling needed)
- [ ] Stopping or deleting an agent in Doer cleanly shuts down its underlying Letta runtime instance
- [ ] Memfs bindings still work to provide the agent's memory directory to its tools
- [ ] Adapter-based agents (OpenCode, Claude Code, etc.) continue to work without changes

---

### 4.5 Memfs Binding Enhancements (Baseline)

**Description**: Ensure every agent in Doer has a valid memfs binding to its Letta memory directory. This is foundational for sections 4.2, 4.3, and 4.4.

**Actions**:
- Audit and validate existing bindings for all 24 gremlins + core agents (DonDog, Alfie, Chef)
- Automate binding creation during agent onboarding
- Health check on agent startup: verify `persona.md` exists, is readable, AND git remote is reachable
- Document path convention: `agents/<letta-uuid>/memory` (per-agent), `agents/SHARED/<pool>/memory` (shared pools)

**Acceptance Criteria**:
- [ ] All agents in the DonJon company have a valid memfs binding
- [ ] At runtime, agents can read `persona.md` and `human.md` without errors
- [ ] Startup health check logs a warning (not crash) if binding is degraded
- [ ] Switching an agent from `letta_cloud` to Letta-native preserves memory continuity

---

## 5. Success Metrics

| Metric | Target |
|--------|--------|
| User-agent chat latency (send → first token) | <2s (LLM-dependent) |
| HQ view refresh rate (tool call log) | ≤2s after tool call completes |
| Goal hierarchy load time in HQ | <500ms |
| Agent startup time with memfs binding | No significant increase (<100ms added) |
| Error rate (chat failures, API timeouts) | <1% of operations |
| Issues with goalId set | 100% within 2 weeks of goals launch |
| Letta-native agent chat latency vs Cloud | ≥20% improvement |

---

## 6. Implementation Roadmap to v0.1.0

Estimated total: **6-8 weeks** assuming parallel execution across gremlins.

### Phase 1 — Foundation (Week 1)
**Owner**: Artificer + Technomancer

- [ ] Memfs binding audit for all 24 gremlins + core agents (4.5)
- [ ] Add `level` + `status` filter params to `GET /companies/:id/goals` (4.3)
- [ ] Build `GET /goals/:id/progress` endpoint with issue + child goal rollup (4.3)
- [ ] Verify goal ancestry populated on issue list responses (4.3)
- [ ] Add goalId warning on issue creation (4.3)
- [ ] Write tests for progress endpoint

### Phase 2 — Agent Tooling + Goal Rituals (Week 2)
**Owner**: Gizmo + DonDog

- [ ] Add `read_goals`, `create_goal`, `update_goal_status` to DonDog/Chef/Alfie Letta adapter tool manifests (4.3)
- [ ] Update DonDog heartbeat protocol to read goals at council start (4.3)
- [ ] Update Chef queue fill to accept + use goalId context (4.3)
- [ ] Update Alfie decomposition to create agent goals + pass goalId to sub-issues (4.3)
- [ ] Chef sprint ritual: create team goal before issue batch (4.3)

### Phase 3 — Goals UI (Week 2-3)
**Owner**: Blueprint + Maker

- [ ] Goals dashboard page (hierarchy view + progress bars) (4.3)
- [ ] Goal selector on issue create/edit (4.3)
- [ ] Goal progress on goal detail page (4.3)

### Phase 4 — HQ Redesign (Week 3-4)
**Owner**: Blueprint + Technomancer

- [ ] Agent state indicator (color-coded badge) (4.2)
- [ ] Goal Hierarchy Tree panel consuming Goals API (4.2 + 4.3)
- [ ] Tool call log with Letta API polling (4.2)
- [ ] Memory inspector tabs (4.2)
- [ ] Performance sidebar (4.2)
- [ ] Nudge button (sends via chat proxy) (4.2)
- [ ] Graceful fallback to existing log view (4.2)

### Phase 5 — In-App Chat (Week 4)
**Owner**: Technomancer + Blueprint

- [ ] Chat proxy endpoint with encrypted API key storage (4.1)
- [ ] Chat UI tab on agent detail view (4.1)
- [ ] Streaming response support (4.1)
- [ ] Error handling inline (4.1)
- [ ] Concurrency lock (one session per agent) (4.1)

### Phase 6 — Letta Agent Workspace Migration (Week 5-7)
**Owner**: Technomancer + Artificer + DonDog

- [ ] Evaluate Option A (managed local Letta server) vs Option B (SDK embed) — 2 days (4.4)
- [ ] Implement chosen approach: Doer starts/manages Letta runtime (4.4)
- [ ] Agent creation flow: Doer provisions Letta agent, stores ID mapping (4.4)
- [ ] Log runs, tool calls, memory ops to Doer DB (4.4)
- [ ] HQ observability reads from Doer DB for Letta-native agents (4.4)
- [ ] In-app chat works for Letta-native agents (4.4)
- [ ] Clean shutdown/delete lifecycle (4.4)
- [ ] Backward compat validation: adapter-based agents unchanged (4.4)

### Phase 7 — QA + Release (Week 8)
**Owner**: Mechanic + Sleuth

- [ ] End-to-end tests for chat (Playwright) (4.1)
- [ ] End-to-end tests for goal operations (4.3)
- [ ] Integration tests for Letta-native agent lifecycle (4.4)
- [ ] Performance validation against success metrics
- [ ] Release notes for v0.1.0
- [ ] Prepare v0.2.0 scope (message bus, adapter pause/resume)

---

## 7. Open Questions

1. **Letta-native Option A vs B**: Should we spike both and decide after, or commit to Option A (managed local Letta server) now? Recommendation: **Use Option A via the Letta Code local backend (`localhost:49169`)**. No Docker, no separate server — Doer points at the same Letta Code runtime already running locally. Closest to Letta Code native. **DECIDED.**

2. **Letta OSS version**: Which version of the open-source Letta server do we pin? Need to verify compatibility with the Letta Cloud features we're already using (memfs git sync, the specific agent config we have for gremlins).

3. **Goal templates**: Should there be a library of common goal structures ("ship feature," "fix stability," "onboard client") that auto-populate child goals? Recommendation: ship without templates in v0.1.0, add in v0.1.1.

4. **Cross-project goals**: Can one company goal span multiple projects? Data model supports it via `parentId`. Recommendation: yes — enforce this via UI (company goal not required to have a single project).

5. **HQ chat for whom**: Is the in-app chat primarily Clay → agent, or should agent → agent chat threads be visible in HQ too? For v0.1.0: Clay → agent only. Agent-to-agent threads are part of the v0.2.0 message bus.

6. **API key rotation**: What's the UX when a Letta API key is rotated? Need a key management UI or at minimum a re-entry flow in agent settings.

---

## 8. v0.2.0 Preview (Out of Scope for This Release)

Documented here so decisions in v0.1.0 don't block v0.2.0:

- **Agent-Adaptor Message Bus** — WebSocket pub/sub for real-time agent-to-agent events. Build on top of existing `live-events-ws.ts` infrastructure. Extend `LIVE_EVENT_TYPES` with `agent.state`, `agent.toolCall`, `agent.memoryRecall`, `adaptor.command`.
- **Pause/Resume via bus** — Adapter-side hooks to check pause signals between steps.
- **Agent-to-agent DM threads** — Persistent conversation threads in Doer DB (from Message Bus PRD).
- **Broadcast channels** — `#completions`, `#blockers`, `#queue-health` pub/sub channels.

---

*DonDog — co-author | Clay — owner | May 9, 2026*  
*This is a living document. Update as decisions are made.*
