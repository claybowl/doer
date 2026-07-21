# Unified Letta Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the custom Letta online/offline inference loops with the Letta Agent SDK while keeping `letta_code` stable, running tools locally, and storing each canonical agent's MemFS inside its Doer instance.

**Architecture:** A small SDK runtime wrapper owns client/session creation and event mapping. `execute()` resolves a local-canonical configuration, points the SDK's per-session `MEMORY_DIR` at Doer's mounted memory repository, resumes the stored conversation, and streams normalized Doer events. Cloud configuration remains only for compatibility and migration; canonical runs use the SDK local backend with either the local or API harness.

**Tech Stack:** TypeScript, `@letta-ai/letta-agent-sdk@0.2.6`, Vitest, React, Doer adapter-utils, Letta Code app-server.

---

### Task 1: Define the canonical configuration and session contract

**Files:**
- Modify: `packages/adapters/letta-code/src/shared/types.ts`
- Create: `packages/adapters/letta-code/src/server/config.ts`
- Create: `packages/adapters/letta-code/src/server/config.test.ts`
- Modify: `packages/adapters/letta-code/src/server/index.ts`

- [ ] **Step 1: Write failing tests for defaults and legacy normalization**

```ts
expect(resolveLettaCodeConfig({})).toMatchObject({ backend: "local", harnessBackend: "local", permissionMode: "standard" });
expect(resolveLettaCodeConfig({ mode: "online", agentId: "agent-cloud", apiKey: "key" })).toMatchObject({
  backend: "cloud_attached", lettaAgentId: "agent-cloud", apiKey: "key",
});
expect(resolveLettaCodeSession({ conversationId: "conv-1", cwd: "/old" }, "/new")).toBeNull();
```

- [ ] **Step 2: Run `pnpm --filter @doerai/adapter-letta-code exec vitest run src/server/config.test.ts` and verify missing exports fail**
- [ ] **Step 3: Implement `ResolvedLettaCodeConfig`, safe parsing, legacy mode conversion, and cwd-aware session decoding**
- [ ] **Step 4: Re-run the focused test and verify it passes**

### Task 2: Add the SDK dependency and event mapper

**Files:**
- Modify: `packages/adapters/letta-code/package.json`
- Create: `packages/adapters/letta-code/src/server/sdk-events.ts`
- Create: `packages/adapters/letta-code/src/server/sdk-events.test.ts`

- [ ] **Step 1: Write failing table tests mapping `init`, `assistant`, `reasoning`, `tool_call`, `tool_result`, `retry`, `error`, and `result` SDK messages to emitted JSON lines**

```ts
const mapped = mapSdkMessage({ type: "assistant", content: "hello", uuid: "m1" });
expect(mapped.events).toEqual([{ type: "assistant_message", content: "hello" }]);
expect(mapSdkMessage({ type: "init", agentId: "agent-local-1", sessionId: "s1", conversationId: "c1", model: "gpt" }).session)
  .toEqual({ lettaAgentId: "agent-local-1", sessionId: "s1", conversationId: "c1", model: "gpt" });
```

- [ ] **Step 2: Run the focused mapper test and verify the missing mapper fails**
- [ ] **Step 3: Add `@letta-ai/letta-agent-sdk: ^0.2.6` and implement a pure exhaustive mapper with untrusted-field validation**
- [ ] **Step 4: Install without committing `pnpm-lock.yaml`, then run mapper tests and adapter typecheck**

### Task 3: Implement an injectable SDK runtime

**Files:**
- Create: `packages/adapters/letta-code/src/server/sdk-runtime.ts`
- Create: `packages/adapters/letta-code/src/server/sdk-runtime.test.ts`

- [ ] **Step 1: Write a failing runtime test using a complete in-memory `LettaCodeSession` fake**

```ts
const result = await runLettaSdkTurn(ctx, config, {
  createClient: () => fakeClient({ events: [initEvent, assistantEvent, resultEvent] }),
});
expect(result.sessionParams).toEqual({ conversationId: "conv-1", lettaAgentId: "agent-local-1", cwd: "/work" });
expect(result.summary).toBe("finished");
```

- [ ] **Step 2: Run the focused test and verify `runLettaSdkTurn` is missing**
- [ ] **Step 3: Implement client selection, create/resume logic, `session.send()`, stream consumption, result aggregation, `finally` close, and abort wiring**
- [ ] **Step 4: Add failing tests for SDK error, unsuccessful result, and stale conversation fallback; implement the smallest handling needed**
- [ ] **Step 5: Run runtime tests and verify all pass**

### Task 4: Make local MemFS and local tools invariant

**Files:**
- Modify: `packages/adapters/letta-code/src/server/sdk-runtime.ts`
- Modify: `packages/adapters/letta-code/src/server/config.ts`
- Modify: `packages/adapters/letta-code/src/server/config.test.ts`
- Modify: `packages/adapters/letta-code/src/server/sdk-runtime.test.ts`

