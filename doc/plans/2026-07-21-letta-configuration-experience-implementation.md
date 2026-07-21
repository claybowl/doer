# Letta Configuration Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver an expanded, connection-first Letta configuration experience with reusable company credentials, live model and agent discovery, prefilled endpoints, local path browsing, and canonical Letta identity persistence.

**Architecture:** Add company-scoped provider connections that reference existing encrypted company secrets, then resolve those connections only at server runtime. Keep discovery and provider normalization in the `letta_code` package, expose company-authorized server routes, and feed the results into the existing adapter configuration form. Use an Electron IPC directory chooser when available and a board-only, root-constrained server filesystem navigator in browser development.

**Tech Stack:** TypeScript, Drizzle/PostgreSQL, Express 5, React 19, TanStack Query, Electron IPC, Letta Agent SDK, Vitest.

---

### Task 1: Provider connection data contract

**Files:**
- Create: `packages/db/src/schema/provider_connections.ts`
- Modify: `packages/db/src/schema/index.ts`
- Create: `packages/shared/src/types/provider-connection.ts`
- Create: `packages/shared/src/validators/provider-connection.ts`
- Modify: `packages/shared/src/index.ts`
- Create: `packages/shared/src/validators/provider-connection.test.ts`
- Create: `packages/db/src/migrations/0053_provider_connections.sql` (generated)

- [ ] **Step 1: Write failing validator tests**

```ts
import { describe, expect, it } from "vitest";
import { createProviderConnectionSchema } from "./provider-connection.js";

describe("createProviderConnectionSchema", () => {
  it("defaults Letta Cloud endpoints", () => {
    const parsed = createProviderConnectionSchema.parse({
      name: "Personal Letta",
      providerType: "letta",
      authMode: "api_key",
    });
    expect(parsed.lettaBaseUrl).toBe("https://api.letta.com");
  });

  it("rejects a secret from an unsupported auth mode", () => {
    expect(() => createProviderConnectionSchema.parse({
      name: "Local Ollama",
      providerType: "ollama",
      authMode: "none",
      secretId: "e5bd2bd2-a9d1-4cd4-a90b-20718967ca35",
    })).toThrow();
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `pnpm vitest run packages/shared/src/validators/provider-connection.test.ts`

Expected: FAIL because `provider-connection.ts` does not exist.

- [ ] **Step 3: Add shared types and validators**

Define `ProviderType` as `letta | chatgpt_oauth | openai | anthropic | ollama | ollama_cloud | openrouter | groq | together | custom`, `ProviderAuthMode` as `api_key | letta_cli | oauth | none`, and DTOs for connections, discovered models, and discovered Letta agents. The create schema must trim names and URLs, default `lettaBaseUrl` to `https://api.letta.com`, require `secretId` for `api_key`, reject it for `none`, and allow nullable provider endpoints for managed OAuth.

```ts
export interface ProviderConnection {
  id: string;
  companyId: string;
  name: string;
  providerType: ProviderType;
  authMode: ProviderAuthMode;
  secretId: string | null;
  lettaBaseUrl: string;
  providerBaseUrl: string | null;
  isDefault: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
```

- [ ] **Step 4: Add the Drizzle table and exports**

Create `provider_connections` with UUID primary key, company and optional secret foreign keys, provider/auth fields, endpoint fields, JSON metadata, default flag, timestamps, a unique `(company_id, name)` index, and company/provider lookup indexes. Use `onDelete: "restrict"` for secrets so credentials cannot disappear while referenced.

- [ ] **Step 5: Generate and inspect the migration**

Run: `pnpm db:generate`

Expected: a migration that creates `provider_connections` and its foreign keys/indexes. Rename the generated SQL to `0053_provider_connections.sql` only if Drizzle selects a generated codename; retain the matching metadata journal entry.

- [ ] **Step 6: Run focused tests and typecheck**

Run: `pnpm vitest run packages/shared/src/validators/provider-connection.test.ts && pnpm --filter @doerai/db typecheck && pnpm --filter @doerai/shared typecheck`

Expected: PASS.

- [ ] **Step 7: Commit the contract**

```bash
git add packages/db/src/schema/provider_connections.ts packages/db/src/schema/index.ts packages/db/src/migrations packages/shared/src/types/provider-connection.ts packages/shared/src/validators/provider-connection.ts packages/shared/src/validators/provider-connection.test.ts packages/shared/src/index.ts
git commit -m "feat: add company provider connections" -m "Co-Authored-By: Doer <noreply@doer.donjon.agency>"
```

