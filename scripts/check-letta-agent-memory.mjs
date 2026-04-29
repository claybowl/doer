#!/usr/bin/env node
/**
 * Diagnostic: cross-check a letta_cloud agent's memory blocks against
 * the set of blocks the agent's system prompt expects.
 *
 * Specifically tuned for the Doer Constitution rollout (2026-04-25):
 * verifies block presence, flags orphans, scans for stale references
 * to "paperclip" wording or to obsolete tools / patterns the new
 * constitution would treat as "older information to be ignored."
 *
 * Usage:
 *   node scripts/check-letta-agent-memory.mjs <doer-agent-id-or-name>
 *
 * Examples:
 *   node scripts/check-letta-agent-memory.mjs dondog
 *   node scripts/check-letta-agent-memory.mjs <uuid>
 */

const DOER = process.env.DOER_API_URL ?? "http://localhost:3100";
const COMPANY_ID =
  process.env.DOER_COMPANY_ID ?? "27b25893-0ff4-4d81-b45b-9631e04b769a";

// Blocks the REVISED Dondog system prompt expects (post-alignment 2026-04-25).
// Updated after dropping dd_menu / dd_gremlin_results, re-attaching
// paperclip_work_instructions, formally listing the previously-orphaned
// blocks, and moving system/persona to the writable list.
const EXPECTED_RW_BLOCKS = [
  "dd_journal",
  "dd_running_memory",
  "dispatch_state",
  "system/work/active",
  "system/goals/current",
  "system/human",
  "system/context/current",
  "system/context/projects",
  "system/context/execution-environment",
  "system/persona",
];
const EXPECTED_RO_BLOCKS = [
  // The work-instructions block is mid-rename: paperclip_work_instructions
  // is the legacy label still present on long-lived agents (Dondog).
  // doer_work_instructions is the new preferred label. The check accepts
  // EITHER as satisfying the requirement (see EITHER_OF_BLOCKS below).
  "system/context/donjon",
  "system/context/mission",
  "system/context/background",
  "system/context/resources",
  "system/context/knowledge",
  "system/context/letta-ecosystem",
  "system/skills/capabilities",
  "system/skills/tools",
  "system/preferences/boundaries",
  "system/preferences/communication",
  "system/preferences/formatting",
  "system/soul-extension",
  "dd_gremlin_manifest",
  "dd_notion_index",
  "dd_history",
];

// Block-name aliases — the agent satisfies the requirement if ANY name
// in the list is attached. Used for the work-instructions rename:
// paperclip_work_instructions (legacy) and doer_work_instructions (new)
// are both acceptable during the transition window.
const EITHER_OF_BLOCKS = [
  ["paperclip_work_instructions", "doer_work_instructions"],
];

// The "core block referenced at top of system prompt" check. Either
// label is fine during the rename transition.
const REFERENCED_CORE_BLOCK_ALIASES = [
  "paperclip_work_instructions",
  "doer_work_instructions",
];

// Blocks that USED to be expected but are now deprecated. If they still
// exist on the agent we'll flag them so Clay can clean them up.
const DEPRECATED_BLOCKS = [
  "dd_menu",
  "dd_gremlin_results",
  "dd_orchestration",
];

// Patterns that signal stale content under the new Constitution.
const STALE_REFS = [
  // Old tool names the new prompt explicitly retires
  { rx: /\bget_kitchen_queue\b/g, label: "retired tool: get_kitchen_queue" },
  { rx: /\bcreate_linear_task\b/g, label: "retired tool: create_linear_task" },
  { rx: /\bget_linear_backlog\b/g, label: "retired tool: get_linear_backlog" },
  // Note: write_kitchen_queue mentions are intentionally allowed in
  // system/human (it's documented as RETIRED there). We exclude that
  // file via per-block filter below.
  // Truncated tool name Dondog hallucinated
  { rx: /\bread_paperclip_issu\b(?!es)/g, label: "truncated tool name: read_paperclip_issu (typo)" },
  // Old ngrok escalation prescription that drove the loop. We're cool
  // with mentioning ngrok; we're NOT cool with "switch to bash" /
  // "expected, escalate" patterns that prescribe behavior.
  { rx: /\bswitch to Bash (built-in|fallback)\b/gi, label: "old 'switch to Bash' prescription (Letta agents have no Bash)" },
  { rx: /\bif ngrok is down.*\bescalate\b/gis, label: "old ngrok-down → escalate pattern (loop driver)" },
  { rx: /\bif ngrok is down.*\bswitch to bash\b/gis, label: "old ngrok-down → bash fallback (impossible advice)" },
  // Old block names that no longer exist
  { rx: /\bdd_menu\b/g, label: "deprecated block reference: dd_menu" },
  { rx: /\bdd_gremlin_results\b/g, label: "deprecated block reference: dd_gremlin_results" },
  { rx: /\bdd_orchestration\b/g, label: "deprecated block reference: dd_orchestration" },
];