- [ ] **Step 1: Write failing tests that require local sessions to receive `cwd`, `MEMORY_DIR`, `LETTA_MEMORY_DIR`, `LETTA_MEMORY_DIR_EXPLICIT=1`, Doer env, and provider-independent permission mode**
- [ ] **Step 2: Verify the tests fail because session env is absent**
- [ ] **Step 3: Implement session options from `LETTA_MEMFS_DIR`/`DOER_AGENT_MEMORY_DIR`, configured cwd, skill sources, tools, model, reasoning, dreaming, and permission policy**
- [ ] **Step 4: Add a regression test proving `ollama_cloud` does not change permissions or remove Bash/filesystem tools**
- [ ] **Step 5: Run focused tests and adapter typecheck**

### Task 5: Replace the custom execute loop

**Files:**
- Replace: `packages/adapters/letta-code/src/server/execute.ts`
- Modify: `packages/adapters/letta-code/src/server/index.ts`
- Delete after replacement tests pass: `packages/adapters/letta-code/src/server/loop.test.ts`, `resolve-provider.test.ts`, `tool-policy.test.ts`
- Preserve or move: `packages/adapters/letta-code/src/server/tool-intercepts.ts`

- [ ] **Step 1: Add a failing adapter-level test proving `execute()` delegates to SDK runtime and emits invocation metadata**
- [ ] **Step 2: Verify it fails against the custom inference loop**
- [ ] **Step 3: Replace `execute.ts` with prompt rendering plus `runLettaSdkTurn`; register existing Doer operations as SDK external tools instead of output intercepts where required**
- [ ] **Step 4: Run all adapter tests; remove tests that exclusively describe the deleted custom provider loop**
- [ ] **Step 5: Run adapter typecheck and inspect the diff for leftover Anthropic/OpenAI inference code**

### Task 6: Update environment diagnostics and UI configuration

**Files:**
- Modify: `packages/adapters/letta-code/src/server/test-environment.ts`
- Create: `packages/adapters/letta-code/src/server/test-environment.test.ts`
- Modify: `packages/adapters/letta-code/src/index.ts`
- Modify: `ui/src/adapters/letta-code/config-fields.tsx`
- Modify: `ui/src/adapters/letta-code/index.ts`
- Create: `ui/src/adapters/letta-code/index.test.ts`

- [ ] **Step 1: Write failing tests for local-canonical config building and diagnostics**

```ts
expect(buildLettaCodeConfig({ backend: "local", model: "openai-codex/gpt-5", permissionMode: "unrestricted" }))
  .toMatchObject({ backend: "local", model: "openai-codex/gpt-5", permissionMode: "unrestricted" });
```

- [ ] **Step 2: Verify old mode/provider UI output fails the tests**
- [ ] **Step 3: Replace mode/provider fields with backend, local Letta ID, model handle, reasoning, permissions, skills, dreaming, mods status, and advanced cloud compatibility fields**
- [ ] **Step 4: Update diagnostics to check SDK/CLI resolution, local memory binding, Cloud credentials only when needed, and warn—not fail—when provider login must be completed through Letta**
- [ ] **Step 5: Run focused UI/server tests and both package typechecks**

### Task 7: Preserve CLI and mods as companion capabilities

**Files:**
- Create: `packages/adapters/letta-code/src/server/letta-cli.ts`
- Create: `packages/adapters/letta-code/src/server/letta-cli.test.ts`
- Modify: `packages/adapters/letta-code/src/server/test-environment.ts`

- [ ] **Step 1: Write failing parser tests for CLI version and `~/.letta/mods/diagnostics/latest.json` inventory**
- [ ] **Step 2: Verify missing companion helpers fail**
- [ ] **Step 3: Implement side-effect-free discovery helpers; do not install, remove, or reload mods during execution**
- [ ] **Step 4: Surface actionable diagnostics for `letta /connect`, mod diagnostics, and `LETTA_DISABLE_MODS`**
- [ ] **Step 5: Run focused tests and adapter typecheck**

### Task 8: Runtime verification and documentation

**Files:**
- Modify: `doc/DEVELOPING.md`
- Modify: `doc/DATABASE.md` only if instance paths require clarification

- [ ] **Step 1: Add documentation for instance-scoped Letta storage, ChatGPT subscription login, model selection, mods, and local tool execution**
- [ ] **Step 2: Run `pnpm --filter @doerai/adapter-letta-code exec vitest run`**
- [ ] **Step 3: Run `pnpm --filter @doerai/adapter-letta-code typecheck` and `pnpm --filter @doerai/ui typecheck`**
- [ ] **Step 4: Start the dev server on port 3101 with the development instance and run a health check without touching the desktop 3100 instance**
- [ ] **Step 5: Commit the runtime slice without `pnpm-lock.yaml`**

