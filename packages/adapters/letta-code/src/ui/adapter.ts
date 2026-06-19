import type { TranscriptEntry } from "@doerai/adapter-utils";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function safeJsonParse(text: string): unknown {
  try { return JSON.parse(text); } catch { return null; }
}

/**
 * Parse stdout lines from the letta_code adapter into TranscriptEntry objects.
 * Emits the same JSON line format as letta-cloud so this adapter is transparent
 * to the UI transcript renderer.
 */
export function parseLettaCodeStdoutLine(line: string, ts: string): TranscriptEntry[] {
  if (!line.trim()) return [];

  const parsed = asRecord(safeJsonParse(line));
  if (!parsed) {
    return [{ kind: "stdout", ts, text: line }];
  }

  const type = typeof parsed.type === "string" ? parsed.type : "";

  switch (type) {
    case "user_message": {
      const text = typeof parsed.content === "string" ? parsed.content : "";
      return text ? [{ kind: "user", ts, text }] : [];
    }

    case "assistant_message": {
      const text = typeof parsed.content === "string" ? parsed.content : "";
      return text ? [{ kind: "assistant", ts, text, delta: true }] : [];
    }

    case "reasoning_message": {
      const text = typeof parsed.content === "string" ? parsed.content : "";
      return text ? [{ kind: "thinking", ts, text, delta: true }] : [];
    }

    case "tool_call_message": {
      const name = typeof parsed.name === "string" ? parsed.name : "unknown";
      const input = parsed.input ?? {};
      return [{ kind: "tool_call", ts, name, input }];
    }

    case "tool_return_message": {
      const content = typeof parsed.content === "string" ? parsed.content : "";
      const toolCallId = typeof parsed.toolCallId === "string" ? parsed.toolCallId : ts;
      const isError = parsed.isError === true;
      return [{ kind: "tool_result", ts, toolUseId: toolCallId, content, isError }];
    }

    case "system_message": {
      const text = typeof parsed.content === "string" ? parsed.content : "";
      return text ? [{ kind: "system", ts, text }] : [];
    }

    case "usage_statistics": {
      const inputTokens = typeof parsed.inputTokens === "number" ? parsed.inputTokens : 0;
      const outputTokens = typeof parsed.outputTokens === "number" ? parsed.outputTokens : 0;
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

    case "stop_reason":
    case "unknown":
      return [];

    default:
      return [{ kind: "stdout", ts, text: line }];
  }
}
