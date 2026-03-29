import type { CreateConfigValues, TranscriptEntry } from "@paperclipai/adapter-utils";

export function buildLettaCloudConfig(values: CreateConfigValues): Record<string, unknown> {
  return {
    agentId: (values as Record<string, unknown>).agentId ?? "",
    apiKey: (values as Record<string, unknown>).apiKey ?? "",
    baseUrl: (values as Record<string, unknown>).baseUrl ?? "",
    model: values.model ?? "",
    temperature: (values as Record<string, unknown>).temperature ?? 0.7,
    maxTokens: (values as Record<string, unknown>).maxTokens ?? 4096,
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
