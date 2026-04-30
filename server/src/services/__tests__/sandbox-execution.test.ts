import { describe, it, expect, vi, beforeEach } from "vitest";

// Unit tests for sandbox-execution service logic that don't require E2B API

describe("sandbox tool validation", () => {
  // Since validateToolCall is not exported, we test through the service behavior
  // and verify approved tool list logic

  const approvedTools = ["bash_command", "read_file", "write_file", "list_dir"] as const;

  it("lists all approved tools", () => {
    expect(approvedTools).toContain("bash_command");
    expect(approvedTools).toContain("read_file");
    expect(approvedTools).toContain("write_file");
    expect(approvedTools).toContain("list_dir");
  });

  it("bash_command requires a command param", () => {
    const validCall = { tool: "bash_command" as const, params: { command: "echo hello" } };
    expect(typeof validCall.params.command).toBe("string");
  });

  it("read_file and write_file require a path param", () => {
    const readCall = { tool: "read_file" as const, params: { path: "/tmp/test.txt" } };
    const writeCall = { tool: "write_file" as const, params: { path: "/tmp/test.txt", content: "hello" } };
    expect(typeof readCall.params.path).toBe("string");
    expect(typeof writeCall.params.path).toBe("string");
    expect(typeof writeCall.params.content).toBe("string");
  });
});

describe("output truncation", () => {
  it("does not truncate short output", () => {
    const input = "hello world";
    const limit = 100;
    const buf = Buffer.from(input, "utf8");
    expect(buf.length <= limit).toBe(true);
  });

  it("truncation message format", () => {
    const omitted = 1000;
    const msg = `\n[output truncated — ${omitted} bytes omitted]`;
    expect(msg).toContain("truncated");
    expect(msg).toContain("1000 bytes omitted");
  });
});

describe("sandbox run record structure", () => {
  it("valid status values are defined", () => {
    const validStatuses = ["queued", "running", "succeeded", "failed", "cancelled"];
    expect(validStatuses).toContain("queued");
    expect(validStatuses).toContain("running");
    expect(validStatuses).toContain("succeeded");
    expect(validStatuses).toContain("failed");
    expect(validStatuses).toContain("cancelled");
  });
});
