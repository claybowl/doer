# ACP, A2A, and Trajectory — Architecture Analysis & Integration Plan

**Date:** 2026-07-31  
**Author:** Doer AI contributor  
**Status:** Research / Planning  

## TL;DR

| Protocol/Tool | What it is | Should it replace Doer adapters? | Doer integration recommendation |
|---|---|---|---|
| **ACP** | stdio-based protocol bridge exposing Letta agents to code editors | **No** — ACP is an editor↔agent wire protocol. Doer's adapters are a harness layer that already talks to Letta via SDK/REST API. | **Not pursued** for Doer core. ACP is relevant only if Doer ever wants to expose agents to Zed/JetBrains. |
| **A2A** | HTTP + JSON-RPC 2.0 + SSE protocol for agent-to-agent communication | **No** — A2A is peer-to-peer delegation, orthogonal to Doer's control plane. | **Green light.** Build an `a2a` adapter package so Doer agents can delegate to or be discovered by remote A2A agents. |
| **Trajectory** | Standardized, token-efficient format for agent experience data | **N/A** — it's a data format, not a harness. | **Quick win.** Align Doer's existing stream-token accumulator with the trajectory schema; add trajectory-based "dreaming" for cross-harness learning. |

---

## 1. Background: How Doer's Adapter System Works

Doer's adapter system is a harness layer. The contract is defined in `packages/adapter-utils/src/types.ts`:

```typescript
// Simplified — full interface in adapter-utils/src/types.ts
interface ServerAdapterModule {
  type: string;           // e.g. "letta_code", "codex_local", "process"
  label: string;
  execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult>;
  // ... config schema, UI fields, hire hooks, stream parser
}

interface AdapterExecutionContext {
  runId: string;
  agent: AdapterAgent;    // { id, companyId, name, adapterType, adapterConfig }
  runtime: AdapterRuntimeContext;  // { sessionId, sessionParams, taskKey, context }
  config: Record<string, unknown>; // adapter-specific config
  context: Record<string, unknown>; // wake context (issue, task, etc.)
  onLog(stream: "stdout" | "stderr", chunk: string): Promise<void>;
  onMeta(meta: AdapterMeta): Promise<void>;
  onSpawn(childCtx): Promise<void>;
  authToken: string;
}

interface AdapterExecutionResult {
  exitCode: number;
  signal: string | null;
  timedOut: boolean;
  errorMessage: string | null;
  usage?: TokenUsage;    // { inputTokens, outputTokens, cachedInputTokens }
  sessionId: string | null;
  sessionParams: Record<string, unknown>;
  sessionDisplayId: string;
  provider: string;
  biller: string;
  model: string | null;
  costUsd: number | null;
  resultJson: Record<string, unknown>;
  summary: string;
  clearSession: boolean;
}
```

The heartbeat service (`server/src/services/heartbeat.ts`, line ~2694) calls `adapter.execute()` and pipes `ctx.onLog("stdout", chunk)` output into the run log store, where the UI parses each JSON line into a `TranscriptEntry` via `parseStdoutLine`.

**Currently registered adapter types** (`server/src/adapters/registry.ts`):
`claude_local`, `codex_local`, `cursor`, `gemini_local`, `opencode_local`, `pi_local`, `openclaw_gateway`, `hermes_local`, `letta_cloud`, `letta_code`, `letta_cli`, `process`, `http`.

There are two reference patterns:
- **`letta-cloud`** — uses `@letta-ai/letta-client` (REST API) directly, has a hand-rolled streaming token accumulator (lines 666–730) that consolidates partial token chunks.
- **`letta-code`** — uses `@letta-ai/letta-agent-sdk` (local-first SDK), with a cleaner `sdk-runtime.ts` + `sdk-events.ts` split that maps SDK events to JSON-line transcript entries.

---

## 2. ACP — Protocol Bridge, Not a Harness Replacement

### What ACP Actually Is

