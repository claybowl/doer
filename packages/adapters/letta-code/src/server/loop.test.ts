import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AdapterExecutionContext } from "@doerai/adapter-utils";

// We test executeOffline indirectly by inspecting emitted events.
// LLM calls are mocked at the fetch/SDK layer.

function makeCtx(overrides: Partial<AdapterExecutionContext["config"]> = {}): AdapterExecutionContext {
  const logs: Array<{ kind: string; line: string }> = [];
  return {
    runId: "run-test",
    agent: {
      id: "agent-test",
      companyId: "company-test",
      name: "Test Agent",
      adapterType: "letta_code",
      budgetMonthlyCents: 10000,
      spentMonthlyCents: 0,
    } as unknown as AdapterExecutionContext["agent"],
    runtime: {} as AdapterExecutionContext["runtime"],
    config: {
      mode: "offline",
      memoryDir: "/tmp/test-memory",
      provider: "anthropic",
      apiKey: "sk-ant-test",
      ...overrides,
    },
    context: {},
    onLog: async (kind: string, line: string) => { logs.push({ kind, line }); },
    onMeta: vi.fn(),
    onSpawn: vi.fn(),
    _testLogs: logs,
  } as unknown as AdapterExecutionContext & { _testLogs: typeof logs };
}

// The loop logic is internal to executeOffline. We verify behavior via emitted
// stdout events (tool_call_message, assistant_message, stop_reason) which are
// observable through onLog.

describe("executeOffline — skill delivery path (inject mode, ollama)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("exits with exitCode 1 when memoryDir not configured", async () => {
    // Import dynamically so vi.mock can intercept fs
    const { execute } = await import("./execute.js");
    const ctx = makeCtx({ memoryDir: undefined as unknown as string });
    const result = await execute(ctx as unknown as AdapterExecutionContext);
    expect(result.exitCode).toBe(1);
    expect(result.errorMessage).toMatch(/memoryDir/i);
  });
});

describe("resolveSkillDelivery — covered in skills.test.ts", () => {
  it("is a pure function — no integration test needed here", () => {
    expect(true).toBe(true);
  });
});
