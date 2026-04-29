#!/usr/bin/env node
/**
 * Migrate paperclip_* Letta tools → doer_* equivalents.
 *
 * Strategy: BACKWARDS-COMPATIBLE. We clone each paperclip_* tool to a
 * doer_* version with the same source code, then attach the doer_*
 * version to every agent that has the paperclip_* attached. The old
 * paperclip_* tools stay attached during the transition window so
 * existing agents (Dondog) keep working with no downtime.
 *
 * What this script DOES NOT do:
 *   - Detach or delete paperclip_* tools (do that manually after a
 *     transition window has shown both names are exercised cleanly)
 *   - Rename memory blocks (paperclip_work_instructions stays as-is;
 *     individual agent system prompts still reference it. Renaming
 *     blocks requires per-agent system-prompt regeneration which is
 *     out of scope for an automated rename.)
 *   - Modify any agent's system prompt
 *
 * Usage:
 *   LETTA_API_KEY=sk-let-... node scripts/migrate-paperclip-tools-to-doer.mjs
 *   LETTA_API_KEY=sk-let-... node scripts/migrate-paperclip-tools-to-doer.mjs --dry-run
 *
 * Idempotent: re-running is safe. Already-cloned tools are skipped.
 *
 * After the migration window (e.g. 1-2 weeks of stable parallel
 * operation), a separate cleanup script can detach + delete the old
 * paperclip_* tools.
 */

const LETTA = "https://api.letta.com/v1";
const apiKey = process.env.LETTA_API_KEY;
const DRY_RUN = process.argv.includes("--dry-run");
const DOER = process.env.DOER_API_URL ?? "http://localhost:3100";
const COMPANY_ID =
  process.env.DOER_COMPANY_ID ?? "27b25893-0ff4-4d81-b45b-9631e04b769a";

