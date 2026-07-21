# Letta Local-Canonical Portability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import a Cloud/Constellation agent into a new local Letta identity and export/import its complete MemFS Git history with the Doer company bundle.

**Architecture:** A dedicated Letta portability service isolates AgentFile transport and MemFS archive handling from the general company serializer. Company export embeds a versioned, checksummed per-agent archive; import validates and stages memory before activating the created Doer agent. Secrets and absolute paths never enter the bundle.

**Tech Stack:** TypeScript, Letta client/Agent SDK, Node filesystem and child-process Git, Vitest, existing company portability services.

---

### Task 1: Define a portable Letta artifact

**Files:**
- Create: `server/src/services/letta-portability.ts`
- Create: `server/src/__tests__/letta-portability.test.ts`
- Modify: `packages/shared/src/types/company-portability.ts`

- [ ] **Step 1: Write failing tests for a versioned manifest that rejects traversal, absolute paths, secrets, and checksum mismatches**

```ts
expect(validateLettaArtifact({ version: 1, memfsPath: "agents/alice/memfs.bundle", sha256: digest })).toMatchObject({ version: 1 });
expect(() => validateLettaArtifact({ version: 1, memfsPath: "../../secret", sha256: digest })).toThrow(/portable path/i);
```

- [ ] **Step 2: Verify validation tests fail because the service is absent**
- [ ] **Step 3: Implement manifest types, safe path normalization, SHA-256 helpers, and secret scrubbing**
- [ ] **Step 4: Run focused tests and server/shared typechecks**

### Task 2: Archive and restore complete MemFS history

**Files:**
- Modify: `server/src/services/letta-portability.ts`
- Modify: `server/src/__tests__/letta-portability.test.ts`

- [ ] **Step 1: Write a failing round-trip test that creates a temporary Git repo with two commits and expects both commits and `system/persona.md` after restore**
- [ ] **Step 2: Verify it fails before archive helpers exist**
- [ ] **Step 3: Implement `git bundle create --all` and staged restore using argument-array child processes, repository ownership checks, and no shell interpolation**
- [ ] **Step 4: Add failing rollback and corrupt-bundle tests, then implement cleanup of staging directories**
- [ ] **Step 5: Run focused round-trip tests**

### Task 3: Add explicit Cloud-to-local migration

**Files:**
- Modify: `server/src/services/letta-portability.ts`
- Create: `server/src/routes/letta-migration.ts`
- Create: `server/src/__tests__/letta-migration.test.ts`
- Modify: `server/src/routes/companies.ts`

- [ ] **Step 1: Write failing service tests for Cloud AgentFile export, local import returning a different Letta ID, provenance metadata, and source-agent non-mutation**
- [ ] **Step 2: Verify the migration service is missing**
- [ ] **Step 3: Implement dependency-injected Cloud export and local import orchestration; stage MemFS and run a smoke session before returning canonical configuration**
- [ ] **Step 4: Add company-scoped preview/execute routes with board authorization and activity logging**
- [ ] **Step 5: Run focused service and route tests**

### Task 4: Embed memory artifacts in company export/import

**Files:**
- Modify: `server/src/services/company-portability.ts`
- Modify: `server/src/__tests__/company-portability.test.ts`
- Modify: `cli/src/__tests__/company-import-export-e2e.test.ts`

- [ ] **Step 1: Write a failing export test expecting `agents/<slug>/letta/agent.af`, `memfs.bundle`, and `manifest.json`, with `workspace.includeSnapshot === true`**
- [ ] **Step 2: Verify current export fails because it sets `includeSnapshot: false`**
- [ ] **Step 3: Add Letta artifacts through the dedicated service and include warnings when an agent has no initialized local MemFS**
- [ ] **Step 4: Write a failing import test requiring staged validation, fresh Letta/Doer IDs, restored history, remapped paths, and no imported secrets**
- [ ] **Step 5: Implement restore after agent creation but before activation; roll back Letta state and staging data on failure**
- [ ] **Step 6: Run company portability and CLI E2E tests**

### Task 5: Deprecate duplicate adapters without rewriting stored agents

**Files:**
- Modify: `server/src/adapters/registry.ts`
- Modify: `ui/src/adapters/registry.ts`
- Modify: adapter metadata for `letta_cli`, `letta_cloud`, and `letta_af_opencode`
- Create: `server/src/__tests__/letta-adapter-migration.test.ts`

- [ ] **Step 1: Write failing tests that existing legacy types still resolve while new creation recommends `letta_code` and returns an explicit migration preview**
- [ ] **Step 2: Verify current registries expose all adapters as equivalent creation choices**
- [ ] **Step 3: Mark legacy adapters deprecated, retain runtime resolution, and add guided conversion that never mutates an agent without confirmation**
- [ ] **Step 4: Run registry, migration, UI, and server tests**

### Task 6: Full acceptance and documentation

**Files:**
- Modify: `doc/DEVELOPING.md`
- Modify: `doc/DATABASE.md`
- Modify: `doc/SPEC-implementation.md` if adapter portability is part of the V1 contract

- [ ] **Step 1: Add the clean-instance acceptance test: export, import, new IDs, same persona, same skills, same Git history, successful resumed work**
- [ ] **Step 2: Run focused acceptance tests**
- [ ] **Step 3: Run `pnpm -r typecheck`, `pnpm test:run`, and `pnpm build`**
- [ ] **Step 4: Confirm `pnpm-lock.yaml` is not included and unrelated untracked files remain untouched**
- [ ] **Step 5: Commit the portability and compatibility slice**
