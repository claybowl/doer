import { describe, expect, it } from "vitest";
import { buildLettaCloudConfig, parseLettaCloudStdoutLine } from "./adapter.js";

/**
 * Structural tests for UI adapter utilities — no API calls, no DOM.
 */

describe("buildLettaCloudConfig", () => {
  it("maps form values to adapterConfig", () => {
    const config = buildLettaCloudConfig({
      agentId: "agent-abc123",
      apiKey: "sk-let-xxx",
      baseUrl: "https://api.letta.com",
    });
    expect(config.agentId).toBe("agent-abc123");
    expect(config.apiKey).toBe("sk-let-xxx");
    expect(config.baseUrl).toBe("https://api.letta.com");
  });

  it("returns object with all provided fields", () => {
    const config = buildLettaCloudConfig({
      agentId: "agent-abc",
      apiKey: "key",
      model: "anthropic/claude-sonnet-4-5",
      temperature: "0.7",
    });
    expect(config).toMatchObject({ agentId: "agent-abc", apiKey: "key" });
  });

  it("handles empty optional fields gracefully", () => {
    const config = buildLettaCloudConfig({ agentId: "agent-abc", apiKey: "key" });
    expect(config.agentId).toBe("agent-abc");
  });
});

describe("parseLettaCloudStdoutLine", () => {
  const ts = new Date().toISOString();

  // ── Structured JSON lines (new format) ──────────────────────────────────

  describe("structured JSON format", () => {
    it("parses user_message", () => {
      const line = JSON.stringify({ type: "user_message", content: "What's the status?" });
      const entries = parseLettaCloudStdoutLine(line, ts);
      expect(entries).toHaveLength(1);
      expect(entries[0].kind).toBe("user");
      if (entries[0].kind === "user") {
        expect(entries[0].text).toBe("What's the status?");
      }
    });

    it("parses assistant_message", () => {
      const line = JSON.stringify({ type: "assistant_message", content: "Here's what I found." });
      const entries = parseLettaCloudStdoutLine(line, ts);
      expect(entries).toHaveLength(1);
      expect(entries[0].kind).toBe("assistant");
      if (entries[0].kind === "assistant") {
        expect(entries[0].text).toBe("Here's what I found.");
      }
    });

    it("parses reasoning_message as thinking", () => {
      const line = JSON.stringify({ type: "reasoning_message", content: "Evaluating options…" });
      const entries = parseLettaCloudStdoutLine(line, ts);
      expect(entries).toHaveLength(1);
      expect(entries[0].kind).toBe("thinking");
      if (entries[0].kind === "thinking") {
        expect(entries[0].text).toBe("Evaluating options…");
      }
    });

    it("parses tool_call_message with name and input", () => {
      const line = JSON.stringify({
        type: "tool_call_message",
        name: "create_linear_task",
        input: { title: "Fix the bug" },
        toolCallId: "tc-123",
      });
      const entries = parseLettaCloudStdoutLine(line, ts);
      expect(entries).toHaveLength(1);
      expect(entries[0].kind).toBe("tool_call");
      if (entries[0].kind === "tool_call") {
        expect(entries[0].name).toBe("create_linear_task");
        expect(entries[0].input).toEqual({ title: "Fix the bug" });
        expect(entries[0].toolUseId).toBe("tc-123");
      }
    });

    it("parses tool_return_message with content and error status", () => {
      const line = JSON.stringify({
        type: "tool_return_message",
        content: "Task created: LIN-42",
        toolCallId: "tc-123",
        isError: false,
      });
      const entries = parseLettaCloudStdoutLine(line, ts);
      expect(entries).toHaveLength(1);
      expect(entries[0].kind).toBe("tool_result");
      if (entries[0].kind === "tool_result") {
        expect(entries[0].content).toBe("Task created: LIN-42");
        expect(entries[0].toolUseId).toBe("tc-123");
        expect(entries[0].isError).toBe(false);
      }
    });

    it("parses tool_return_message error", () => {
      const line = JSON.stringify({
        type: "tool_return_message",
        content: "Permission denied",
        toolCallId: "tc-456",
        isError: true,
      });
      const entries = parseLettaCloudStdoutLine(line, ts);
      expect(entries).toHaveLength(1);
      if (entries[0].kind === "tool_result") {
        expect(entries[0].isError).toBe(true);
      }
    });

    it("parses system_message", () => {
      const line = JSON.stringify({ type: "system_message", content: "Memory compacted." });
      const entries = parseLettaCloudStdoutLine(line, ts);
      expect(entries).toHaveLength(1);
      expect(entries[0].kind).toBe("system");
      if (entries[0].kind === "system") {
        expect(entries[0].text).toBe("Memory compacted.");
      }
    });

    it("parses usage_statistics as result entry", () => {
      const line = JSON.stringify({
        type: "usage_statistics",
        inputTokens: 1500,
        outputTokens: 300,
        cachedTokens: 100,
        stepCount: 3,
        totalTokens: 1800,
      });
      const entries = parseLettaCloudStdoutLine(line, ts);
      expect(entries).toHaveLength(1);
      expect(entries[0].kind).toBe("result");
      if (entries[0].kind === "result") {
        expect(entries[0].inputTokens).toBe(1500);
        expect(entries[0].outputTokens).toBe(300);
        expect(entries[0].cachedTokens).toBe(100);
      }
    });

    it("returns empty for stop_reason", () => {
      const line = JSON.stringify({ type: "stop_reason", reason: "max_steps" });
      const entries = parseLettaCloudStdoutLine(line, ts);
      expect(entries).toEqual([]);
    });

    it("renders unknown types as stdout", () => {
      const line = JSON.stringify({ type: "unknown", messageType: "foo", raw: '{"data":"bar"}' });
      const entries = parseLettaCloudStdoutLine(line, ts);
      expect(entries).toHaveLength(1);
      expect(entries[0].kind).toBe("stdout");
    });

    it("skips empty content fields", () => {
      const line = JSON.stringify({ type: "assistant_message", content: "" });
      const entries = parseLettaCloudStdoutLine(line, ts);
      expect(entries).toEqual([]);
    });
  });

  // ── Legacy plain-text fallback ──────────────────────────────────────────

  describe("legacy plain-text fallback", () => {
    it("parses a plain assistant message", () => {
      const entries = parseLettaCloudStdoutLine("Hello from DonDog", ts);
      expect(entries.length).toBeGreaterThan(0);
      expect(entries[0].kind).toBe("assistant");
    });

    it("parses a [thinking] prefix as reasoning", () => {
      const entries = parseLettaCloudStdoutLine("[thinking] Evaluating options…", ts);
      expect(entries.length).toBeGreaterThan(0);
      expect(entries[0].kind).toBe("thinking");
      if (entries[0].kind === "thinking") {
        expect(entries[0].text).toContain("Evaluating options");
      }
    });

    it("parses a [tool: name] prefix as tool call", () => {
      const entries = parseLettaCloudStdoutLine("[tool: create_linear_task] running…", ts);
      expect(entries.length).toBeGreaterThan(0);
      expect(entries[0].kind).toBe("tool_call");
      if (entries[0].kind === "tool_call") {
        expect(entries[0].name).toContain("create_linear_task");
      }
    });
  });

  // ── Edge cases ──────────────────────────────────────────────────────────

  describe("edge cases", () => {
    it("returns empty array for empty string", () => {
      expect(parseLettaCloudStdoutLine("", ts)).toEqual([]);
    });

    it("returns empty array for whitespace-only string", () => {
      expect(parseLettaCloudStdoutLine("   ", ts)).toEqual([]);
    });

    it("attaches the provided timestamp", () => {
      const entries = parseLettaCloudStdoutLine(
        JSON.stringify({ type: "assistant_message", content: "Hi" }),
        ts,
      );
      if (entries.length > 0) {
        expect(entries[0].ts).toBe(ts);
      }
    });

    it("handles malformed JSON gracefully (falls back to plain text)", () => {
      const entries = parseLettaCloudStdoutLine("{broken json}", ts);
      expect(entries).toHaveLength(1);
      expect(entries[0].kind).toBe("assistant");
    });
  });
});
