import type { AdapterExecutionContext, AdapterExecutionResult } from "@doerai/adapter-utils";
import { StreamTokenBuffer } from "@doerai/adapter-utils/stream-buffer";
import type { LettaCloudAdapterConfig } from "../shared/types.js";
import { computeRunCost } from "../shared/cost.js";
import {
  attachTool,
  attachToolsBatch,
  DELIVERABLE_TOOL_NAME,
  ensureDeliverableTool,
  ensureGoalTools,
  ensurePaperclipIssueTools,
  ensureWriteOutputTool,
  fetchAgentSnapshot,
  findToolIdByName,
  getLettaClient,
  READ_GOALS_TOOL_NAME,
  CREATE_GOAL_TOOL_NAME,
  UPDATE_GOAL_STATUS_TOOL_NAME,
} from "./letta-client.js";
import {
  GET_FLEET_STATUS_TOOL_NAME,
  SCHEDULE_COUNCIL_TOOL_NAME,
  EMERGENCY_PAUSE_AGENT_TOOL_NAME,
  CLONE_FROM_TEMPLATE_TOOL_NAME,
  BULK_DISPATCH_TOOL_NAME,
  REASSIGN_TASK_TOOL_NAME,
  FORECAST_CAPACITY_TOOL_NAME,
  BUILD_DEPENDENCY_GRAPH_TOOL_NAME,
  ANALYZE_ISSUE_PATTERNS_TOOL_NAME,
  SCAN_FLEET_ANOMALIES_TOOL_NAME,
  AUDIT_AGENT_COMPLIANCE_TOOL_NAME,
  GENERATE_WEEKLY_BRIEF_TOOL_NAME,
  CREATE_PAPERCLIP_ISSUE_TOOL_NAME,
  READ_PAPERCLIP_ISSUES_TOOL_NAME,
  READ_PAPERCLIP_ISSUE_TOOL_NAME,
  UPDATE_PAPERCLIP_ISSUE_TOOL_NAME,
  POST_ISSUE_COMMENT_TOOL_NAME,
  WRITE_OUTPUT_TOOL_NAME,
  interceptGetFleetStatus,
  interceptScheduleCouncil,
  interceptEmergencyPauseAgent,
  interceptCloneFromTemplate,
  interceptBulkDispatch,
  interceptReassignTask,
  interceptForecastCapacity,
  interceptBuildDependencyGraph,
  interceptAnalyzeIssuePatterns,
  interceptScanFleetAnomalies,
  interceptAuditAgentCompliance,
  interceptGenerateWeeklyBrief,
  interceptCreatePaperclipIssue,
  interceptReadPaperclipIssues,
  interceptReadPaperclipIssue,
  interceptUpdatePaperclipIssue,
  interceptPostIssueComment,
  interceptWriteOutput,
} from "./tool-intercepts.js";
import { renderTemplate, buildPaperclipEnv } from "@doerai/adapter-utils/server-utils";

// Process-local cache: agents we've verified have produce_deliverable
// attached. Cleared on adapter restart, which is fine — re-attach is
// idempotent and runs at most once per agent per server lifetime.
const deliverableToolVerifiedAgents = new Set<string>();

// Process-local cache: agents we've verified have new tools attached.
const newToolsVerifiedAgents = new Set<string>();

// Process-local cache: agents we've verified have goal tools attached.
const goalToolsVerifiedAgents = new Set<string>();

// Process-local cache: agents we've verified have paperclip issue stubs attached.
const paperclipIssueToolsVerifiedAgents = new Set<string>();

// Process-local cache: agents we've verified have write_output attached.
const writeOutputToolVerifiedAgents = new Set<string>();

/** Tool names that should be attached per agent role */
const AGENT_TOOL_SUITE_NAMES: Record<string, string[]> = {
  dondog: [
    GET_FLEET_STATUS_TOOL_NAME,
    SCHEDULE_COUNCIL_TOOL_NAME,
    EMERGENCY_PAUSE_AGENT_TOOL_NAME,
    CLONE_FROM_TEMPLATE_TOOL_NAME,
  ],
  alfie: [
    BULK_DISPATCH_TOOL_NAME,
    REASSIGN_TASK_TOOL_NAME,
  ],
  chef: [
    BUILD_DEPENDENCY_GRAPH_TOOL_NAME,
    FORECAST_CAPACITY_TOOL_NAME,
    ANALYZE_ISSUE_PATTERNS_TOOL_NAME,
  ],
  "tower keeper": [
    SCAN_FLEET_ANOMALIES_TOOL_NAME,
    AUDIT_AGENT_COMPLIANCE_TOOL_NAME,
    GENERATE_WEEKLY_BRIEF_TOOL_NAME,
  ],
};

/**
 * Self-heal hook: ensure new tool suites are attached per agent role.
 * Looks up tools by name in the Letta registry — works on both cloud and local instances.
 * Non-blocking — logs but doesn't abort the run.
 */
