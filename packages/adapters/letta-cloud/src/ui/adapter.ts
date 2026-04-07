import type { TranscriptEntry } from "@paperclipai/adapter-utils";
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

export function parseLettaCloudStdoutLine(line: string, ts: string): TranscriptEntry[] {
  if (!line.trim()) return [];

  // Tool call lines
  if (line.startsWith("[tool: ")) {
    const name = line.slice(7, line.indexOf("]"));
    return [{ kind: "tool_call", ts, name, input: {} }];
  }

  // Thinking lines
  if (line.startsWith("[thinking] ")) {
    return [{ kind: "thinking", ts, text: line.slice(11) }];
  }

  // Default: assistant message
  return [{ kind: "assistant", ts, text: line }];
}