### Task 2: Company-authorized connection CRUD

**Files:**
- Create: `server/src/services/provider-connections.ts`
- Modify: `server/src/services/index.ts`
- Create: `server/src/routes/provider-connections.ts`
- Modify: `server/src/app.ts`
- Create: `server/src/__tests__/provider-connections-routes.test.ts`

- [ ] **Step 1: Write route tests for isolation, defaults, and deletion guards**

Use the existing Express/Supertest board-actor pattern. Assert that listing is company-scoped, creating an `api_key` connection rejects a cross-company secret, setting a default clears the previous default for the same provider, and deleting a referenced connection returns `409` with `{ agentIds }`.

```ts
expect(await request(app).get(`/api/companies/${companyA}/provider-connections`)).toMatchObject({ status: 200 });
expect(await request(app).post(`/api/companies/${companyA}/provider-connections`).send(crossCompanySecret)).toMatchObject({ status: 422 });
expect(await request(app).delete(`/api/provider-connections/${usedId}`)).toMatchObject({ status: 409 });
```

- [ ] **Step 2: Run the route test and verify it fails**

Run: `pnpm vitest run server/src/__tests__/provider-connections-routes.test.ts`

Expected: FAIL because the route and service are absent.

- [ ] **Step 3: Implement the service**

Implement `list`, `getById`, `create`, `update`, `listReferencingAgents`, and `remove`. Validate secret ownership with `secretService(db).assertSecretInCompany`; expose that existing helper from `server/src/services/secrets.ts`. Set defaults transactionally:

```ts
if (input.isDefault) {
  await tx.update(providerConnections)
    .set({ isDefault: false, updatedAt: new Date() })
    .where(and(
      eq(providerConnections.companyId, companyId),
      eq(providerConnections.providerType, input.providerType),
    ));
}
```

Find references by reading `agents.adapterConfig.providerConnectionId`; return their IDs and names before refusing deletion.

- [ ] **Step 4: Implement board-only routes and activity logs**

Add:

```text
GET    /companies/:companyId/provider-connections
POST   /companies/:companyId/provider-connections
PATCH  /provider-connections/:id
DELETE /provider-connections/:id
```

Every route calls `assertBoard`, checks company access, validates the shared schema, and logs `provider_connection.created|updated|deleted` without secret values.

- [ ] **Step 5: Run tests and server typecheck**

Run: `pnpm vitest run server/src/__tests__/provider-connections-routes.test.ts && pnpm --filter @doerai/server typecheck`

Expected: PASS.

- [ ] **Step 6: Commit CRUD**

```bash
git add server/src/services/provider-connections.ts server/src/services/secrets.ts server/src/services/index.ts server/src/routes/provider-connections.ts server/src/app.ts server/src/__tests__/provider-connections-routes.test.ts
git commit -m "feat: manage company provider connections" -m "Co-Authored-By: Doer <noreply@doer.donjon.agency>"
```

### Task 3: Letta model and agent discovery

**Files:**
- Create: `packages/adapters/letta-code/src/server/provider-defaults.ts`
- Create: `packages/adapters/letta-code/src/server/discovery.ts`
- Create: `packages/adapters/letta-code/src/server/discovery.test.ts`
- Modify: `packages/adapters/letta-code/src/server/index.ts`
- Modify: `packages/adapters/letta-code/src/index.ts`
- Modify: `server/src/services/provider-connections.ts`
- Modify: `server/src/routes/provider-connections.ts`
- Modify: `server/src/__tests__/provider-connections-routes.test.ts`

- [ ] **Step 1: Write failing normalization and fallback tests**

```ts
it("normalizes Letta models by handle and provider", async () => {
  const models = await discoverModels(connection, depsReturning([
    { handle: "ollama/qwen3", display_name: "Qwen 3", provider_type: "ollama" },
  ]));
  expect(models).toEqual([{ id: "ollama/qwen3", label: "Qwen 3", provider: "ollama" }]);
});

it("lists local Ollama tags without a cloud credential", async () => {
  const models = await discoverModels(ollamaConnection, depsReturningTags(["qwen3:latest"]));
  expect(models[0]?.id).toBe("ollama/qwen3:latest");
});
```

