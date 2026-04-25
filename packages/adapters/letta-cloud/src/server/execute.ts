import type { AdapterExecutionContext, AdapterExecutionResult } from "@doerai/adapter-utils";
import type { LettaCloudAdapterConfig } from "../shared/types.js";
import { getLettaClient, DELIVERABLE_TOOL_NAME } from "./letta-client.js";
import { renderTemplate, buildPaperclipEnv } from "@doerai/adapter-utils/server-utils";

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

  // Accumulator for async-fire work triggered by tool calls we intercept
  // (notably `produce_deliverable`). We await all of these after the
  // Letta stream closes so the adapter doesn't return before file uploads
  // finish — otherwise the caller could see a "run complete" event before
  // the deliverable row is inserted.
  const pendingSideEffects: Promise<void>[] = [];

  // ----------------------------------------------------------------------
  // Stream-token accumulator
  // ----------------------------------------------------------------------
  // We request `stream_tokens: true` from Letta because it gives us live,
  // typewriter-style streaming during the run. The downside is each chunk
  // becomes a separate message_type event (often a partial word — "ng" +
  // "rok", "Heart" + "beat"). If we naively emit each chunk as its own
  // assistant_message / reasoning_message event, the Doer transcript UI
  // renders each as a sibling node and inserts whitespace between, so
  // users see "Heart beat" instead of "Heartbeat" everywhere.
  //
  // Fix: accumulate consecutive chunks of the same kind (and same Letta
  // message id, when present), emit one consolidated event when the kind
  // changes, when a new logical message starts, when a non-streamable
  // event arrives (tool calls, returns, errors, etc.), or when the
  // stream ends.
  type StreamKind = "assistant" | "reasoning";
  type StreamBuffer = {
    kind: StreamKind;
    messageId: string | null;
    text: string;
  };
  let streamBuffer: StreamBuffer | null = null;

  async function flushStreamBuffer(): Promise<void> {
    if (!streamBuffer || streamBuffer.text.length === 0) {
      streamBuffer = null;
      return;
    }
    if (streamBuffer.kind === "assistant") {
      await emit(ctx, {
        type: "assistant_message",
        content: streamBuffer.text,
      });
    } else {
      await emit(ctx, {
        type: "reasoning_message",
        content: streamBuffer.text,
      });
    }
    streamBuffer = null;
  }

  // Helper: append `text` to the buffer, opening a new buffer or flushing
  // the previous one when the kind / messageId changes.
  async function appendToStreamBuffer(
    kind: StreamKind,
    messageId: string | null,
    text: string,
  ): Promise<void> {
    if (text.length === 0) return;
    if (
      streamBuffer &&
      (streamBuffer.kind !== kind || streamBuffer.messageId !== messageId)
    ) {
      await flushStreamBuffer();
    }
    if (!streamBuffer) {
      streamBuffer = { kind, messageId, text: "" };
    }
    streamBuffer.text += text;
  }

  // Streamable Letta message_types — anything else is a logical break and
  // forces the buffer to drain BEFORE we run that event's handler so the
  // ordering of events the UI sees stays correct (assistant text before
  // the tool call it triggered, etc.).
  const STREAMABLE_TYPES = new Set(["assistant_message", "reasoning_message"]);

  for await (const chunk of stream) {
    const rec = chunk as unknown as Record<string, unknown>;
    const messageType = String(rec.message_type ?? "");

    // Drain accumulated streaming chunks before any non-streamable event
    // so the consumer sees them in the correct interleaved order.
    if (!STREAMABLE_TYPES.has(messageType) && streamBuffer) {
      await flushStreamBuffer();
    }

    switch (messageType) {
      case "assistant_message": {
        const text = extractAssistantContent(rec.content);
        const messageId =
          typeof rec.id === "string" ? rec.id : null;
        await appendToStreamBuffer("assistant", messageId, text);
        break;
      }

      case "reasoning_message": {
        const reasoning =
          typeof rec.reasoning === "string" ? rec.reasoning : "";
        const messageId =
          typeof rec.id === "string" ? rec.id : null;
        await appendToStreamBuffer("reasoning", messageId, reasoning);
        break;
      }

      case "hidden_reasoning_message": {
        // Redacted reasoning — emit as a single line, not buffered. The
        // pre-loop drain already flushed any pending streamable chunks.
        await emit(ctx, {
          type: "reasoning_message",
          content: "(reasoning redacted by model)",
        });
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

  // Final drain of the streaming accumulator — there may be a trailing
  // assistant_message or reasoning_message that wasn't followed by a
  // non-streamable event before the stream closed.
  if (streamBuffer) {
    await flushStreamBuffer();
  }

  // Drain any pending deliverable uploads before reporting success. We
  // use Promise.allSettled so a failing upload doesn't reject the whole
  // run — individual failures already log to stderr via ctx.onLog.
  if (pendingSideEffects.length > 0) {
    await Promise.allSettled(pendingSideEffects);
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