async function ensureNewToolsAttached(
  ctx: AdapterExecutionContext,
  config: LettaCloudAdapterConfig,
  snapshot: Awaited<ReturnType<typeof fetchAgentSnapshot>>,
): Promise<void> {
  const agentId = config.agentId;
  if (newToolsVerifiedAgents.has(agentId)) return;

  const agentName = (ctx.agent?.name ?? "").toLowerCase().trim();
  const toolNames = AGENT_TOOL_SUITE_NAMES[agentName];
  if (!toolNames || toolNames.length === 0) {
    newToolsVerifiedAgents.add(agentId);
    return;
  }

  try {
    const attachedNames = new Set(snapshot.tools.map((t) => t.name));
    const missing = toolNames.filter((n) => !attachedNames.has(n));

    for (const toolName of missing) {
      const toolId = await findToolIdByName(config, toolName);
      if (!toolId) {
        await ctx.onLog("stdout", `[letta-cloud] self-heal: tool '${toolName}' not found in registry — skipping\n`);
        continue;
      }
      await attachTool(config, toolId);
    }

    if (missing.length > 0) {
      await ctx.onLog(
        "stdout",
        `[letta-cloud] self-heal: attached ${missing.join(", ")} to ${agentId}\n`,
      );
    }
    newToolsVerifiedAgents.add(agentId);
  } catch (err) {
    await ctx.onLog(
      "stderr",
      `[letta-cloud] self-heal failed for new tools on ${agentId}: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    // Don't cache failure — next wake retries
  }
}

/**
 * Self-heal hook: ensure the produce_deliverable tool is registered AND
 * attached to this agent before we start streaming.
 *
 * Why this exists:
 *   on-hire-approved is the canonical attach point, but agents created
 *   before that hook shipped (or hires that errored mid-flight) end up
 *   with the tool missing. Letta agents that lack produce_deliverable
 *   silently fail file production — the agent calls a non-existent
 *   tool, gets an error, hallucinates success or loops. Catching this
 *   at run-time turns a silent failure into a self-healing one.
 *
 * Cost: ~one network round-trip per agent per server lifetime. After
 * verification the agent is cached and subsequent wakes skip entirely.
 *
 * Failure mode: non-fatal. If the self-heal fails, we log to stderr
 * and continue. The run can still produce a useful transcript even
 * if the deliverable path is broken.
 */
async function ensureDeliverableToolAttached(
  ctx: AdapterExecutionContext,
  config: LettaCloudAdapterConfig,
): Promise<void> {
  if (deliverableToolVerifiedAgents.has(config.agentId)) return;
  try {
    const snapshot = await fetchAgentSnapshot(config);
    const alreadyAttached = snapshot.tools.some(
      (t) => t.name === DELIVERABLE_TOOL_NAME,
    );
    if (alreadyAttached) {
      deliverableToolVerifiedAgents.add(config.agentId);
      return;
    }
    const toolId = await ensureDeliverableTool(config);
    await attachTool(config, toolId);
    await ctx.onLog(
      "stdout",
      `[letta-cloud] self-heal: attached ${DELIVERABLE_TOOL_NAME} to ${config.agentId}\n`,
    );
    deliverableToolVerifiedAgents.add(config.agentId);
  } catch (err) {
    await ctx.onLog(
      "stderr",
      `[letta-cloud] self-heal failed for ${config.agentId} (continuing run): ${err instanceof Error ? err.message : String(err)}\n`,
    );
    // Don't cache failure — next wake retries. If Letta is just
    // transiently unhappy, we want to recover on the next attempt.
  }
}

/**
 * Handle a `produce_deliverable` tool call by POSTing the decoded file to
 * the Doer API. This runs fire-and-forget: Letta has already executed the
 * stub tool and will continue the agent's reasoning regardless. The
 * returned promise is tracked so the adapter can await completion at end
 * of run and surface failures in logs.
 *
 * We do the work here — in the adapter, on the user's localhost — because
 * Letta's cloud sandbox can't reach the user's Doer server. That's the
 * whole reason for the adapter-side interception pattern.
 */
async function postDeliverableFromToolCall(
  ctx: AdapterExecutionContext,
  args: Record<string, unknown>,
): Promise<void> {
  const kind = typeof args.kind === "string" ? args.kind : null;
  const filename = typeof args.filename === "string" ? args.filename : null;
  const title = typeof args.title === "string" ? args.title : null;
  const contentB64 =
    typeof args.file_content_base64 === "string" ? args.file_content_base64 : null;

  if (!kind || !filename || !title || !contentB64) {
    // eslint-disable-next-line no-console
    console.warn(
      `[letta-cloud] produce_deliverable missing required fields; skipping`,
      { kind, filename, title, hasContent: !!contentB64 },
    );
    return;
  }

  let bytes: Buffer;
  try {
    bytes = Buffer.from(contentB64, "base64");
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      `[letta-cloud] produce_deliverable base64 decode failed:`,
      err instanceof Error ? err.message : err,
    );
    return;
  }
  if (bytes.length === 0) {
    // eslint-disable-next-line no-console
    console.warn(`[letta-cloud] produce_deliverable: decoded content is empty`);
    return;
  }

  const env = buildPaperclipEnv(ctx.agent);
  const apiUrl = env.DOER_API_URL;
  if (!apiUrl) {
    // eslint-disable-next-line no-console
    console.warn(
      `[letta-cloud] No DOER_API_URL resolved; cannot post deliverable`,
    );
    return;
  }

  const form = new FormData();
  // The server infers contentType from `kind` — we just label the blob
  // with something sane. application/octet-stream is the safe fallback.
  form.append(
    "file",
    new Blob([new Uint8Array(bytes)], { type: "application/octet-stream" }),
    filename,
  );
  form.append("kind", kind);
  form.append("filename", filename);
  form.append("title", title);
  if (typeof args.description === "string" && args.description.trim()) {
    form.append("description", args.description);
  }
  if (typeof args.issue_id === "string" && args.issue_id.trim()) {
    form.append("issueId", args.issue_id);
  }
  if (typeof args.project_id === "string" && args.project_id.trim()) {
    form.append("projectId", args.project_id);
  }

  const headers: Record<string, string> = {};
  if (ctx.authToken) {
    headers.Authorization = `Bearer ${ctx.authToken}`;
  }
  // Carry the run id so the deliverable row is attributed to this run.
  headers["X-Doer-Run-Id"] = ctx.runId;

  const endpoint = `${apiUrl.replace(/\/+$/, "")}/api/companies/${ctx.agent.companyId}/deliverables`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      body: form,
      headers,
    });
    if (!res.ok) {
      const bodyText = await res.text().catch(() => "");
      await ctx.onLog(
        "stderr",
        `[deliverable] POST ${endpoint} -> ${res.status} ${bodyText.slice(0, 400)}\n`,
      );
      return;
    }
    const body = (await res.json().catch(() => null)) as {
      id?: string;
      title?: string;
    } | null;
    await ctx.onLog(
      "stdout",
      `[deliverable] stored id=${body?.id ?? "?"} title=${JSON.stringify(body?.title ?? title)}\n`,
    );
  } catch (err) {
    await ctx.onLog(
      "stderr",
      `[deliverable] POST failed: ${err instanceof Error ? err.message : String(err)}\n`,
    );
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Safely JSON-stringify, returning fallback on failure */
function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Extract text content from a Letta AssistantMessage.
 * `content` may be a plain string or an array of content parts.
 */
function extractAssistantContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part: unknown) => {
        if (typeof part === "string") return part;
        const rec = part as Record<string, unknown> | null;
        if (rec && typeof rec.text === "string") return rec.text;
        return "";
      })
      .filter(Boolean)
      .join("");
  }
  return "";
}

/**
 * Extract user message content (may be string or content-parts array).
 */
function extractUserContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part: unknown) => {
        if (typeof part === "string") return part;
        const rec = part as Record<string, unknown> | null;
        if (rec && typeof rec.text === "string") return rec.text;
        return "";
      })
      .filter(Boolean)
      .join("");
  }
  return "";
}

/** Parse tool call arguments from string to object (if possible) */
function parseToolArgs(args: unknown): unknown {
  if (typeof args !== "string") return args ?? {};
  try {
    return JSON.parse(args);
  } catch {
    return { raw: args };
  }
}

/** Read a non-empty string from an unknown value, else null */
function readNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Build the user message sent to Letta for this heartbeat.
 *
 * Two modes — selected by whether the heartbeat context contains a
 * task / issue id:
 *
 *  - **TASK MODE** — the agent has been woken FOR a specific task.
 *    The wake message names the task explicitly so the agent's wake
 *    context (Constitution L1) overrides any memory-block heartbeat
 *    protocol that would otherwise route the agent into queue review.
 *    The agent is told to read the issue body and execute it; the
 *    base heartbeatPrompt template is intentionally NOT included
 *    (the issue body is the instruction set for this wake).
 *
 *  - **QUEUE REVIEW** — no specific task. The agent's existing
 *    heartbeatPrompt (or "Hello" default) is used, prefixed with a
 *    short reminder that they should check for issues assigned to
 *    THEM specifically before doing meta-management work.
 *
 * Both modes start with a `[DOER HEARTBEAT — *MODE*]` header so the
 * agent can tell at a glance which mode it's in.
 *
 * Exported for unit testing.
 */
export function buildWakeMessage(
  ctx: AdapterExecutionContext,
  fallbackUserMessage: string,
): string {
  const context = (ctx.context ?? {}) as Record<string, unknown>;
  const taskKey =
    readNonEmptyString(context.taskKey) ??
    readNonEmptyString(context.taskId) ??
    readNonEmptyString(context.issueId);
  const wakeReason = readNonEmptyString(context.wakeReason) ?? "unspecified";
  const wakeCommentId = readNonEmptyString(context.wakeCommentId);
  const agentName = ctx.agent?.name ?? "agent";

  if (taskKey) {
    // ── TASK MODE ────────────────────────────────────────────────────
    // Explicit assignment. Wake context wins; ignore the queue-review
    // heartbeatPrompt entirely so it can't compete with the issue
    // body for salience.
    const issueTitle = readNonEmptyString(context.issueTitle);
    const issueDescription = readNonEmptyString(context.issueDescription);
    const lines = [
      "[DOER HEARTBEAT — TASK MODE]",
      "You have been assigned a specific task. Focus on it.",
      "",
      `YOUR TASK: ${taskKey}`,
    ];
    if (issueTitle) {
      lines.push(`TITLE: ${issueTitle}`);
    }
    lines.push(`WAKE REASON: ${wakeReason}`);
    if (wakeCommentId) {
      lines.push(`TRIGGERING COMMENT: ${wakeCommentId}`);
    }
    if (issueDescription) {
      lines.push(
        "",
        "── ISSUE BODY ──────────────────────────────────────────",
        issueDescription.trim(),
        "────────────────────────────────────────────────────────",
      );
    } else {
      lines.push(
        "",
        `Read the issue body for ${taskKey} and execute its instructions.`,
      );
    }
    lines.push(
      "",
      "Do NOT run queue-review, Chef-signaling, or council protocols",
      "unless the issue body itself asks for them.",
      "",
      "Per your Constitution, the wake context (this message + the issue",
      `body of ${taskKey}) is the highest-priority instruction. Memory`,
      "blocks describe your DEFAULT mode of operation — they do not",
      "override an explicit task assignment.",
      "",
      "When you finish: update the issue status (done / blocked /",
      "needs_human) and add a comment summarizing what you did. If you",
      "cannot finish in this heartbeat, leave the issue in_progress and",
      "explain what's blocking you.",
    );
    return lines.join("\n");
  }

  // ── QUEUE REVIEW MODE ──────────────────────────────────────────────
  // No specific task. Wrap the existing heartbeatPrompt with a short
  // preamble so the agent doesn't dive straight into meta-management
  // without first checking if THEY have direct work to do.
  return [
    "[DOER HEARTBEAT — QUEUE REVIEW MODE]",
    `You (${agentName}) have been woken for a general check, not a specific task.`,
    "",
    "Before any queue-meta work (counting issues, signaling Chef,",
    "commenting on stale items), check whether you have issues assigned",
    "to YOU specifically with status in_progress or todo. Those are",
    "your direct work — handle the highest-priority one first.",
    "",
    "If you have no assigned work, then run your standard heartbeat",
    "protocol from your work-instructions memory block.",
    "",
    "──────────────────────────────────────────────────────────",
    fallbackUserMessage,
  ].join("\n");
}

// ── Goal tool proxy helpers ───────────────────────────────────────────────

async function proxyGoalToolCall(
  ctx: AdapterExecutionContext,
  toolName: string,
  args: Record<string, unknown>,
): Promise<void> {
  const env = buildPaperclipEnv(ctx.agent);
  const apiUrl = env.DOER_API_URL;
  if (!apiUrl) {
    console.warn(`[letta-cloud] No DOER_API_URL resolved; cannot proxy goal tool ${toolName}`);
    return;
  }

  const base = apiUrl.replace(/\/+$/, "");
  const companyId = ctx.agent.companyId;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(ctx.authToken ? { Authorization: `Bearer ${ctx.authToken}` } : {}),
  };

  try {
    if (toolName === READ_GOALS_TOOL_NAME) {
      const params = new URLSearchParams();
      if (typeof args.level === "string") params.set("level", args.level);
      if (typeof args.status === "string") params.set("status", args.status);
      const qs = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(`${base}/api/companies/${companyId}/goals${qs}`, { headers });
      const goals = await res.json();
      console.info(`[letta-cloud] read_goals returned ${Array.isArray(goals) ? goals.length : "?"} goals`);
    } else if (toolName === CREATE_GOAL_TOOL_NAME) {
      const body = {
        title: args.title,
        description: args.description,
        level: args.level,
        parentId: args.parent_id ?? null,
        ownerAgentId: args.owner_agent_id ?? null,
        status: "active",
      };
      const res = await fetch(`${base}/api/companies/${companyId}/goals`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      const goal = await res.json();
      console.info(`[letta-cloud] create_goal created: ${goal?.id ?? "?"} — ${goal?.title ?? "?"}`);
    } else if (toolName === UPDATE_GOAL_STATUS_TOOL_NAME) {
      const goalId = args.goal_id;
      if (!goalId || typeof goalId !== "string") {
        console.warn(`[letta-cloud] update_goal_status missing goal_id`);
        return;
      }
      const res = await fetch(`${base}/api/goals/${goalId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: args.status }),
      });
      const goal = await res.json();
      console.info(`[letta-cloud] update_goal_status: ${goal?.id ?? "?"} → ${goal?.status ?? "?"}`);
    }
  } catch (err) {
    console.warn(`[letta-cloud] goal tool proxy failed for ${toolName}:`, err instanceof Error ? err.message : err);
  }
}