- [ ] **Step 2: Run the discovery test and verify it fails**

Run: `pnpm vitest run packages/adapters/letta-code/src/server/discovery.test.ts`

Expected: FAIL because discovery exports do not exist.

- [ ] **Step 3: Implement defaults and discovery**

Use an explicit registry for known defaults: Letta API `https://api.letta.com`, Ollama `http://127.0.0.1:11434`, OpenAI `https://api.openai.com/v1`, Anthropic `https://api.anthropic.com`, OpenRouter `https://openrouter.ai/api/v1`, Groq `https://api.groq.com/openai/v1`, and Together `https://api.together.xyz/v1`. Managed `chatgpt_oauth` displays `Managed by Letta authentication` instead of inventing a provider URL.

`discoverModels` calls Letta `GET /v1/models/` for Letta-backed connections, Ollama `GET /api/tags` for local Ollama, and OpenAI-compatible `GET /models` where supported. `discoverAgents` calls Letta `GET /v1/agents/?limit=100`. Apply a 10-second timeout, deduplicate by ID, and sort by label. Never include authorization headers in thrown errors.

- [ ] **Step 4: Add cached discovery service methods and routes**

Add a bounded five-minute in-memory cache keyed by `connectionId:updatedAt:resource`. `?refresh=true` bypasses it. Resolve the secret only immediately before discovery.

```text
GET  /provider-connections/:id/models?refresh=true
GET  /provider-connections/:id/letta-agents?refresh=true
POST /provider-connections/:id/test
```

Return normalized DTOs and `{ ok, message }` for connection tests.

- [ ] **Step 5: Verify focused tests**

Run: `pnpm vitest run packages/adapters/letta-code/src/server/discovery.test.ts server/src/__tests__/provider-connections-routes.test.ts`

Expected: PASS, including preserved cached results when a non-refresh call follows a successful fetch.

- [ ] **Step 6: Commit discovery**

```bash
git add packages/adapters/letta-code/src/server/provider-defaults.ts packages/adapters/letta-code/src/server/discovery.ts packages/adapters/letta-code/src/server/discovery.test.ts packages/adapters/letta-code/src/server/index.ts packages/adapters/letta-code/src/index.ts server/src/services/provider-connections.ts server/src/routes/provider-connections.ts server/src/__tests__/provider-connections-routes.test.ts
git commit -m "feat: discover Letta models and agents" -m "Co-Authored-By: Doer <noreply@doer.donjon.agency>"
```

### Task 4: Runtime connection resolution and legacy credential migration

