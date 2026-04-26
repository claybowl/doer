#!/usr/bin/env node
/**
 * Diagnostic: list every tool attached to a given letta_cloud agent.
 * Useful for hunting bad/truncated tool names, name collisions, or
 * stale attachments.
 *
 * Usage:
 *   node scripts/list-letta-agent-tools.mjs <doer-agent-id-or-name>
 *
 * Prints each tool's name, id, source (custom vs letta_core), tags,
 * and the first 80 chars of its description. Highlights any name
 * that looks suspicious (truncated, very short, or has trailing
 * whitespace).
 */

const DOER = process.env.DOER_API_URL ?? "http://localhost:3100";
const COMPANY_ID =
  process.env.DOER_COMPANY_ID ?? "27b25893-0ff4-4d81-b45b-9631e04b769a";

const target = process.argv[2];
if (!target) {
  console.error("Usage: node scripts/list-letta-agent-tools.mjs <agent-id-or-name>");
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
const toolsRes = await fetch(`https://api.letta.com/v1/agents/${cfg.agentId}/tools`, {
  headers,
});
if (!toolsRes.ok) abort(`Letta /agents/:id/tools returned ${toolsRes.status}`);
const tools = await toolsRes.json();
const list = Array.isArray(tools) ? tools : tools?.data ?? [];

console.log(`${list.length} tool(s) attached:\n`);

function sus(name) {
  if (typeof name !== "string") return "✗ not a string";
  if (name !== name.trim()) return "⚠ trailing/leading whitespace";
  if (name.length < 4) return "⚠ very short name";
  // Doer uses snake_case; warn on truncation patterns
  if (/_$/.test(name)) return "⚠ trailing underscore";
  if (/\bissu$|\bdeliv$|\bcrea$/.test(name)) return "⚠ looks truncated";
  return null;
}

for (const t of list) {
  const flag = sus(t.name);
  const flagStr = flag ? `  ${flag}` : "";
  console.log(
    `  ${t.name?.padEnd(34)} ${(t.tool_type || "—").padEnd(20)} id=${t.id}${flagStr}`,
  );
  if (t.description) {
    const desc = t.description.replace(/\s+/g, " ").slice(0, 80);
    console.log(`      ${desc}${t.description.length > 80 ? "…" : ""}`);
  }
  if (t.tags?.length) {
    console.log(`      tags: ${t.tags.join(", ")}`);
  }
}

// Specifically hunt for the suspicious one
const target_truncated = "read_paperclip_issu";
const exactMatch = list.find((t) => t.name === target_truncated);
const startsWith = list.filter(
  (t) => typeof t.name === "string" && t.name.startsWith(target_truncated),
);

console.log("\n— Diagnosis for read_paperclip_issu —");
if (exactMatch) {
  console.log(`✗ FOUND a tool literally named "read_paperclip_issu" (truncated).`);
  console.log(`  This is a real broken tool. id=${exactMatch.id}`);
  console.log(`  Fix: detach it from this agent (and probably delete it from Letta).`);
} else if (startsWith.length > 1) {
  console.log(`⚠ Multiple tools start with "read_paperclip_issu":`);
  for (const t of startsWith) console.log(`    - ${t.name}`);
  console.log(`  Possible name collision causing the model to guess wrong.`);
} else if (startsWith.length === 1) {
  console.log(
    `✓ Only one matching tool: "${startsWith[0].name}". Model truncated the name when calling.`,
  );
  console.log(`  Diagnosis: model token-prediction error, not a broken tool.`);
  console.log(
    `  Fix path: make the tool name shorter, give it a more memorable description,`,
  );
  console.log(
    `  or check if a memory block in the agent references the truncated name.`,
  );
} else {
  console.log(`? No tool matches "read_paperclip_issu" or starts with it.`);
  console.log(`  This is unusual. The agent invented a name with no source.`);
}
