import type { AdapterExecutionContext, AdapterExecutionResult } from "@doerai/adapter-utils";
import type { LettaCloudAdapterConfig } from "../shared/types.js";
import { getLettaClient } from "./letta-client.js";
import { renderTemplate } from "@doerai/adapter-utils/server-utils";

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

// ── Emit helpers — one JSON line per stdout write ──────────────────────────
// The UI parser (`parseLettaCloudStdoutLine`) will parse these back into
// TranscriptEntry objects for the real-time dashboard transcript.

async function emit(ctx: AdapterExecutionContext, payload: Record<string, unknown>): Promise<void> {
  await ctx.onLog("stdout", JSON.stringify(payload) + "\n");
}

// ── Streaming execution ───────────────────────────────────────────────────

async function executeStreaming(
  ctx: AdapterExecutionContext,
  config: LettaCloudAdapterConfig,
  userMessage: string,
): Promise<AdapterExecutionResult> {
  const client = getLettaClient(config);

  // Emit the user message so the transcript shows the full conversation
  await emit(ctx, { type: "user_message", content: userMessage });

  const stream = await client.agents.messages.create(config.agentId, {
    messages: [{ role: "user", content: userMessage }],
    streaming: true,
    stream_tokens: true,
  });

  let inputTokens = 0;
  let outputTokens = 0;
  let cachedTokens = 0;
  let stepCount = 0;

  for await (const chunk of stream) {
    const rec = chunk as unknown as Record<string, unknown>;
    const messageType = String(rec.message_type ?? "");

    switch (messageType) {
      case "assistant_message": {
        const text = extractAssistantContent(rec.content);
        if (text) {
          await emit(ctx, { type: "assistant_message", content: text });
        }
        break;
      }

      case "reasoning_message": {
        const reasoning = typeof rec.reasoning === "string" ? rec.reasoning : "";
        if (reasoning) {
          await emit(ctx, { type: "reasoning_message", content: reasoning });
        }
        break;
      }

      case "hidden_reasoning_message": {
        // Redacted reasoning — show that the agent is thinking
        await emit(ctx, { type: "reasoning_message", content: "(reasoning redacted by model)" });
        break;
      }

      case "tool_call_message": {
        // Prefer tool_calls array (new SDK), fall back to deprecated tool_call
        const toolCalls = rec.tool_calls ?? (rec.tool_call ? [rec.tool_call] : []);
        if (Array.isArray(toolCalls)) {
          for (const tc of toolCalls) {
            const call = tc as Record<string, unknown>;
            const name = typeof call.name === "string" ? call.name : "unknown";
            const toolCallId = typeof call.tool_call_id === "string" ? call.tool_call_id : undefined;
            const input = parseToolArgs(call.arguments ?? call.input);
            await emit(ctx, { type: "tool_call_message", name, input, toolCallId });
          }
        }
        break;
      }

      case "tool_return_message": {
        const toolReturn = typeof rec.tool_return === "string" ? rec.tool_return : safeStringify(rec.tool_return);
        const toolCallId = typeof rec.tool_call_id === "string" ? rec.tool_call_id : "";
        const status = typeof rec.status === "string" ? rec.status : "success";
        const toolName = typeof rec.name === "string" ? rec.name : undefined;
        await emit(ctx, {
          type: "tool_return_message",
          content: toolReturn,
          toolCallId,
          isError: status === "error" || rec.is_err === true,
          name: toolName,
        });
        break;
      }

      case "system_message": {
        const text = typeof rec.content === "string" ? rec.content : "";
        if (text) {
          await emit(ctx, { type: "system_message", content: text });
        }
        break;
      }

      case "usage_statistics": {
        inputTokens = typeof rec.prompt_tokens === "number" ? rec.prompt_tokens : inputTokens;
        outputTokens = typeof rec.completion_tokens === "number" ? rec.completion_tokens : outputTokens;
        cachedTokens = typeof rec.cached_input_tokens === "number" ? rec.cached_input_tokens : cachedTokens;
        stepCount = typeof rec.step_count === "number" ? rec.step_count : stepCount;
        // Emit a result summary so the UI can show tokens/cost
        await emit(ctx, {
          type: "usage_statistics",
          inputTokens,
          outputTokens,
          cachedTokens,
          stepCount,
          totalTokens: typeof rec.total_tokens === "number" ? rec.total_tokens : inputTokens + outputTokens,
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
        await emit(ctx, { type: "stop_reason", reason });
        break;
      }

      case "ping":
        // Keepalive — skip silently
        break;

      default:
        // Unknown message type — emit as raw stdout for debugging
        await emit(ctx, { type: "unknown", messageType, raw: safeStringify(rec) });
        break;
    }
  }

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
  };
}

// ── Main entry point ──────────────────────────────────────────────────────

export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const config = ctx.config as unknown as LettaCloudAdapterConfig;

  if (!config.agentId || !config.apiKey) {
    await ctx.onLog("stderr", "[letta-cloud] Missing agentId or apiKey in adapter config\n");
    return { exitCode: 1, signal: null, timedOut: false };
  }

  // The task message is passed via context.message (Doer standard)
  // If not set, fall back to heartbeatPrompt config, then to a sensible default.
  let userMessage =
    typeof ctx.context.message === "string"
      ? ctx.context.message
      : typeof ctx.context.prompt === "string"
        ? ctx.context.prompt
        : null;

  // If no explicit message/prompt, use heartbeatPrompt template or default
  if (!userMessage) {
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
      userMessage = renderTemplate(heartbeatPrompt, templateData);
    } else {
      userMessage = "Hello";
    }
  }

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
