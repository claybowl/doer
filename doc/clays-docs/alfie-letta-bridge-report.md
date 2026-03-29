status: completed
output: ## Executive Summary

The Letta bridge already exists as a **plugin** (not a full adapter). To achieve "OpenClaw-level" integration, we need to build a **dedicated Letta adapter** following the same pattern as `@paperclipai/adapter-openclaw-gateway`.

## Current State

**Existing Letta Bridge Plugin:**
- Location: `/paperclip/packages/plugins/examples/letta-bridge/`
- Type: Paperclip plugin (not adapter)
- Capabilities:
  - Lists Letta agents via UI page
  - Syncs agents from Letta cloud
  - Shows Letta memory in agent detail tabs
  - Sends messages to Letta agents

**OpenClaw Adapter Pattern:**
- Location: `/paperclip/packages/adapters/openclaw-gateway/`
- Type: Full Paperclip adapter
- Structure:
  - `src/server/` - Server-side execution logic
  - `src/ui/` - UI config building
  - `src/cli/` - CLI formatting
  - `src/shared/` - Shared utilities
  - Registered in `/server/src/adapters/registry.ts`

## Gap Analysis

| Aspect | Current (Plugin) | Target (Adapter) |
|--------|-----------------|------------------|
| **Agent Lifecycle** | Import/sync only | Full lifecycle (create, run, manage) |
| **Execution Model** | Messages via plugin API | Native adapter execution |
| **Skills Support** | Limited | Full skill registry + sync |
| **Session Management** | External | Integrated session codec |
| **Heartbeat Support** | No | Yes - true Paperclip agents |

## Implementation Path

### Phase 1: Create Letta Adapter Package
```
/packages/adapters/letta/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts          # Models & exports
│   ├── server/
│   │   ├── index.ts      # Adapter registration
│   │   ├── execute.ts    # Heartbeat execution
│   │   ├── test.ts       # Environment testing
│   │   └── session.ts    # Session codec
│   ├── ui/
│   │   ├── index.ts      # Config builder
│   │   └── parse.ts      # Stdout parsing
│   └── cli/
└── README.md
```

### Phase 2: Core Components Required

**1. Server Adapter (`src/server/index.ts`):**
```typescript
const lettaAdapter: ServerAdapterModule = {
  type: "letta",
  execute: lettaExecute,
  testEnvironment: lettaTestEnvironment,
  models: lettaModels,
  sessionCodec: lettaSessionCodec,
  supportsLocalAgentJwt: false,
  agentConfigurationDoc: lettaAgentConfigurationDoc,
};
```

**2. Execution Logic (`src/server/execute.ts`):**
- Connect to Letta MCP/WebSocket endpoint
- Translate Paperclip heartbeat → Letta messages
- Handle streaming responses
- Map Letta memory blocks ↔ Paperclip context

**3. Session Codec (`src/server/session.ts`):**
- Encode Paperclip session state into Letta memory
- Decode Letta memory into Paperclip context

**4. UI Config (`src/ui/index.ts`):**
- Build adapter config for Letta connection
- Support Letta API key + endpoint URL

### Phase 3: Integration Points

1. **Registry Registration** (`server/src/adapters/registry.ts`)
2. **Access Routes** (`server/src/routes/access.ts`) - Add Letta join flow
3. **UI Adapter Registry** (`ui/src/adapters/registry.ts`)

### Phase 4: MCP Protocol Consideration

Letta agents expose capabilities via **MCP (Model Context Protocol)**. The adapter should:
- Connect to Letta's MCP endpoint
- Discover available tools from Letta agents
- Map MCP tools → Paperclip skills
- Support bidirectional tool invocation

## Technical Spec

