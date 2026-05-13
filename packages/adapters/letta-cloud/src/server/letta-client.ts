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

/**
 * Send a chat message to a Letta agent and collect the full response.
 * Returns all assistant messages in order.
 */
export async function sendChatMessage(
  config: LettaCloudAdapterConfig,
  message: string,
): Promise<Array<{ role: string; content: string; toolName?: string }>> {
  const client = getLettaClient(config);

  const response = await client.agents.messages.create(config.agentId, {
    messages: [{ role: "user", content: message }],
  });

  const messages: Array<{ role: string; content: string; toolName?: string }> = [];
  const rawMessages = Array.isArray((response as unknown as Record<string, unknown>).messages)
    ? ((response as unknown as Record<string, unknown>).messages as unknown[])
    : [];

  for (const msg of rawMessages) {
    const m = msg as Record<string, unknown>;
    const msgType = String(m.message_type ?? m.type ?? "");
    const role = String(m.role ?? "assistant");

    if (msgType === "assistant_message" || (role === "assistant" && msgType !== "tool_call_message" && msgType !== "tool_return_message")) {
      const text = m.content
        ? String(m.content)
        : m.text
          ? String(m.text)
          : null;
      if (text) messages.push({ role: "assistant", content: text });
    } else if (msgType === "tool_call_message") {
      // Surface tool calls as a note
      const toolCalls = Array.isArray(m.tool_calls) ? m.tool_calls as Record<string, unknown>[] : [];
      for (const tc of toolCalls) {
        const toolName = String(tc.name ?? "tool");
        messages.push({ role: "tool", content: `Called ${toolName}`, toolName });
      }
    }
  }

  return messages;
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

// ---------------------------------------------------------------------------
// Goal management tools — read_goals, create_goal, update_goal_status
//
// These are no-op Python stubs. The real work happens server-side: the
// adapter's execute.ts stream handler intercepts tool_call_message events
// and proxies them to the Doer API running on localhost.
// ---------------------------------------------------------------------------

const DOER_BASE_URL = process.env.PAPERCLIP_BASE_URL ?? "http://localhost:3100";

// --- read_goals ---

export const READ_GOALS_TOOL_NAME = "read_goals";

const READ_GOALS_SOURCE = `def read_goals(level: str = None, status: str = None) -> dict:
    """List Doer goals with optional filters.

    Args:
        level: Optional filter — one of "company", "team", "agent", "task".
        status: Optional filter — one of "planned", "active", "achieved", "cancelled".

    Returns:
        A dict with a "goals" list. Each goal has id, title, level, status, parentId, ownerAgentId.
    """
    return {"goals": [], "_note": "Results injected by Doer adapter"}
`;

const READ_GOALS_DESCRIPTION = `List goals from Doer with optional level and status filters.

WHEN TO USE:
- At the start of a council session to understand current company/team objectives
- Before creating issues to find the right goalId to attach
- When checking if a goal has been achieved or needs updating

FILTERS:
- level: "company" | "team" | "agent" | "task"
- status: "planned" | "active" | "achieved" | "cancelled"
- Both are optional — omit to get all goals

EXAMPLE:
  read_goals(level="team", status="active")  # get active sprint goals
  read_goals(level="company", status="active")  # get company objectives`;

const READ_GOALS_ARGS_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    level: {
      type: "string",
      enum: ["company", "team", "agent", "task"],
      description: "Filter by goal level. Omit to get all levels.",
    },
    status: {
      type: "string",
      enum: ["planned", "active", "achieved", "cancelled"],
      description: "Filter by status. Omit to get all statuses.",
    },
  },
};

// --- create_goal ---

export const CREATE_GOAL_TOOL_NAME = "create_goal";

const CREATE_GOAL_SOURCE = `def create_goal(title: str, description: str, level: str, parent_id: str = None, owner_agent_id: str = None) -> dict:
    """Create a new goal in Doer.

    Args:
        title: Short, clear goal title.
        description: What success looks like. Be specific.
        level: One of "company", "team", "agent", "task".
        parent_id: Optional UUID of the parent goal. Team goals should reference a company goal. Agent goals should reference a team goal.
        owner_agent_id: Optional UUID of the agent responsible for this goal.

    Returns:
        The created goal object with its id.
    """
    return {"id": None, "_note": "Created by Doer adapter"}
`;