**Files:**
- Modify: `packages/adapters/letta-code/src/shared/types.ts`
- Modify: `packages/adapters/letta-code/src/server/config.ts`
- Modify: `packages/adapters/letta-code/src/server/config.test.ts`
- Modify: `server/src/services/secrets.ts`
- Create: `server/src/services/letta-provider-migration.ts`
- Create: `server/src/__tests__/letta-provider-migration.test.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Write failing runtime-resolution and migration tests**

Assert that `providerConnectionId` persists while runtime config receives resolved `apiKey`, `apiBaseUrl`, and provider environment variables. Assert that two legacy agents sharing company/key/base URL produce one secret and one connection, both lose plaintext `apiKey`, and rerunning migration changes nothing.

```ts
expect(runtime.config).toMatchObject({
  providerConnectionId: connectionId,
  apiKey: "resolved-only-at-runtime",
  apiBaseUrl: "https://api.letta.com",
});
expect(savedAgent.adapterConfig).not.toHaveProperty("apiKey");
```

- [ ] **Step 2: Run tests and verify failure**

Run: `pnpm vitest run packages/adapters/letta-code/src/server/config.test.ts server/src/__tests__/letta-provider-migration.test.ts`

Expected: FAIL on missing connection resolution/migration behavior.

- [ ] **Step 3: Extend canonical Letta config**

Add `providerConnectionId?: string` and `identityMode?: "create_local" | "attach_existing"` to `LettaCodeSdkConfig`. Preserve legacy direct key parsing only as a migration compatibility path. Keep permissions independent from model/provider selection.

- [ ] **Step 4: Resolve connections in the secret service**

When `adapterConfig.providerConnectionId` is present, verify the connection belongs to the agent company, resolve its secret, and inject runtime-only fields. Map provider credentials to environment keys (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, `GROQ_API_KEY`, `TOGETHER_API_KEY`, `OLLAMA_API_KEY`, or `LETTA_API_KEY`) under `config.env`. Add every injected key to `secretKeys` for log redaction. Do not return resolved connection material from persistence normalization.

- [ ] **Step 5: Implement idempotent startup migration**

After database migrations and before accepting HTTP traffic, scan `letta_code` agents containing a non-empty plaintext `apiKey`. Group by company, API base URL, and SHA-256 key fingerprint; create a local-encrypted secret and connection with collision-safe names, patch each agent config with `providerConnectionId`, and delete `apiKey`. Log counts only. If one record fails, log its agent ID and continue; the next startup retries it.

- [ ] **Step 6: Run focused tests and typecheck**

Run: `pnpm vitest run packages/adapters/letta-code/src/server/config.test.ts server/src/__tests__/letta-provider-migration.test.ts server/src/__tests__/redaction.test.ts && pnpm --filter @doerai/server typecheck`

Expected: PASS with no plaintext key in persisted snapshots or logs.

- [ ] **Step 7: Commit runtime resolution and migration**

```bash
git add packages/adapters/letta-code/src/shared/types.ts packages/adapters/letta-code/src/server/config.ts packages/adapters/letta-code/src/server/config.test.ts server/src/services/secrets.ts server/src/services/letta-provider-migration.ts server/src/__tests__/letta-provider-migration.test.ts server/src/index.ts
git commit -m "feat: resolve Letta connections securely" -m "Co-Authored-By: Doer <noreply@doer.donjon.agency>"
```

### Task 5: Secure directory discovery and Electron picker

**Files:**
- Create: `server/src/services/local-paths.ts`
- Create: `server/src/routes/local-paths.ts`
- Create: `server/src/__tests__/local-paths-routes.test.ts`
- Modify: `server/src/app.ts`
- Modify: `desktop/src/main.ts`
- Modify: `desktop/src/preload.ts`
- Create: `desktop/src/path-picker.ts`
- Create: `desktop/src/path-picker.test.ts`
- Create: `ui/src/types/doer-desktop.d.ts`

- [ ] **Step 1: Write failing path-boundary tests**

Assert that the server lists directories only, rejects traversal outside configured roots, validates readable directories, blocks agent actors, and marks Desktop/Documents paths with a macOS protection warning. Test the Electron helper converts cancellation to `null` and returns only the first selected directory.

```ts
expect(resolveBrowsablePath(home, "../etc")).toEqual({ ok: false, reason: "outside_allowed_roots" });
expect(pickResult({ canceled: false, filePaths: ["/tmp/work"] })).toBe("/tmp/work");
```

- [ ] **Step 2: Run tests and verify failure**

Run: `pnpm vitest run server/src/__tests__/local-paths-routes.test.ts desktop/src/path-picker.test.ts`

Expected: FAIL because path services are absent.

- [ ] **Step 3: Implement board-only browser filesystem routes**

Allowed roots are the operator home directory, repository working directory, configured Doer data directory, and existing platform volume roots (`/Volumes` on macOS). Resolve real paths before boundary checks to prevent symlink escape.

```text
GET  /local-paths/roots
GET  /local-paths/entries?path=<absolute-directory>
POST /local-paths/validate { path }
```

Return directory names, absolute paths, readability, and warnings. Apply `assertBoard`; agent bearer keys must receive `403`.

- [ ] **Step 4: Add Electron IPC**

Register `ipcMain.handle("doer:choose-directory", ...)` before creating the window. Call `dialog.showOpenDialog({ properties: ["openDirectory", "createDirectory"] })`. Expose only `chooseDirectory(): Promise<string | null>` from preload via `ipcRenderer.invoke`; do not expose generic IPC.

- [ ] **Step 5: Verify focused tests and desktop compilation**

Run: `pnpm vitest run server/src/__tests__/local-paths-routes.test.ts desktop/src/path-picker.test.ts && pnpm --dir desktop exec tsc --noEmit`

Expected: PASS.

- [ ] **Step 6: Commit path backends**

```bash
git add server/src/services/local-paths.ts server/src/routes/local-paths.ts server/src/__tests__/local-paths-routes.test.ts server/src/app.ts desktop/src/main.ts desktop/src/preload.ts desktop/src/path-picker.ts desktop/src/path-picker.test.ts ui/src/types/doer-desktop.d.ts
git commit -m "feat: add secure local directory picker backends" -m "Co-Authored-By: Doer <noreply@doer.donjon.agency>"
```

### Task 6: Reusable path-picker UI

**Files:**
- Create: `ui/src/api/local-paths.ts`
- Create: `ui/src/components/PathPickerInput.tsx`
- Create: `ui/src/components/path-picker-state.ts`
- Create: `ui/src/components/path-picker-state.test.ts`
- Modify: `ui/src/components/PathInstructionsModal.tsx`
- Modify: `ui/src/components/AgentConfigForm.tsx`
- Modify: `ui/src/components/NewProjectDialog.tsx`
- Modify: `ui/src/components/ProjectProperties.tsx`
- Modify: `ui/src/pages/AdapterManager.tsx`
- Modify: `ui/src/adapters/claude-local/config-fields.tsx`
- Modify: `ui/src/adapters/codex-local/config-fields.tsx`
- Modify: `ui/src/adapters/cursor/config-fields.tsx`
- Modify: `ui/src/adapters/gemini-local/config-fields.tsx`
- Modify: `ui/src/adapters/hermes-local/config-fields.tsx`
- Modify: `ui/src/adapters/letta-af-opencode/config-fields.tsx`
- Modify: `ui/src/adapters/opencode-local/config-fields.tsx`
- Modify: `ui/src/adapters/pi-local/config-fields.tsx`

- [ ] **Step 1: Write failing picker-state tests**

Test Electron-first selection, browser fallback navigation, validation warnings, and cancellation preserving the prior value.

```ts
expect(applyPickedPath("/old", null)).toBe("/old");
expect(applyPickedPath("/old", "/new")).toBe("/new");
expect(parentPath("/Users/clay/work")).toBe("/Users/clay");
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `pnpm vitest run ui/src/components/path-picker-state.test.ts`

