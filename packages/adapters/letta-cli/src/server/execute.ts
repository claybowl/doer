import type { AdapterExecutionContext, AdapterExecutionResult } from "@doerai/adapter-utils";
import {
  asString,
  asNumber,
  buildPaperclipEnv,
  ensureCommandResolvable,
  ensurePathInEnv,
  runChildProcess,
} from "@doerai/adapter-utils/server-utils";
import type { LettaCliAdapterConfig } from "../shared/types.js";
import {
  parseLettaCliStreamJson,
  isLettaCliAuthError,
  describeLettaCliFailure,
} from "./parse.js";

function readNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

/**
 * Build the user message for this heartbeat. Mirrors the letta_code online
 * adapter's buildWakeMessage so agents receive the same TASK MODE directive
 * regardless of which Letta adapter delivers it.
 */
function buildWakeMessage(ctx: AdapterExecutionContext, heartbeatPrompt: string): string {
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
      "HEADLESS CONSTRAINT: You cannot call tools that require approval.",
      "Use only the Bash tool with curl for any Doer API calls.",
      "",
      "When you finish: update the issue status (done / blocked /",
      "needs_human) and add a comment summarizing what you did.",
    );
    return lines.join("\n");
  }

  return [
    "[DOER HEARTBEAT — QUEUE REVIEW MODE]",
    `You (${agentName}) have been woken for a general check, not a specific task.`,
    "",
    "Before any queue-meta work, check whether you have issues assigned",
    "to YOU specifically with status in_progress or todo. Those are",
    "your direct work — handle the highest-priority one first.",
    "",
    "If you have no assigned work, run your standard heartbeat protocol.",
    "",
    "──────────────────────────────────────────────────────────",
    heartbeatPrompt,
    "",
    "HEADLESS CONSTRAINT: You are running in headless mode and tools are unavailable.",
    "Respond with a short status message only. Do NOT call any tools.",
  ].join("\n");
}

export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const { runId, agent, config: rawConfig, context, onLog, onMeta, onSpawn, authToken } = ctx;
  const config = rawConfig as unknown as LettaCliAdapterConfig;

  const command = asString(config.command, "letta");
  const agentId = asString(config.agentId, "");
  const apiKey = asString(config.apiKey, "");
  const baseUrl = asString(config.baseUrl, "https://api.letta.com").replace(/\/$/, "");
  const backend = asString(config.backend, "api");
  const model = asString(config.model, "");
  const timeoutSec = asNumber(config.timeoutSec, 0);
  const graceSec = asNumber(config.graceSec, 20);
  const heartbeatPrompt = asString(config.heartbeatPrompt, "Hello");

  if (!agentId) {
    await onLog("stderr", "[letta-cli] Missing agentId in adapterConfig\n");
    return { exitCode: 1, signal: null, timedOut: false, errorMessage: "agentId is required" };
  }
  if (!apiKey && backend !== "local") {
    await onLog("stderr", "[letta-cli] Missing apiKey in adapterConfig\n");
    return { exitCode: 1, signal: null, timedOut: false, errorMessage: "apiKey is required" };
  }

  const env: Record<string, string> = { ...buildPaperclipEnv(agent) };
  env.DOER_RUN_ID = runId;
  if (apiKey) env.LETTA_API_KEY = apiKey;
  env.LETTA_BASE_URL = baseUrl;

  // Propagate TASK MODE env vars for tools the agent might shell out to
  const taskId =
    readNonEmptyString(context.taskId) ??
    readNonEmptyString(context.issueId);
  if (taskId) env.DOER_TASK_ID = taskId;
  const wakeReason = readNonEmptyString(context.wakeReason);
  if (wakeReason) env.DOER_WAKE_REASON = wakeReason;

  if (!authToken) {
    const hasExplicitKey = typeof (rawConfig as Record<string, unknown>).DOER_API_KEY === "string";
    if (!hasExplicitKey && authToken) env.DOER_API_KEY = authToken as string;
  } else {
    env.DOER_API_KEY = authToken;
  }

  const effectiveEnv = ensurePathInEnv({ ...process.env, ...env });
  await ensureCommandResolvable(command, process.cwd(), effectiveEnv);

  const prompt = buildWakeMessage(ctx, heartbeatPrompt);

  // Always start a fresh conversation (`--new`) to avoid stale approval gates
  // from previous runs. Lettai agents have approval-gated tools (e.g.
  // create_paperclip_issue) that block headless execution if a prior run
  // left a pending approval_request_message. Session resumption would hit
  // "Cannot process approval response: No tool call is currently awaiting
  // approval." — so we never resume.
  const args = [
    "-p",
    prompt,
    "--new",
    "--output-format",
    "stream-json",
    "--include-partial-messages",
    "--backend",
    backend,
    "--agent",
    agentId,
  ];
  if (model) args.push("--model", model);

  if (onMeta) {
    await onMeta({
      adapterType: "letta_cli",
      command,
      commandArgs: args,
      prompt,
      context: { agentId, backend, baseUrl, mode: "fresh-conversation" },
    });
  }

  const proc = await runChildProcess(runId, command, args, {
    cwd: process.cwd(),
    env,
    timeoutSec,
    graceSec,
    onSpawn,
    onLog,
  });

  if (proc.timedOut) {
    return {
      exitCode: proc.exitCode,
      signal: proc.signal,
      timedOut: true,
      errorMessage: `Timed out after ${timeoutSec}s`,
      errorCode: "timeout",
    };
  }

  const parsed = parseLettaCliStreamJson(proc.stdout);

  const isAuthErr = isLettaCliAuthError(proc.stdout, proc.stderr);
  const errorCode = isAuthErr ? "letta_auth_required" : null;

  if (!parsed.resultJson && (proc.exitCode ?? 0) !== 0) {
    return {
      exitCode: proc.exitCode,
      signal: proc.signal,
      timedOut: false,
      errorMessage: describeLettaCliFailure(proc) ?? "letta-code exited with an error",
      errorCode,
    };
  }

  // Don't save conversationId for session resumption — see --new comment above.
  return {
    exitCode: proc.exitCode,
    signal: proc.signal,
    timedOut: false,
    errorMessage: (proc.exitCode ?? 0) === 0
      ? null
      : describeLettaCliFailure(proc),
    errorCode,
    usage: parsed.usage ?? undefined,
    // No sessionId/sessionParams — always create fresh conversations (see --new above)
    provider: "letta",
    biller: "letta",
    model: parsed.model || undefined,
    resultJson: parsed.resultJson ?? undefined,
    summary: parsed.summary,
  };
}
