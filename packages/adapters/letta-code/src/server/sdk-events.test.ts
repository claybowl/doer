import { describe, expect, it } from "vitest";
import { mapSdkMessage } from "./sdk-events.js";

describe("mapSdkMessage", () => {
  it("captures initialized session identity without leaking unknown fields", () => {
    expect(mapSdkMessage({
      type: "init",
      agentId: "agent-local-1",
      sessionId: "session-1",
      conversationId: "conversation-1",
      model: "openai-codex/gpt-5",
      secret: "ignore-me",
    })).toEqual({
      events: [],
      session: {
        lettaAgentId: "agent-local-1",
        sessionId: "session-1",
        conversationId: "conversation-1",
        model: "openai-codex/gpt-5",
      },
    });
  });

  it.each([
    [
      { type: "assistant", content: "hello", uuid: "m1" },
      { type: "assistant_message", content: "hello" },
    ],
    [
      { type: "reasoning", content: "checking", uuid: "m2" },
      { type: "reasoning_message", content: "checking" },
    ],
    [
      { type: "tool_call", toolCallId: "call-1", toolName: "Bash", toolInput: { command: "pwd" }, uuid: "m3" },
      { type: "tool_call_message", name: "Bash", input: { command: "pwd" }, toolCallId: "call-1" },
    ],
    [
      { type: "tool_result", toolCallId: "call-1", content: "/work", isError: false, uuid: "m4" },
      { type: "tool_return_message", toolCallId: "call-1", content: "/work", isError: false },
    ],
    [
      { type: "retry", reason: "rate_limit", attempt: 1, maxAttempts: 3, delayMs: 250 },
      { type: "system_message", content: "Letta retry 1/3 after rate_limit (250ms)" },
    ],
    [
      { type: "error", message: "provider unavailable", stopReason: "llm_api_error" },
      { type: "system_message", content: "Letta error (llm_api_error): provider unavailable", isError: true },
    ],
    [
      { type: "result", success: true, result: "finished", durationMs: 42, conversationId: "conversation-1" },
      { type: "stop_reason", success: true, reason: "finished", durationMs: 42 },
    ],
  ])("maps %s into a stable Doer event", (message, expected) => {
    expect(mapSdkMessage(message)).toEqual({ events: [expected] });
  });

  it("sanitizes malformed SDK fields instead of forwarding arbitrary values", () => {
    expect(mapSdkMessage({
      type: "tool_call",
      toolCallId: 7,
      toolName: null,
      toolInput: "not-an-object",
    })).toEqual({
      events: [{ type: "tool_call_message", name: "unknown", input: {}, toolCallId: "" }],
    });
  });

  it("maps text-bearing stream events into incremental transcript deltas", () => {
    expect(mapSdkMessage({
      type: "stream_event",
      event: { type: "content_block_delta", delta: { type: "text_delta", text: "hel" } },
      uuid: "s1",
    })).toEqual({ events: [{ type: "assistant_message", content: "hel", delta: true }] });
    expect(mapSdkMessage({
      type: "stream_event",
      event: { type: "reasoning_delta", delta: { text: "thinking" } },
      uuid: "s2",
    })).toEqual({ events: [{ type: "reasoning_message", content: "thinking", delta: true }] });
    expect(mapSdkMessage({ type: "stream_event", event: {}, uuid: "s3" })).toEqual({ events: [] });
    expect(mapSdkMessage({ type: "loop_status", status: "idle", activeRunIds: [] })).toEqual({ events: [] });
  });

  it("maps Letta usage_statistics stream events into usage events", () => {
    expect(mapSdkMessage({
      type: "stream_event",
      event: {
        message_type: "usage_statistics",
        prompt_tokens: 10000,
        completion_tokens: 5000,
        cached_input_tokens: 4000,
        step_count: 3,
        total_tokens: 15000,
      },
      uuid: "s4",
    })).toEqual({
      events: [{
        type: "usage_statistics",
        inputTokens: 10000,
        outputTokens: 5000,
        cachedTokens: 4000,
        stepCount: 3,
        totalTokens: 15000,
      }],
    });
  });
});
