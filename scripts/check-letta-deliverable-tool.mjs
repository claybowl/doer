#!/usr/bin/env node
/**
 * Diagnostic: does the produce_deliverable tool exist in Letta, and is it
 * attached to a given letta_cloud agent?
 *
 * Usage:
 *   node scripts/check-letta-deliverable-tool.mjs <doer-agent-id-or-name>
 *
 * Examples:
 *   node scripts/check-letta-deliverable-tool.mjs pope-orby
 *   node scripts/check-letta-deliverable-tool.mjs <uuid>
 *
 * Reads adapter config from your local Doer (localhost:3101) — no env
 * vars needed. Uses the local_trusted implicit auth.
 */

const DOER = process.env.DOER_API_URL ?? "http://localhost:3100";
const COMPANY_ID =
  process.env.DOER_COMPANY_ID ?? "27b25893-0ff4-4d81-b45b-9631e04b769a";

const target = process.argv[2];
if (!target) {
  console.error("Usage: node scripts/check-letta-deliverable-tool.mjs <agent-id-or-name>");
  process.exit(1);
}

function abort(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

// 1. Find the agent in Doer
console.log(`Looking up agent "${target}" in Doer (company ${COMPANY_ID.slice(0, 8)}…)`);
const agentsRes = await fetch(`${DOER}/api/companies/${COMPANY_ID}/agents`);
if (!agentsRes.ok) abort(`Doer /agents returned ${agentsRes.status}`);
const agents = await agentsRes.json();

const agent =
  agents.find((a) => a.id === target) ||
  agents.find((a) => a.name?.toLowerCase() === target.toLowerCase()) ||
  agents.find((a) => a.urlKey?.toLowerCase() === target.toLowerCase());

if (!agent) {
  console.error("Available letta_cloud agents:");
  for (const a of agents.filter((a) => a.adapterType === "letta_cloud")) {
    console.error(`  - ${a.name} (${a.id})`);
  }
  abort(`Agent "${target}" not found`);
}

console.log(`✓ Found Doer agent: ${agent.name} (${agent.id})`);
console.log(`  adapterType: ${agent.adapterType}`);

if (agent.adapterType !== "letta_cloud") {
  abort(`This tool is for letta_cloud agents; ${agent.name} is ${agent.adapterType}`);
}

const cfg = agent.adapterConfig ?? {};
const apiKey = cfg.apiKey;
const lettaAgentId = cfg.agentId;

if (!apiKey) abort("No apiKey in adapterConfig");
if (!lettaAgentId) abort("No agentId in adapterConfig");

console.log(`  Letta agent id: ${lettaAgentId}`);
console.log(`  apiKey: ${apiKey.slice(0, 8)}…${apiKey.slice(-4)}`);

// 2. Ask Letta about the tool
const LETTA = "https://api.letta.com/v1";
const lettaHeaders = {
  Authorization: `Bearer ${apiKey}`,
  "Content-Type": "application/json",
};

console.log(`\nAsking Letta: does a tool named "produce_deliverable" exist?`);
const toolListRes = await fetch(`${LETTA}/tools/?name=produce_deliverable`, {
  headers: lettaHeaders,
});
if (!toolListRes.ok) {
  abort(`Letta /tools returned ${toolListRes.status}: ${await toolListRes.text()}`);
}
const tools = await toolListRes.json();
const toolMatches = (Array.isArray(tools) ? tools : tools?.data ?? []).filter(
  (t) => t.name === "produce_deliverable",
);

if (toolMatches.length === 0) {
  console.log(`✗ Tool "produce_deliverable" does NOT exist in your Letta account.`);
  console.log(
    `  → ensureDeliverableTool() never ran for this account. Re-hire any letta_cloud agent to create it.`,
  );
  process.exit(0);
}

console.log(`✓ Tool exists in Letta. ${toolMatches.length} match(es):`);
for (const t of toolMatches) {
  console.log(`    id=${t.id}`);
  console.log(`    description: ${(t.description ?? "").slice(0, 120)}…`);
  console.log(`    tags: ${(t.tags ?? []).join(", ")}`);
}

// 3. Is it attached to this specific agent?
console.log(`\nAsking Letta: is the tool attached to ${agent.name} (Letta id ${lettaAgentId})?`);
const attachedRes = await fetch(`${LETTA}/agents/${lettaAgentId}/tools`, {
  headers: lettaHeaders,
});
if (!attachedRes.ok) {
  abort(`Letta /agents/:id/tools returned ${attachedRes.status}: ${await attachedRes.text()}`);
}
const attached = await attachedRes.json();
const attachedList = Array.isArray(attached) ? attached : attached?.data ?? [];

const attachedMatch = attachedList.find((t) => t.name === "produce_deliverable");

console.log(`  ${attachedList.length} tools attached to this agent total.`);
if (attachedMatch) {
  console.log(`✓ produce_deliverable IS attached. id=${attachedMatch.id}`);
  console.log(`\nDIAGNOSIS: tool is in place. The agent should be able to call it.`);
  console.log(
    `If the agent still doesn't call it, the issue is instruction-layering / prompt — not adapter wiring.`,
  );
} else {
  console.log(`✗ produce_deliverable is NOT attached to ${agent.name}.`);
  console.log(`  Attached tool names: ${attachedList.map((t) => t.name).join(", ")}`);
  console.log(`\nDIAGNOSIS: tool exists in your Letta registry but isn't on this agent.`);
  console.log(`  Most likely cause: agent was hired BEFORE the produce_deliverable code shipped.`);
  console.log(
    `  Quickest fix: re-hire the agent in Fernweh (terminate + new hire pointing at same Letta agentId),`,
  );
  console.log(
    `  OR run scripts/attach-letta-deliverable-tool.mjs (let me know if you want that one too).`,
  );
}
