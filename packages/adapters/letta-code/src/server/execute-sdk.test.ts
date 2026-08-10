import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
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
        costEstimated: false,
        usage: null,
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

  it("passes through estimated cost and usage from the SDK turn", async () => {
    const ctx = context();
    const result = await execute(ctx, {
      runTurn: vi.fn(async () => ({
        success: true,
        summary: "finished",
        model: "moonshotai/kimi-k2-5",
        costUsd: 0.0167,
        costEstimated: true,
        usage: { inputTokens: 10000, outputTokens: 5000, cachedTokens: 4000 },
        sessionParams: {
          conversationId: "conversation-1",
          lettaAgentId: "agent-local-1",
          cwd: "/doer/workspace",
          backend: "local" as const,
        },
        sessionDisplayId: "session-1",
      })),
    });

    expect(result).toMatchObject({
      exitCode: 0,
      costUsd: 0.0167,
      costEstimated: true,
      usage: { inputTokens: 10000, outputTokens: 5000, cachedInputTokens: 4000 },
    });
  });

  it("omits costEstimated and usage when the SDK turn has neither", async () => {
    const ctx = context();
    const result = await execute(ctx, {
      runTurn: vi.fn(async () => ({
        success: true,
        summary: "finished",
        model: "some-unknown-model",
        costUsd: null,
        costEstimated: false,
        usage: null,
        sessionParams: {
          conversationId: "conversation-1",
          lettaAgentId: "agent-local-1",
          cwd: "/doer/workspace",
          backend: "local" as const,
        },
        sessionDisplayId: "session-1",
      })),
    });

    expect(result.costUsd).toBeNull();
    expect(result.costEstimated).toBeUndefined();
    expect(result.usage).toBeUndefined();
  });

  it("reports SDK failures as adapter failures", async () => {
    const ctx = context();
    const result = await execute(ctx, {
      runTurn: vi.fn(async () => { throw new Error("Letta app-server failed"); }),
    });

    expect(result).toMatchObject({ exitCode: 1, errorMessage: "Letta app-server failed" });
    expect(ctx.onLog).toHaveBeenCalledWith("stderr", "[letta-code] Letta app-server failed\n");
  });

  it("injects DOER_* publish env into the turn environment", async () => {
    const ctx = context({
      authToken: "tok-run",
      config: {
        backend: "local",
        model: "openai-codex/gpt-5",
        permissionMode: "unrestricted",
        env: { LETTA_MEMFS_DIR: "/doer/memory" },
      },
      context: {
        cwd: "/doer/workspace",
        taskKey: "DOER-42",
        issueId: "123e4567-e89b-42d3-a456-426614174000",
        wakeReason: "assignment",
      },
    });
    const runTurn = vi.fn(async () => ({
      success: false,
      summary: "stop early",
      model: "",
      costUsd: null,
      costEstimated: false,
      usage: null,
      sessionParams: {
        conversationId: "",
        lettaAgentId: "",
        cwd: "/doer/workspace",
        backend: "local" as const,
      },
      sessionDisplayId: "",
    }));

    await execute(ctx, { runTurn } satisfies LettaCodeExecuteDependencies);

    expect(runTurn).toHaveBeenCalledWith(expect.objectContaining({
      env: expect.objectContaining({
        LETTA_MEMFS_DIR: "/doer/memory",
        DOER_API_KEY: "tok-run",
        DOER_RUN_ID: "run-1",
        DOER_COMPANY_ID: "company-1",
        DOER_AGENT_ID: "agent-doer-1",
        DOER_API_URL: expect.any(String),
        DOER_TASK_ID: "123e4567-e89b-42d3-a456-426614174000",
      }),
    }));
  });

  it("captures outputs written during a successful run", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "letta-code-exec-"));
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 201 })));
    try {
      await fs.mkdir(path.join(tmpDir, "outputs"));
      await fs.writeFile(path.join(tmpDir, "outputs", "report.md"), "# done");
      const ctx = context({
        authToken: "tok-run",
        config: {
          backend: "local",
          model: "openai-codex/gpt-5",
          permissionMode: "unrestricted",
          env: { LETTA_MEMFS_DIR: "/doer/memory" },
        },
        context: { cwd: tmpDir, taskKey: "DOER-42", wakeReason: "assignment" },
      });

      const result = await execute(ctx, {
        runTurn: vi.fn(async () => ({
          success: true,
          summary: "finished",
          model: "openai-codex/gpt-5",
          costUsd: null,
          costEstimated: false,
          usage: null,
          sessionParams: {
            conversationId: "conversation-1",
            lettaAgentId: "agent-local-1",
            cwd: tmpDir,
            backend: "local" as const,
          },
          sessionDisplayId: "session-1",
        })),
      });

      expect(result.exitCode).toBe(0);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/companies/company-1/deliverables"),
        expect.objectContaining({ method: "POST" }),
      );
      expect(ctx.onLog).toHaveBeenCalledWith("stdout", "[output-sweep] Captured 1 file(s) → Outputs\n");
    } finally {
      vi.unstubAllGlobals();
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("does not sweep outputs when the turn fails", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "letta-code-exec-"));
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 201 })));
    try {
      await fs.mkdir(path.join(tmpDir, "outputs"));
      await fs.writeFile(path.join(tmpDir, "outputs", "report.md"), "# done");
      const ctx = context({
        config: {
          backend: "local",
          model: "openai-codex/gpt-5",
          permissionMode: "unrestricted",
          env: { LETTA_MEMFS_DIR: "/doer/memory" },
        },
        context: { cwd: tmpDir, taskKey: "DOER-42", wakeReason: "assignment" },
      });

      const result = await execute(ctx, {
        runTurn: vi.fn(async () => ({
          success: false,
          summary: "turn failed",
          model: "",
          costUsd: null,
          costEstimated: false,
          usage: null,
          sessionParams: {
            conversationId: "",
            lettaAgentId: "",
            cwd: tmpDir,
            backend: "local" as const,
          },
          sessionDisplayId: "",
        })),
      });

      expect(result.exitCode).toBe(1);
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
