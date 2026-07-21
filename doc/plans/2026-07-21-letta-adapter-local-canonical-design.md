# Unified Letta Adapter: Local-Canonical Design

**Status:** Approved for implementation  
**Date:** 2026-07-21

## Objective

Replace Doer's overlapping Letta execution paths with one `letta_code` adapter built on `@letta-ai/letta-agent-sdk`. It must run shell and filesystem tools on the Doer machine, support Letta Cloud/Constellation and local model providers, preserve Letta Code mods, and export an agent with its complete durable memory.

## Decisions

1. **Local execution is invariant.** Shell, filesystem, skills, and client tools execute on the Doer host. Model location does not alter tool permissions or execution location.
2. **Local agents are canonical.** A Cloud/Constellation agent may be imported into Doer and receive a new local Letta ID. After import, the local agent is the source of truth.
3. **Doer owns persistence.** The local Letta backend and each agent's MemFS live inside the active Doer instance, keeping development, desktop, and worktree databases isolated.
4. **Letta's MemFS format is preserved.** Doer mounts the actual git-backed Letta memory repository; it does not maintain a second translated memory store.
5. **Agent SDK is the runtime API.** The Letta Code CLI remains a companion for provider authentication, model setup, mods, diagnostics, and an emergency compatibility path—not the normal execution transport.

## Adapter Shape

Keep the persisted adapter type `letta_code` to avoid breaking existing agents. Its configuration is organized around capabilities rather than unrelated adapters:

- **Identity:** local Letta agent ID; optional source Cloud agent ID retained as migration provenance.
- **Backend:** `local` by default; `cloud_attached` only for explicit compatibility or migration workflows.
- **Model:** selected from the SDK's model inventory. Provider credentials and subscription login remain owned by Letta. This includes ChatGPT subscription, Ollama, Ollama Cloud, and other Letta-supported providers.
- **Runtime:** local working directory, permission mode, allowed/disallowed tools, reasoning effort, and skill sources.
- **Extensions:** mods enabled/disabled plus an installed-mod inventory. Agent-owned skills remain under MemFS; machine-wide mods are recorded as dependencies but are not silently bundled as agent data.

Model provider and tool authority are independent. Selecting Ollama Cloud, for example, must never silently replace shell/filesystem access with a restricted profile. Doer exposes explicit permission modes and applies company policy on top of the SDK's approval callbacks.

## Execution Lifecycle

At heartbeat start, Doer resolves the instance-scoped Letta backend directory, ensures the local Letta agent exists, and binds its MemFS repository into the agent workspace as `memory/`. It then creates or resumes an Agent SDK session using the stored conversation ID, local `cwd`, model, tools, permission mode, and skills.

SDK stream events map onto Doer's existing adapter events: reasoning, assistant text, tool calls/results, approvals, usage, and final result. Cancellation calls the SDK abort path. Session and conversation identifiers are persisted after initialization and after successful turns.

After a run, Letta's own MemFS commits remain authoritative. Doer verifies repository cleanliness, records the resulting commit SHA, and reports failures without inventing a parallel commit history.

## Storage and MemFS

Each Doer instance receives a dedicated Letta runtime root, conceptually:

```text
<doer-instance>/letta/
  backend/                 # local Letta state
  agents/<doer-agent-id>/
    memory/                # actual Letta MemFS git repository
```

The exact internal backend paths may follow the SDK's supported layout, but Doer stores and addresses them through stable agent-scoped locators. The existing MemFS binding service remains the mounting and authorization layer. Its default binding points to the actual Letta memory repository instead of a duplicate directory.

The native MemFS hierarchy travels unchanged: `system/` files are always in context, while `reference/`, `skills/`, and other files remain discoverable. Shared company memory stays a separate binding so personal agent memory can be exported independently.

## Cloud-to-Local Migration

Migration is explicit and non-destructive:

1. Connect to Letta Cloud with an API key and select the source agent ID.
2. Export the source as AgentFile and fetch its available MemFS/filesystem state.
3. Import into the local Letta backend, producing a new local Letta agent ID.
4. Materialize and validate the local MemFS repository.
5. Update the Doer agent to the local ID while retaining Cloud ID, import timestamp, and source metadata.
6. Run a smoke turn before declaring the local copy canonical.

The Cloud agent is not deleted or modified. Direct Cloud-attached execution remains available for compatibility, but the UI identifies that its memory is Cloud-owned and recommends migration.

## Portable Agent Bundle

Doer's export is the complete portability boundary. An exported agent includes:

- Doer agent definition, role, instructions, adapter configuration, and policy
- AgentFile `.af` for Letta interoperability
- a portable Git bundle or full snapshot of the agent's MemFS, including commit history
- current conversation/session metadata where exportable
- agent-owned skills and memory files
- a manifest of required mods and provider/model handles
- checksums and a format version

Secrets, API keys, subscription tokens, absolute machine paths, and installed machine-wide mod source are excluded. Import creates fresh Doer and local Letta IDs, restores MemFS history, remaps paths, requests missing credentials, and permits model override when the original model is unavailable.

This changes company portability from `includeSnapshot: false` to exporting agent-memory snapshots explicitly. Import must be transactional: validate before activation and leave no half-created canonical agent on failure.

## Consolidation and Compatibility

The existing custom offline inference loop is removed after behavior parity is demonstrated. `letta_cli`, `letta_cloud`, and `letta_af_opencode` become migration aliases or deprecated adapters, with guided conversion into `letta_code`. No stored agent is rewritten without an explicit migration.

The pending `cloud_safe`/`cloud_worker` work is replaced by provider-independent runtime permissions. Security policy remains, but it is named for authority—not for Ollama or cloud model usage.

## Verification

Tests cover local SDK execution, ChatGPT-subscription model discovery through Letta configuration, Ollama/local-provider selection, shell and filesystem access, permission approvals, cancellation, session resumption, mods inventory, Cloud-to-local import, MemFS commit persistence, dev/desktop instance isolation, full export/import round trips, secret scrubbing, and failure rollback.

An acceptance test exports a working agent, imports it into a clean Doer instance, assigns a different local Letta ID, and verifies that identity, memory files, Git history, skills, and a resumed task survive intact.