async function ensureGoalToolsAttached(
  config: LettaCloudAdapterConfig,
  agentId: string,
  snapshot: Awaited<ReturnType<typeof import("./letta-client.js").fetchAgentSnapshot>>,
): Promise<void> {
  if (goalToolsVerifiedAgents.has(agentId)) return;
  try {
    const { readGoalsId, createGoalId, updateGoalStatusId } = await ensureGoalTools(config);
    const attachedIds = new Set(snapshot.tools.map((t) => t.id));
    await Promise.all([
      !attachedIds.has(readGoalsId) ? attachTool(config, readGoalsId) : Promise.resolve(),
      !attachedIds.has(createGoalId) ? attachTool(config, createGoalId) : Promise.resolve(),
      !attachedIds.has(updateGoalStatusId) ? attachTool(config, updateGoalStatusId) : Promise.resolve(),
    ]);
    goalToolsVerifiedAgents.add(agentId);
  } catch (err) {
    console.warn(`[letta-cloud] Could not ensure goal tools for agent ${agentId}:`, err instanceof Error ? err.message : err);
  }
}

async function ensurePaperclipIssueToolsAttached(
  config: LettaCloudAdapterConfig,
  agentId: string,
  snapshot: Awaited<ReturnType<typeof fetchAgentSnapshot>>,
): Promise<void> {
  if (paperclipIssueToolsVerifiedAgents.has(agentId)) return;
  try {
    const { createIssueId, readIssuesId, readIssueId, updateIssueId, postCommentId } = await ensurePaperclipIssueTools(config);
    const currentIds = snapshot.tools.map((t) => t.id);
    await attachToolsBatch(config, currentIds, [createIssueId, readIssuesId, readIssueId, updateIssueId, postCommentId]);
    paperclipIssueToolsVerifiedAgents.add(agentId);
  } catch (err) {
    console.warn(`[letta-cloud] Could not ensure paperclip issue tools for agent ${agentId}:`, err instanceof Error ? err.message : err);
  }
}

