#!/usr/bin/env node
/**
 * Backfill: ensure the produce_deliverable tool exists in Letta and is
 * attached to every existing letta_cloud agent.
 *
 * Why this exists:
 * The on-hire-approved hook only runs at agent hire time. Letta agents
 * created BEFORE the commit that added ensureDeliverableTool will never
 * have the tool attached. This script does the one-time backfill across
 * the whole fleet.
 *
 * Usage:
 *   node scripts/attach-letta-deliverable-tool.mjs
 *
 * Idempotent: safe to run repeatedly. Creates the tool once, attaches
 * only where missing.
 */

const DOER = process.env.DOER_API_URL ?? "http://localhost:3100";
const COMPANY_ID =
  process.env.DOER_COMPANY_ID ?? "27b25893-0ff4-4d81-b45b-9631e04b769a";

const TOOL_NAME = "produce_deliverable";

// Mirrors packages/adapters/letta-cloud/src/server/letta-client.ts. Kept
// inline so this script is self-contained and runnable without building
// the workspace.
const TOOL_SOURCE = `def produce_deliverable(
    kind: str,
    filename: str,
    title: str,
    file_content_base64: str,
    description: str = None,
    issue_id: str = None,
    project_id: str = None,
) -> dict:
    """Publish a file your agent produced as a Doer Output so the user
    can see and download it from Fernweh.

    The file content must be base64-encoded bytes of a real file (.docx,
    .xlsx, .pdf, .pptx, .png, .jpg, .csv, .html, .json). The Doer adapter
    stores the file server-side when it observes this tool call; you just
    pass the arguments.
    """
    return {
        "status": "accepted",
        "kind": kind,
        "filename": filename,
        "title": title,
    }
`;

const TOOL_DESCRIPTION = `Publish a file as a Doer Output so the human user can download it from Fernweh.

WHEN TO USE:
Any time you produce user-facing content the human will read OUTSIDE a chat transcript. Reports, briefs, proposals, summaries, analyses, spreadsheets, trackers, rosters, presentations, extracts. If the user asked for "a document", "a report", "a spreadsheet", or any specific file format, use this tool. Do NOT return that content as markdown in the conversation — that's scratch, not a deliverable.

WHEN NOT TO USE:
Internal planning notes, thinking-out-loud, inter-agent coordination, or short conversational answers. Those stay as normal messages.

HOW TO OBTAIN file_content_base64:
Generate the file in Python (python-docx for .docx, openpyxl for .xlsx, reportlab for .pdf, python-pptx for .pptx), save to bytes, then base64-encode. Typical Python:

    from docx import Document
    from io import BytesIO
    import base64
    doc = Document()
    doc.add_heading("Your title", level=1)
    doc.add_paragraph("Body text...")
    buf = BytesIO()
    doc.save(buf)
    file_content_base64 = base64.b64encode(buf.getvalue()).decode("ascii")

SIZE: keep files under ~500 KB. Base64 content flows through Letta's model context; huge files will exceed message size limits.

VISIBILITY: outputs land as "draft" by default. The human reviews in Fernweh and publishes before sharing — do NOT try to auto-publish.

LINK TO WORK: if your current task is tied to an issue, pass its UUID as issue_id so the output attaches to it in Fernweh.`;

const TOOL_ARGS_SCHEMA = {
  type: "object",
  required: ["kind", "filename", "title", "file_content_base64"],
  properties: {
    kind: {
      type: "string",
      enum: [
        "docx",
        "xlsx",
        "pdf",
        "pptx",
        "md",
        "png",
        "jpg",
        "csv",
        "html",
        "json",
        "other",
      ],
      description:
        "File format. The Doer server assigns the MIME type from this; don't guess.",
    },
    filename: {
      type: "string",
      description: "Display filename the user will see, e.g. 'Q4-Brief.docx'.",
    },
    title: {
      type: "string",
      description: "Human-facing title, may differ from filename.",
    },
    file_content_base64: {
      type: "string",
      description: "File bytes, base64-encoded.",
    },
    description: {
      type: "string",
      description: "Optional short summary sentence. Omit if you don't have one.",
    },
    issue_id: {
      type: "string",
      description: "Optional Doer issue UUID this output relates to. Omit if not tied to an issue.",
    },
    project_id: {
      type: "string",
      description: "Optional Doer project UUID this output relates to. Omit if not tied to a project.",
    },
  },
};

const LETTA = "https://api.letta.com/v1";

