import type { UsageSummary } from "@doerai/adapter-utils";
import { asString, asNumber, parseJson } from "@doerai/adapter-utils/server-utils";

/**
 * Parse stdout from the letta-code CLI (--output-format stream-json).
 *
 * CLI event format:
 *   {"type":"system","subtype":"init","agent_id":"...","conversation_id":"...","model":"..."}
 *   {"type":"message","message_type":"assistant_message","content":"..."}
 *   {"type":"message","message_type":"reasoning_message","reasoning":"..."}
 *   {"type":"message","message_type":"usage_statistics","prompt_tokens":N,"completion_tokens":N}
 *   {"type":"result","subtype":"success","result":"...","conversation_id":"...","usage":{...}}
 */
export function parseLettaCliStreamJson(stdout: string): {
  conversationId: string | null;
  model: string;
  usage: UsageSummary | null;
  summary: string;
  resultJson: Record<string, unknown> | null;
} {
  let conversationId: string | null = null;
  let model = "";
  let resultJson: Record<string, unknown> | null = null;
  const assistantTexts: string[] = [];
  let promptTokens = 0;
  let completionTokens = 0;

  for (const rawLine of stdout.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const event = parseJson(line);
    if (!event) continue;

    const type = asString(event.type, "");

    if (type === "system" && asString(event.subtype, "") === "init") {
      conversationId = asString(event.conversation_id, conversationId ?? "") || conversationId;
      model = asString(event.model, model);
      continue;
    }

    if (type === "message") {
      const messageType = asString(event.message_type, "");
      if (messageType === "assistant_message") {
        const text = asString(event.content, "");
        if (text) assistantTexts.push(text);
      } else if (messageType === "usage_statistics") {
        promptTokens = asNumber(event.prompt_tokens, promptTokens);
        completionTokens = asNumber(event.completion_tokens, completionTokens);
      }
      continue;
    }

    if (type === "result") {
      resultJson = event;
      conversationId = asString(event.conversation_id, conversationId ?? "") || conversationId;
    }
  }

  if (!resultJson) {
    return {
      conversationId,
      model,
      usage: promptTokens > 0 || completionTokens > 0
        ? { inputTokens: promptTokens, cachedInputTokens: 0, outputTokens: completionTokens }
        : null,
      summary: assistantTexts.join("\n\n").trim(),
      resultJson: null,
    };
  }

  // Prefer usage from the result event if present
  const usageObj = typeof resultJson.usage === "object" && resultJson.usage !== null
    ? (resultJson.usage as Record<string, unknown>)
    : {};
  const usage: UsageSummary = {
    inputTokens: asNumber(usageObj.input_tokens ?? usageObj.prompt_tokens, promptTokens),
    cachedInputTokens: asNumber(usageObj.cache_read_input_tokens, 0),
    outputTokens: asNumber(usageObj.output_tokens ?? usageObj.completion_tokens, completionTokens),
  };

  const summary = asString(resultJson.result, assistantTexts.join("\n\n")).trim();

  return { conversationId, model, usage, summary, resultJson };
}

export function isLettaCliAuthError(stdout: string, stderr: string): boolean {
  const combined = (stdout + "\n" + stderr).toLowerCase();
  return (
    combined.includes("unauthorized") ||
    combined.includes("invalid api key") ||
    combined.includes("authentication") ||
    combined.includes("api key required")
  );
}

export function describeLettaCliFailure(proc: { exitCode: number | null; stderr: string }): string | null {
  const stderrLine = proc.stderr
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find(Boolean) ?? "";
  if (!stderrLine && (proc.exitCode ?? 0) === 0) return null;
  return stderrLine
    ? `letta-code exited with code ${proc.exitCode ?? -1}: ${stderrLine}`
    : `letta-code exited with code ${proc.exitCode ?? -1}`;
}
