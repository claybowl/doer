import path from "node:path";
import type { AdapterExecutionContext, AdapterExecutionResult } from "@doerai/adapter-utils";
import type { LettaCodeOfflineConfig } from "../shared/types.js";
import { resolveLettaCodeConfig, resolveLettaCodeSession } from "./config.js";
import { buildDoerAgentTools } from "./doer-tools.js";
import { runLettaSdkTurn, type LettaSdkTurnInput, type LettaSdkTurnResult } from "./sdk-runtime.js";

export interface LettaCodeExecuteDependencies {
  runTurn(input: LettaSdkTurnInput): Promise<LettaSdkTurnResult>;
}

const DEFAULT_DEPENDENCIES: LettaCodeExecuteDependencies = { runTurn: runLettaSdkTurn };

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function runtimeEnv(ctx: AdapterExecutionContext): Record<string, string> {
  const env = record(record(ctx.config).env);
  return Object.fromEntries(
    Object.entries(env)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

/** Resolve the Doer-owned memory mount, preserving the legacy explicit memoryDir fallback. */
export function resolveOfflineMemoryDir(
  ctx: AdapterExecutionContext,
  config: Pick<LettaCodeOfflineConfig, "memoryDir">,
): string | undefined {
  const env = runtimeEnv(ctx);
  return nonEmptyString(config.memoryDir)
    ?? nonEmptyString(env.LETTA_MEMFS_DIR)
    ?? nonEmptyString(env.DOER_AGENT_MEMORY_DIR)
    ?? undefined;
}

export function buildLettaCodePrompt(ctx: AdapterExecutionContext, heartbeatPrompt: string): string {
  const context = record(ctx.context);
  const taskKey = nonEmptyString(context.taskKey)
    ?? nonEmptyString(context.taskId)
    ?? nonEmptyString(context.issueId)
    ?? nonEmptyString(ctx.runtime.taskKey);
  const wakeReason = nonEmptyString(context.wakeReason) ?? "unspecified";
  const wakeCommentId = nonEmptyString(context.wakeCommentId);

  if (taskKey) {
    const title = nonEmptyString(context.issueTitle);
    const description = nonEmptyString(context.issueDescription);
    const lines = [
      "[DOER HEARTBEAT — TASK MODE]",
      "You have been assigned a specific task. Focus on it.",
      "",
      `YOUR TASK: ${taskKey}`,
    ];
    if (title) lines.push(`TITLE: ${title}`);
    lines.push(`WAKE REASON: ${wakeReason}`);
    if (wakeCommentId) lines.push(`TRIGGERING COMMENT: ${wakeCommentId}`);
    if (description) lines.push("", "── ISSUE BODY ──", description, "──────────────────");
    else lines.push("", `Read the issue body for ${taskKey} and execute its instructions.`);
    lines.push(
      "",
      "The wake context and issue body are the highest-priority task instructions.",
      "Memory describes your default operating mode and does not override this assignment.",
      "When finished, update the issue status and add a concise work summary.",
    );
    return lines.join("\n");
  }

  return [
    "[DOER HEARTBEAT — QUEUE REVIEW MODE]",
    `You (${ctx.agent.name}) have been woken for a general check, not a specific task.`,
    "",
    "Check your assigned in-progress and todo issues first, then run your standard heartbeat protocol.",
    "",
    heartbeatPrompt,
  ].join("\n");
}

export async function execute(
  ctx: AdapterExecutionContext,
  dependencies: LettaCodeExecuteDependencies = DEFAULT_DEPENDENCIES,
): Promise<AdapterExecutionResult> {
  const rawConfig = record(ctx.config);
  const context = record(ctx.context);
  const configured = resolveLettaCodeConfig({
    ...rawConfig,
    cwd: nonEmptyString(rawConfig.cwd) ?? nonEmptyString(context.cwd) ?? process.cwd(),
  });
  const env = runtimeEnv(ctx);
  const explicitMemory = nonEmptyString(rawConfig.memoryDir);
  if (explicitMemory && !env.LETTA_MEMFS_DIR) env.LETTA_MEMFS_DIR = explicitMemory;
  const memoryDir = nonEmptyString(env.LETTA_MEMFS_DIR) ?? nonEmptyString(env.DOER_AGENT_MEMORY_DIR);
  if (!memoryDir) {
    const message = "No Doer memory mount is available; attach a MemFS binding or configure DOER_AGENT_MEMORY_DIR";
    await ctx.onLog("stderr", `[letta-code] ${message}\n`);
    return { exitCode: 1, signal: null, timedOut: false, errorMessage: message };
  }

  const prompt = buildLettaCodePrompt(ctx, configured.heartbeatPrompt);
  const sessionParams = resolveLettaCodeSession(
    ctx.runtime.sessionParams,
    configured.cwd,
    configured.backend,
  );

  await ctx.onMeta?.({
    adapterType: "letta_code",
    command: "letta-agent-sdk",
    cwd: configured.cwd,
    prompt,
    commandNotes: [
      `backend=${configured.backend}`,
      `harness=${configured.harnessBackend}`,
      "tools=local-doer-machine",
      `memory=${path.resolve(memoryDir)}`,
    ],
    context: {
      backend: configured.backend,
      lettaAgentId: configured.lettaAgentId || sessionParams?.lettaAgentId || null,
      model: configured.model || null,
    },
  });
  await ctx.onLog("stdout", `${JSON.stringify({ type: "user_message", content: prompt })}\n`);

  try {
    const result = await dependencies.runTurn({
      prompt,
      config: configured,
      sessionParams,
      env,
      tools: buildDoerAgentTools(ctx),
      onEvent: async (event) => {
        await ctx.onLog("stdout", `${JSON.stringify(event)}\n`);
      },
    });
    return {
      exitCode: result.success ? 0 : 1,
      signal: null,
      timedOut: false,
      errorMessage: result.success ? null : result.summary || "Letta turn failed",
      sessionParams: { ...result.sessionParams },
      sessionDisplayId: result.sessionDisplayId,
      sessionId: result.sessionDisplayId,
      provider: "letta",
      biller: "letta",
      billingType: "unknown",
      model: result.model || configured.model || null,
      costUsd: result.costUsd,
      summary: result.summary,
      resultJson: {
        success: result.success,
        lettaAgentId: result.sessionParams.lettaAgentId,
        conversationId: result.sessionParams.conversationId,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await ctx.onLog("stderr", `[letta-code] ${message}\n`);
    return { exitCode: 1, signal: null, timedOut: false, errorMessage: message };
  }
}