if (!apiKey) {
  console.error(
    "\n✗ LETTA_API_KEY env var is required. Get it from https://app.letta.com/settings\n",
  );
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${apiKey}`,
  "Content-Type": "application/json",
};

function abort(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

async function jfetch(url, init = {}) {
  const res = await fetch(url, { ...init, headers: { ...headers, ...(init.headers ?? {}) } });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { ok: res.ok, status: res.status, body };
}

console.log(
  `\n=== paperclip_* → doer_* tool migration ===${DRY_RUN ? " (DRY RUN)" : ""}\n`,
);

// ── 1. Find all letta_cloud agents in Doer (we need their apiKeys + agent IDs)
console.log("1. Pulling letta_cloud agents from Doer…");
const agentsRes = await fetch(`${DOER}/api/companies/${COMPANY_ID}/agents`);
if (!agentsRes.ok) abort(`Doer /agents returned ${agentsRes.status}`);
const allAgents = await agentsRes.json();
const lettaAgents = allAgents.filter((a) => a.adapterType === "letta_cloud");
if (lettaAgents.length === 0) {
  console.log("   No letta_cloud agents found. Nothing to migrate.\n");
  process.exit(0);
}
console.log(`   Found ${lettaAgents.length} letta_cloud agent(s).\n`);

// ── 2. List all tools in the Letta registry, filter to paperclip_*
console.log("2. Discovering paperclip_* tools in Letta registry…");
const allToolsRes = await jfetch(`${LETTA}/tools/?limit=300`);
if (!allToolsRes.ok) abort(`Letta /tools list returned ${allToolsRes.status}`);
const allTools = Array.isArray(allToolsRes.body)
  ? allToolsRes.body
  : allToolsRes.body?.data ?? [];
const paperclipTools = allTools.filter(
  (t) => typeof t.name === "string" && t.name.startsWith("paperclip_"),
);
const allOldNames = paperclipTools.map((t) => t.name);
console.log(`   Found ${paperclipTools.length} paperclip_* tool(s):`);
for (const t of paperclipTools) {
  const newName = t.name.replace(/^paperclip_/, "doer_");
  console.log(`     - ${t.name} → ${newName}`);
}
if (paperclipTools.length === 0) {
  console.log(
    "   Nothing to clone. Did the migration already run, or are tool names different?\n",
  );
  process.exit(0);
}
console.log();

// Also check for the paperclip-prefixed tools that don't have the underscore
// after — i.e. "read_paperclip_issues", "update_paperclip_issue" — those
// embed paperclip in the middle. Detect both patterns.
const alsoPaperclipNamedTools = allTools.filter(
  (t) =>
    typeof t.name === "string" &&
    !t.name.startsWith("paperclip_") &&
    /paperclip/i.test(t.name),
);
if (alsoPaperclipNamedTools.length > 0) {
  console.log(
    `   ALSO found ${alsoPaperclipNamedTools.length} tool(s) with 'paperclip' in the name (not at prefix):`,
  );
  for (const t of alsoPaperclipNamedTools) {
    const newName = t.name.replace(/paperclip/gi, "doer");
    console.log(`     - ${t.name} → ${newName}`);
  }
  console.log();
}

// Combine both sets for the migration loop
const allToolsToMigrate = [...paperclipTools, ...alsoPaperclipNamedTools];

// Helper: derive new name (handles both prefix and embedded forms)
function newNameFor(oldName) {
  if (oldName.startsWith("paperclip_")) {
    return oldName.replace(/^paperclip_/, "doer_");
  }
  return oldName.replace(/paperclip/gi, "doer");
}

// ── 3. For each old tool, ensure a doer_* clone exists in the registry
console.log("3. Creating doer_* clones (where missing)…");
const cloneIdsByOldName = new Map(); // oldName → newToolId
let toolsCreated = 0;
let toolsAlreadyExist = 0;
let toolsErrored = 0;

for (const oldTool of allToolsToMigrate) {
  const newName = newNameFor(oldTool.name);
  const existingClone = allTools.find((t) => t.name === newName);
  if (existingClone) {
    cloneIdsByOldName.set(oldTool.name, existingClone.id);
    console.log(`   · ${oldTool.name} → ${newName} (clone already exists, id=${existingClone.id})`);
    toolsAlreadyExist += 1;
    continue;
  }
  // Need to fetch full tool details to get source_code + schema
  const toolDetailRes = await jfetch(`${LETTA}/tools/${oldTool.id}`);
  if (!toolDetailRes.ok) {
    console.warn(
      `   ! Could not fetch ${oldTool.name} details (${toolDetailRes.status}); skipping`,
    );
    toolsErrored += 1;
    continue;
  }
  const detail = toolDetailRes.body;
  const newDescription = (detail.description ?? "").replace(/paperclip/gi, "Doer");
  const newSourceCode = (detail.source_code ?? "").replace(
    new RegExp(oldTool.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
    newName,
  );
  if (DRY_RUN) {
    console.log(
      `   [dry-run] would create ${newName} (clone of ${oldTool.name}, src ${newSourceCode.length} bytes)`,
    );
    toolsCreated += 1;
    continue;
  }
  const createRes = await jfetch(`${LETTA}/tools/`, {
    method: "POST",
    body: JSON.stringify({
      source_code: newSourceCode,
      source_type: detail.source_type ?? "python",
      description: newDescription,
      args_json_schema: detail.args_json_schema,
      tags: ["doer", "migrated-from-paperclip", ...(detail.tags ?? [])],
      return_char_limit: detail.return_char_limit,
    }),
  });
  if (!createRes.ok) {
    console.warn(
      `   ! Failed to create ${newName} (${createRes.status}): ${JSON.stringify(createRes.body)}`,
    );
    toolsErrored += 1;
    continue;
  }
  cloneIdsByOldName.set(oldTool.name, createRes.body.id);
  console.log(`   ✓ Created ${newName} (id=${createRes.body.id})`);
  toolsCreated += 1;
}
console.log();

// ── 4. For each agent that has paperclip_* attached, attach the doer_* clone
console.log("4. Attaching doer_* tools to agents that have paperclip_* attached…");
let attachmentsMade = 0;
let attachmentsAlreadyExist = 0;
let attachmentsErrored = 0;
let agentsTouched = 0;

for (const agent of lettaAgents) {
  const cfg = agent.adapterConfig ?? {};
  if (!cfg.agentId || !cfg.apiKey) {
    console.warn(`   ! ${agent.name} missing apiKey/agentId — skipping`);
    continue;
  }
  const agentHeaders = { Authorization: `Bearer ${cfg.apiKey}` };
  const agentToolsRes = await fetch(`${LETTA}/agents/${cfg.agentId}/tools`, {
    headers: agentHeaders,
  });
  if (!agentToolsRes.ok) {
    console.warn(
      `   ! ${agent.name}: /agents/:id/tools returned ${agentToolsRes.status}; skipping`,
    );
    continue;
  }
  const agentToolsBody = await agentToolsRes.json();
  const agentTools = Array.isArray(agentToolsBody)
    ? agentToolsBody
    : agentToolsBody?.data ?? [];
  const attachedNames = new Set(agentTools.map((t) => t.name));

  let touched = false;
  for (const oldName of allOldNames.concat(alsoPaperclipNamedTools.map((t) => t.name))) {
    if (!attachedNames.has(oldName)) continue;
    const newName = newNameFor(oldName);
    if (attachedNames.has(newName)) {
      attachmentsAlreadyExist += 1;
      continue;
    }
    const newToolId = cloneIdsByOldName.get(oldName);
    if (!newToolId) {
      // Clone failed earlier; can't attach
      continue;
    }
    if (DRY_RUN) {
      console.log(`   [dry-run] would attach ${newName} to ${agent.name}`);
      touched = true;
      attachmentsMade += 1;
      continue;
    }
    const attachRes = await fetch(
      `${LETTA}/agents/${cfg.agentId}/tools/attach/${newToolId}`,
      { method: "PATCH", headers: agentHeaders },
    );
    if (!attachRes.ok) {
      console.warn(
        `   ! ${agent.name}: failed to attach ${newName} (${attachRes.status})`,
      );
      attachmentsErrored += 1;
      continue;
    }
    console.log(`   ✓ ${agent.name}: attached ${newName} (alongside ${oldName})`);
    attachmentsMade += 1;
    touched = true;
  }
  if (touched) agentsTouched += 1;
}
console.log();

// ── Summary
console.log("=== Summary ===");
console.log(`  Tools cloned (new doer_* created):  ${toolsCreated}`);
console.log(`  Tools already cloned (skipped):     ${toolsAlreadyExist}`);
console.log(`  Tools errored:                      ${toolsErrored}`);
console.log(`  Agents touched:                     ${agentsTouched}`);
console.log(`  Attachments made:                   ${attachmentsMade}`);
console.log(`  Attachments already existed:        ${attachmentsAlreadyExist}`);
console.log(`  Attachments errored:                ${attachmentsErrored}`);
console.log(`
Both old (paperclip_*) and new (doer_*) tools are now attached to migrated
agents. Existing agent system prompts referencing the old names KEEP
WORKING. Update prompts at your own pace to prefer the doer_* names.

After a transition window of stable parallel operation (suggest 1-2
weeks), you can detach + delete the old paperclip_* tools manually
or via a follow-up cleanup script.
${DRY_RUN ? "\nThis was a DRY RUN. Re-run without --dry-run to apply.\n" : ""}`);
