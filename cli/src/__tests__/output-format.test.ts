import { describe, expect, it, vi } from "vitest";
import { printOutput } from "../commands/client/common.js";

// Capture console.log output
function captureLog(fn: () => void): string {
  const lines: string[] = [];
  const original = console.log;
  console.log = (...args: unknown[]) => lines.push(args.map(String).join(" "));
  try {
    fn();
  } finally {
    console.log = original;
  }
  return lines.join("\n");
}

const sampleRows = [
  { id: "agent-1", name: "Alfie", role: "gm", status: "active" },
  { id: "agent-2", name: "Maker", role: "general", status: "active" },
];

describe("printOutput format modes", () => {
  it("outputs JSON when format is 'json'", () => {
    const out = captureLog(() => printOutput(sampleRows, { format: "json" }));
    const parsed = JSON.parse(out);
    expect(parsed).toEqual(sampleRows);
  });

  it("outputs JSON when json flag is true (backward compat)", () => {
    const out = captureLog(() => printOutput(sampleRows, { json: true }));
    const parsed = JSON.parse(out);
    expect(parsed).toEqual(sampleRows);
  });

  it("outputs table with headers when format is 'table'", () => {
    const out = captureLog(() => printOutput(sampleRows, { format: "table" }));
    // Table should have a header row with column names
    expect(out).toContain("id");
    expect(out).toContain("name");
    expect(out).toContain("role");
    expect(out).toContain("status");
    // Table should contain separator dashes
    expect(out).toContain("---");
    // Table should contain the data
    expect(out).toContain("agent-1");
    expect(out).toContain("Alfie");
    expect(out).toContain("agent-2");
    expect(out).toContain("Maker");
  });

  it("outputs inline text when format is 'text' (default)", () => {
    const out = captureLog(() => printOutput(sampleRows, { format: "text" }));
    expect(out).toContain("id=agent-1");
    expect(out).toContain("name=Alfie");
    expect(out).toContain("id=agent-2");
    expect(out).toContain("name=Maker");
    // Should NOT be JSON
    expect(() => JSON.parse(out)).toThrow();
  });

  it("defaults to text format when no format/json specified", () => {
    const out = captureLog(() => printOutput(sampleRows, {}));
    expect(out).toContain("id=agent-1");
    expect(() => JSON.parse(out)).toThrow();
  });

  it("handles empty arrays in all formats", () => {
    expect(captureLog(() => printOutput([], { format: "json" }))).toBe("[]");
    expect(captureLog(() => printOutput([], { format: "table" }))).toContain("empty");
    expect(captureLog(() => printOutput([], { format: "text" }))).toContain("empty");
  });

  it("handles single object in table format", () => {
    const single = { id: "agent-1", name: "Alfie" };
    const out = captureLog(() => printOutput(single, { format: "table" }));
    expect(out).toContain("id");
    expect(out).toContain("name");
    expect(out).toContain("agent-1");
    expect(out).toContain("Alfie");
  });
});