Expected: FAIL because picker helpers do not exist.

- [ ] **Step 3: Build `PathPickerInput`**

Accept controlled `value`, `onChange`, `kind="directory"`, label/ARIA props, and disabled state. If `window.doer.chooseDirectory` exists, use it. Otherwise open an in-app dialog backed by `/local-paths/roots` and `/local-paths/entries`. Provide breadcrumb navigation, readable-directory selection, manual typing, validation status, and warnings.

- [ ] **Step 4: Replace instructional Choose buttons**

Replace every filesystem `ChoosePathButton` occurrence listed above with a controlled picker that commits into that field’s existing setter. Keep `PathInstructionsModal` only as a help fallback when the browser path API is unavailable. Do not alter non-path text fields.

- [ ] **Step 5: Run UI tests and typecheck**

Run: `pnpm vitest run ui/src/components/path-picker-state.test.ts && pnpm --filter @doerai/ui typecheck`

Expected: PASS and no remaining filesystem-field import of `ChoosePathButton` from adapter/project configuration files.

- [ ] **Step 6: Commit reusable path UI**

```bash
git add ui/src/api/local-paths.ts ui/src/components/PathPickerInput.tsx ui/src/components/path-picker-state.ts ui/src/components/path-picker-state.test.ts ui/src/components/PathInstructionsModal.tsx ui/src/components/AgentConfigForm.tsx ui/src/components/NewProjectDialog.tsx ui/src/components/ProjectProperties.tsx ui/src/pages/AdapterManager.tsx ui/src/adapters
git commit -m "feat: browse local filesystem paths from configuration" -m "Co-Authored-By: Doer <noreply@doer.donjon.agency>"
```

### Task 7: Expanded Letta connection-first configuration UI

**Files:**
- Create: `ui/src/api/provider-connections.ts`
- Modify: `ui/src/lib/queryKeys.ts`
- Modify: `ui/src/adapters/types.ts`
- Create: `ui/src/adapters/letta-code/config-state.ts`
- Create: `ui/src/adapters/letta-code/config-state.test.ts`
- Create: `ui/src/adapters/letta-code/ProviderConnectionDialog.tsx`
- Modify: `ui/src/adapters/letta-code/config-fields.tsx`
- Modify: `ui/src/adapters/letta-code/index.ts`
- Modify: `ui/src/components/AgentConfigForm.tsx`