const CREATE_GOAL_DESCRIPTION = `Create a new goal in Doer.

WHEN TO USE:
- Chef: before creating a batch of issues, create a team goal to tie them to
- Alfie: before dispatching a gremlin, create an agent goal for that gremlin's cycle
- DonDog: when council identifies a new company objective

HIERARCHY RULES:
- company goals: no parentId required
- team goals: set parentId to the relevant company goal
- agent goals: set parentId to the relevant team goal, ownerAgentId to the gremlin's Doer agent UUID

After creating, use the returned id as goalId when calling create_paperclip_issue.`;

const CREATE_GOAL_ARGS_SCHEMA: Record<string, unknown> = {
  type: "object",
  required: ["title", "description", "level"],
  properties: {
    title: { type: "string", description: "Short, clear goal title." },
    description: { type: "string", description: "What success looks like. Be specific." },
    level: {
      type: "string",
      enum: ["company", "team", "agent", "task"],
      description: "Goal level in the hierarchy.",
    },
    parent_id: {
      type: "string",
      description: "UUID of the parent goal. Team goals should reference a company goal.",
    },
    owner_agent_id: {
      type: "string",
      description: "UUID of the Doer agent responsible for this goal.",
    },
  },
};

// --- update_goal_status ---

export const UPDATE_GOAL_STATUS_TOOL_NAME = "update_goal_status";

const UPDATE_GOAL_STATUS_SOURCE = `def update_goal_status(goal_id: str, status: str) -> dict:
    """Update the status of an existing goal in Doer.

    Args:
        goal_id: UUID of the goal to update.
        status: New status — one of "planned", "active", "achieved", "cancelled".

    Returns:
        The updated goal object.
    """
    return {"id": goal_id, "status": status, "_note": "Updated by Doer adapter"}
`;

const UPDATE_GOAL_STATUS_DESCRIPTION = `Update the status of a goal in Doer.

WHEN TO USE:
- Mark a goal "achieved" when all linked issues are done
- Mark "cancelled" when a goal is no longer relevant
- Mark "active" when starting work on a planned goal

STATUS VALUES: "planned" | "active" | "achieved" | "cancelled"

Always update goal status at the end of a council session or when you observe all child goals/issues are complete.`;

const UPDATE_GOAL_STATUS_ARGS_SCHEMA: Record<string, unknown> = {
  type: "object",
  required: ["goal_id", "status"],
  properties: {
    goal_id: { type: "string", description: "UUID of the goal to update." },
    status: {
      type: "string",
      enum: ["planned", "active", "achieved", "cancelled"],
      description: "New status for the goal.",
    },
  },
};

// --- ensure helpers ---

async function ensureGoalTool(
  client: Letta,
  name: string,
  source: string,
  description: string,
  argsSchema: Record<string, unknown>,
): Promise<string> {
  const existingPage = await client.tools.list({ name });
  for await (const tool of existingPage) {
    const rec = tool as unknown as Record<string, unknown>;
    if (typeof rec.name === "string" && rec.name === name) {
      const id = typeof rec.id === "string" ? rec.id : null;
      if (id) return id;
    }
  }
  const created = await client.tools.create({
    source_code: source,
    source_type: "python",
    description,
    args_json_schema: argsSchema,
    tags: ["doer", "goals"],
    return_char_limit: 4096,
  });
  const rec = created as unknown as Record<string, unknown>;
  const id = typeof rec.id === "string" ? rec.id : null;
  if (!id) throw new Error(`Letta returned no id for created tool: ${name}`);
  return id;
}

export async function ensureGoalTools(config: LettaCloudAdapterConfig): Promise<{ readGoalsId: string; createGoalId: string; updateGoalStatusId: string }> {
  const client = getLettaClient(config);
  const [readGoalsId, createGoalId, updateGoalStatusId] = await Promise.all([
    ensureGoalTool(client, READ_GOALS_TOOL_NAME, READ_GOALS_SOURCE, READ_GOALS_DESCRIPTION, READ_GOALS_ARGS_SCHEMA),
    ensureGoalTool(client, CREATE_GOAL_TOOL_NAME, CREATE_GOAL_SOURCE, CREATE_GOAL_DESCRIPTION, CREATE_GOAL_ARGS_SCHEMA),
    ensureGoalTool(client, UPDATE_GOAL_STATUS_TOOL_NAME, UPDATE_GOAL_STATUS_SOURCE, UPDATE_GOAL_STATUS_DESCRIPTION, UPDATE_GOAL_STATUS_ARGS_SCHEMA),
  ]);
  return { readGoalsId, createGoalId, updateGoalStatusId };
}
