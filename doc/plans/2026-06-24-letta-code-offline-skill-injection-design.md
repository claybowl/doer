# letta-code Offline Skill Injection — Design

_Date: 2026-06-24 · Status: Approved (design) · Owner: Clay · Author: #1_

## Problem

The `letta_code` adapter does not deliver skills to its agents. CLI adapters
(claude/codex/cursor/gemini/pi) deliver skills by placing skill directories on a
filesystem the agent can discover and read on demand. A `letta_code` **offline**
agent has no agent-side filesystem and no tool loop: it runs in-process as a
single system-prompt + user-message → one streamed response, so it can neither
discover skills nor read a skill body mid-turn. Its checked skills (`desiredSkills`,
already persisted to `adapterConfig.paperclipSkillSync`) are silently ignored.

Two consequences:

1. Offline agents never use their skills.
2. The memfs auto-attach maps `fs-mount → agents-md-memory`. That skill instructs
   the agent to read `./memory/AGENTS.md` and write files in place — operations an
   offline agent **cannot perform**. Once we start injecting skill content, the
   offline agent would receive a memory protocol it physically can't execute.

## Scope

**This spec covers `letta_code` offline mode only.** The server-side path
(`letta_code` online + `letta_cloud`, where a remote Letta server owns the prompt
and Doer only sends a user message) is a deliberate **phase 2**, with its own spec.

Non-goals here: changing `letta_code` online, changing `letta_cloud`, changing how
CLI adapters deliver skills, or implementing the `system-prompt-inject` memfs
strategy generically.

## Decisions (locked)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Target | Offline first; server-side is phase 2 |
| 2 | Injection model | Manifest + `read_skill` tool-call loop (progressive disclosure) |
| 3 | Fallback on tool-incapable backends | Degrade to full-body injection, size-guarded |
| 4 | Memory-skill collision | New offline-specific memory skill (`letta-code-memory`); adapter-aware strategy→skill mapping |
| 5 | New skill name | `letta-code-memory` |
| 6 | Inject-mode char budget | ~12,000 chars, required/priority skills first, visible truncation warning |

## Architecture

Offline mode today (`packages/adapters/letta-code/src/server/execute.ts`,
`executeOffline`): build system prompt via `buildOfflineSystemPrompt` (persona +
memory blocks + `<memory_update>` protocol) → single LLM call (Anthropic SDK or
OpenAI-compat fetch) → parse `<memory_update>` tags → persist.

This design adds skill awareness, with delivery chosen by backend capability:

```
                    ┌─ tool-capable backend ──→ MANIFEST + read_skill loop
desiredSkills ──────┤
                    └─ tool-incapable backend ─→ FULL-BODY injection (≤ ~12k chars)
```

## Components

### 1. Capability resolution

- Extend `OPENAI_COMPAT_PRESETS` (in `execute.ts`) with `supportsTools: boolean`.
  Defaults: `openai` true, `groq` true, `nvidia` true, `opencode_zen` false
  (conservative), `ollama_cloud` false, `ollama` (local) false. Anthropic
  (`resolveProvider` `kind: "anthropic"`) is always true.
- Optional per-agent override: `adapterConfig.skillToolCalls?: boolean`.
- New pure function `resolveSkillDelivery(resolved, config) → "loop" | "inject"`.
  Override wins; else provider default; offline with no desired skills → neither
  (no skill section emitted).

### 2. Desired-skill loading

letta-code must consume the skill plumbing it currently ignores:

- `resolvePaperclipDesiredSkillNames(config, entries)` (from
  `@doerai/adapter-utils/server-utils`) → the checked skill keys.
- `readPaperclipRuntimeSkillEntries(config, __moduleDir)` → available entries
  (key, runtimeName, source).
- `readPaperclipSkillMarkdown(moduleDir, key)` → a skill's full SKILL.md body.
- Frontmatter parse (`name`, `description`) for the manifest. **Reuse an existing
  parser in adapter-utils if one exists; otherwise a ~10-line local YAML-frontmatter
  reader** (only `name` + `description` are needed).

### 3. System-prompt assembly

Extend `buildOfflineSystemPrompt`:

- **loop mode**: append an `## Available Skills` section listing
  `- {name} — {description}` per desired skill, plus one directive:
  *"Call the `read_skill` tool to load a skill's full instructions before acting in
  its domain."*
- **inject mode**: append a `## Skills` section with full SKILL.md bodies.
  Enforce a **~12,000-char budget**: order by `required` first, then config order;
  stop when the budget would be exceeded and emit a visible `onLog` warning naming
  the skills that were dropped. Never silently truncate mid-skill — drop whole
  skills.

### 4. Agentic tool-call loop (the substantive change)

Wrap the LLM call in a bounded loop (**max 8 tool iterations**):