**Adapter Type:** `letta`  
**Config Required:**
- `lettaApiKey` - API key from app.letta.com
- `lettaBaseUrl` - Optional (default: https://api.letta.com)
- `lettaAgentId` - Specific agent to use as "self"

**Execution Flow:**
1. Paperclip heartbeat triggers adapter
2. Adapter loads Letta agent via MCP
3. Transforms task → Letta message format
4. Streams response back to Paperclip
5. Updates agent memory with outcome

## Recommendation

**Proceed with Phase 1** — scaffold the `@paperclipai/adapter-letta` package following the OpenClaw adapter pattern. The existing Letta bridge plugin proves the API integration works; the adapter elevates it to first-class Paperclip citizenship.

**Priority:** High — enables persistent, memory-backed agents in Paperclip
**Effort:** 3-5 days for MVP
**Dependencies:** Letta MCP documentation, Paperclip adapter SDK

exit: 0
description: Generate research findings report
truncated: false

## Executive Summary

The Letta bridge already exists as a **plugin** (not a full adapter). To achieve "OpenClaw-level" integration, we need to build a **dedicated Letta adapter** following the same pattern as `@paperclipai/adapter-openclaw-gateway`.

## Current State

**Existing Letta Bridge Plugin:**
- Location: `/paperclip/packages/plugins/examples/letta-bridge/`
- Type: Paperclip plugin (not adapter)
- Capabilities:
  - Lists Letta agents via UI page
  - Syncs agents from Letta cloud
  - Shows Letta memory in agent detail tabs
  - Sends messages to Letta agents

**OpenClaw Adapter Pattern:**
- Location: `/paperclip/packages/adapters/openclaw-gateway/`
- Type: Full Paperclip adapter
- Structure:
  - `src/server/` - Server-side execution logic
  - `src/ui/` - UI config building
  - `src/cli/` - CLI formatting
  - `src/shared/` - Shared utilities
  - Registered in `/server/src/adapters/registry.ts`

## Gap Analysis

| Aspect | Current (Plugin) | Target (Adapter) |
|--------|-----------------|------------------|
| **Agent Lifecycle** | Import/sync only | Full lifecycle (create, run, manage) |
| **Execution Model** | Messages via plugin API | Native adapter execution |
| **Skills Support** | Limited | Full skill registry + sync |
| **Session Management** | External | Integrated session codec |
| **Heartbeat Support** | No | Yes - true Paperclip agents |

## Implementation Path

### Phase 1: Create Letta Adapter Package
```
/packages/adapters/letta/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts          # Models & exports
│   ├── server/
│   │   ├── index.ts      # Adapter registration
│   │   ├── execute.ts    # Heartbeat execution
│   │   ├── test.ts       # Environment testing
│   │   └── session.ts    # Session codec
│   ├── ui/
│   │   ├── index.ts      # Config builder
│   │   └── parse.ts      # Stdout parsing
│   └── cli/
└── README.md
```

### Phase 2: Core Components Required

**1. Server Adapter (`src/server/index.ts`):**
```typescript
const lettaAdapter: ServerAdapterModule = {
  type: "letta",
  execute: lettaExecute,
  testEnvironment: lettaTestEnvironment,
  models: lettaModels,
  sessionCodec: lettaSessionCodec,
  supportsLocalAgentJwt: false,
  agentConfigurationDoc: lettaAgentConfigurationDoc,
};
```

**2. Execution Logic (`src/server/execute.ts`):**
- Connect to Letta MCP/WebSocket endpoint
- Translate Paperclip heartbeat → Letta messages
- Handle streaming responses
- Map Letta memory blocks ↔ Paperclip context

**3. Session Codec (`src/server/session.ts`):**
- Encode Paperclip session state into Letta memory
- Decode Letta memory into Paperclip context

**4. UI Config (`src/ui/index.ts`):**
- Build adapter config for Letta connection
- Support Letta API key + endpoint URL

### Phase 3: Integration Points

1. **Registry Registration** (`server/src/adapters/registry.ts`)
2. **Access Routes** (`server/src/routes/access.ts`) - Add Letta join flow
3. **UI Adapter Registry** (`ui/src/adapters/registry.ts`)

### Phase 4: MCP Protocol Consideration

Letta agents expose capabilities via **MCP (Model Context Protocol)**. The adapter should:
- Connect to Letta's MCP endpoint
- Discover available tools from Letta agents
- Map MCP tools → Paperclip skills
- Support bidirectional tool invocation

## Technical Spec

**Adapter Type:** `letta`  
**Config Required:**
- `lettaApiKey` - API key from app.letta.com
- `lettaBaseUrl` - Optional (default: https://api.letta.com)
- `lettaAgentId` - Specific agent to use as "self"

**Execution Flow:**
1. Paperclip heartbeat triggers adapter
2. Adapter loads Letta agent via MCP
3. Transforms task → Letta message format
4. Streams response back to Paperclip
5. Updates agent memory with outcome

## Recommendation

**Proceed with Phase 1** — scaffold the `@paperclipai/adapter-letta` package following the OpenClaw adapter pattern. The existing Letta bridge plugin proves the API integration works; the adapter elevates it to first-class Paperclip citizenship.

**Priority:** High — enables persistent, memory-backed agents in Paperclip
**Effort:** 3-5 days for MVP
**Dependencies:** Letta MCP documentation, Paperclip adapter SDK
