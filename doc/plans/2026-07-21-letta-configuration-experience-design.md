# Letta Configuration Experience Design

## Status

Approved in conversation on 2026-07-21. This design extends the unified `letta_code` adapter without changing its local-tool execution or memfs ownership model.

## Goals

- Make Letta credentials reusable across all agents in a company.
- Populate models from the selected provider instead of requiring model handles to be typed.
- Supply sensible Letta-server and provider endpoint defaults while preserving advanced overrides.
- Let users browse for every local filesystem path rather than typing it from memory.
- Reuse the canonical Letta agent ID and optionally create a new local Letta agent.
- Preserve local shell, filesystem, and portable memfs-backed memory on the Doer machine.

## User Experience

The Letta configuration screen uses the approved expanded, connection-first layout.

1. **Agent identity** offers `Create local Letta agent` and `Attach existing agent`. Existing runtime identity is selected automatically. Cloud attachment provides a searchable agent list, with manual ID entry under Advanced.
2. **Provider connection** selects a named company connection, indicates the default, and links to inline connection management.
3. **Model** is a searchable, provider-grouped dropdown with a visible refresh action.
4. **Execution** states clearly that tools execute locally on the Doer machine.
5. **Memory directory** and other path fields use a reusable Browse control.
6. **Advanced** contains Letta server URL, provider endpoint overrides, permissions, mods, and environment settings.

The canonical Letta ID is displayed read-only on Agent Overview with a copy action.

## Company Provider Connections

Introduce a company-scoped provider-connection record containing a display name, provider type, default marker, Letta server URL, provider endpoint metadata, and a reference to an existing encrypted company secret. Agents store only the connection ID. Multiple named connections per provider are allowed, with at most one default per company and provider.

Connection deletion is blocked while referenced and reports affected agents. Company export includes connection requirements and non-secret metadata, never credentials.

Existing plaintext Letta API keys are migrated into company secrets and removed from adapter configuration. Existing IDs, models, URLs, and paths remain unchanged.

## Discovery and Defaults

The server lists models through the selected Letta connection and normalizes results into the existing adapter model contract. Local providers such as Ollama may additionally query their configured local endpoint. Results are cached briefly; explicit refresh bypasses the cache. A failed refresh preserves the current value, presents an actionable warning, and permits manual recovery under Advanced.

Known endpoint defaults are selected from provider type. The Letta API defaults to `https://api.letta.com`. Custom endpoints remain supported and are never silently rewritten after saving.

## Identity Lifecycle

For `Create local Letta agent`, the adapter creates the agent during the first successful initialization, records the returned ID in runtime state, and persists that canonical ID to agent configuration. Retries must be idempotent and must not create duplicates. For attachment, the selected connection supplies known agents; an already-recorded runtime ID wins unless the user explicitly chooses a replacement.

## Path Picker

Create a reusable path-input component for adapter and application filesystem fields. Electron invokes a native open-directory dialog over a narrow preload IPC bridge. Browser development uses a server-backed filesystem navigator restricted to local operator access and allowed roots. The server validates path existence, type, and readability. The UI warns about macOS-protected Desktop and Documents locations and recommends `~/.doer/` or memfs mounts.

## Security and Failure Handling

- Resolve secret references only at runtime and redact resolved values from API responses and logs.
- Enforce company boundaries on connections, secrets, model discovery, and agent listing.
- Apply request timeouts and bounded caches to provider discovery.
- Keep saved configuration usable during provider outages.
- Never expose arbitrary server filesystem browsing to agent bearer-key contexts.

## Verification

Tests cover schema and migration behavior, company isolation, secret resolution and redaction, model normalization/cache/fallback, endpoint defaults, canonical-ID persistence, duplicate local-agent prevention, attach-existing discovery, path authorization and validation, and Electron IPC allowlisting. UI tests cover the expanded workflow, inline connection creation, refresh errors, Advanced recovery fields, and Overview identity display.
