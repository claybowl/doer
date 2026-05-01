# Runbook: paperclip_* → doer_* tool rename

**Date authored:** 2026-04-26
**Closes task #46.** Coordinated rename of Letta-side tool names from
the legacy `paperclip_*` / `*_paperclip_*` prefix to `doer_*` / `*_doer_*`.

## Strategy

**Backwards-compatible parallel attach.** Both old and new tools coexist
during the transition window. Existing agent system prompts that reference
the old names KEEP WORKING; new prompts use the new names. After a
transition window of stable parallel operation (suggest 1-2 weeks), the
old `paperclip_*` tools can be safely detached + deleted.

**No automated system-prompt edits.** Each agent's persona is sensitive;
prompt regeneration is left to human judgment per agent.

## Migration steps

### Step 1 — Dry-run the migration

```sh
LETTA_API_KEY=sk-let-... node scripts/migrate-paperclip-tools-to-doer.mjs --dry-run
```

Expected output: list of paperclip_* tools found in your Letta registry,
the doer_* names they'll be cloned to, and the agents that will receive
the new attachments. **Verify nothing surprising before proceeding.**

### Step 2 — Run for real

```sh
LETTA_API_KEY=sk-let-... node scripts/migrate-paperclip-tools-to-doer.mjs
```

Idempotent — safe to re-run if it fails partway.

What this does:
- For each `paperclip_*` (or `*_paperclip_*`) tool in your Letta registry,
  creates a `doer_*` (or `*_doer_*`) clone with the same source code
- Attaches each new `doer_*` tool to every agent that has the old version
- Tags new tools with `migrated-from-paperclip` for audit
- Leaves old `paperclip_*` tools attached and unchanged (no breakage)

### Step 3 — Verify a known agent still works

Trigger any heartbeat (e.g., assign a small issue to Dondog). The agent
should still call the `paperclip_*` tools as before — the new `doer_*`
versions are present but unused until the system prompt is updated.

### Step 4 — Update memory check expectations

Already done in this commit: `scripts/check-letta-agent-memory.mjs` now
accepts EITHER `paperclip_work_instructions` OR `doer_work_instructions`
as satisfying the work-instructions requirement. Run:

```sh
node scripts/check-letta-agent-memory.mjs dondog
```

Expected: zero missing, zero deprecated, soft-flag count drops as agents
migrate.

### Step 5 — Migrate agents one at a time (manual)

For each agent you want to fully migrate:

1. **Rename the work-instructions block** (Letta UI or API):
   - Old label: `paperclip_work_instructions`
   - New label: `doer_work_instructions`
   - Content unchanged
2. **Update the agent's system prompt** to reference the new tool/block
   names. Search for `paperclip_` and replace with `doer_`. The
   agent persona text is yours to adjust.
3. **Re-run the memory check** to confirm clean state.

Recommend: start with a low-stakes worker (not Dondog). Only migrate
Dondog after at least one other agent has run cleanly with `doer_*`
names for 24+ hours.

### Step 6 — Cleanup (after transition window)

Once all agents are confirmed running on `doer_*` names:

```sh
# (No script yet — manual via Letta UI or a follow-up cleanup script)
# 1. Detach paperclip_* tools from all agents
# 2. Delete paperclip_* tools from the Letta registry
# 3. Delete paperclip_work_instructions blocks (after confirming
#    no agent still references them)
```

## Rollback

If the migration causes issues:

- Old `paperclip_*` tools are NOT removed by this script — they remain
  attached and functional. Agents continue working as before.
- New `doer_*` tools are tagged `migrated-from-paperclip`. Detach them
  from any affected agent if they cause confusion (unlikely — they're
  identical in behavior to their old siblings).
- The verification script accepts either name, so it won't false-flag
  the rollback state.

## What this doesn't touch

- `donjon-paperclip` directory name (project-level decision, separate)
- `paperclipApi` / `paperclipEnv` / `paperclipRuntimeServices` code
  identifiers (internal abstractions, not Letta-facing)
- The `[PAPERCLIP HEARTBEAT]` wake-message prefix — already handled by
  the wake-mode patch (#47), which now emits `[DOER HEARTBEAT — *MODE*]`
- `PAPERCLIP_*` environment variables (already migrated to `DOER_*` in
  the env builder; legacy uses are in test fixtures only)

## References

- Migration script: `scripts/migrate-paperclip-tools-to-doer.mjs`
- Verification script: `scripts/check-letta-agent-memory.mjs`
- Closes task #46.
