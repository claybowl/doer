import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import Letta from "@letta-ai/letta-client";
import type { AdapterExecutionContext, AdapterExecutionResult } from "@doerai/adapter-utils";
import {
  readPaperclipRuntimeSkillEntries,
  resolvePaperclipDesiredSkillNames,
  readPaperclipSkillMarkdown,
} from "@doerai/adapter-utils/server-utils";
import type {
  LettaCodeAdapterConfig,
  LettaCodeOfflineConfig,
  LettaCodeOnlineConfig,
  LettaCodeMemoryBlock,
  LettaCodeMemoryUpdate,
} from "../shared/types.js";
import {
  CREATE_PAPERCLIP_ISSUE_TOOL_NAME,
  READ_PAPERCLIP_ISSUES_TOOL_NAME,
  READ_PAPERCLIP_ISSUE_TOOL_NAME,
  UPDATE_PAPERCLIP_ISSUE_TOOL_NAME,
  POST_ISSUE_COMMENT_TOOL_NAME,
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
} from "./tool-intercepts.js";

const __moduleDir = path.dirname(fileURLToPath(import.meta.url));

// ── Emit helpers ──────────────────────────────────────────────────────────
// Emits JSON lines in the same format as letta-cloud so the existing
// parseLettaCloudStdoutLine UI parser handles this adapter without changes.

async function emit(ctx: AdapterExecutionContext, payload: Record<string, unknown>): Promise<void> {
  await ctx.onLog("stdout", JSON.stringify(payload) + "\n");
}

function safeStringify(value: unknown): string {
  try { return JSON.stringify(value); } catch { return String(value); }
}

function parseToolArgs(args: unknown): Record<string, unknown> {
  if (typeof args === "string") {
    try { return JSON.parse(args) as Record<string, unknown>; } catch { return { raw: args }; }
  }
  return (args as Record<string, unknown> | null) ?? {};
}

// ── Offline tool registry ─────────────────────────────────────────────────
// Small set of headless actions available to all offline letta_code agents.
// These are wired into both Anthropic and OpenAI-compat loop paths below.

type ToolHandler = (
  ctx: AdapterExecutionContext,
  args: Record<string, unknown>,
  config: LettaCodeOfflineConfig,
) => Promise<string>;

const OFFLINE_TOOLS: Record<string, { description: string; parameters: Record<string, unknown>; handler: ToolHandler }> = {
  bash: {
    description: "Run a shell command in the agent workspace. Use for git, curl, ls, cat, npm, pnpm, etc. Prefer doer_api for Doer API calls.",
    parameters: {
      type: "object",
      properties: {
        command: { type: "string", description: "Shell command to execute" },
        timeout: { type: "number", description: "Timeout in milliseconds (default 30000)" },
        cwd: { type: "string", description: "Working directory. Defaults to the agent workspace root." },
      },
      required: ["command"],
    },
    handler: runBash,
  },
  read: {
    description: "Read a file from the agent workspace.",
    parameters: {
      type: "object",
      properties: {
        file_path: { type: "string", description: "Absolute or workspace-relative file path" },
        offset: { type: "number", description: "1-based start line" },
        limit: { type: "number", description: "Max lines to read" },
      },
      required: ["file_path"],
    },
    handler: readWorkspaceFile,
  },
  write: {
    description: "Write (overwrite) a file in the agent workspace.",
    parameters: {
      type: "object",
      properties: {
        file_path: { type: "string", description: "Absolute or workspace-relative file path" },
        content: { type: "string", description: "Full file content" },
      },
      required: ["file_path", "content"],
    },
    handler: writeWorkspaceFile,
  },
  edit: {
    description: "Replace an exact string in a file. Use read first to verify the current text.",
    parameters: {
      type: "object",
      properties: {
        file_path: { type: "string", description: "Absolute or workspace-relative file path" },
        old_string: { type: "string", description: "Exact text to replace" },
        new_string: { type: "string", description: "Replacement text" },
      },
      required: ["file_path", "old_string", "new_string"],
    },
    handler: editWorkspaceFile,
  },
  grep: {
    description: "Search file contents with a regex pattern.",
    parameters: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "Regex pattern" },
        path: { type: "string", description: "Directory or file to search (default agent workspace root)" },
        include: { type: "string", description: "Glob filter, e.g. '*.ts'" },
      },
      required: ["pattern"],
    },
    handler: grepWorkspace,
  },
  doer_api: {
    description: "Call the Doer API. Automatically uses the agent's DOER_API_KEY and DOER_RUN_ID from the execution environment.",
    parameters: {
      type: "object",
      properties: {
        method: { type: "string", description: "HTTP method (GET, POST, PATCH, DELETE)" },
        endpoint: { type: "string", description: "API path, e.g. /api/companies/ba1d.../issues" },
        body: { type: "object", description: "JSON request body" },
      },
      required: ["method", "endpoint"],
    },
    handler: doerApiCall,
  },
};

function resolveWorkspacePath(ctx: AdapterExecutionContext, config: LettaCodeOfflineConfig, raw: unknown): string {
  if (typeof raw !== "string" || !raw) throw new Error("file_path is required");
  if (path.isAbsolute(raw)) return raw;
  const cwd = typeof config.cwd === "string" ? config.cwd : (ctx.context.cwd as string | undefined);
  return cwd ? path.resolve(cwd, raw) : path.resolve(raw);
}

async function runBash(
  ctx: AdapterExecutionContext,
  args: Record<string, unknown>,
  config: LettaCodeOfflineConfig,
): Promise<string> {
  const command = String(args.command ?? "");
  if (!command) throw new Error("command is required");
  const timeout = typeof args.timeout === "number" ? args.timeout : 30000;
  const cwdRaw = typeof args.cwd === "string" && args.cwd ? args.cwd : config.cwd;
  const cwd = cwdRaw ? path.resolve(cwdRaw) : (ctx.context.cwd as string | undefined) ?? process.cwd();

  await ctx.onLog("stdout", `[bash] $ ${command}\n`);
  return new Promise((resolve) => {
    const child = execFile("/bin/sh", ["-c", command], { cwd, timeout, env: { ...process.env, ...getDoerEnv(ctx) } }, (err, stdout, stderr) => {
      const combined = stdout + (stderr ? `\n[stderr]\n${stderr}` : "");
      if (err) {
        resolve(`exit ${err.code ?? "unknown"}\n${combined}`);
      } else {
        resolve(combined || "(no output)");
      }
    });
    void ctx.onSpawn?.({ pid: child.pid ?? 0, startedAt: new Date().toISOString() });
  });
}