`@letta-ai/letta-acp` (npm `0.1.7`) is a **stdio-based ACP server adapter**. It exposes a Letta agent over the [Agent Client Protocol](https://docs.letta.com/platform/acp) so that ACP-compatible **code editors** (Zed, JetBrains) can launch it as a custom agent:

```json
// Zed settings.json
{
  "agent_servers": {
    "Letta": {
      "type": "custom",
      "command": "npx",
      "args": ["-y", "@letta-ai/letta-acp"],
      "env": {
        "LETTA_ACP_BACKEND": "cloud-oauth",
        "LETTA_AGENT_ID": "agent-..."
      }
    }
  }
}
```

Key characteristics:
- **Transport:** stdio (the editor spawns the process and communicates via stdin/stdout).
- **Session model:** Each ACP session maps to a Letta conversation. `LETTA_AGENT_ID` reuses an existing agent.
- **Backend modes:** `local`, `remote` (app server), `cloud`, `cloud-oauth`.
- **Not a harness:** ACP is a **protocol bridge** — it translates between the ACP JSON protocol and Letta's internal SDK. It does not provide an agent's planning/execution loop; it just wires the agent to a specific front-end (an editor).

### Why ACP Does NOT Replace Doer's Adapters

```
Editor (Zed/JetBrains)  ←ACP→  letta-acp (stdio)  ←→  Letta API/SDK

Doer heartbeat  ←───  adapter.execute(ctx)  ───→  Letta API/SDK
```

Doer's adapter system and ACP sit at **different layers**:
1. Doer adapters translate Doer's internal `AdapterExecutionContext` → Letta's SDK/REST API. They handle task context, memory dirs, doer-tools injection, and streaming back to the run log store.
2. ACP translates the ACP JSON protocol ↔ Letta's SDK for code editors.

They don't overlap. Doer never spawns an editor; it runs agent turns on a schedule (heartbeat). ACP doesn't apply here.

### When ACP *Would* Be Relevant to Doer

Only if Doer wanted to **expose its agents as ACP servers** so that external editors could drive Doer-managed agents. That would require:
- A new adapter type (e.g., `acp`) that implements an ACP server over stdio.
- Doer's agent config would need an `acpServer` flag.
- The UI editor would need to know the `npx -y @letta-ai/letta-acp` launch command.

This is not Doer's use case — Doer is a control plane managing agent lifecycles, not an editor plugin host.

**Verdict: ACP is not a Doer integration. It's a useful mental model for understanding how Letta bridges to editors, but it does not change Doer's architecture.**

---

## 3. A2A — Real Integration Opportunity

### What A2A Is

The [Agent2Agent (A2A) Protocol](https://github.com/a2aproject/A2A) (Linux Foundation AI & Data, v1.0.0) is designed for **agent-to-agent** communication — letting independent agents discover, negotiate, and delegate tasks to each other.

Unlike ACP (editor↔agent), A2A is agent↔agent. Unlike MCP (agent↔tool), A2A enables agents to call other agents as peers.

### A2A Architecture (three layers)

**L1 — Data Model:** `Task`, `Message`, `AgentCard`, `Part`, `Artifact`, `Extension`
**L2 — Operations:** `sendMessage`, `sendStreamingMessage`, `getTask`, `listTasks`, `cancelTask`, `getAgentCard`
**L3 — Protocol Bindings:** JSON-RPC 2.0 (primary), gRPC, HTTP/REST

### Transport Details

```
# Agent discovery
GET /.well-known/agent-card.json

# Send message (JSON-RPC 2.0, HTTP)
POST /message:send
Content-Type: application/a2a+json

{ "jsonrpc": "2.0", "id": 1, "method": "message/send",
  "params": { "message": { "role": "user",
    "parts": [{ "text": "Do the thing" }] } } }

# Streaming (SSE)
POST /message:stream
Content-Type: text/event-stream
data: {"jsonrpc":"2.0","method":"streamMessage","params":{"result":{...}}}
```

**Agent Card example:**
```json
{
  "name": "Doer Coding Agent",
  "description": "A Doer-managed Letta agent exposed via A2A",
  "url": "https://doer.company.com/a2a",
  "version": "1.0.0",
  "capabilities": {
    "streaming": true,
    "pushNotifications": false,
    "extendedAgentCard": false
  },
  "securitySchemes": {
    "bearer": {
      "type": "HTTP",
      "scheme": "bearer"
    }
  },
  "skills": [
    {
      "id": "coding",
      "name": "Code Modification",
      "description": "Read, write, and refactor code",
      "tags": ["development"]
    }
  ],
  "defaultInputModes": ["text"],
  "defaultOutputModes": ["text"]
}
```

### Mapping A2A → Doer's Adapter Architecture

| A2A Concept | Doer Equivalent | Mapping |
|---|---|---|
| `AgentCard` | Agent config (`adapter_config` JSONB, `name`, `model`) | Doer generates Agent Card from agent metadata |
| `message/send` | `adapter.execute(ctx)` | Doer sends `AdapterExecutionContext` as the A2A message |
| `streamMessage` (SSE) | `ctx.onLog("stdout", chunk)` | A2A stream events → Doer transcript entries |
| `Task` lifecycle (SUBMITTED → WORKING → COMPLETED) | `AdapterExecutionResult` | Map exit_code/result → task state |
| `Artifact` (file output) | Doer deliverable / write_output tool | Results become artifacts |

### Implementation Plan: `@doerai/adapter-a2a`

**Step 1 — Adapter package scaffold** (`packages/adapters/a2a/`):
```
packages/adapters/a2a/
├── package.json          (@doerai/adapter-a2a, depends on @doerai/adapter-utils)
├── src/
│   ├── index.ts          # exports ServerAdapterModule
│   ├── server/
│   │   ├── execute.ts     # A2A adapter execute()
│   │   ├── agent-card.ts  # generates AgentCard JSON
│   │   ├── a2a-client.ts  # JSON-RPC 2.0 + SSE client to remote A2A agents
│   │   └── on-hire-approved.ts
│   ├── ui/
│   │   ├── adapter.ts     # parseStdoutLine for A2A stream events
│   │   └── config-fields.tsx
│   └── shared/
│       └── types.ts       # A2aAdapterConfig
```

**Step 2 — `execute.ts` skeleton:**
```typescript
// packages/adapters/a2a/src/server/execute.ts
import type { AdapterExecutionContext, AdapterExecutionResult } from "@doerai/adapter-utils";
import type { A2aAdapterConfig } from "../shared/types.js";

export async function execute(
  ctx: AdapterExecutionContext,
  config: A2aAdapterConfig,
): Promise<AdapterExecutionResult> {
  // 1. Fetch remote Agent Card (or use cached/discover endpoint)
  const agentCard = await fetchAgentCard(config.endpoint);

  // 2. Emit user message as A2A message
  const userMessage = buildUserMessage(ctx);
  await emit(ctx, { type: "user_message", content: userMessage });

  // 3. Send streaming message via JSON-RPC 2.0 + SSE
  const stream = await sendStreamingMessage(config.endpoint, {
    jsonrpc: "2.0",
    id: ctx.runId,
    method: "message/stream",
    params: {
      message: {
        role: "user",
        parts: [{ type: "text", text: ctx.context.taskPrompt || ctx.runtime.taskKey }],
      },
      configuration: {
        acceptedOutputModes: agentCard.defaultOutputModes,
      },
    },
  });

  // 4. Process SSE stream → transcript entries
  let streamBuffer: StreamBuffer | null = null;
  for await (const event of stream) {
    const entry = mapA2aEventToTranscript(event);
    await emit(ctx, entry);
  }

  // 5. Return result
  return {
    exitCode: 0,
    signal: null,
    timedOut: false,
    errorMessage: null,
    sessionId: ctx.runId,
    sessionDisplayId: ctx.runId,
    provider: "a2a",
    biller: "a2a",
    billingType: "unknown",
    model: agentCard?.preferredAgent?.[0]?.model || null,
    costUsd: null,
    summary: "A2A task completed",
    resultJson: {},
  };
}
```

**Step 3 — Register in `server/src/adapters/registry.ts`:**
```typescript
import { create as createA2a } from "@doerai/adapter-a2a/server";

export const ADAPTER_MODULES: Record<string, ServerAdapterModule> = {
  // ...existing...
  a2a: {
    type: "a2a",
    label: "A2A Remote Agent",
    execute: (ctx, deps) => createA2a.execute(ctx, deps),
    ...
  },
};
```

**Step 4 — UI adapter registration** (`ui/src/adapters/registry.ts` + `ui/src/adapters/a2a/`):
- `parseStdoutLine` handles A2A SSE `TaskStatusUpdateEvent` and `TaskArtifactUpdateEvent` → `TranscriptEntry` mapping.
- `ConfigFields` for `endpoint`, `agentCardUrl`, `authToken` (bearer token, hashed at rest).

### What A2A Enables for Doer

1. **Outbound delegation:** A Doer agent calls `produce_deliverable`-style tools that internally delegate to a remote A2A agent (e.g., "ask the research-agent over at research.example.com to find market intel"). The Doer adapter wraps `message/send` + `subscribeToTask` + SSE streaming.

2. **Inbound exposure:** Doer publishes Agent Cards for its agents at `https://doer.company.com/agents/{agentId}/.well-known/agent-card.json`, allowing external A2A clients to discover and delegate to Doer-managed agents. This is the reverse direction — Doer as an A2A *server*. (Higher value: makes Doer agents first-class citizens in a multi-agent ecosystem.)

3. **Cross-company agent delegation:** Since Doer agents are company-scoped, A2A's `Task.contextId` can carry the originating company ID, enabling safe cross-company delegation (subject to approval gates — A2A's `TASK_STATE_AUTH_REQUIRED` maps nicely to Doer's approval gate system).

**Priority: P1** — A2A is the highest-value integration. It's a natural fit and opens up multi-agent ecosystems.

---

## 4. Trajectory — Immediate Improvement Opportunity

### What Trajectory Is

Letta's [`@letta-ai/trajectory`](https://www.letta.com/blog/trajectory/) package (announced July 2026) standardizes agent experience data across harnesses into a token-efficient format:

```typescript
// Trajectory record schema (trajectory-v1.schema.json)
type TrajectoryRecord =
  | { type: "meta";    source: string; model?: string; ... }
  | { type: "user";     content: string; timestamp: string }
  | { type: "reasoning"; content: string; timestamp: string }
  | { type: "assistant"; content: string; tool_calls?: ToolCall[]; timestamp: string }
  | { type: "tool";     tool_call_id: string; content: string; timestamp: string }
  | { type: "tool_error"; tool_call_id: string; content: string; timestamp: string }
```

Supported sources: `claude-code`, `codex`, `letta-code`, etc.

**Key claims:**
- ~5x token reduction vs native formats (Claude Code: 951K → 171K tokens).
- Drops harness bookkeeping (per-line envelopes, duplicated payloads, UI event streams).
- Optionally truncates long tool results.

### How This Maps to Doer's Existing Streaming

Doer's `letta-cloud` adapter already has a **stream-token accumulator** (`execute.ts` lines 666–730) that does exactly what trajectory's normalization aims for:

```typescript
// Doer's existing StreamBuffer (letta-cloud/src/server/execute.ts:690-730)
type StreamKind = "assistant" | "reasoning";
type StreamBuffer = { kind: StreamKind; text: string };

async function appendToStreamBuffer(kind, text) {
  if (text.length === 0) return;
  if (streamBuffer && streamBuffer.kind !== kind) {
    await flushStreamBuffer();  // flush on kind change
  }
  if (!streamBuffer) streamBuffer = { kind, text: "" };
  streamBuffer.text += text;  // accumulate consecutive same-kind chunks
}

// Flushes on: kind change, non-streamable event, or stream end
const STREAMABLE_TYPES = new Set(["assistant_message", "reasoning_message"]);
if (!STREAMABLE_TYPES.has(messageType) && streamBuffer) {
  await flushStreamBuffer();
}
```

This is the **same concept** as trajectory's consolidation of partial token chunks — just implemented per-adapter rather than as a shared standard. The `letta-code` adapter's `sdk-runtime.ts` (lines 165–193) does a similar dedup using `streamedAssistant` / `streamedReasoning` accumulators with prefix-matching.

### Improvement Plan: Trajectory-Aligned Streaming

**Step 1 — Refactor the stream-token accumulator into a shared utility** (`packages/adapter-utils/src/stream-buffer.ts`):

```typescript
export class StreamTokenBuffer {
  private buffer: { kind: "assistant" | "reasoning"; text: string } | null = null;

  append(kind: "assistant" | "reasoning", text: string): { flush: boolean; entry?: TrajectoryRecord } {
    if (text.length === 0) return { flush: false };
    if (this.buffer && this.buffer.kind !== kind) {
      const prev = { ...this.buffer };
      this.buffer = { kind, text };
      return { flush: true, entry: { type: prev.kind === "assistant" ? "assistant" : "reasoning", content: prev.text } };
    }
    if (!this.buffer) this.buffer = { kind, text: "" };
    this.buffer.text += text;
    return { flush: false };
  }

  flush(): { type: "assistant" | "reasoning"; content: string } | null {
    if (!this.buffer || this.buffer.text.length === 0) {
      this.buffer = null;
      return null;
    }
    const result = { type: this.buffer.kind, content: this.buffer.text } as const;
    this.buffer = null;
    return result;
  }
}
```

Then both `letta-cloud` and `letta-code` adapters can import this shared buffer, eliminating the duplicated logic.

**Step 2 — Emit trajectory-shaped records from `emit()`:**

Currently Doer's `emit()` writes JSON lines like:
```json
{"type":"assistant_message","content":"Hello"}
```

These are already very close to the trajectory schema. The main gap is that `tool_call_message` events carry `input` as a nested object rather than flat `tool_calls[]`, and there's no `timestamp` field (the UI injects `ts` from the line parse time).

**Quick wins (no DB schema changes needed):**
1. Add `timestamp` to emitted JSON lines → UI can populate `ts` from the record itself.
2. Add a `trajectory` field to `AdapterExecutionResult.resultJson` containing the normalized trajectory record list — enables memory agents to review past sessions.
3. The UI's `parseStdoutLine` already maps `assistant_message`/`reasoning_message`/`tool_call_message` etc. to `TranscriptEntry` types — this matches the trajectory record types 1:1.

**Step 3 — Cross-harness trajectory learning ("dreaming"):**

Letta's trajectory package can normalize sessions from `claude-code`, `codex`, and `letta-code` — all of which Doer supports as adapter types. This means:

- When a Doer agent runs on `codex_local` or `claude_local`, the raw transcript (JSON lines from `emit`) can be collected post-run.
- A background "dreaming" process (like Letta's) calls `normalizeTranscript({ source: "codex" })` on the collected transcript to produce a compact trajectory.
- The trajectory is fed into the agent's MemFS memory as learning context for the next heartbeat.

**Implementation surface:**
- The run log store already captures all stdout lines per run (heartbeat → run log).
- A new job/daemon in `server/src/services/` would: query completed runs → extract stdout lines → normalize via trajectory format → write to `data/trajectories/{companyId}/{agentId}/{runId}.traj.json` in MemFS.
- The Letta code adapter's `sdk-runtime.ts` already sets `env.MEMORY_DIR` / `env.LETTA_MEMFS_DIR` to the agent's memory path, so trajectory files placed in MemFS would be visible to the agent's own tools.

**Priority: P0** — This is a quick win. Doer already does the hard part (stream-token accumulation). Aligning the output format with trajectory and enabling cross-harness learning is a natural next step that improves streaming quality and unlocks memory formation.

---

## 5. Decision Matrix

| Feature | Complexity | Effort | Value | Risk | Priority |
|---|---|---|---|---|---|
| ACP adapter | Low | 1–2 days | ★☆☆☆ — only helps editor users | Low | **Won't do** |
| A2A outbound adapter | Medium | 3–5 days | ★★★☆ — enables agent delegation | Medium | **P1** |
| A2A inbound (Doer as A2A server) | Medium-High | 5–7 days | ★★★★ — ecosystem integration | Medium | **P2** |
| Trajectory-aligned streaming refactor | Low | 1–2 days | ★★★☆ — cleaner transcripts + foundation | Low | **P0** |
| Trajectory "dreaming" / cross-harness learning | Medium | 4–6 days | ★★★★ — agents learn from all harnesses | Medium | **P1** |

---

## 6. Recommended Next Steps

1. **Trajectory-aligned streaming (P0)** — Extract `StreamTokenBuffer` into `adapter-utils`, update `letta-cloud` and `letta-code` to use it, add timestamps to `emit()`. This immediately improves transcript quality and sets up the trajectory pipeline.

2. **A2A outbound adapter (P1)** — Build `packages/adapters/a2a/` as a new `ServerAdapterModule` that calls remote A2A agents via JSON-RPC 2.0 + SSE. Start with `message/stream` (no push notifications) and map A2A task states to Doer's `AdapterExecutionResult`.

3. **Trajectory dreaming (P1)** — Add a background job that normalizes completed run transcripts into trajectory files in MemFS, enabling cross-harness learning (e.g., a Codex session informs a Letta agent's next heartbeat).

4. **A2A inbound (P2)** — If Doer agents need to be discoverable by external A2A clients, expose Agent Cards at `/.well-known/agent-card.json` and implement `message/send` + `message/stream` as server routes in the Doer API.

---

## 7. Files Referenced

- `packages/adapter-utils/src/types.ts` — `ServerAdapterModule`, `AdapterExecutionContext`, `AdapterExecutionResult`, `TranscriptEntry`
- `packages/adapter-utils/src/server-utils.ts` — shared utilities (env, skills, path resolution)
- `packages/adapters/letta-cloud/src/server/execute.ts` — stream-token accumulator (lines 666–730), `emit()` (line 614)
- `packages/adapters/letta-cloud/src/ui/adapter.ts` — `parseLettaCloudStdoutLine`
- `packages/adapters/letta-code/src/server/sdk-runtime.ts` — SDK streaming with `streamedAssistant`/`streamedReasoning` dedup
- `packages/adapters/letta-code/src/server/sdk-events.ts` — `mapSdkMessage` (SDK event → transcript entry)
- `server/src/adapters/registry.ts` — 13 registered adapter types
- `server/src/services/heartbeat.ts` — calls `adapter.execute()`, pipes `ctx.onLog` to run log store
- `ui/src/adapters/registry.ts` — UI adapter registry with `parseStdoutLine` fallback chain
- `ui/src/adapters/transcript.ts` — transcript entry rendering

---

## Implementation Notes (Post-Mortem)

### What was actually built

#### Trajectory Track (complete)
1. **StreamTokenBuffer** extracted to `packages/adapter-utils/src/stream-buffer.ts` — exports
   `StreamTokenBuffer` class, `StreamKind` type (`"assistant" | "reasoning"`), `StreamTokenEntry`
   interface. Methods: `appendDelta(kind, text)`, `flush()`, `getBuffered()`, `isBuffered`,
   `reset()`, `matchFullAndConsume(kind, fullContent)`, `entries` property.
2. **Exported** from `packages/adapter-utils/src/index.ts`.
3. **Tests**: 22 tests in `stream-buffer.test.ts` — all passing.
4. **letta-cloud**: Replaced inline buffer logic with `StreamTokenBuffer`. Added `ts` timestamp
   to every `emit()` call via `emitTracked()` wrapper. Added `trajectory` array accumulated in
   `executeStreaming()`. Returns `resultJson: { exitCode, stepCount, trajectory }`.
5. **letta-code**: SDK-runtime uses `StreamTokenBuffer` for delta/full-text token streaming.
   `execute.ts` adds `ts` timestamps to emit calls and `trajectory` array to `resultJson`.
6. **Test fix**: `execute-sdk.test.ts` updated to expect `ts` timestamp field using regex matcher,
   plus `resultJson.trajectory` assertion.

#### A2A Track (complete)
1. **Package scaffold**: `packages/adapters/a2a/` — package.json with exports for `.`, `./server`,
   `./ui`; tsconfig extends `../../../tsconfig.base.json`; vitest.config.ts.
2. **Shared types**: Full A2A protocol type definitions in `shared/types.ts`.
   - A2A error codes stored as **string keys** (`Record<string, string>`) — TypeScript
     rejected numeric literal keys like `-32700`.
   - `A2aAgentCapabilities` uses `streaming?: boolean` (not `{ supported: boolean }`).
   - `A2aMessage` requires `messageId`, `role`, `parts`.
3. **A2A client**: `A2aClient` class with injectable `fetchImpl` constructor parameter (defaults
   to `globalThis.fetch`). Methods: `fetchAgentCard()`, `sendMessage()`, `streamMessage()` (async
   generator), `cancelTask()`, `getTask()`, `supportsStreaming()`, `parseSseStream()`.
   - URL mapping: `{base}/message:send`, `{base}/message:stream`, `{base}/tasks:get`,
     `{base}/tasks:cancel`, `{base}/agent:get`.
   - `parseSseStream` handles JSON-RPC 2.0 SSE notification format with `method`/`params`
     unwrapping.
   - 14 tests in `a2a-client.test.ts` — all passing.
4. **Agent card**: `generateAgentCard()` + `validateAgentCard()` + `DoerAgentInfo` interface.
5. **Server execute**: `execute(ctx)` implementing `ServerAdapterModule` contract. Uses
   `makeEmit()` helper that wraps payload with `ts` timestamp and accumulates trajectory.
   - **Task ID fix**: Captures `taskId` from first SSE `A2aTaskStatusUpdateEvent` (not using
     `userMessage.messageId` as fallback). Uses `taskId ?? userMessage.messageId` for
     `getTask`/`cancelTask`/`resultJson`.
   - Supports both streaming (`message/stream` via SSE) and non-streaming (`message/send`) paths.
6. **UI adapter**: `parseA2aStdoutLine()` + `buildA2aAdapterConfig()` in `ui/adapter.ts`.
7. **Registrations**: Registered in both `server/src/adapters/registry.ts` and
   `ui/src/adapters/registry.ts`.
8. **package.json deps**: Added `@doerai/adapter-a2a: workspace:*` to both `server/package.json`
   and `ui/package.json` (required for pnpm workspace linking).

#### ACP
Explicitly scrapped by user ("scrap the ACP!").

### Verification Results
- `pnpm -r typecheck`: All 29 packages pass. Server fails with pre-existing `sharp 2` type
  definition issue (unrelated to our changes — confirmed by stashing all changes).
- `pnpm test:run`: 880 passed, 4 failed (pre-existing: gemini-local and pi-local environment
  diagnostic tests timeout because CLI tools aren't installed in this environment).
- `pnpm build`: All packages build successfully except server (same pre-existing `sharp 2` issue).
- `pnpm --filter @doerai/adapter-a2a build`: ✅
- `pnpm --filter @doerai/adapter-utils build`: ✅
- `pnpm --filter @doerai/adapter-letta-cloud build`: ✅
- `pnpm --filter @doerai/adapter-letta-code build`: ✅

### Files Modified
- `packages/adapter-utils/src/index.ts` — export StreamTokenBuffer
- `packages/adapter-utils/src/stream-buffer.ts` — (new) StreamTokenBuffer class
- `packages/adapter-utils/src/stream-buffer.test.ts` — (new) 22 tests
- `packages/adapter-utils/vitest.config.ts` — (new) node environment
- `packages/adapters/letta-cloud/src/server/execute.ts` — trajectory refactor + timestamps
- `packages/adapters/letta-code/src/server/execute.ts` — trajectory + timestamps
- `packages/adapters/letta-code/src/server/sdk-runtime.ts` — StreamTokenBuffer usage
- `packages/adapters/letta-code/src/server/execute-sdk.test.ts` — test fix for ts field
- `packages/adapters/a2a/` — (new) 10 files for full A2A adapter package
- `server/src/adapters/registry.ts` — A2A adapter registration
- `server/package.json` — added @doerai/adapter-a2a dependency
- `ui/src/adapters/registry.ts` — A2A UI adapter registration
- `ui/src/adapters/a2a/index.ts` — (new) UI adapter integration
- `ui/src/adapters/a2a/config-fields.tsx` — (new) UI config fields
- `ui/package.json` — added @doerai/adapter-a2a dependency
- `vitest.config.ts` — added a2a to projects list