- [ ] **Step 1: Write failing state/build-config tests**

Assert that create-local omits an ID, attach-existing requires one, connection selection stores only `providerConnectionId`, endpoint defaults remain in connection metadata, and API keys never enter adapter config.

```ts
expect(buildLettaCodeConfig(values)).toMatchObject({
  backend: "local",
  identityMode: "create_local",
  providerConnectionId: connectionId,
  model: "openai-codex/gpt-5",
});
expect(buildLettaCodeConfig(values)).not.toHaveProperty("apiKey");
```

- [ ] **Step 2: Run tests and verify failure**

Run: `pnpm vitest run ui/src/adapters/letta-code/config-state.test.ts ui/src/adapters/letta-code/index.test.ts`

Expected: FAIL on the new identity/connection contract.

- [ ] **Step 3: Add UI APIs and adapter props**

Add CRUD, test, models, and agents methods. Extend `AdapterConfigFieldsProps` with `companyId`, `agent`, and `runtimeState` as optional typed properties; populate them from `AgentConfigForm`. Add query keys scoped by company and connection ID.

- [ ] **Step 4: Implement inline connection management**

The dialog creates/edits named connections, allows multiple per provider, creates a company secret once for API-key auth, supports OAuth/CLI/no-key modes without a secret, prefills known endpoints, marks a default, and tests before save when requested. Never repopulate secret inputs from server data.

- [ ] **Step 5: Implement the approved expanded layout**

Render in this order: identity cards, local-tools notice, provider connection selector with Manage action, searchable model selector with refresh, execution summary, memory/path field, and collapsed Advanced settings. Preserve permissions, skills, mods, dreaming, allow/deny lists, reasoning effort, and manual recovery fields. Refresh errors leave the saved/current model selectable and show a retry message.

- [ ] **Step 6: Run tests and UI typecheck**

Run: `pnpm vitest run ui/src/adapters/letta-code/config-state.test.ts ui/src/adapters/letta-code/index.test.ts && pnpm --filter @doerai/ui typecheck`

Expected: PASS.

- [ ] **Step 7: Commit expanded Letta UI**

```bash
git add ui/src/api/provider-connections.ts ui/src/lib/queryKeys.ts ui/src/adapters/types.ts ui/src/adapters/letta-code ui/src/components/AgentConfigForm.tsx
git commit -m "feat: add expanded Letta configuration workflow" -m "Co-Authored-By: Doer <noreply@doer.donjon.agency>"
```

### Task 8: Canonical Letta identity persistence and Overview display

**Files:**
- Create: `server/src/services/letta-identity.ts`
- Create: `server/src/__tests__/letta-identity.test.ts`
- Modify: `server/src/services/heartbeat.ts`
- Modify: `ui/src/pages/AgentDetail.tsx`
- Modify: `ui/src/fernweh/FernwehAgentDetail.tsx`
- Create: `ui/src/lib/letta-identity.ts`
- Create: `ui/src/lib/letta-identity.test.ts`

- [ ] **Step 1: Write failing identity tests**

Assert that a successful `letta_code` result with a new `sessionParams.lettaAgentId` persists it only when config is blank/create-local, never overwrites an explicitly attached ID, and is idempotent. Assert the UI prefers adapter config then runtime session parameters.

```ts
expect(resolveCanonicalLettaId(agent, runtime)).toBe("agent-local-new");
expect(await persistCanonicalLettaId(db, attachedAgent, "agent-other")).toEqual({ changed: false });
```

- [ ] **Step 2: Run tests and verify failure**

Run: `pnpm vitest run server/src/__tests__/letta-identity.test.ts ui/src/lib/letta-identity.test.ts`

Expected: FAIL because identity helpers do not exist.

- [ ] **Step 3: Persist canonical identity after successful execution**

After heartbeat session-state persistence succeeds, call `persistCanonicalLettaId` for `letta_code`. Use a conditional update that requires the stored adapter ID to still be absent, preventing concurrent runs or operator edits from being overwritten. Record an agent config revision and `letta.identity.recorded` activity event without changing other adapter settings.

- [ ] **Step 4: Display and reuse identity**

Add a Letta Identity card to both current Agent Overview implementations when adapter type is `letta_code`. Show the canonical ID, Local/Attached origin, copy button, and Pending initialization state. Pass runtime state into configuration so the form auto-populates a known ID without requiring re-entry.