function getDoerEnv(ctx: AdapterExecutionContext): Record<string, string> {
  const env = ((ctx.config as Record<string, unknown>).env ?? {}) as Record<string, string>;
  const out: Record<string, string> = {};
  for (const key of ["DOER_API_KEY", "DOER_RUN_ID", "DOER_BASE_URL", "LETTA_MEMFS_DIR", "DOER_AGENT_MEMORY_DIR"]) {
    if (env[key]) out[key] = env[key];
  }
  return out;
}

async function readWorkspaceFile(
  ctx: AdapterExecutionContext,
  args: Record<string, unknown>,
  config: LettaCodeOfflineConfig,
): Promise<string> {
  const filePath = resolveWorkspacePath(ctx, config, args.file_path);
  const offset = typeof args.offset === "number" ? args.offset : 1;
  const limit = typeof args.limit === "number" ? args.limit : 200;
  const content = await readFile(filePath, "utf-8");
  const lines = content.split("\n");
  const start = Math.max(0, offset - 1);
  const end = Math.min(lines.length, start + limit);
  const header = offset > 1 || end < lines.length ? `[lines ${start + 1}-${end} of ${lines.length}]\n` : "";
  return header + lines.slice(start, end).join("\n");
}

async function writeWorkspaceFile(
  ctx: AdapterExecutionContext,
  args: Record<string, unknown>,
  config: LettaCodeOfflineConfig,
): Promise<string> {
  const filePath = resolveWorkspacePath(ctx, config, args.file_path);
  const content = String(args.content ?? "");
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf-8");
  return `wrote ${filePath} (${content.length} chars)`;
}

async function editWorkspaceFile(
  ctx: AdapterExecutionContext,
  args: Record<string, unknown>,
  config: LettaCodeOfflineConfig,
): Promise<string> {
  const filePath = resolveWorkspacePath(ctx, config, args.file_path);
  const oldString = String(args.old_string ?? "");
  const newString = String(args.new_string ?? "");
  if (!oldString) throw new Error("old_string is required");
  const content = await readFile(filePath, "utf-8");
  if (!content.includes(oldString)) throw new Error(`old_string not found in ${filePath}`);
  if (content.split(oldString).length > 2) throw new Error(`old_string appears multiple times in ${filePath}; use a more specific string`);
  const updated = content.replace(oldString, newString);
  await writeFile(filePath, updated, "utf-8");
  return `edited ${filePath}`;
}

async function grepWorkspace(
  ctx: AdapterExecutionContext,
  args: Record<string, unknown>,
  config: LettaCodeOfflineConfig,
): Promise<string> {
  const pattern = String(args.pattern ?? "");
  if (!pattern) throw new Error("pattern is required");
  const rootRaw = typeof args.path === "string" && args.path ? args.path : config.cwd;
  const root = rootRaw ? path.resolve(rootRaw) : (ctx.context.cwd as string | undefined) ?? process.cwd();
  const include = typeof args.include === "string" ? args.include : "*";
  const regex = new RegExp(pattern, "gm");
  const results: string[] = [];
  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") continue;
        await walk(full);
      } else if (entry.isFile()) {
        if (include !== "*" && !entry.name.endsWith(include.replace(/^\*\./, "."))) continue;
        try {
          const content = await readFile(full, "utf-8");
          const matches = content.match(regex);
          if (matches && matches.length > 0) {
            results.push(`${full}: ${matches.length} match(es)`);
            const lines = content.split("\n");
            for (let i = 0; i < lines.length; i++) {
              if (regex.test(lines[i]!)) {
                results.push(`  ${i + 1}: ${lines[i]!.slice(0, 120)}`);
                regex.lastIndex = 0;
              }
            }
          }
        } catch { /* ignore unreadable files */ }
      }
    }
  }
  await walk(root);
  return results.length > 0 ? results.slice(0, 200).join("\n") : "no matches";
}

async function doerApiCall(
  ctx: AdapterExecutionContext,
  args: Record<string, unknown>,
  _config: LettaCodeOfflineConfig,
): Promise<string> {
  const method = String(args.method ?? "GET").toUpperCase();
  const endpoint = String(args.endpoint ?? "");
  if (!endpoint) throw new Error("endpoint is required");
  const env = getDoerEnv(ctx);
  const baseUrl = env.DOER_BASE_URL?.replace(/\/$/, "") || "http://127.0.0.1:3100";
  const url = `${baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (env.DOER_API_KEY) headers.Authorization = `Bearer ${env.DOER_API_KEY}`;
  if (env.DOER_RUN_ID) headers["X-Doer-Run-Id"] = env.DOER_RUN_ID;

  const init: RequestInit = {
    method,
    headers,
    ...(method !== "GET" && method !== "DELETE" && args.body ? { body: JSON.stringify(args.body) } : {}),
  };

  const res = await fetch(url, init);
  const text = await res.text();
  return `${res.status} ${res.statusText}\n${text.slice(0, 4000)}`;
}

function buildOfflineToolInstructions(): string {
  const lines = [
    "## Available Tools",
    "",
    "You MUST use these tools to gather information and take action. Do not just describe plans — execute them by calling tools. You may chain multiple tool calls in a row until the task is complete.",
    "",
    "### Tools",
  ];
  for (const [name, tool] of Object.entries(OFFLINE_TOOLS)) {
    lines.push(`- **${name}**: ${tool.description}`);
  }
  lines.push("");
  lines.push("### Tool-use rules");
  lines.push("1. When asked to create, read, update, or search anything in Doer, call `doer_api`.");
  lines.push("2. When asked to read or edit files in the workspace, call `read`/`write`/`edit`/`grep`.");
  lines.push("3. When asked to run a shell command (git, curl for non-Doer APIs, ls, npm), call `bash`.");
  lines.push("4. Do not respond with 'I will do X'. Actually call the tool and do X.");
  lines.push("5. After a tool returns, inspect the result. If the task is not complete, call the next tool immediately.");
  lines.push("");
  lines.push("### doer_api examples");
  lines.push('```json');
  lines.push('{ "name": "doer_api", "arguments": { "method": "GET", "endpoint": "/api/companies/ba1dcf35-9204-4273-97ad-2791577351cb/issues" } }');
  lines.push('{ "name": "doer_api", "arguments": { "method": "POST", "endpoint": "/api/companies/ba1dcf35-9204-4273-97ad-2791577351cb/issues", "body": { "title": "New task", "description": "Details" } } }');
  lines.push('{ "name": "doer_api", "arguments": { "method": "POST", "endpoint": "/api/companies/ba1dcf35-9204-4273-97ad-2791577351cb/issues/b9b441e2-7952-4344-afe2-a3a1f7d01804/comments", "body": { "content": "Done." } } }');
  lines.push("```");
  return lines.join("\n");
}

function extractTextContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((p: unknown) => {
        if (typeof p === "string") return p;
        const r = p as Record<string, unknown> | null;
        return r && typeof r.text === "string" ? r.text : "";
      })
      .filter(Boolean)
      .join("");
  }
  return "";
}