async function ensureWriteOutputToolAttached(
  config: LettaCloudAdapterConfig,
  agentId: string,
  snapshot: Awaited<ReturnType<typeof fetchAgentSnapshot>>,
): Promise<void> {
  if (writeOutputToolVerifiedAgents.has(agentId)) return;
  try {
    const toolId = await ensureWriteOutputTool(config);
    const attachedIds = new Set(snapshot.tools.map((t) => t.id));
    if (!attachedIds.has(toolId)) {
      await attachTool(config, toolId);
    }
    writeOutputToolVerifiedAgents.add(agentId);
  } catch (err) {
    console.warn(`[letta-cloud] Could not ensure write_output for agent ${agentId}:`, err instanceof Error ? err.message : err);
  }
}

// ── Emit helpers — one JSON line per stdout write ──────────────────────────
// The UI parser (`parseLettaCloudStdoutLine`) will parse these back into
// TranscriptEntry objects for the real-time dashboard transcript.

async function emit(ctx: AdapterExecutionContext, payload: Record<string, unknown>): Promise<void> {
  const entry = { ts: new Date().toISOString(), ...payload };
  await ctx.onLog("stdout", JSON.stringify(entry) + "\n");
}

// ── Streaming execution ───────────────────────────────────────────────────

async function executeStreaming(
  ctx: AdapterExecutionContext,
  config: LettaCloudAdapterConfig,
  userMessage: string,
): Promise<AdapterExecutionResult> {
  const client = getLettaClient(config);

  // Self-heal: make sure produce_deliverable is attached before we
  // start streaming. First wake per agent per server lifetime does
  // the verification; subsequent wakes are cached. See
  // ensureDeliverableToolAttached for rationale.
  await ensureDeliverableToolAttached(ctx, config);

  // Self-heal: ensure goal tools + paperclip issue tools + new orchestration
  // tools are attached BEFORE streaming so the agent can call them on this
  // wake. Goal and new tools are low-risk voids; paperclip tools are awaited
  // so the agent sees them immediately.
  const snapshot = await fetchAgentSnapshot(config).catch(() => null);
  if (snapshot) {
    void ensureGoalToolsAttached(config, config.agentId, snapshot);
    void ensureNewToolsAttached(ctx, config, snapshot);
    void ensureWriteOutputToolAttached(config, config.agentId, snapshot);
    await ensurePaperclipIssueToolsAttached(config, config.agentId, snapshot);
  }

  // Stream-token accumulator — uses the shared StreamTokenBuffer from
  // adapter-utils (see doc/plans/2026-07-31-acp-a2a-trajectory-analysis.md).
  const streamBuffer = new StreamTokenBuffer();

  // Trajectory accumulator: every emitted JSON-line is collected here
  // so the full session transcript can be returned in resultJson
  // for cross-harness "dreaming" and memory formation.
  const trajectory: Array<Record<string, unknown>> = [];
  const emitTracked = async (payload: Record<string, unknown>): Promise<void> => {
    const entry = { ts: new Date().toISOString(), ...payload };
    await ctx.onLog("stdout", JSON.stringify(entry) + "\n");
    trajectory.push(entry);
  };

  // Streamable Letta message_types — anything else is a logical break and
  // forces the buffer to drain BEFORE we run that event's handler so the
  // ordering of events the UI sees stays correct (assistant text before
  // the tool call it triggered, etc.).
  const STREAMABLE_TYPES = new Set(["assistant_message", "reasoning_message"]);

  async function flushAndEmit(): Promise<void> {
    const flushed = streamBuffer.flush();
    if (flushed) {
      await emitTracked({ type: flushed.type, content: flushed.content });
    }
  }

  async function appendAndEmit(kind: "assistant" | "reasoning", text: string): Promise<void> {
    if (!text) return;
    const flushed = streamBuffer.appendDelta(kind, text);
    if (flushed) {
      await emitTracked({ type: flushed.type, content: flushed.content });
    }
  }

  // Emit the user message so the transcript shows the full conversation
  await emitTracked({ type: "user_message", content: userMessage });

  const stream = await client.agents.messages.create(config.agentId, {
    messages: [{ role: "user", content: userMessage }],
    streaming: true,
    stream_tokens: true,
  });

  let inputTokens = 0;
  let outputTokens = 0;
  let cachedTokens = 0;
  let stepCount = 0;
  // Cost reported by Letta itself, if it ever starts reporting one. When
  // present it always wins over the rate-card estimate.
  let providerCostUsd: number | null = null;

  // Accumulator for async-fire work triggered by tool calls we intercept
  // (notably `produce_deliverable`). We await all of these after the
  // Letta stream closes so the adapter doesn't return before file uploads
  // finish — otherwise the caller could see a "run complete" event before
  // the deliverable row is inserted.
  const pendingSideEffects: Promise<void>[] = [];

  // Letta Cloud streams tool call arguments in fragments (one JSON chunk per
  // streaming event). The first event carries the tool name; subsequent events
  // carry the remaining JSON fragments (with no name field). We buffer the
  // raw args string per toolCallId so we fire intercepts only after the
  // complete argument object is assembled — not on the first partial chunk.
  const pendingToolCallArgs = new Map<string, { name: string; rawArgs: string }>();

  // Stream-token buffer, trajectory accumulator, emitTracked, flushAndEmit,
  // and appendAndEmit are all declared above (before the user_message emit).

  for await (const chunk of stream) {
    const rec = chunk as unknown as Record<string, unknown>;
    const messageType = String(rec.message_type ?? "");

    // Debug: log raw message type so we can see what Letta is sending
    if (messageType === "tool_call_message") {
      const tc0 = Array.isArray(rec.tool_calls) ? rec.tool_calls[0] : rec.tool_call;
      const tcRec = tc0 as Record<string, unknown> | null | undefined;
      const tcName = tcRec ? String(tcRec.name ?? tcRec.function ?? "?") : "no-tc";
      const tcArgs = tcRec ? safeStringify(tcRec.arguments ?? tcRec.input ?? tcRec).slice(0, 120) : "";
      await ctx.onLog("stdout", `[letta-cloud/tool_call] name=${tcName} args=${tcArgs}\n`);
    }

    // Drain accumulated streaming chunks before any non-streamable event
    // so the consumer sees them in the correct interleaved order.
    if (!STREAMABLE_TYPES.has(messageType) && streamBuffer.isBuffered) {
      await flushAndEmit();
    }

    switch (messageType) {
      case "assistant_message": {
        const text = extractAssistantContent(rec.content);
        await appendAndEmit("assistant", text);
        break;
      }

      case "reasoning_message": {
        const reasoning =
          typeof rec.reasoning === "string" ? rec.reasoning : "";
        await appendAndEmit("reasoning", reasoning);
        break;
      }

      case "hidden_reasoning_message": {
        // Redacted reasoning — emit as a single line, not buffered. The
        // pre-loop drain already flushed any pending streamable chunks.
        await emitTracked({
          type: "reasoning_message",
          content: "(reasoning redacted by model)",
        });
        break;
      }

      case "tool_call_message": {
        // Prefer tool_calls array (new SDK), fall back to deprecated tool_call.
        // IMPORTANT: use length check — Letta Cloud sometimes sends tool_calls=[]
        // (empty array, not null) while the real data is in tool_call (singular).
        // The ?? operator won't fall back because [] is not null/undefined.
        const rawToolCallsArr = Array.isArray(rec.tool_calls) ? rec.tool_calls as unknown[] : null;
        const toolCalls = rawToolCallsArr && rawToolCallsArr.length > 0
          ? rawToolCallsArr
          : rec.tool_call ? [rec.tool_call] : [];
        if (Array.isArray(toolCalls)) {
          for (const tc of toolCalls) {
            const call = tc as Record<string, unknown>;
            const name = typeof call.name === "string" ? call.name : "unknown";
            const toolCallId = typeof call.tool_call_id === "string" ? call.tool_call_id : undefined;
            // Extract the raw argument string — may be a partial JSON fragment
            // in streaming mode. We use the raw string for buffering and fall back
            // to the parsed representation only for non-streaming tools.
            const rawArgStr = typeof (call.arguments ?? call.input) === "string"
              ? String(call.arguments ?? call.input ?? "")
              : "";
            const input = parseToolArgs(call.arguments ?? call.input);
            await emitTracked({ type: "tool_call_message", name, input, toolCallId });

            // Interception: when the agent calls `produce_deliverable`,
            // Letta's sandbox runs a no-op stub. The REAL work happens
            // here — we decode the base64 file bytes and POST to the
            // Doer server on localhost. Fire-and-track: don't block the
            // stream, but await at the end so the run doesn't "finish"
            // before the deliverable row exists.
            if (
              name === DELIVERABLE_TOOL_NAME &&
              input &&
              typeof input === "object" &&
              !Array.isArray(input)
            ) {
              pendingSideEffects.push(
                postDeliverableFromToolCall(ctx, input as Record<string, unknown>),
              );
            }

            // Interception: goal tool stubs — proxy to Doer API
            if (
              (name === READ_GOALS_TOOL_NAME || name === CREATE_GOAL_TOOL_NAME || name === UPDATE_GOAL_STATUS_TOOL_NAME) &&
              input &&
              typeof input === "object" &&
              !Array.isArray(input)
            ) {
              pendingSideEffects.push(
                proxyGoalToolCall(ctx, name, input as Record<string, unknown>),
              );
            }

            // ── Streaming-aware intercepts for paperclip/fleet tools ─────────
            // Letta Cloud streams args as fragments (one JSON chunk per event).
            // The FIRST event carries the tool name + opening brace; subsequent
            // events carry more fields. We buffer raw args per toolCallId and
            // fire the interceptor only after tool_return_message signals the
            // complete call is done — guaranteeing complete args.
            const BUFFERED_TOOL_NAMES = new Set([
              GET_FLEET_STATUS_TOOL_NAME,
              SCHEDULE_COUNCIL_TOOL_NAME,
              EMERGENCY_PAUSE_AGENT_TOOL_NAME,
              CLONE_FROM_TEMPLATE_TOOL_NAME,
              BULK_DISPATCH_TOOL_NAME,
              REASSIGN_TASK_TOOL_NAME,
              FORECAST_CAPACITY_TOOL_NAME,
              BUILD_DEPENDENCY_GRAPH_TOOL_NAME,
              ANALYZE_ISSUE_PATTERNS_TOOL_NAME,
              SCAN_FLEET_ANOMALIES_TOOL_NAME,
              AUDIT_AGENT_COMPLIANCE_TOOL_NAME,
              GENERATE_WEEKLY_BRIEF_TOOL_NAME,
              CREATE_PAPERCLIP_ISSUE_TOOL_NAME,
              READ_PAPERCLIP_ISSUES_TOOL_NAME,
              READ_PAPERCLIP_ISSUE_TOOL_NAME,
              UPDATE_PAPERCLIP_ISSUE_TOOL_NAME,
              POST_ISSUE_COMMENT_TOOL_NAME,
            ]);
            if (toolCallId) {
              if (BUFFERED_TOOL_NAMES.has(name)) {
                // First fragment: initialize the buffer
                pendingToolCallArgs.set(toolCallId, { name, rawArgs: rawArgStr });
              } else if (pendingToolCallArgs.has(toolCallId)) {
                // Subsequent fragments: accumulate
                pendingToolCallArgs.get(toolCallId)!.rawArgs += rawArgStr;
              }
            }
          }
        }
        break;
      }

      case "tool_return_message": {
        const toolReturn = typeof rec.tool_return === "string" ? rec.tool_return : safeStringify(rec.tool_return);
        const toolCallId = typeof rec.tool_call_id === "string" ? rec.tool_call_id : "";
        const status = typeof rec.status === "string" ? rec.status : "success";
        const toolName = typeof rec.name === "string" ? rec.name : undefined;
        await emitTracked({
          type: "tool_return_message",
          content: toolReturn,
          toolCallId,
          isError: status === "error" || rec.is_err === true,
          name: toolName,
        });

        // Fire buffered intercept now that we have complete args.
        // The buffer was populated incrementally across streaming tool_call_message
        // events; the tool_return_message signals all fragments have arrived.
        if (toolCallId && pendingToolCallArgs.has(toolCallId)) {
          const { name: bufferedName, rawArgs } = pendingToolCallArgs.get(toolCallId)!;
          pendingToolCallArgs.delete(toolCallId);
          const completeInput = parseToolArgs(rawArgs);
          const interceptors: Record<string, (ctx: AdapterExecutionContext, args: Record<string, unknown>) => Promise<string | void>> = {
            [GET_FLEET_STATUS_TOOL_NAME]: interceptGetFleetStatus,
            [SCHEDULE_COUNCIL_TOOL_NAME]: interceptScheduleCouncil,
            [EMERGENCY_PAUSE_AGENT_TOOL_NAME]: interceptEmergencyPauseAgent,
            [CLONE_FROM_TEMPLATE_TOOL_NAME]: interceptCloneFromTemplate,
            [BULK_DISPATCH_TOOL_NAME]: interceptBulkDispatch,
            [REASSIGN_TASK_TOOL_NAME]: interceptReassignTask,
            [FORECAST_CAPACITY_TOOL_NAME]: interceptForecastCapacity,
            [BUILD_DEPENDENCY_GRAPH_TOOL_NAME]: interceptBuildDependencyGraph,
            [ANALYZE_ISSUE_PATTERNS_TOOL_NAME]: interceptAnalyzeIssuePatterns,
            [SCAN_FLEET_ANOMALIES_TOOL_NAME]: interceptScanFleetAnomalies,
            [AUDIT_AGENT_COMPLIANCE_TOOL_NAME]: interceptAuditAgentCompliance,
            [GENERATE_WEEKLY_BRIEF_TOOL_NAME]: interceptGenerateWeeklyBrief,
            [CREATE_PAPERCLIP_ISSUE_TOOL_NAME]: interceptCreatePaperclipIssue,
            [READ_PAPERCLIP_ISSUES_TOOL_NAME]: interceptReadPaperclipIssues,
            [READ_PAPERCLIP_ISSUE_TOOL_NAME]: interceptReadPaperclipIssue,
            [UPDATE_PAPERCLIP_ISSUE_TOOL_NAME]: interceptUpdatePaperclipIssue,
            [POST_ISSUE_COMMENT_TOOL_NAME]: interceptPostIssueComment,
            [WRITE_OUTPUT_TOOL_NAME]: interceptWriteOutput,
          };
          const fn = interceptors[bufferedName];
          if (fn && completeInput && typeof completeInput === "object" && !Array.isArray(completeInput)) {
            await ctx.onLog("stdout", `[letta-cloud/intercept] FIRING ${bufferedName} args=${JSON.stringify(completeInput).slice(0, 300)}\n`);
            pendingSideEffects.push(
              fn(ctx, completeInput as Record<string, unknown>)
                .then(() => undefined)
                .catch((err: unknown) => {
                  void ctx.onLog("stderr", `[letta-cloud/intercept] ERROR in ${bufferedName}: ${String(err)}\n`);
                }),
            );
          }
        }
        break;
      }

      case "system_message": {
        const text = typeof rec.content === "string" ? rec.content : "";
        if (text) {
          await emitTracked({ type: "system_message", content: text });
        }
        break;
      }

      case "usage_statistics": {
        inputTokens = typeof rec.prompt_tokens === "number" ? rec.prompt_tokens : inputTokens;
        outputTokens = typeof rec.completion_tokens === "number" ? rec.completion_tokens : outputTokens;
        cachedTokens = typeof rec.cached_input_tokens === "number" ? rec.cached_input_tokens : cachedTokens;
        stepCount = typeof rec.step_count === "number" ? rec.step_count : stepCount;
        // Prefer a provider-reported cost if Letta ever sends one.
        const reportedCost =
          typeof rec.cost_usd === "number" ? rec.cost_usd
          : typeof rec.total_cost_usd === "number" ? rec.total_cost_usd
          : null;
        if (reportedCost != null && Number.isFinite(reportedCost)) {
          providerCostUsd = reportedCost;
        }
        // Letta doesn't report cost — estimate from the rate card so the
        // UI can show a live spend figure. Null when the model is unknown.
        const runCost = computeRunCost({
          model: config.model,
          usage: { inputTokens, outputTokens, cachedTokens },
          providerCostUsd,
        });
        // Emit a result summary so the UI can show tokens/cost
        await emitTracked({
          type: "usage_statistics",
          inputTokens,
          outputTokens,
          cachedTokens,
          stepCount,
          totalTokens: typeof rec.total_tokens === "number" ? rec.total_tokens : inputTokens + outputTokens,
          model: config.model,
          ...(runCost
            ? { costUsd: runCost.costUsd, costEstimated: runCost.costEstimated }
            : {}),
        });
        break;
      }

      case "error_message": {
        const errMsg = typeof rec.message === "string" ? rec.message : "Unknown Letta error";
        const detail = typeof rec.detail === "string" ? rec.detail : undefined;
        await ctx.onLog("stderr", `[letta-cloud] ${errMsg}${detail ? `: ${detail}` : ""}\n`);
        break;
      }

      case "stop_reason": {
        // Final event — log it but don't need to emit to transcript
        const reason = typeof rec.stop_reason === "string" ? rec.stop_reason : "unknown";
        await emitTracked({ type: "stop_reason", reason });
        break;
      }

      case "ping":
        // Keepalive — skip silently
        break;

      default:
        // Unknown message type — emit as raw stdout for debugging
        await emitTracked({ type: "unknown", messageType, raw: safeStringify(rec) });
        break;
    }
  }

  // Final drain of the streaming accumulator — there may be a trailing
  // assistant_message or reasoning_message that wasn't followed by a
  // non-streamable event before the stream closed.
  if (streamBuffer.isBuffered) {
    await flushAndEmit();
  }

  // Drain any pending deliverable uploads before reporting success. We
  // use Promise.allSettled so a failing upload doesn't reject the whole
  // run — individual failures already log to stderr via ctx.onLog.
  if (pendingSideEffects.length > 0) {
    await Promise.allSettled(pendingSideEffects);
  }

  // Final cost: provider-reported wins; otherwise estimate from the rate
  // card. Unknown model → omit cost entirely (never fabricate spend).
  const finalCost = computeRunCost({
    model: config.model,
    usage: { inputTokens, outputTokens, cachedTokens },
    providerCostUsd,
  });

  return {
    exitCode: 0,
    signal: null,
    timedOut: false,
    model: config.model,
    provider: "letta",
    usage: {
      inputTokens,
      outputTokens,
      cachedInputTokens: cachedTokens,
    },
    ...(finalCost
      ? {
          costUsd: finalCost.costUsd,
          ...(finalCost.costEstimated ? { costEstimated: true } : {}),
        }
      : {}),
    resultJson: {
      exitCode: 0,
      stepCount,
      trajectory,
    },
  };
}

