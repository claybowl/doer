import Letta from "@letta-ai/letta-client";
import type { LettaCloudAdapterConfig, LettaMemoryBlock, LettaTool, LettaAgentSnapshot } from "../shared/types.js";

const LETTA_CLOUD_BASE = "https://api.letta.com";

/** Strip trailing /v1 suffix — the SDK appends its own version path */
function resolveBaseUrl(raw: string | undefined): string {
  const url = raw?.trim() || LETTA_CLOUD_BASE;
  return url.replace(/\/v\d+\/?$/, "");
}

export function getLettaClient(config: LettaCloudAdapterConfig): Letta {
  return new Letta({
    apiKey: config.apiKey,
    baseURL: resolveBaseUrl(config.baseUrl),
  });
}

/** Fetch agent metadata + all memory blocks + all tools in one shot */
export async function fetchAgentSnapshot(config: LettaCloudAdapterConfig): Promise<LettaAgentSnapshot> {
  const client = getLettaClient(config);

  const [agent, blocksPage, toolsPage] = await Promise.all([
    client.agents.retrieve(config.agentId),
    client.agents.blocks.list(config.agentId),
    client.agents.tools.list(config.agentId),
  ]);

  // PagePromise — collect all items across pages
  const rawBlocks: Record<string, unknown>[] = [];
  for await (const b of blocksPage) rawBlocks.push(b as unknown as Record<string, unknown>);
  const rawTools: Record<string, unknown>[] = [];
  for await (const t of toolsPage) rawTools.push(t as unknown as Record<string, unknown>);

  const blocks: LettaMemoryBlock[] = rawBlocks.map((b: Record<string, unknown>) => ({
    id: String(b.id ?? ""),
    label: String(b.label ?? ""),
    value: String(b.value ?? ""),
    description: b.description ? String(b.description) : undefined,
    readOnly: Boolean(b.read_only ?? false),
    limit: typeof b.limit === "number" ? b.limit : undefined,
  }));

  const tools: LettaTool[] = rawTools.map((t) => ({
    id: String(t.id ?? ""),
    name: String(t.name ?? ""),
    description: t.description ? String(t.description) : undefined,
    toolType: t.tool_type ? String(t.tool_type) : undefined,
    tags: Array.isArray(t.tags) ? t.tags.map(String) : [],
    defaultRequiresApproval: Boolean(t.default_requires_approval ?? false),
  }));

  return {
    agent: {
      id: String((agent as unknown as Record<string, unknown>).id ?? ""),
      name: String((agent as unknown as Record<string, unknown>).name ?? ""),
      model: String((agent as unknown as Record<string, unknown>).model ?? ""),
      agentType: String((agent as unknown as Record<string, unknown>).agent_type ?? ""),
      system: (agent as unknown as Record<string, unknown>).system ? String((agent as unknown as Record<string, unknown>).system) : undefined,
      tags: Array.isArray((agent as unknown as Record<string, unknown>).tags) ? ((agent as unknown as Record<string, unknown>).tags as unknown[]).map(String) : [],
    },
    blocks,
    tools,
  };
}

/** Update a single memory block by label */
export async function updateMemoryBlock(
  config: LettaCloudAdapterConfig,
  blockLabel: string,
  value: string,
): Promise<void> {
  const client = getLettaClient(config);
  await client.agents.blocks.update(blockLabel, { agent_id: config.agentId, value });
}

/** Attach a tool by tool ID */
export async function attachTool(config: LettaCloudAdapterConfig, toolId: string): Promise<void> {
  const client = getLettaClient(config);
  await client.agents.tools.attach(toolId, { agent_id: config.agentId });
}

/** Detach a tool by tool ID */
export async function detachTool(config: LettaCloudAdapterConfig, toolId: string): Promise<void> {
  const client = getLettaClient(config);
  await client.agents.tools.detach(toolId, { agent_id: config.agentId });
}

// ---------------------------------------------------------------------------
// Deliverable tool
//
// Letta tools run server-side in Letta's sandbox, so they can't reach a
// Doer server sitting on the user's localhost. We register a no-op stub
// that just echoes its arguments back; the Doer adapter observes the
// tool_call_message event in the execution stream and handles file storage
// itself (via HTTP POST to /api/companies/:id/deliverables on the same
// machine the adapter runs on).
//
// One tool per Letta account is enough — all letta_cloud agents on a given
// Letta API key share it via the registry. `ensureDeliverableTool` does a
// get-or-create: look up by name, create if missing, return the id.
// ---------------------------------------------------------------------------

