// ─── A2A Adapter — UI ─────────────────────────────────────────────────────────

import type { TranscriptEntry, StdoutLineParser } from "@doerai/adapter-utils";
import type { A2aAdapterConfig } from "../shared/types.js";

/**
 * Parse a single A2A JSON-line stdout line from the server adapter into
 * Doer TranscriptEntry objects for the real-time dashboard transcript.
 *
 * The server emits one JSON object per line (via `emit()`). This function
 * reverses that, mapping A2A event types to Doer transcript kinds:
 *   - user_message      → { kind: "user" }
 *   - assistant_message → { kind: "assistant" }
 *   - reasoning_message → { kind: "thinking" }
 *   - system_message    → { kind: "system" }
 *   - tool_call_message → { kind: "tool_call" }
 *   - tool_return_message → { kind: "tool_result" }
 *   - stop_reason       → { kind: "result" } (terminal)
 *   - agent_card        → { kind: "init" }
 *   - usage_statistics  → { kind: "result" } (with subtype "usage")
 */
export function parseA2aStdoutLine(line: string, ts: string): TranscriptEntry[] {
  const trimmed = line.trim();
  if (!trimmed) return [];

  let payload: unknown;
  try {
    payload = JSON.parse(trimmed);
  } catch {
    // Non-JSON line (e.g. plain stderr echo) — treat as system
    return [{ kind: "system", ts, text: trimmed }];
  }

  const rec = payload as Record<string, unknown>;
  const type = String(rec.type ?? "");

  switch (type) {
    case "user_message":
      return [{
        kind: "user",
        ts: String(rec.ts ?? ts),
        text: typeof rec.content === "string" ? rec.content : "",
      }];

    case "assistant_message":
      return [{
        kind: "assistant",
        ts: String(rec.ts ?? ts),
        text: typeof rec.content === "string" ? rec.content : "",
        delta: typeof rec.delta === "boolean" ? rec.delta : undefined,
      }];

    case "reasoning_message":
      return [{
        kind: "thinking",
        ts: String(rec.ts ?? ts),
        text: typeof rec.content === "string" ? rec.content : "",
        delta: typeof rec.delta === "boolean" ? rec.delta : undefined,
      }];

    case "system_message":
      return [{
        kind: "system",
        ts: String(rec.ts ?? ts),
        text: typeof rec.content === "string" ? rec.content : "",
      }];

    case "tool_call_message":
      return [{
        kind: "tool_call",
        ts: String(rec.ts ?? ts),
        name: typeof rec.name === "string" ? rec.name : "unknown",
        input: rec.input ?? rec.args ?? {},
        toolUseId: typeof rec.toolCallId === "string" ? rec.toolCallId : undefined,
      }];

    case "tool_return_message":
      return [{
        kind: "tool_result",
        ts: String(rec.ts ?? ts),
        toolUseId: typeof rec.toolCallId === "string" ? rec.toolCallId : "",
        toolName: typeof rec.name === "string" ? rec.name : undefined,
        content: typeof rec.content === "string" ? rec.content : JSON.stringify(rec.content ?? ""),
        isError: rec.isError === true,
      }];

    case "agent_card":
      return [{
        kind: "init",
        ts: String(rec.ts ?? ts),
        model: typeof rec.model === "string" ? rec.model : (typeof rec.agentName === "string" ? rec.agentName : "a2a"),
        sessionId: typeof rec.sessionId === "string" ? rec.sessionId : "",
      }];

    case "usage_statistics":
    case "stop_reason":
      return [{
        kind: "result",
        ts: String(rec.ts ?? ts),
        text: type === "stop_reason"
          ? typeof rec.reason === "string" ? rec.reason : ""
          : "A2A task completed",
        inputTokens: typeof rec.inputTokens === "number" ? rec.inputTokens : 0,
        outputTokens: typeof rec.outputTokens === "number" ? rec.outputTokens : 0,
        cachedTokens: typeof rec.cachedTokens === "number" ? rec.cachedTokens : 0,
        costUsd: typeof rec.costUsd === "number" ? rec.costUsd : 0,
        subtype: type === "stop_reason" ? "stop_reason" : "usage",
        isError: type === "stop_reason"
          ? typeof rec.reason === "string"
            ? ["TASK_STATE_FAILED", "TASK_STATE_CANCELED", "TASK_STATE_REJECTED"].includes(rec.reason)
            : false
          : false,
        errors: [],
      }];

    default:
      // Unknown/unsupported type — emit as a system entry with the raw payload
      return [{
        kind: "system",
        ts: String(rec.ts ?? ts),
        text: `[a2a/unknown] ${type}: ${JSON.stringify(rec)}`,
      }];
  }
}

/** Build the adapter config from UI form values. */
export function buildA2aAdapterConfig(
  values: Record<string, unknown>,
): A2aAdapterConfig {
  const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
  const num = (v: unknown, fallback: number): number => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };

  return {
    endpointUrl: str(values.endpointUrl),
    ...(str(values.agentCardUrl) ? { agentCardUrl: str(values.agentCardUrl) } : {}),
    ...(str(values.authToken) ? { authToken: str(values.authToken) } : {}),
    ...(str(values.skillId) ? { skillId: str(values.skillId) } : {}),
    timeoutSec: num(values.timeoutSec, 300),
  };
}

export const parseStdoutLine: StdoutLineParser = parseA2aStdoutLine;