// ── Main entry point ──────────────────────────────────────────────────────

export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const config = ctx.config as unknown as LettaCloudAdapterConfig;

  if (!config.agentId || !config.apiKey) {
    await ctx.onLog("stderr", "[letta-cloud] Missing agentId or apiKey in adapter config\n");
    return { exitCode: 1, signal: null, timedOut: false };
  }

  // Resolve the base user message: explicit override (context.message
  // or context.prompt) → rendered heartbeatPrompt template → "Hello".
  // This becomes the QUEUE-REVIEW body if no task is assigned to this
  // wake; in TASK MODE it's discarded (issue body is the instruction).
  let baseMessage =
    typeof ctx.context.message === "string"
      ? ctx.context.message
      : typeof ctx.context.prompt === "string"
        ? ctx.context.prompt
        : null;

  if (!baseMessage) {
    const heartbeatPrompt = config.heartbeatPrompt?.trim();
    if (heartbeatPrompt) {
      const templateData = {
        agentId: ctx.agent?.id ?? "",
        agentName: ctx.agent?.name ?? "",
        agent: ctx.agent ?? { id: "", name: "" },
        runId: ctx.runId ?? "",
        run: { id: ctx.runId ?? "" },
        context: ctx.context ?? {},
      };
      baseMessage = renderTemplate(heartbeatPrompt, templateData);
    } else {
      baseMessage = "Hello";
    }
  }

  // Wrap the base message in a TASK-MODE header (if context names a
  // task) or a QUEUE-REVIEW preamble. See `buildWakeMessage` for why.
  const userMessage = buildWakeMessage(ctx, baseMessage);

  try {
    await ctx.onMeta?.({
      adapterType: "letta_cloud",
      command: "letta-cloud",
      prompt: userMessage,
      context: { agentId: config.agentId, model: config.model },
    });

    return await executeStreaming(ctx, config, userMessage);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    await ctx.onLog("stderr", `[letta-cloud] Error: ${message}\n`);
    return { exitCode: 1, signal: null, timedOut: false, errorMessage: message };
  }
}