- **Anthropic path**: pass `tools: [read_skill]`. On `tool_use` content blocks, run
  the handler, append `tool_result`, continue until `stop_reason` is `end_turn` (or
  max iterations). Preserve existing text-delta streaming to the UI.
- **OpenAI-compat path**: pass function-schema `tools`. On `tool_calls` in the
  stream, append a `tool`-role message with the result, continue. Preserve text
  streaming.
- `read_skill({ name })` handler: reads the SKILL.md body in-process via
  `readPaperclipSkillMarkdown` (we are in the Doer process — direct fs read, no
  sandbox). Returns body, or a "skill not found / not available to this agent"
  message if the name isn't in the desired set.
- Emit `tool_call_message` and `tool_return_message` events for each `read_skill`
  call so the existing UI transcript (parsed by `parseLettaCloudStdoutLine`) shows
  skill reads.
- Accumulate assistant text across **all** turns; parse `<memory_update>` once at
  the end. The memory mechanism is otherwise unchanged.

### 5. Offline-specific memory skill + adapter-aware mapping

- New bundled skill `skills/letta-code-memory/SKILL.md` teaching the
  `<memory_update label="…">` block protocol (read injected blocks; persist by
  emitting update tags; never attempt file I/O). Mirrors the honesty/format rules of
  `agents-md-memory` but for the block model.
- Make memory-protocol-skill resolution **adapter-aware**. In
  `resolveMemoryProtocolSkills` (`server/src/routes/agents.ts`), select the skill by
  `(adapterType, strategy)`: `letta_code` + `fs-mount` → `letta-code-memory`; all
  other adapters keep the global `MEMFS_STRATEGY_SKILL[strategy]` (so `fs-mount`
  stays `agents-md-memory` for the CLI adapters). Implement as an override map
  `MEMFS_STRATEGY_SKILL_BY_ADAPTER[adapterType][strategy]` falling back to the global
  map. Ensure the new skill is ensured into every company library like other bundled
  Doer skills.

## Data flow

```
agent run (offline)
  → resolveOfflineMemoryDir + loadMemoryBlocks            (unchanged)
  → resolveProvider                                       (unchanged)
  → resolvePaperclipDesiredSkillNames + entries           (NEW)
  → resolveSkillDelivery(resolved, config)                (NEW)  ── "loop" | "inject"
  → buildOfflineSystemPrompt(persona, blocks, skills, mode) (EXTENDED)
  → LLM call:
        loop mode  → tool loop with read_skill            (NEW)
        inject mode→ single call (bodies already in prompt)(≈ current shape)
  → accumulate assistant text → parse <memory_update>     (unchanged)
  → persist blocks                                        (unchanged)
```

## Testing (vitest, following `resolve-provider.test.ts`)

- `resolveSkillDelivery`: provider defaults, override precedence, no-skills case.
- frontmatter parse: name/description extraction, missing fields, malformed.
- manifest builder: ordering, formatting.
- inject-mode budget: ordering (required first), whole-skill drop, truncation warning.
- loop: terminates on `end_turn`, respects max-iteration guard, `read_skill` handler
  returns body / not-found, memory_update parsed from multi-turn accumulation.
- adapter-aware memory-skill mapping: `letta_code`+`fs-mount` → `letta-code-memory`;
  `claude_local`+`fs-mount` → `agents-md-memory`.
- Loop integration: mock both Anthropic and OpenAI-compat shapes.

## Risks

- **OpenAI-compat tool streaming is fiddly**; some "compatible" providers diverge
  from the spec. The degrade path is the safety net, but capability detection is a
  provider-level heuristic plus override — wrong defaults are correctable per agent.
- **Inject-fallback token cost** on small-context local models — bounded by the
  ~12k budget; truncation is logged, not silent.
- **Loop runaway / cost** — bounded by max-iterations and the existing budget
  hard-stop invariant.
- **memory_update emitted mid-loop** — handled by accumulating all assistant turns
  before parsing.

## Build order (feeds writing-plans)

1. New `letta-code-memory` skill (content only) + adapter-aware
   `MEMFS_STRATEGY_SKILL_BY_ADAPTER` mapping in shared/constants + `agents.ts`.
   Verify: `letta_code`+`fs-mount` resolves the new skill; CLI adapters unchanged.
2. Capability resolution (`supportsTools` on presets, `resolveSkillDelivery`,
   optional `skillToolCalls`). Verify: unit tests.
3. Desired-skill loading + frontmatter parse in letta-code. Verify: unit tests.
4. `buildOfflineSystemPrompt` extension (manifest + inject modes, budget guard).
   Verify: unit tests including truncation warning.
5. Agentic loop for both provider paths + `read_skill` handler + transcript events.
   Verify: loop unit/integration tests, max-iteration guard.
6. End-to-end smoke: an offline agent with a checked skill reads it via `read_skill`
   (capable backend) and via injected body (incapable backend).

Steps 1–4 are small and low-risk. Step 5 is the substantive change.
