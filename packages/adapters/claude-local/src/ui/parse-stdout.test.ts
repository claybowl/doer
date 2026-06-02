import { describe, expect, it } from "vitest";
import { parseClaudeStdoutLine } from "./parse-stdout.js";

const TS = "2026-05-31T00:00:00.000Z";

describe("parseClaudeStdoutLine — partial message streaming", () => {
  it("renders text_delta stream events as coalescable assistant deltas", () => {
    const line = JSON.stringify({
      type: "stream_event",
      event: { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "Hi there" } },
    });
    expect(parseClaudeStdoutLine(line, TS)).toEqual([
      { kind: "assistant", ts: TS, text: "Hi there", delta: true },
    ]);
  });

  it("renders thinking_delta stream events as coalescable thinking deltas", () => {
    const line = JSON.stringify({
      type: "stream_event",
      event: { type: "content_block_delta", delta: { type: "thinking_delta", thinking: "hmm" } },
    });
    expect(parseClaudeStdoutLine(line, TS)).toEqual([
      { kind: "thinking", ts: TS, text: "hmm", delta: true },
    ]);
  });

  it("ignores non-delta stream events (message_start, content_block_stop, ...)", () => {
    for (const evType of ["message_start", "content_block_start", "content_block_stop", "message_stop"]) {
      const line = JSON.stringify({ type: "stream_event", event: { type: evType } });
      expect(parseClaudeStdoutLine(line, TS)).toEqual([]);
    }
  });

  it("does NOT re-render text from the complete assistant message (deltas already showed it)", () => {
    const line = JSON.stringify({
      type: "assistant",
      message: { content: [{ type: "text", text: "Hi there" }] },
    });
    // Text already streamed via deltas — complete message must not duplicate it.
    expect(parseClaudeStdoutLine(line, TS)).toEqual([]);
  });

  it("still renders tool_use from the complete assistant message", () => {
    const line = JSON.stringify({
      type: "assistant",
      message: {
        content: [
          { type: "text", text: "running a tool" },
          { type: "tool_use", id: "tool_1", name: "Bash", input: { command: "ls" } },
        ],
      },
    });
    expect(parseClaudeStdoutLine(line, TS)).toEqual([
      { kind: "tool_call", ts: TS, name: "Bash", toolUseId: "tool_1", input: { command: "ls" } },
    ]);
  });

  it("drops noisy non-init system events instead of dumping raw JSON", () => {
    for (const subtype of ["hook_started", "hook_response", "status", "post_turn_summary"]) {
      const line = JSON.stringify({ type: "system", subtype, foo: "bar" });
      expect(parseClaudeStdoutLine(line, TS)).toEqual([]);
    }
  });

  it("still renders the system init event", () => {
    const line = JSON.stringify({ type: "system", subtype: "init", model: "claude-x", session_id: "s1" });
    expect(parseClaudeStdoutLine(line, TS)).toEqual([
      { kind: "init", ts: TS, model: "claude-x", sessionId: "s1" },
    ]);
  });
});
