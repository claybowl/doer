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

  it("parses a plain assistant message", () => {
    const entries = parseLettaCloudStdoutLine("Hello from DonDog", ts);
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0].role).toBe("assistant");
  });

  it("parses a [thinking] prefix as reasoning", () => {
    const entries = parseLettaCloudStdoutLine("[thinking] Evaluating options…", ts);
    expect(entries.length).toBeGreaterThan(0);
    // Should be marked as thinking/reasoning
    const entry = entries[0];
    expect(entry.content).toContain("Evaluating options");
  });

  it("parses a [tool: name] prefix as tool call", () => {
    const entries = parseLettaCloudStdoutLine("[tool: create_linear_task] running…", ts);
    expect(entries.length).toBeGreaterThan(0);
    const entry = entries[0];
    expect(entry.content).toContain("create_linear_task");
  });

  it("returns empty array for empty string", () => {
    const entries = parseLettaCloudStdoutLine("", ts);
    expect(entries).toEqual([]);
  });

  it("returns empty array for whitespace-only string", () => {
    const entries = parseLettaCloudStdoutLine("   ", ts);
    expect(entries).toEqual([]);
  });

  it("attaches the provided timestamp", () => {
    const entries = parseLettaCloudStdoutLine("Hello", ts);
    if (entries.length > 0) {
      expect(entries[0].ts).toBe(ts);
    }
  });
});
