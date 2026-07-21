export type LettaCodeOutputEvent = Record<string, unknown> & { type: string };

export interface LettaCodeSdkSessionIdentity {
  lettaAgentId: string;
  sessionId: string;
  conversationId: string;
  model: string;
}

export interface MappedSdkMessage {
  events: LettaCodeOutputEvent[];
  session?: LettaCodeSdkSessionIdentity;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** Convert an untrusted Agent SDK message into Doer's stable JSON-line protocol. */
export function mapSdkMessage(value: unknown): MappedSdkMessage {
  const message = record(value);
  const type = stringValue(message.type);

  switch (type) {
    case "init":
      return {
        events: [],
        session: {
          lettaAgentId: stringValue(message.agentId),
          sessionId: stringValue(message.sessionId),
          conversationId: stringValue(message.conversationId),
          model: stringValue(message.model),
        },
      };
    case "assistant":
      return { events: [{ type: "assistant_message", content: stringValue(message.content) }] };
    case "reasoning":
      return { events: [{ type: "reasoning_message", content: stringValue(message.content) }] };
    case "tool_call":
      return {
        events: [{
          type: "tool_call_message",
          name: stringValue(message.toolName) || "unknown",
          input: record(message.toolInput),
          toolCallId: stringValue(message.toolCallId),
        }],
      };
    case "tool_result":
      return {
        events: [{
          type: "tool_return_message",
          toolCallId: stringValue(message.toolCallId),
          content: stringValue(message.content),
          isError: message.isError === true,
        }],
      };
    case "retry": {
      const attempt = numberValue(message.attempt);
      const maxAttempts = numberValue(message.maxAttempts);
      const reason = stringValue(message.reason) || "transient failure";
      const delayMs = numberValue(message.delayMs);
      return {
        events: [{
          type: "system_message",
          content: `Letta retry ${attempt}/${maxAttempts} after ${reason} (${delayMs}ms)`,
        }],
      };
    }
    case "error": {
      const stopReason = stringValue(message.stopReason) || "error";
      const detail = stringValue(message.message) || stringValue(message.errorDetail) || "Unknown error";
      return {
        events: [{
          type: "system_message",
          content: `Letta error (${stopReason}): ${detail}`,
          isError: true,
        }],
      };
    }
    case "result":
      return {
        events: [{
          type: "stop_reason",
          success: message.success === true,
          reason: stringValue(message.result) || stringValue(message.error) || stringValue(message.stopReason),
          durationMs: numberValue(message.durationMs),
        }],
      };
    case "stream_event":
    case "queue_update":
    case "loop_status":
    default:
      return { events: [] };
  }
}
