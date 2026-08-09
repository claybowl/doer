import { describe, expect, it, vi } from "vitest";
import type { AdapterExecutionContext } from "@doerai/adapter-utils";
import { execute, type LettaCodeExecuteDependencies } from "./execute.js";

function context(overrides: Partial<AdapterExecutionContext> = {}): AdapterExecutionContext {
  return {
    runId: "run-1",
    agent: { id: "agent-doer-1", companyId: "company-1", name: "Builder", adapterType: "letta_code", adapterConfig: {} },
    runtime: { sessionId: null, sessionParams: null, sessionDisplayId: null, taskKey: "DOER-42" },
    config: {
      backend: "local",
      model: "openai-codex/gpt-5",
      permissionMode: "unrestricted",
      env: { LETTA_MEMFS_DIR: "/doer/memory", DOER_API_KEY: "key" },
    },
    context: {
      cwd: "/doer/workspace",
      taskKey: "DOER-42",
      issueTitle: "Build unified Letta",
      issueDescription: "Use the Agent SDK.",
      wakeReason: "assignment",
    },
    onLog: vi.fn(async () => undefined),
    onMeta: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("letta_code Agent SDK execute", () => {
  it("delegates a local-canonical task turn and persists SDK session identity", async () => {
    const ctx = context();
    const runTurn = vi.fn(async (input) => {
      await input.onEvent({ type: "assistant_message", content: "done" });
      return {
        success: true,
        summary: "finished",
        model: "openai-codex/gpt-5",
        costUsd: null,
        sessionParams: {
          conversationId: "conversation-1",
          lettaAgentId: "agent-local-1",
          cwd: "/doer/workspace",
          backend: "local" as const,
        },
        sessionDisplayId: "session-1",
      };
    });

    const result = await execute(ctx, { runTurn } satisfies LettaCodeExecuteDependencies);

    expect(runTurn).toHaveBeenCalledWith(expect.objectContaining({
      prompt: expect.stringContaining("YOUR TASK: DOER-42"),
      config: expect.objectContaining({
        backend: "local",
        cwd: "/doer/workspace",
        permissionMode: "unrestricted",
      }),
      env: expect.objectContaining({ LETTA_MEMFS_DIR: "/doer/memory", DOER_API_KEY: "key" }),
    }));
    expect(ctx.onMeta).toHaveBeenCalledWith(expect.objectContaining({
      adapterType: "letta_code",
      command: "letta-agent-sdk",
      cwd: "/doer/workspace",
    }));
    expect(ctx.onLog).toHaveBeenCalledWith(
      "stdout",
      expect.stringMatching(
        /^\{"ts":"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z","type":"assistant_message","content":"done"}\n$/,
      ),
    );
    expect(result).toMatchObject({
      exitCode: 0,
      provider: "letta",
      model: "openai-codex/gpt-5",
      sessionDisplayId: "session-1",
      sessionParams: { conversationId: "conversation-1", lettaAgentId: "agent-local-1", backend: "local" },
      resultJson: expect.objectContaining({ trajectory: expect.any(Array) }),
    });
  });

  it("reports SDK failures as adapter failures", async () => {
    const ctx = context();
    const result = await execute(ctx, {
      runTurn: vi.fn(async () => { throw new Error("Letta app-server failed"); }),
    });

    expect(result).toMatchObject({ exitCode: 1, errorMessage: "Letta app-server failed" });
    expect(ctx.onLog).toHaveBeenCalledWith("stderr", "[letta-code] Letta app-server failed\n");
  });
});
