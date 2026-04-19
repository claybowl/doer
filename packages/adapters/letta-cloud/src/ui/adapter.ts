import type { TranscriptEntry } from "@doerai/adapter-utils";
import type { LettaCreateConfigValues } from "../shared/types.js";

export function buildLettaCloudConfig(values: LettaCreateConfigValues): Record<string, unknown> {
  return {
    agentId: values.agentId ?? "",
    apiKey: values.apiKey ?? "",
    baseUrl: values.baseUrl ?? "",
    model: values.model ?? "",
    temperature: values.temperature ?? 0.7,
    maxTokens: values.maxTokens ?? 4096,
    heartbeatPrompt: values.heartbeatPrompt ?? "",
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ── Parser ─────────────────────────────────────────────────────────────────

/**
 * Parse a single stdout line from the Letta Cloud adapter into transcript
 * entries for the live dashboard. Each line is expected to be a JSON object
 * emitted by `execute.ts`; plain text falls back to the legacy prefix-based
 * parsing for backward compatibility.
 */
export function parseLettaCloudStdoutLine(line: string, ts: string): TranscriptEntry[] {
  if (!line.trim()) return [];

  const parsed = asRecord(safeJsonParse(line));
  if (!parsed) {
    // ── Legacy fallback: prefix-based plain text ──────────────────────────
    if (line.startsWith("[tool: ")) {
      const name = line.slice(7, line.indexOf("]"));
      return [{ kind: "tool_call", ts, name, input: {} }];
    }
    if (line.startsWith("[thinking] ")) {
      return [{ kind: "thinking", ts, text: line.slice(11) }];
    }
    return [{ kind: "assistant", ts, text: line }];
  }

  const type = typeof parsed.type === "string" ? parsed.type : "";

  switch (type) {
    case "user_message": {
      const text = typeof parsed.content === "string" ? parsed.content : "";
      if (!text) return [];
      return [{ kind: "user", ts, text }];
    }

    case "assistant_message": {
      const text = typeof parsed.content === "string" ? parsed.content : "";
      if (!text) return [];
      return [{ kind: "assistant", ts, text }];
    }

    case "reasoning_message": {
      const text = typeof parsed.content === "string" ? parsed.content : "";
      if (!text) return [];
      return [{ kind: "thinking", ts, text }];
    }

    case "tool_call_message": {
      const name = typeof parsed.name === "string" ? parsed.name : "unknown";
      const toolUseId = typeof parsed.toolCallId === "string" ? parsed.toolCallId : undefined;
      return [{ kind: "tool_call", ts, name, input: parsed.input ?? {}, toolUseId }];
    }

    case "tool_return_message": {
      const toolUseId = typeof parsed.toolCallId === "string" ? parsed.toolCallId : "";
      const content = typeof parsed.content === "string" ? parsed.content : "";
      const isError = parsed.isError === true;
      return [{ kind: "tool_result", ts, toolUseId, content, isError }];
    }

    case "system_message": {
      const text = typeof parsed.content === "string" ? parsed.content : "";
      if (!text) return [];
      return [{ kind: "system", ts, text }];
    }

    case "usage_statistics": {
      const inputTokens = asNumber(parsed.inputTokens);
      const outputTokens = asNumber(parsed.outputTokens);
      const cachedTokens = asNumber(parsed.cachedTokens);
      return [{
        kind: "result",
        ts,
        text: "",
        inputTokens,
        outputTokens,
        cachedTokens,
        costUsd: 0, // Letta doesn't report cost directly
        subtype: "usage",
        isError: false,
        errors: [],
      }];
    }

    case "stop_reason": {
      // Don't render stop reasons in the transcript — they're metadata
      return [];
    }

    case "unknown": {
      // Unknown message types from the server — render as raw stdout
      const raw = typeof parsed.raw === "string" ? parsed.raw : "";
      if (!raw) return [];
      return [{ kind: "stdout", ts, text: raw }];
    }

    default:
      // Unrecognized JSON — render as stdout
      return [{ kind: "stdout", ts, text: line }];
  }
}