- [ ] **Step 5: Run focused tests and typechecks**

Run: `pnpm vitest run server/src/__tests__/letta-identity.test.ts ui/src/lib/letta-identity.test.ts packages/adapters/letta-code/src/server/execute-sdk.test.ts && pnpm --filter @doerai/server typecheck && pnpm --filter @doerai/ui typecheck`

Expected: PASS.

- [ ] **Step 6: Commit canonical identity**

```bash
git add server/src/services/letta-identity.ts server/src/__tests__/letta-identity.test.ts server/src/services/heartbeat.ts ui/src/pages/AgentDetail.tsx ui/src/fernweh/FernwehAgentDetail.tsx ui/src/lib/letta-identity.ts ui/src/lib/letta-identity.test.ts
git commit -m "feat: persist canonical Letta agent identity" -m "Co-Authored-By: Doer <noreply@doer.donjon.agency>"
```

### Task 9: Portability, documentation, and end-to-end verification

**Files:**
- Modify: `server/src/services/company-portability.ts`
- Modify: `packages/shared/src/types/company-portability.ts`
- Modify: `server/src/__tests__/letta-portability.test.ts`
- Modify: `doc/DEVELOPING.md`
- Modify: `doc/DATABASE.md`
- Modify: `doc/plans/2026-07-21-letta-configuration-experience-implementation.md`

- [ ] **Step 1: Write failing portability tests**

Assert exports include non-secret provider connection requirements and model/identity/memory configuration, exclude secret IDs and values, and imports leave connections unresolved with an actionable requirement rather than binding another company’s credential.

```ts
expect(exported.providerConnections[0]).toMatchObject({ providerType: "letta", name: "Personal Letta" });
expect(JSON.stringify(exported)).not.toContain(secretId);
expect(imported.adapterConfig).not.toHaveProperty("providerConnectionId");
```

- [ ] **Step 2: Run the portability test and verify it fails**

Run: `pnpm vitest run server/src/__tests__/letta-portability.test.ts`

Expected: FAIL on missing provider-connection requirement handling.

- [ ] **Step 3: Implement portable connection requirements**

Export provider type, auth mode, endpoint metadata, and a stable requirement name. On import, match an existing same-company connection by explicit user mapping or stable name; otherwise omit `providerConnectionId`, preserve the requirement in import results, and keep the agent paused/unconfigured until selected. Never export secret IDs, versions, fingerprints, or values.

- [ ] **Step 4: Update operator documentation**

Document provider connections, live model refresh, the Electron/browser picker split, allowed browser roots, legacy-key migration, endpoint defaults, and the fact that shell/filesystem execution remains local regardless of model provider.

- [ ] **Step 5: Run the complete verification suite**

Run:

```bash
pnpm -r typecheck
pnpm test:run
pnpm build
git diff --check
git status --short
```

Expected: typecheck, tests, build, and whitespace checks pass. `pnpm-lock.yaml` is not staged. Pre-existing unrelated untracked files remain untouched.

- [ ] **Step 6: Smoke-test the running development instance**

Use the existing port `3101` development instance and its separate development database. Verify `/api/health`, create a temporary company connection, refresh models, open the path picker, save a Letta agent without a plaintext key, and confirm the packaged Electron instance on `3100` was not contacted.

- [ ] **Step 7: Mark the plan complete and commit final integration**

Check completed boxes in this file, then:

```bash
git add server/src/services/company-portability.ts packages/shared/src/types/company-portability.ts server/src/__tests__/letta-portability.test.ts doc/DEVELOPING.md doc/DATABASE.md doc/plans/2026-07-21-letta-configuration-experience-implementation.md
git commit -m "feat: complete portable Letta configuration experience" -m "Co-Authored-By: Doer <noreply@doer.donjon.agency>"
```

## Self-Review

- Spec coverage: company credentials, named defaults, live models, endpoint defaults, local/attached identity, local-agent creation, Overview identity, path browsing, local tools, memfs portability, migration, failure behavior, and security each map to a task.
- Placeholder scan: every implementation step identifies concrete behavior, files, commands, and expected results.
- Type consistency: `providerConnectionId`, `identityMode`, `ProviderConnection`, `DiscoveredProviderModel`, and `DiscoveredLettaAgent` retain the same names across DB, shared, server, adapter, and UI tasks.