export const DELIVERABLE_TOOL_NAME = "produce_deliverable";

/**
 * Python source the Letta sandbox runs when the agent calls
 * `produce_deliverable(...)`. Intentionally a no-op: it returns a short
 * accepted-receipt that the Letta agent can reason about. The REAL work
 * (decoding bytes, writing to Doer storage, inserting the deliverable row)
 * happens in the Doer adapter's execute.ts stream handler, which sees the
 * tool_call_message event and has access to the adapter's HTTP client +
 * auth token to POST directly to the Doer server running on localhost.
 *
 * We deliberately do NOT try to do any HTTP from this Python: Letta's
 * sandbox couldn't reach Clay's localhost even if we wanted it to.
 */
const DELIVERABLE_TOOL_SOURCE = `def produce_deliverable(
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

    Args:
        kind: One of "docx", "xlsx", "pdf", "pptx", "md", "png", "jpg",
              "csv", "html", "json", "other".
        filename: The display name, e.g. "Q4-Brief.docx". Keep it human.
        title: Human-facing title, may differ from filename.
        file_content_base64: The file bytes, base64-encoded.
        description: Optional short sentence describing the file.
        issue_id: Optional Doer issue UUID. If this output was produced
                  for a specific issue, attach it here.
        project_id: Optional Doer project UUID.

    Returns:
        An accepted-receipt dict. The actual deliverable row is created
        by the Doer adapter asynchronously after this call returns.
    """
    return {
        "status": "accepted",
        "kind": kind,
        "filename": filename,
        "title": title,
    }
`;

/**
 * Rich tool description — this is the authoritative guidance the model
 * sees for every Letta agent on every reasoning turn. Letta agents have
 * no skill-file mechanism (unlike Claude Code), so the tool description
 * IS the instruction surface. Keep it short and direct; the agent
 * reads this alongside the JSON args schema when deciding what to call.
 */
const DELIVERABLE_TOOL_DESCRIPTION = `Publish a file as a Doer Output so the human user can download it from Fernweh.

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

const DELIVERABLE_TOOL_ARGS_SCHEMA: Record<string, unknown> = {
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
    // Letta's pydantic-based schema parser rejects JSON Schema's
    // ["string", "null"] union syntax. For optional/nullable fields,
    // use "type": "string" and rely on being absent from `required` —
    // the Python signature uses `= None` defaults so the agent knows
    // these are skippable. Empirically confirmed against api.letta.com.
    description: {
      type: "string",
      description:
        "Optional short summary sentence. Omit if you don't have one.",
    },
    issue_id: {
      type: "string",
      description:
        "Optional Doer issue UUID this output relates to. Omit if not tied to an issue.",
    },
    project_id: {
      type: "string",
      description:
        "Optional Doer project UUID this output relates to. Omit if not tied to a project.",
    },
  },
};

/**
 * Get-or-create the shared `produce_deliverable` tool in Letta.
 *
 * Scope: tools live per-Letta-account (per API key). This is idempotent —
 * callers can invoke on every agent hire without creating duplicates. If
 * the tool already exists by name, we return its id without modification;
 * if it doesn't, we create it.
 */
export async function ensureDeliverableTool(
  config: LettaCloudAdapterConfig,
): Promise<string> {
  const client = getLettaClient(config);

  // Listing is paginated; iterate until we find a match by name.
  const existingPage = await client.tools.list({ name: DELIVERABLE_TOOL_NAME });
  for await (const tool of existingPage) {
    const rec = tool as unknown as Record<string, unknown>;
    if (typeof rec.name === "string" && rec.name === DELIVERABLE_TOOL_NAME) {
      const id = typeof rec.id === "string" ? rec.id : null;
      if (id) return id;
    }
  }

  const created = await client.tools.create({
    source_code: DELIVERABLE_TOOL_SOURCE,
    source_type: "python",
    description: DELIVERABLE_TOOL_DESCRIPTION,
    args_json_schema: DELIVERABLE_TOOL_ARGS_SCHEMA,
    tags: ["doer", "deliverable"],
    return_char_limit: 512,
  });
  const rec = created as unknown as Record<string, unknown>;
  const id = typeof rec.id === "string" ? rec.id : null;
  if (!id) {
    throw new Error(
      "Letta returned a created tool with no id; cannot register produce_deliverable",
    );
  }
  return id;
}
