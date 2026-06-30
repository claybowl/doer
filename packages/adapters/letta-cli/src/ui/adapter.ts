import type { TranscriptEntry } from "@doerai/adapter-utils";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function safeJsonParse(text: string): unknown {
  try { return JSON.parse(text); } catch { return null; }
}

/**
 * Parse stdout lines from the letta_cli adapter into TranscriptEntry objects.
 *
 * The letta-code CLI emits stream-json with a nested structure:
 *   {"type":"message","message_type":"assistant_message","content":"..."}
 *   {"type":"message","message_type":"tool_call_message","name":"...","input":{}}
 *   {"type":"result","subtype":"success","result":"..."}
 */
export function parseLettaCliStdoutLine(line: string, ts: string): TranscriptEntry[] {
  if (!line.trim()) return [];

  const parsed = asRecord(safeJsonParse(line));
  if (!parsed) {
    return [{ kind: "stdout", ts, text: line }];
  }

  const type = typeof parsed.type === "string" ? parsed.type : "";

  // System init — not user-visible
  if (type === "system") return [];

  // Result event — informational only (session ID already captured in execute.ts)
  if (type === "result") return [];

  // stream_event: partial streaming fragments emitted by --include-partial-messages.
  // Each logical message also emits a final assembled "message" type event, so these
  // fragments are pure noise for the transcript viewer. Suppress them.
  if (type === "stream_event") return [];

  if (type === "message") {
    const messageType = typeof parsed.message_type === "string" ? parsed.message_type : "";

    switch (messageType) {
      case "user_message": {
        const text = typeof parsed.content === "string" ? parsed.content : "";
        return text ? [{ kind: "user", ts, text }] : [];
      }

      case "assistant_message": {
        const text = typeof parsed.content === "string" ? parsed.content : "";
        return text ? [{ kind: "assistant", ts, text, delta: true }] : [];
      }

      case "reasoning_message": {
        const text = typeof parsed.reasoning === "string" ? parsed.reasoning : "";
        return text ? [{ kind: "thinking", ts, text, delta: true }] : [];
      }

      case "tool_call_message": {
        const name = typeof parsed.name === "string" ? parsed.name : "unknown";
        const input = parsed.input ?? {};
        const toolCallId = typeof parsed.tool_call_id === "string" ? parsed.tool_call_id : undefined;
        return [{ kind: "tool_call", ts, name, input, ...(toolCallId ? { toolUseId: toolCallId } : {}) }];
      }

      case "tool_return_message": {
        const content = typeof parsed.tool_return === "string"
          ? parsed.tool_return
          : typeof parsed.content === "string"
            ? parsed.content
            : "";
        const toolCallId = typeof parsed.tool_call_id === "string" ? parsed.tool_call_id : ts;
        const isError = parsed.status === "error" || parsed.is_err === true;
        return [{ kind: "tool_result", ts, toolUseId: toolCallId, content, isError }];
      }

      case "system_message": {
        const text = typeof parsed.content === "string" ? parsed.content : "";
        return text ? [{ kind: "system", ts, text }] : [];
      }

      case "usage_statistics": {
        const inputTokens = typeof parsed.prompt_tokens === "number" ? parsed.prompt_tokens : 0;
        const outputTokens = typeof parsed.completion_tokens === "number" ? parsed.completion_tokens : 0;
        return [
          {
            kind: "result",
            ts,
            text: `${inputTokens + outputTokens} tokens`,
            inputTokens,
            outputTokens,
            cachedTokens: 0,
            costUsd: 0,
            subtype: "usage",
            isError: false,
            errors: [],
          },
        ];
      }

      default:
        return [];
    }
  }

  return [{ kind: "stdout", ts, text: line }];
}