function abort(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

// 1. Find all letta_cloud agents in Doer
console.log(`Pulling letta_cloud agents from Doer (company ${COMPANY_ID.slice(0, 8)}…)`);
const agentsRes = await fetch(`${DOER}/api/companies/${COMPANY_ID}/agents`);
if (!agentsRes.ok) abort(`Doer /agents returned ${agentsRes.status}`);
const allAgents = await agentsRes.json();
const lettaAgents = allAgents.filter((a) => a.adapterType === "letta_cloud");

if (lettaAgents.length === 0) {
  console.log("No letta_cloud agents found. Nothing to backfill.");
  process.exit(0);
}

console.log(`Found ${lettaAgents.length} letta_cloud agent(s):`);
for (const a of lettaAgents) {
  console.log(`  - ${a.name} (${a.id})`);
}

// All agents on a single Letta account share the same tool registry, so
// we can use the first agent's apiKey to create the tool once. Group by
// apiKey just in case there are multiple Letta accounts in play.
const byApiKey = new Map();
for (const a of lettaAgents) {
  const key = a.adapterConfig?.apiKey;
  if (!key) {
    console.warn(`  ! ${a.name} has no apiKey in adapterConfig — skipping`);
    continue;
  }
  if (!byApiKey.has(key)) byApiKey.set(key, []);
  byApiKey.get(key).push(a);
}

let totalAttached = 0;
let totalAlreadyAttached = 0;
let totalSkipped = 0;
let totalErrored = 0;

for (const [apiKey, agentsForKey] of byApiKey) {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  console.log(
    `\n— Letta account ${apiKey.slice(0, 8)}…${apiKey.slice(-4)} (${agentsForKey.length} agent(s)) —`,
  );

  // 2. Get-or-create the tool for this Letta account
  console.log(`  Looking up tool "${TOOL_NAME}"…`);
  const listRes = await fetch(`${LETTA}/tools/?name=${TOOL_NAME}`, { headers });
  if (!listRes.ok) {
    console.warn(`  ! /tools list returned ${listRes.status}: ${await listRes.text()}`);
    totalErrored += agentsForKey.length;
    continue;
  }
  const tools = await listRes.json();
  const matches = (Array.isArray(tools) ? tools : tools?.data ?? []).filter(
    (t) => t.name === TOOL_NAME,
  );

  let toolId = matches[0]?.id ?? null;
  if (toolId) {
    console.log(`  ✓ Tool already exists. id=${toolId}`);
  } else {
    console.log(`  Creating tool…`);
    const createRes = await fetch(`${LETTA}/tools/`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        source_code: TOOL_SOURCE,
        source_type: "python",
        description: TOOL_DESCRIPTION,
        args_json_schema: TOOL_ARGS_SCHEMA,
        tags: ["doer", "deliverable"],
        return_char_limit: 512,
      }),
    });
    if (!createRes.ok) {
      console.error(`  ! Tool create failed ${createRes.status}: ${await createRes.text()}`);
      totalErrored += agentsForKey.length;
      continue;
    }
    const created = await createRes.json();
    toolId = created.id;
    console.log(`  ✓ Created tool. id=${toolId}`);
  }

  // 3. Attach to each agent under this account if not already attached
  for (const a of agentsForKey) {
    const lettaAgentId = a.adapterConfig?.agentId;
    if (!lettaAgentId) {
      console.warn(`  ! ${a.name} has no Letta agentId — skipping`);
      totalSkipped += 1;
      continue;
    }

    // Check current attachments
    const attachedRes = await fetch(`${LETTA}/agents/${lettaAgentId}/tools`, { headers });
    if (!attachedRes.ok) {
      console.warn(
        `  ! ${a.name}: /agents/:id/tools returned ${attachedRes.status} — skipping`,
      );
      totalErrored += 1;
      continue;
    }
    const attached = await attachedRes.json();
    const list = Array.isArray(attached) ? attached : attached?.data ?? [];
    const already = list.find((t) => t.id === toolId || t.name === TOOL_NAME);
    if (already) {
      console.log(`  ✓ ${a.name}: already attached.`);
      totalAlreadyAttached += 1;
      continue;
    }

    // Attach
    const attachRes = await fetch(
      `${LETTA}/agents/${lettaAgentId}/tools/attach/${toolId}`,
      { method: "PATCH", headers },
    );
    if (!attachRes.ok) {
      console.error(
        `  ! ${a.name}: attach failed ${attachRes.status}: ${await attachRes.text()}`,
      );
      totalErrored += 1;
      continue;
    }
    console.log(`  ✓ ${a.name}: attached.`);
    totalAttached += 1;
  }
}

console.log("\n— Summary —");
console.log(`  Newly attached: ${totalAttached}`);
console.log(`  Already attached: ${totalAlreadyAttached}`);
console.log(`  Skipped (no agentId/apiKey): ${totalSkipped}`);
console.log(`  Errored: ${totalErrored}`);
console.log("\nDone. Re-test with the smoke flow on any letta_cloud agent.");