// Per-block exemptions: skip these patterns inside named blocks.
// (Honor the documented-as-retired notes in system/human.)
const STALE_EXEMPTIONS = {
  "system/human": [/\bwrite_kitchen_queue\b/, /\bcreate_linear_task\b/],
};

// Soft-flag patterns: not necessarily stale, but worth Clay's eyes.
const SOFT_FLAGS = [
  // Lingering Paperclip prose where Doer would now be preferred
  { rx: /\bPaperclip\b/g, label: "Paperclip prose (consider 'Doer')" },
];

const target = process.argv[2];
if (!target) {
  console.error("Usage: node scripts/check-letta-agent-memory.mjs <agent-id-or-name>");
  process.exit(1);
}

function abort(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

console.log(`Looking up agent "${target}" in Doer…`);
const agentsRes = await fetch(`${DOER}/api/companies/${COMPANY_ID}/agents`);
if (!agentsRes.ok) abort(`Doer /agents returned ${agentsRes.status}`);
const agents = await agentsRes.json();

const agent =
  agents.find((a) => a.id === target) ||
  agents.find((a) => a.name?.toLowerCase() === target.toLowerCase()) ||
  agents.find((a) => a.urlKey?.toLowerCase() === target.toLowerCase());

if (!agent) abort(`Agent "${target}" not found`);
if (agent.adapterType !== "letta_cloud") {
  abort(`This tool is for letta_cloud agents; ${agent.name} is ${agent.adapterType}`);
}

const cfg = agent.adapterConfig ?? {};
if (!cfg.apiKey || !cfg.agentId) abort("apiKey/agentId missing from adapterConfig");

console.log(`✓ ${agent.name} (Letta agent ${cfg.agentId})\n`);

const headers = { Authorization: `Bearer ${cfg.apiKey}` };
const blocksRes = await fetch(
  `https://api.letta.com/v1/agents/${cfg.agentId}/core-memory/blocks`,
  { headers },
);
if (!blocksRes.ok) {
  abort(`Letta /core-memory/blocks returned ${blocksRes.status}: ${await blocksRes.text()}`);
}
const blocks = await blocksRes.json();
const blockList = Array.isArray(blocks) ? blocks : blocks?.data ?? [];

if (blockList.length === 0) {
  abort("Agent has zero memory blocks. Something is very wrong.");
}

const blocksByLabel = new Map();
for (const b of blockList) {
  if (typeof b.label === "string") {
    blocksByLabel.set(b.label, b);
  }
}

console.log(`${blockList.length} block(s) attached:\n`);

for (const b of blockList) {
  const label = b.label ?? "(no-label)";
  const ro = b.read_only ? "RO" : "rw";
  const len = (b.value ?? "").length;
  const limit = b.limit ?? "—";
  console.log(`  [${ro}] ${label.padEnd(34)} ${String(len).padStart(6)} chars (limit ${limit})`);
}

// ----- Presence checks --------------------------------------------------

console.log("\n— Expected blocks (per new system prompt) —");

let missingRW = 0;
let missingRO = 0;

console.log("\n  Read-write (Doer memory):");
for (const expected of EXPECTED_RW_BLOCKS) {
  const found = blocksByLabel.get(expected);
  if (!found) {
    console.log(`    ✗ MISSING: ${expected}`);
    missingRW += 1;
  } else if (found.read_only) {
    console.log(`    ⚠ ${expected} — exists but is marked read-only (prompt says it should be writable)`);
  } else {
    console.log(`    ✓ ${expected}`);
  }
}

console.log("\n  Read-only reference:");
for (const expected of EXPECTED_RO_BLOCKS) {
  const found = blocksByLabel.get(expected);
  if (!found) {
    console.log(`    ✗ MISSING: ${expected}`);
    missingRO += 1;
  } else if (!found.read_only) {
    console.log(`    ⚠ ${expected} — exists but is writable (prompt says it should be read-only)`);
  } else {
    console.log(`    ✓ ${expected}`);
  }
}

console.log("\n  Core memory block referenced at top of prompt:");
const coreBlockMatch = REFERENCED_CORE_BLOCK_ALIASES.map((label) => ({
  label,
  block: blocksByLabel.get(label),
})).find((entry) => entry.block);
if (!coreBlockMatch) {
  console.log(
    `    ✗ MISSING: none of [${REFERENCED_CORE_BLOCK_ALIASES.join(", ")}] is attached`,
  );
} else {
  const aliasNote =
    coreBlockMatch.label === "paperclip_work_instructions"
      ? " (legacy — consider migrating to doer_work_instructions)"
      : "";
  console.log(
    `    ✓ ${coreBlockMatch.label} (${(coreBlockMatch.block.value ?? "").length} chars)${aliasNote}`,
  );
}

// ----- "Either-of" block satisfaction (rename transition) ---------------
console.log("\n  Either-of block requirements (rename transition):");
let eitherOfMissing = 0;
for (const aliases of EITHER_OF_BLOCKS) {
  const present = aliases.filter((label) => blocksByLabel.has(label));
  if (present.length === 0) {
    console.log(`    ✗ MISSING: need one of [${aliases.join(", ")}]`);
    eitherOfMissing += 1;
  } else if (present.length === aliases.length) {
    console.log(
      `    ✓ both present (${present.join(", ")}) — safe to drop legacy after the rename window`,
    );
  } else {
    const isLegacy = present[0] === aliases[0];
    console.log(
      `    ✓ ${present.join(", ")}${isLegacy ? " (legacy — consider migrating)" : ""}`,
    );
  }
}

// ----- Orphan + deprecated block check ----------------------------------

const expectedSet = new Set([
  ...EXPECTED_RW_BLOCKS,
  ...EXPECTED_RO_BLOCKS,
  ...REFERENCED_CORE_BLOCK_ALIASES,
  ...EITHER_OF_BLOCKS.flat(),
]);
const deprecatedSet = new Set(DEPRECATED_BLOCKS);

const presentLabels = blockList
  .map((b) => b.label)
  .filter((l) => typeof l === "string");

const orphans = presentLabels.filter(
  (l) => !expectedSet.has(l) && !deprecatedSet.has(l),
);
const deprecatedPresent = presentLabels.filter((l) => deprecatedSet.has(l));

console.log("\n— Deprecated blocks (no longer referenced; should be removed) —");
if (deprecatedPresent.length === 0) {
  console.log("  ✓ Clean. No deprecated blocks present.");
} else {
  console.log(
    "  ⚠ These blocks were dropped from the new prompt but still exist on the agent.",
  );
  console.log("    Detach them in Letta (or delete) so they don't drift back into reasoning:");
  for (const label of deprecatedPresent) {
    const b = blocksByLabel.get(label);
    const len = (b?.value ?? "").length;
    console.log(`    - ${label} (${b?.read_only ? "RO" : "rw"}, ${len} chars)`);
  }
}

console.log("\n— Orphan blocks (present, not in expected or deprecated lists) —");
if (orphans.length === 0) {
  console.log("  ✓ None. Prompt and blocks are in sync.");
} else {
  console.log(
    "  ⚠ These blocks exist but the new prompt doesn't reference them. Either the",
  );
  console.log("    prompt should be updated to acknowledge them, or they should be cleaned up:");
  for (const label of orphans) {
    const b = blocksByLabel.get(label);
    const len = (b?.value ?? "").length;
    console.log(`    - ${label} (${b?.read_only ? "RO" : "rw"}, ${len} chars)`);
  }
}

// ----- Stale-content scan ----------------------------------------------

console.log("\n— Stale-content scan (Constitution-relevant patterns) —");

let staleHits = 0;
let softHits = 0;

for (const b of blockList) {
  const value = b.value ?? "";
  if (!value) continue;
  const label = b.label ?? "(no-label)";
  const exemptions = STALE_EXEMPTIONS[label] ?? [];

  for (const { rx, label: pat } of STALE_REFS) {
    // Honor per-block exemptions — skip patterns that block has cleared as expected
    if (exemptions.some((ex) => ex.source === rx.source)) continue;

    const matches = value.match(rx);
    if (matches && matches.length > 0) {
      staleHits += matches.length;
      console.log(
        `  ⚠ STALE: ${label} contains ${matches.length}× ${pat}`,
      );
      // Show first context window for the first match
      const idx = value.search(rx);
      const start = Math.max(0, idx - 40);
      const end = Math.min(value.length, idx + 80);
      console.log(`     "${value.slice(start, end).replace(/\s+/g, " ")}"`);
    }
  }

  for (const { rx, label: pat } of SOFT_FLAGS) {
    const matches = value.match(rx);
    if (matches && matches.length > 0) {
      softHits += matches.length;
      console.log(`  · SOFT: ${label} contains ${matches.length}× ${pat}`);
    }
  }
}

if (staleHits === 0 && softHits === 0) {
  console.log("  ✓ Clean. No stale Constitution-violating content found.");
}

// ----- Summary ----------------------------------------------------------

console.log("\n— Summary —");
console.log(`  Blocks present:        ${blockList.length}`);
console.log(`  Expected blocks:       ${expectedSet.size}`);
console.log(
  `  Missing required:      ${missingRW + missingRO + (coreBlockMatch ? 0 : 1) + eitherOfMissing}`,
);
console.log(`  Deprecated still present: ${deprecatedPresent.length}`);
console.log(`  Orphans:               ${orphans.length}`);
console.log(`  Stale references:      ${staleHits}`);
console.log(`  Soft flags (Paperclip prose, etc): ${softHits}`);

const isClean =
  missingRW + missingRO + eitherOfMissing === 0 &&
  !!coreBlockMatch &&
  deprecatedPresent.length === 0 &&
  staleHits === 0;

if (isClean) {
  console.log("\n✓ Memory blocks aligned with the new system prompt.");
  console.log(
    "  Soft flags (Paperclip prose) are cosmetic — they'll go away once the agent's system prompt is regenerated to use the doer_* names.",
  );
} else {
  console.log(
    "\n⚠ Issues found. Review above. Memory doctor + manual block edits may be needed.",
  );
}