// ── User message builder ──────────────────────────────────────────────────

function readNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Mirror of letta-cloud's buildWakeMessage. Two modes:
 *  - TASK MODE: context has taskKey/taskId/issueId — sends a directive header
 *    with the issue body so the agent executes a specific task.
 *  - QUEUE REVIEW MODE: no task key — wraps the heartbeatPrompt with a preamble.
 */
function buildWakeMessage(ctx: AdapterExecutionContext, fallbackUserMessage: string): string {
  const context = (ctx.context ?? {}) as Record<string, unknown>;
  const taskKey =
    readNonEmptyString(context.taskKey) ??
    readNonEmptyString(context.taskId) ??
    readNonEmptyString(context.issueId);
  const wakeReason = readNonEmptyString(context.wakeReason) ?? "unspecified";
  const wakeCommentId = readNonEmptyString(context.wakeCommentId);
  const agentName = ctx.agent?.name ?? "agent";

  if (taskKey) {
    const issueTitle = readNonEmptyString(context.issueTitle);
    const issueDescription = readNonEmptyString(context.issueDescription);
    const lines = [
      "[DOER HEARTBEAT — TASK MODE]",
      "You have been assigned a specific task. Focus on it.",
      "",
      `YOUR TASK: ${taskKey}`,
    ];
    if (issueTitle) lines.push(`TITLE: ${issueTitle}`);
    lines.push(`WAKE REASON: ${wakeReason}`);
    if (wakeCommentId) lines.push(`TRIGGERING COMMENT: ${wakeCommentId}`);
    if (issueDescription) {
      lines.push(
        "",
        "── ISSUE BODY ──────────────────────────────────────────",
        issueDescription.trim(),
        "────────────────────────────────────────────────────────",
      );
    } else {
      lines.push("", `Read the issue body for ${taskKey} and execute its instructions.`);
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

  // QUEUE REVIEW MODE
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

function buildUserMessage(
  ctx: AdapterExecutionContext,
  heartbeatPrompt: string | undefined,
): string {
  if (typeof ctx.context.message === "string" && ctx.context.message) return ctx.context.message;
  if (typeof ctx.context.prompt === "string" && ctx.context.prompt) return ctx.context.prompt;
  const base = heartbeatPrompt?.trim() || "Hello";
  return buildWakeMessage(ctx, base);
}

// ─────────────────────────────────────────────────────────────────────────────
// ONLINE MODE — delegates to the Letta server (api.letta.com or self-hosted)
// ─────────────────────────────────────────────────────────────────────────────

const LETTA_CLOUD_BASE = "https://api.letta.com";

function getLettaClient(config: LettaCodeOnlineConfig): Letta {
  const raw = config.baseUrl?.trim() || LETTA_CLOUD_BASE;
  // Strip trailing /v1 — the SDK appends its own version path
  const baseURL = raw.replace(/\/v\d+\/?$/, "");
  const isLocal = baseURL.includes("localhost") || baseURL.includes("127.0.0.1");
  return new Letta({
    apiKey: config.apiKey || (isLocal ? "sk-local" : ""),
    baseURL,
  });
}

async function executeOnline(
  ctx: AdapterExecutionContext,
  config: LettaCodeOnlineConfig,
): Promise<AdapterExecutionResult> {
  if (!config.agentId || !config.apiKey) {
    await ctx.onLog("stderr", "[letta-code/online] Missing agentId or apiKey\n");
    return { exitCode: 1, signal: null, timedOut: false, errorMessage: "agentId and apiKey required for online mode" };
  }

  const userMessage = buildUserMessage(ctx, config.heartbeatPrompt);

  await ctx.onMeta?.({
    adapterType: "letta_code",
    command: "letta-code/online",
    prompt: userMessage,
    context: { mode: "online", agentId: config.agentId, baseUrl: config.baseUrl ?? LETTA_CLOUD_BASE },
  });

  await emit(ctx, { type: "user_message", content: userMessage });

  const client = getLettaClient(config);
  let inputTokens = 0;
  let outputTokens = 0;
  let stepCount = 0;

  // Side effects fired by intercepts — await after stream closes
  const pendingSideEffects: Promise<void>[] = [];
  // Buffer streaming arg fragments per toolCallId; fire intercept on tool_return
  const pendingToolCallArgs = new Map<string, { name: string; rawArgs: string }>();
  const BUFFERED_TOOL_NAMES = new Set([
    GET_FLEET_STATUS_TOOL_NAME, SCHEDULE_COUNCIL_TOOL_NAME, EMERGENCY_PAUSE_AGENT_TOOL_NAME,
    CLONE_FROM_TEMPLATE_TOOL_NAME, BULK_DISPATCH_TOOL_NAME, REASSIGN_TASK_TOOL_NAME,
    FORECAST_CAPACITY_TOOL_NAME, BUILD_DEPENDENCY_GRAPH_TOOL_NAME, ANALYZE_ISSUE_PATTERNS_TOOL_NAME,
    SCAN_FLEET_ANOMALIES_TOOL_NAME, AUDIT_AGENT_COMPLIANCE_TOOL_NAME, GENERATE_WEEKLY_BRIEF_TOOL_NAME,
    CREATE_PAPERCLIP_ISSUE_TOOL_NAME, READ_PAPERCLIP_ISSUES_TOOL_NAME, READ_PAPERCLIP_ISSUE_TOOL_NAME,
    UPDATE_PAPERCLIP_ISSUE_TOOL_NAME, POST_ISSUE_COMMENT_TOOL_NAME,
  ]);

  // Stream-token accumulator — merges consecutive same-kind chunks so the UI
  // doesn't split words across separate transcript nodes.
  type StreamKind = "assistant" | "reasoning";
  type StreamBuffer = { kind: StreamKind; messageId: string | null; text: string };
  let streamBuffer: StreamBuffer | null = null;

  async function flushStreamBuffer(): Promise<void> {
    if (!streamBuffer || streamBuffer.text.length === 0) { streamBuffer = null; return; }
    await emit(ctx, {
      type: streamBuffer.kind === "assistant" ? "assistant_message" : "reasoning_message",
      content: streamBuffer.text,
    });
    streamBuffer = null;
  }

  async function appendToStreamBuffer(kind: StreamKind, messageId: string | null, text: string): Promise<void> {
    if (!text) return;
    if (streamBuffer && (streamBuffer.kind !== kind || streamBuffer.messageId !== messageId)) {
      await flushStreamBuffer();
    }
    if (!streamBuffer) streamBuffer = { kind, messageId, text: "" };
    streamBuffer.text += text;
  }

  const STREAMABLE_TYPES = new Set(["assistant_message", "reasoning_message"]);

  try {
    const stream = await client.agents.messages.create(config.agentId, {
      messages: [{ role: "user", content: userMessage }],
      streaming: true,
      stream_tokens: true,
    });

    for await (const chunk of stream) {
      const rec = chunk as unknown as Record<string, unknown>;
      const messageType = String(rec.message_type ?? "");

      if (!STREAMABLE_TYPES.has(messageType) && streamBuffer) {
        await flushStreamBuffer();
      }

      switch (messageType) {
        case "assistant_message": {
          const text = extractTextContent(rec.content);
          const mid = typeof rec.id === "string" ? rec.id : null;
          await appendToStreamBuffer("assistant", mid, text);
          break;
        }
        case "reasoning_message": {
          const text = typeof rec.reasoning === "string" ? rec.reasoning : "";
          const mid = typeof rec.id === "string" ? rec.id : null;
          await appendToStreamBuffer("reasoning", mid, text);
          break;
        }
        case "tool_call_message": {
          // IMPORTANT: Letta Cloud sometimes sends tool_calls=[] (empty array) while
          // the real data is in tool_call (singular). ?? won't fall back because [] is
          // not null/undefined — use a length check.
          const rawArr = Array.isArray(rec.tool_calls) ? rec.tool_calls as unknown[] : null;
          const toolCalls = rawArr && rawArr.length > 0
            ? rawArr
            : rec.tool_call ? [rec.tool_call] : [];
          for (const tc of toolCalls) {
            const call = tc as Record<string, unknown>;
            const name = typeof call.name === "string" ? call.name : "unknown";
            const toolCallId = typeof call.tool_call_id === "string" ? call.tool_call_id : undefined;
            const rawArgStr = typeof (call.arguments ?? call.input) === "string"
              ? String(call.arguments ?? call.input ?? "") : "";
            const input = parseToolArgs(call.arguments ?? call.input);
            await emit(ctx, { type: "tool_call_message", name, input, toolCallId });
            // Buffer args for streaming-aware intercept tools
            if (toolCallId) {
              if (BUFFERED_TOOL_NAMES.has(name)) {
                pendingToolCallArgs.set(toolCallId, { name, rawArgs: rawArgStr });
              } else if (pendingToolCallArgs.has(toolCallId)) {
                pendingToolCallArgs.get(toolCallId)!.rawArgs += rawArgStr;
              }
            }
          }
          break;
        }
        case "tool_return_message": {
          const toolReturn = typeof rec.tool_return === "string" ? rec.tool_return : safeStringify(rec.tool_return);
          const toolCallId = typeof rec.tool_call_id === "string" ? rec.tool_call_id : "";
          const status = typeof rec.status === "string" ? rec.status : "success";
          await emit(ctx, {
            type: "tool_return_message",
            content: toolReturn,
            toolCallId,
            isError: status === "error" || rec.is_err === true,
          });
          // Fire buffered intercept now that complete args have arrived
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
            };
            const fn = interceptors[bufferedName];
            if (fn && completeInput && typeof completeInput === "object" && !Array.isArray(completeInput)) {
              await ctx.onLog("stdout", `[letta-code/intercept] FIRING ${bufferedName} args=${JSON.stringify(completeInput).slice(0, 300)}\n`);
              pendingSideEffects.push(
                fn(ctx, completeInput as Record<string, unknown>)
                  .then(() => undefined)
                  .catch((err: unknown) => {
                    void ctx.onLog("stderr", `[letta-code/intercept] ERROR in ${bufferedName}: ${String(err)}\n`);
                  }),
              );
            }
          }
          break;
        }
        case "usage_statistics": {
          inputTokens = typeof rec.prompt_tokens === "number" ? rec.prompt_tokens : inputTokens;
          outputTokens = typeof rec.completion_tokens === "number" ? rec.completion_tokens : outputTokens;
          stepCount = typeof rec.step_count === "number" ? rec.step_count : stepCount;
          await emit(ctx, {
            type: "usage_statistics",
            inputTokens,
            outputTokens,
            totalTokens: inputTokens + outputTokens,
            stepCount,
          });
          break;
        }
        case "error_message": {
          const errMsg = typeof rec.message === "string" ? rec.message : "Unknown Letta error";
          await ctx.onLog("stderr", `[letta-code/online] ${errMsg}\n`);
          break;
        }
        case "stop_reason":
          await emit(ctx, { type: "stop_reason", reason: rec.stop_reason ?? "unknown" });
          break;
        case "ping":
          break;
        default:
          await emit(ctx, { type: "unknown", messageType, raw: safeStringify(rec) });
      }
    }

    if (streamBuffer) await flushStreamBuffer();
    if (pendingSideEffects.length > 0) {
      await Promise.allSettled(pendingSideEffects);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await ctx.onLog("stderr", `[letta-code/online] Error: ${message}\n`);
    return { exitCode: 1, signal: null, timedOut: false, errorMessage: message };
  }

  return {
    exitCode: 0,
    signal: null,
    timedOut: false,
    model: config.model,
    provider: "letta",
    usage: { inputTokens, outputTokens },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// OFFLINE MODE — pure in-process, local .md files + any LLM backend
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_MODEL = "claude-sonnet-4-6";
const DEFAULT_MAX_TOKENS = 8192;

// ── Provider presets ────────────────────────────────────────────────────────
// Groq, NVIDIA NIM, Ollama (local + cloud), OpenCode Zen and OpenAI all speak
// the same /v1/chat/completions contract. One fetch path + this table covers
// every one of them. Anthropic is the only backend with its own SDK shape.
interface ProviderPreset {
  baseUrl: string;
  /** Env var holding the key. null = no key required (local Ollama). */
  envKey: string | null;
  label: string;
  /**
   * Whether this provider/backend reliably supports tool-calling.
   * false = degrade to full-body skill injection.
   * Anthropic is always true (handled separately in resolveSkillDelivery).
   */
  supportsTools: boolean;
}

const OPENAI_COMPAT_PRESETS: Record<string, ProviderPreset> = {
  openai:       { baseUrl: "https://api.openai.com/v1",           envKey: "OPENAI_API_KEY",   label: "OpenAI",         supportsTools: true  },
  groq:         { baseUrl: "https://api.groq.com/openai/v1",      envKey: "GROQ_API_KEY",     label: "Groq",           supportsTools: true  },
  nvidia:       { baseUrl: "https://integrate.api.nvidia.com/v1", envKey: "NVIDIA_API_KEY",   label: "NVIDIA NIM",     supportsTools: true  },
  opencode_zen: { baseUrl: "https://opencode.ai/zen/v1",          envKey: "OPENCODE_API_KEY", label: "OpenCode Zen",   supportsTools: false },
  ollama_cloud: { baseUrl: "https://ollama.com/v1",               envKey: "OLLAMA_API_KEY",   label: "Ollama Cloud",   supportsTools: true },
  ollama:       { baseUrl: "http://localhost:11434/v1",           envKey: null,               label: "Ollama (local)", supportsTools: false },
};

export interface ResolvedProvider {
  kind: "anthropic" | "openai_compat";
  baseUrl: string;
  /** null when a key is required but unset — caller surfaces the error. */
  apiKey: string | null;
  envKey: string | null;
  label: string;
  /** The raw provider key (e.g. "groq", "ollama"). null for anthropic. */
  providerKey: string | null;
}

/**
 * Resolve a provider config → concrete base URL + key. Key precedence:
 *   adapterConfig.apiKey → Doer env binding → process env → (ollama: placeholder)
 */
export function resolveProvider(
  config: { provider?: string; baseUrl?: string; apiKey?: string },
  env: Record<string, string>,
): ResolvedProvider {
  const provider = config.provider || "anthropic";
  if (provider === "anthropic") {
    return {
      kind: "anthropic",
      baseUrl: "https://api.anthropic.com",
      apiKey: config.apiKey || env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || null,
      envKey: "ANTHROPIC_API_KEY",
      label: "Anthropic",
      providerKey: null,
    };
  }
  const preset = OPENAI_COMPAT_PRESETS[provider] ?? OPENAI_COMPAT_PRESETS.openai;
  const fromEnv = preset.envKey ? env[preset.envKey] || process.env[preset.envKey] || "" : "";
  // Local Ollama needs no key; send a harmless placeholder so the header exists.
  const apiKey = config.apiKey || fromEnv || (preset.envKey === null ? "ollama" : "");
  return {
    kind: "openai_compat",
    baseUrl: config.baseUrl?.trim() || preset.baseUrl,
    apiKey: apiKey || null,
    envKey: preset.envKey,
    label: preset.label,
    providerKey: provider,
  };
}

/**
 * Decide how to deliver checked skills to this offline agent.
 * "loop"   → inject a skills manifest + expose read_skill tool; model pulls
 *             bodies on demand (progressive disclosure).
 * "inject" → inject all desired skill bodies into the system prompt at once,
 *             capped by SKILL_INJECT_CHAR_BUDGET.
 *
 * Precedence: explicit adapterConfig.skillToolCalls > provider default.
 * Anthropic always supports tools; local Ollama never does.
 */
export function resolveSkillDelivery(
  resolved: ResolvedProvider,
  config: { skillToolCalls?: "loop" | "inject" },
): "loop" | "inject" {
  if (config.skillToolCalls === "loop") return "loop";
  if (config.skillToolCalls === "inject") return "inject";
  if (resolved.kind === "anthropic") return "loop";
  const preset = resolved.providerKey ? OPENAI_COMPAT_PRESETS[resolved.providerKey] : null;
  return preset?.supportsTools ? "loop" : "inject";
}

export const SKILL_INJECT_CHAR_BUDGET = 12_000;

/**
 * Parse the name and description fields from YAML frontmatter at the top of a
 * SKILL.md. Only handles simple single-line values and ">" block scalars.
 * Returns empty strings for missing or absent frontmatter.
 */
export function parseFrontmatter(content: string): { name: string; description: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { name: "", description: "" };
  const block = match[1];

  function extractScalar(key: string): string {
    // "key: >\n  line one\n  line two" — check block scalar BEFORE simple
    const blockScalar = block.match(new RegExp(`^${key}:\\s*>\\n([\\s\\S]*?)(?=^\\S|$)`, "m"));
    if (blockScalar) {
      return blockScalar[1]
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .join(" ")
        .trim();
    }
    // "key: simple value"
    const simple = block.match(new RegExp(`^${key}:\\s+(.+)$`, "m"));
    if (simple) return simple[1].trim();
    return "";
  }

  return {
    name: extractScalar("name"),
    description: extractScalar("description"),
  };
}

/**
 * Build a manifest string listing available skills. Injected into the system
 * prompt for loop-mode delivery so the agent knows which skills exist and that
 * it should call read_skill to load a body before acting in that domain.
 */
export function buildSkillsManifest(
  skills: Array<{ name: string; description: string }>,
): string {
  if (skills.length === 0) return "";
  const lines = skills.map((s) => `- **${s.name || "(unnamed)"}** — ${s.description || "No description."}`);
  return [
    "## Available Skills",
    "",
    "The following skills are available to you. Call the `read_skill` tool with a",
    "skill name to load its full instructions before acting in its domain.",
    "",
    ...lines,
  ].join("\n");
}

/**
 * Build a full-body inject section for inject-mode delivery. Includes complete
 * SKILL.md content for each skill up to SKILL_INJECT_CHAR_BUDGET total chars.
 * Skills are included in order (required/priority first — caller is responsible
 * for ordering). Whole skills are dropped, never partially truncated.
 * Returns the section string and a list of dropped skill names.
 */
export function buildSkillsInjectSection(
  skills: Array<{ name: string; body: string }>,
  budgetChars = SKILL_INJECT_CHAR_BUDGET,
): { section: string; dropped: string[] } {
  if (skills.length === 0) return { section: "", dropped: [] };
  const included: Array<{ name: string; body: string }> = [];
  const dropped: string[] = [];
  let used = 0;

  for (const skill of skills) {
    if (used + skill.body.length <= budgetChars) {
      included.push(skill);
      used += skill.body.length;
    } else {
      dropped.push(skill.name || "(unnamed)");
    }
  }

  if (included.length === 0) return { section: "", dropped };

  const parts = ["## Skills", ""];
  for (const skill of included) {
    parts.push(`### ${skill.name || "(unnamed)"}`, "", skill.body.trim(), "");
  }

  return { section: parts.join("\n"), dropped };
}

/** Stream an OpenAI-compatible /chat/completions response. */
async function streamOpenAICompat(
  ctx: AdapterExecutionContext,
  resolved: ResolvedProvider,
  args: { model: string; maxTokens: number; temperature?: number; systemPrompt: string; userMessage: string },
): Promise<{ fullResponse: string; inputTokens: number; outputTokens: number }> {
  const url = `${resolved.baseUrl.replace(/\/$/, "")}/chat/completions`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(resolved.apiKey ? { Authorization: `Bearer ${resolved.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: args.model,
      max_tokens: args.maxTokens,
      temperature: args.temperature,
      stream: true,
      stream_options: { include_usage: true },
      messages: [
        { role: "system", content: args.systemPrompt },
        { role: "user", content: args.userMessage },
      ],
    }),
  });

  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    throw new Error(`${resolved.label} HTTP ${res.status}: ${body.slice(0, 300)}`);
  }

  let fullResponse = "";
  let inputTokens = 0;
  let outputTokens = 0;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      let json: Record<string, unknown>;
      try { json = JSON.parse(data); } catch { continue; }
      const choices = json.choices as Array<{ delta?: { content?: string } }> | undefined;
      const delta = choices?.[0]?.delta?.content;
      if (typeof delta === "string" && delta) {
        fullResponse += delta;
        await emit(ctx, { type: "assistant_message", content: delta });
      }
      const usage = json.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined;
      if (usage) {
        inputTokens = usage.prompt_tokens ?? inputTokens;
        outputTokens = usage.completion_tokens ?? outputTokens;
      }
    }
  }
  return { fullResponse, inputTokens, outputTokens };
}

/**
 * Resolve the offline memory directory. Precedence:
 *   1. explicit adapterConfig.memoryDir
 *   2. LETTA_MEMFS_DIR  — symlink in the workspace from a memory binding
 *   3. DOER_AGENT_MEMORY_DIR — native agent workspace memory folder
 * Doer injects (2) and (3) onto ctx.config.env at run time.
 */
export function resolveOfflineMemoryDir(
  ctx: AdapterExecutionContext,
  config: LettaCodeOfflineConfig,
): string | undefined {
  const explicit = config.memoryDir?.trim();
  if (explicit) return explicit;
  const env = ((ctx.config as Record<string, unknown>).env ?? {}) as Record<string, string>;
  const bound = env.LETTA_MEMFS_DIR?.trim() || env.DOER_AGENT_MEMORY_DIR?.trim();
  return bound || undefined;
}

async function loadMemoryBlocks(memoryDir: string): Promise<LettaCodeMemoryBlock[]> {
  if (!existsSync(memoryDir)) {
    await mkdir(memoryDir, { recursive: true });
    return [];
  }
  const entries = await readdir(memoryDir, { withFileTypes: true });
  const mdFiles = entries
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .sort((a, b) => a.name.localeCompare(b.name));

  const blocks: LettaCodeMemoryBlock[] = [];
  for (const entry of mdFiles) {
    const filePath = path.join(memoryDir, entry.name);
    const content = await readFile(filePath, "utf-8");
    blocks.push({ label: entry.name.replace(/\.md$/, ""), content, filePath });
  }
  return blocks;
}

async function writeMemoryBlock(block: LettaCodeMemoryBlock, content: string): Promise<void> {
  await mkdir(path.dirname(block.filePath), { recursive: true });
  await writeFile(block.filePath, content, "utf-8");
}

function parseMemoryUpdates(text: string): LettaCodeMemoryUpdate[] {
  const updates: LettaCodeMemoryUpdate[] = [];
  const regex = /<memory_update\s+label="([^"]+)">([\s\S]*?)<\/memory_update>/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    updates.push({ label: match[1], content: match[2].replace(/^\n/, "").replace(/\n$/, "") });
  }
  return updates;
}

export function buildOfflineSystemPrompt(
  basePrompt: string,
  blocks: LettaCodeMemoryBlock[],
  skillSection = "",
  toolInstructions = "",
): string {
  const parts: string[] = [basePrompt.trim() || "You are a helpful AI agent."];

  if (toolInstructions.trim()) {
    parts.push("\n\n" + toolInstructions.trim());
  }

  if (blocks.length > 0) {
    parts.push("\n\n## Memory\n");
    parts.push("These are your persistent memory blocks. Read them first, then respond.\n");
    for (const block of blocks) {
      parts.push(`### ${block.label}\n${block.content.trim()}`);
    }
    parts.push("\n## Memory Update Protocol");
    parts.push(
      "To persist a change to memory, include in your response:\n" +
      '<memory_update label="BLOCK_LABEL">\nnew content\n</memory_update>\n' +
      "Available blocks: " + blocks.map((b) => b.label).join(", ") + "\n" +
      "You may create new blocks by using a new label.",
    );
  }

  if (skillSection.trim()) {
    parts.push("\n\n" + skillSection.trim());
  }

  return parts.join("\n");
}

async function executeOffline(
  ctx: AdapterExecutionContext,
  config: LettaCodeOfflineConfig,
): Promise<AdapterExecutionResult> {
  // memoryDir may be set explicitly in adapterConfig, OR provided implicitly by
  // a Doer memory binding. The memfs layer mounts the bound folder and exposes
  // it via LETTA_MEMFS_DIR (symlink in the workspace → live source dir, so
  // writes persist) or DOER_AGENT_MEMORY_DIR (native workspace fallback).
  const memoryDir = resolveOfflineMemoryDir(ctx, config);
  if (!memoryDir) {
    await ctx.onLog(
      "stderr",
      "[letta-code/offline] No memory directory — set adapterConfig.memoryDir or attach a memory binding (provides LETTA_MEMFS_DIR)\n",
    );
    return { exitCode: 1, signal: null, timedOut: false, errorMessage: "memoryDir not configured" };
  }

  const model = config.model || DEFAULT_MODEL;
  const maxTokens = config.maxTokens ?? DEFAULT_MAX_TOKENS;
  // Resolve the LLM backend: anthropic (native SDK) or any OpenAI-compatible
  // provider (Groq, Ollama, NVIDIA, OpenCode Zen, …) via preset base URL.
  const offlineEnv = ((ctx.config as Record<string, unknown>).env ?? {}) as Record<string, string>;
  const resolved = resolveProvider(config, offlineEnv);

  if (!resolved.apiKey) {
    await ctx.onLog(
      "stderr",
      `[letta-code/offline] No API key for ${resolved.label} — set ${resolved.envKey} or adapterConfig.apiKey\n`,
    );
    return { exitCode: 1, signal: null, timedOut: false, errorMessage: `Missing API key (${resolved.label})` };
  }

  let blocks: LettaCodeMemoryBlock[] = [];
  try {
    blocks = await loadMemoryBlocks(memoryDir);
    await ctx.onLog("stdout", `[letta-code/offline] ${blocks.length} block(s) from ${memoryDir}\n`);
  } catch (err) {
    await ctx.onLog("stderr", `[letta-code/offline] Failed to load blocks: ${err instanceof Error ? err.message : String(err)}\n`);
    return { exitCode: 1, signal: null, timedOut: false, errorMessage: "Memory block load failed" };
  }

  // ── Skill loading ─────────────────────────────────────────────────────────
  const allSkillEntries = await readPaperclipRuntimeSkillEntries(
    config as unknown as Record<string, unknown>,
    __moduleDir,
  );
  const desiredSkillNames = resolvePaperclipDesiredSkillNames(
    config as unknown as Record<string, unknown>,
    allSkillEntries,
  );
  const delivery = resolveSkillDelivery(resolved, config);

  let skillSection = "";
  // Maps display name (shown to the agent in the manifest) → full canonical key
  // (used with readPaperclipSkillMarkdown). Built during loop-mode manifest
  // construction so the read_skill handler can resolve agent-supplied names.
  const skillKeyByName = new Map<string, string>();

  if (desiredSkillNames.length > 0) {
    if (delivery === "loop") {
      // Manifest only — bodies pulled via read_skill tool during the turn.
      const manifests: Array<{ name: string; description: string }> = [];
      for (const skillKey of desiredSkillNames) {
        const body = await readPaperclipSkillMarkdown(__moduleDir, skillKey);
        if (body) {
          const meta = parseFrontmatter(body);
          const displayName = meta.name || skillKey;
          skillKeyByName.set(displayName, skillKey);
          manifests.push({ name: displayName, description: meta.description });
        }
      }
      skillSection = buildSkillsManifest(manifests);
    } else {
      // Inject mode — full bodies, budget-capped.
      const skillBodies: Array<{ name: string; body: string; required: boolean }> = [];
      for (const entry of allSkillEntries) {
        if (!desiredSkillNames.includes(entry.key)) continue;
        const body = await readPaperclipSkillMarkdown(__moduleDir, entry.key);
        if (body) {
          const meta = parseFrontmatter(body);
          skillBodies.push({ name: meta.name || entry.key, body, required: Boolean(entry.required) });
        }
      }
      // Required skills first, then config order
      skillBodies.sort((a, b) => (b.required ? 1 : 0) - (a.required ? 1 : 0));
      const { section, dropped } = buildSkillsInjectSection(skillBodies);
      skillSection = section;
      if (dropped.length > 0) {
        await ctx.onLog(
          "stderr",
          `[letta-code/offline] Skill inject budget exceeded — dropped: ${dropped.join(", ")}\n`,
        );
      }
    }
  }

  const systemPrompt = buildOfflineSystemPrompt(config.systemPrompt ?? "", blocks, skillSection, buildOfflineToolInstructions());
  const userMessage = buildUserMessage(ctx, config.heartbeatPrompt);

  await ctx.onMeta?.({
    adapterType: "letta_code",
    command: "letta-code/offline",
    prompt: userMessage,
    context: { mode: "offline", provider: resolved.label, model, memoryDir, blocks: blocks.length },
  });

  await emit(ctx, { type: "user_message", content: userMessage });

  let fullResponse = "";
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    if (resolved.kind === "anthropic") {
      const client = new Anthropic({ apiKey: resolved.apiKey });
      const baseTools: Anthropic.Tool[] = delivery === "loop"
        ? [{
            name: "read_skill",
            description: "Load the full instructions for a skill by name. Call this before acting in a skill's domain.",
            input_schema: {
              type: "object" as const,
              properties: {
                name: { type: "string", description: "The skill name (as shown in ## Available Skills)" },
              },
              required: ["name"],
            },
          }]
        : [];
      const offlineTools: Anthropic.Tool[] = Object.entries(OFFLINE_TOOLS).map(([name, tool]) => ({
        name,
        description: tool.description,
        input_schema: tool.parameters as Anthropic.Tool["input_schema"],
      }));
      const tools: Anthropic.Tool[] = [...baseTools, ...offlineTools];

      const messages: Anthropic.MessageParam[] = [{ role: "user", content: userMessage }];
      const MAX_TOOL_ITERATIONS = 24;
      let iterations = 0;

      while (iterations < MAX_TOOL_ITERATIONS) {
        iterations++;
        const streamParams: Anthropic.MessageStreamParams = {
          model,
          max_tokens: maxTokens,
          temperature: config.temperature,
          system: systemPrompt,
          messages,
          ...(tools.length > 0 ? { tools } : {}),
        };

        let stopReason: string | null = null;
        let turnText = "";

        const stream = client.messages.stream(streamParams);

        for await (const event of stream) {
          if (event.type === "content_block_delta") {
            if (event.delta.type === "text_delta") {
              turnText += event.delta.text;
              await emit(ctx, { type: "assistant_message", content: event.delta.text });
            }
            // input_json_delta: accumulate tool input — parsed from finalMessage below
          }
          if (event.type === "message_start" && event.message.usage) {
            inputTokens += event.message.usage.input_tokens ?? 0;
          }
          if (event.type === "message_delta") {
            if (event.usage) outputTokens += event.usage.output_tokens ?? 0;
            stopReason = event.delta.stop_reason ?? null;
          }
        }

        fullResponse += turnText;

        // Re-read the final message for complete tool_use blocks
        const finalMessage = await stream.finalMessage();
        const finalToolUses = finalMessage.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
        );

        if (finalToolUses.length === 0 || stopReason === "end_turn") {
          break;
        }

        // Process tool calls
        const assistantMsg: Anthropic.MessageParam = {
          role: "assistant",
          content: finalMessage.content,
        };
        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const tu of finalToolUses) {
          await emit(ctx, {
            type: "tool_call_message",
            name: tu.name,
            input: tu.input,
            toolCallId: tu.id,
          });
          let toolOutput: string;
          let isError = false;
          try {
            if (tu.name === "read_skill") {
              const skillName = (tu.input as Record<string, unknown>).name;
              const fullKey = typeof skillName === "string"
                ? (skillKeyByName.get(skillName) ?? (desiredSkillNames.includes(skillName) ? skillName : null))
                : null;
              if (!fullKey) {
                toolOutput = `Skill "${String(skillName)}" is not available to this agent. Available skills: ${[...skillKeyByName.keys()].join(", ")}.`;
                isError = true;
              } else {
                const body = await readPaperclipSkillMarkdown(__moduleDir, fullKey);
                toolOutput = body ?? `Skill "${String(skillName)}" not found.`;
                if (!body) isError = true;
              }
            } else if (tu.name in OFFLINE_TOOLS) {
              toolOutput = await OFFLINE_TOOLS[tu.name]!.handler(ctx, parseToolArgs(tu.input), config);
            } else {
              toolOutput = `Unknown tool: ${tu.name}`;
              isError = true;
            }
          } catch (err) {
            toolOutput = err instanceof Error ? err.message : String(err);
            isError = true;
          }
          await emit(ctx, {
            type: "tool_return_message",
            content: toolOutput,
            toolCallId: tu.id,
            isError,
          });
          toolResults.push({ type: "tool_result", tool_use_id: tu.id, content: toolOutput, is_error: isError });
        }

        messages.push(assistantMsg, { role: "user", content: toolResults });
      }

      if (iterations >= MAX_TOOL_ITERATIONS) {
        await ctx.onLog("stderr", "[letta-code/offline] Max tool iterations reached\n");
      }
    } else {
      if (delivery === "loop") {
        // OpenAI-compat tool-call loop
        const toolSchema = [{
          type: "function" as const,
          function: {
            name: "read_skill",
            description: "Load the full instructions for a skill by name.",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string", description: "Skill name as listed in ## Available Skills" },
              },
              required: ["name"],
            },
          },
        }, ...Object.entries(OFFLINE_TOOLS).map(([name, tool]) => ({
          type: "function" as const,
          function: {
            name,
            description: tool.description,
            parameters: tool.parameters,
          },
        }))];

        type OAIMessage = {
          role: string;
          content: string | null;
          tool_calls?: unknown[];
          tool_call_id?: string;
          name?: string;
        };
        const messages: OAIMessage[] = [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ];
        const MAX_TOOL_ITERATIONS = 24;
        let iterations = 0;

        while (iterations < MAX_TOOL_ITERATIONS) {
          iterations++;
          const url = `${resolved.baseUrl.replace(/\/$/, "")}/chat/completions`;
          const res = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(resolved.apiKey ? { Authorization: `Bearer ${resolved.apiKey}` } : {}),
            },
            body: JSON.stringify({
              model,
              max_tokens: maxTokens,
              temperature: config.temperature,
              messages,
              tools: toolSchema,
              tool_choice: "auto",
              stream: true,
              stream_options: { include_usage: true },
            }),
          });

          if (!res.ok || !res.body) {
            const body = await res.text().catch(() => "");
            throw new Error(`${resolved.label} HTTP ${res.status}: ${body.slice(0, 300)}`);
          }

          let turnText = "";
          const toolCalls: Array<{ id: string; name: string; argsRaw: string }> = [];
          let finishReason: string | null = null;

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const data = trimmed.slice(5).trim();
              if (!data || data === "[DONE]") continue;
              let json: Record<string, unknown>;
              try { json = JSON.parse(data); } catch { continue; }
              const choices = json.choices as Array<{
                delta?: {
                  content?: string;
                  tool_calls?: Array<{
                    index: number;
                    id?: string;
                    function?: { name?: string; arguments?: string };
                  }>;
                };
                finish_reason?: string;
              }> | undefined;
              const delta = choices?.[0]?.delta;
              if (delta?.content) {
                turnText += delta.content;
                await emit(ctx, { type: "assistant_message", content: delta.content });
              }
              if (delta?.tool_calls) {
                for (const tc of delta.tool_calls) {
                  if (!toolCalls[tc.index]) {
                    toolCalls[tc.index] = { id: tc.id ?? "", name: tc.function?.name ?? "", argsRaw: "" };
                  }
                  if (tc.id) toolCalls[tc.index]!.id = tc.id;
                  if (tc.function?.name) toolCalls[tc.index]!.name = tc.function.name;
                  if (tc.function?.arguments) toolCalls[tc.index]!.argsRaw += tc.function.arguments;
                }
              }
              if (choices?.[0]?.finish_reason) finishReason = choices[0].finish_reason;
              const usage = json.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined;
              if (usage) {
                inputTokens += usage.prompt_tokens ?? 0;
                outputTokens += usage.completion_tokens ?? 0;
              }
            }
          }

          fullResponse += turnText;

          const validToolCalls = toolCalls.filter((tc) => tc.name && tc.id);
          if (validToolCalls.length === 0 || finishReason === "stop") break;

          messages.push({
            role: "assistant",
            content: turnText || null,
            tool_calls: validToolCalls.map((tc) => ({
              id: tc.id,
              type: "function",
              function: { name: tc.name, arguments: tc.argsRaw },
            })),
          });

          for (const tc of validToolCalls) {
            let parsedArgs: Record<string, unknown> = {};
            try { parsedArgs = JSON.parse(tc.argsRaw); } catch { /* ok */ }
            await emit(ctx, { type: "tool_call_message", name: tc.name, input: parsedArgs, toolCallId: tc.id });

            let toolOutput: string;
            let isError = false;
            try {
              if (tc.name === "read_skill") {
                const skillName = parsedArgs.name;
                const fullKey = typeof skillName === "string"
                  ? (skillKeyByName.get(skillName) ?? (desiredSkillNames.includes(skillName) ? skillName : null))
                  : null;
                if (!fullKey) {
                  toolOutput = `Skill "${String(skillName)}" is not available. Available: ${[...skillKeyByName.keys()].join(", ")}.`;
                  isError = true;
                } else {
                  const body = await readPaperclipSkillMarkdown(__moduleDir, fullKey);
                  toolOutput = body ?? `Skill "${String(skillName)}" not found.`;
                  if (!body) isError = true;
                }
              } else if (tc.name in OFFLINE_TOOLS) {
                toolOutput = await OFFLINE_TOOLS[tc.name]!.handler(ctx, parsedArgs, config);
              } else {
                toolOutput = `Unknown tool: ${tc.name}`;
                isError = true;
              }
            } catch (err) {
              toolOutput = err instanceof Error ? err.message : String(err);
              isError = true;
            }

            await emit(ctx, { type: "tool_return_message", content: toolOutput, toolCallId: tc.id, isError });
            messages.push({ role: "tool", content: toolOutput, tool_call_id: tc.id });
          }
        }

        if (iterations >= MAX_TOOL_ITERATIONS) {
          await ctx.onLog("stderr", "[letta-code/offline] Max tool iterations reached\n");
        }
      } else {
        // Inject mode — single call, bodies already in systemPrompt
        const out = await streamOpenAICompat(ctx, resolved, {
          model,
          maxTokens,
          temperature: config.temperature,
          systemPrompt,
          userMessage,
        });
        fullResponse = out.fullResponse;
        inputTokens = out.inputTokens;
        outputTokens = out.outputTokens;
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await ctx.onLog("stderr", `[letta-code/offline] ${resolved.label} error: ${message}\n`);
    return { exitCode: 1, signal: null, timedOut: false, errorMessage: message };
  }

  await emit(ctx, {
    type: "usage_statistics",
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    stepCount: 1,
  });

  // Persist any memory updates the LLM emitted
  const updates = parseMemoryUpdates(fullResponse);
  for (const update of updates) {
    const existing = blocks.find((b) => b.label === update.label);
    const filePath = existing?.filePath ?? path.join(memoryDir, `${update.label}.md`);
    try {
      await writeMemoryBlock({ label: update.label, content: update.content, filePath }, update.content);
      await emit(ctx, { type: "tool_call_message", name: "memory_update", input: { label: update.label } });
      await ctx.onLog("stdout", `[letta-code/offline] updated block "${update.label}"\n`);
    } catch (err) {
      await ctx.onLog("stderr", `[letta-code/offline] write block "${update.label}" failed: ${err instanceof Error ? err.message : String(err)}\n`);
    }
  }

  await emit(ctx, { type: "stop_reason", reason: "end_turn" });

  return {
    exitCode: 0,
    signal: null,
    timedOut: false,
    model,
    provider: config.provider || "anthropic",
    usage: { inputTokens, outputTokens },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────────────────────────────────────

export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const config = ctx.config as unknown as LettaCodeAdapterConfig;
  const mode = (config as unknown as Record<string, unknown>).mode ?? "offline";

  if (mode === "online") {
    return executeOnline(ctx, config as LettaCodeOnlineConfig);
  }
  return executeOffline(ctx, config as LettaCodeOfflineConfig);
}
