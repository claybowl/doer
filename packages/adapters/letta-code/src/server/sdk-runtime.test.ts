import { describe, expect, it, vi } from "vitest";
import { resolveLettaCodeConfig } from "./config.js";
import { runLettaSdkTurn, type LettaSdkClientLike, type LettaSdkSessionLike } from "./sdk-runtime.js";

function sessionWith(events: unknown[]): LettaSdkSessionLike & { send: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> } {
  return {
    agentId: "agent-local-1",
    sessionId: "session-1",
    conversationId: "conversation-1",
    send: vi.fn(async () => undefined),
    stream: async function* () {
      for (const event of events) yield event;
    },
    abort: vi.fn(async () => undefined),
    close: vi.fn(),
  };
}

describe("runLettaSdkTurn", () => {
  it("does not duplicate streamed text when the SDK emits a final assembled message", async () => {
    const events: Array<Record<string, unknown>> = [];
    const result = await runLettaSdkTurn({
      prompt: "hello",
      config: resolveLettaCodeConfig({ backend: "local", model: "openai-codex/gpt-5", cwd: "/work" }),
      env: {},
      onEvent: async (event) => { events.push(event); },
    }, {
      createClient: () => ({
        createAgent: async () => "agent-local-1",
        createSession: () => ({
          agentId: "agent-local-1",
          sessionId: "session-1",
          conversationId: "conversation-1",
          send: async () => undefined,
          stream: async function* () {
            yield { type: "init", agentId: "agent-local-1", sessionId: "session-1", conversationId: "conversation-1", model: "openai-codex/gpt-5" };
            yield { type: "assistant", content: "hello", delta: true };
            yield { type: "assistant", content: "hello world" };
            yield { type: "result", success: true, result: "done" };
          },
          abort: async () => undefined,
          close: () => undefined,
        }),
        resumeSession: () => ({
          agentId: "agent-local-1",
          sessionId: "session-1",
          conversationId: "conversation-1",
          send: async () => undefined,
          stream: async function* () {
            yield { type: "init", agentId: "agent-local-1", sessionId: "session-1", conversationId: "conversation-1", model: "openai-codex/gpt-5" };
            yield { type: "assistant", content: "hello", delta: true };
            yield { type: "assistant", content: "hello world" };
            yield { type: "result", success: true, result: "done" };
          },
          abort: async () => undefined,
          close: () => undefined,
        }),
      }),
    });

    expect(events.filter((event) => event.type === "assistant_message").map((event) => event.content)).toEqual(["hello", " world"]);
    expect(result.success).toBe(true);
  });

  it("creates a canonical local agent, runs a turn, emits events, and closes", async () => {
    const sdkSession = sessionWith([
      { type: "init", agentId: "agent-local-1", sessionId: "session-1", conversationId: "conversation-1", model: "openai-codex/gpt-5" },
      { type: "assistant", content: "done", uuid: "message-1" },
      { type: "result", success: true, result: "finished", durationMs: 25, conversationId: "conversation-1" },
    ]);
    const client: LettaSdkClientLike = {
      createAgent: vi.fn(async () => "agent-local-1"),
      createSession: vi.fn(() => sdkSession),
      resumeSession: vi.fn(() => sdkSession),
    };
    const createClient = vi.fn(() => client);
    const onEvent = vi.fn(async () => undefined);

    const result = await runLettaSdkTurn({
      prompt: "Work the issue",
      config: resolveLettaCodeConfig({ backend: "local", model: "openai-codex/gpt-5", cwd: "/work" }),
      env: { LETTA_MEMFS_DIR: "/memory", DOER_AGENT_STATE_DIR: "/state" },
      onEvent,
    }, { createClient });

    expect(createClient).toHaveBeenCalledWith({
      backend: "local",
      transport: "app-server",
      appServer: { harnessBackend: "local" },
    });
    expect(client.createAgent).toHaveBeenCalledWith(expect.objectContaining({
      memfs: true,
      model: "openai-codex/gpt-5",
      env: expect.objectContaining({
        MEMORY_DIR: "/memory",
        LETTA_LOCAL_BACKEND_DIR: "/state/letta-local-backend",
      }),
    }));
    expect(client.resumeSession).toHaveBeenCalledWith("agent-local-1", expect.objectContaining({ cwd: "/work" }));
    expect(sdkSession.send).toHaveBeenCalledWith("Work the issue");
    expect(onEvent).toHaveBeenCalledWith({ type: "assistant_message", content: "done" });
    expect(sdkSession.close).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      success: true,
      summary: "finished",
      model: "openai-codex/gpt-5",
      sessionParams: {
        conversationId: "conversation-1",
        lettaAgentId: "agent-local-1",
        cwd: "/work",
        backend: "local",
      },
    });
  });

  it("resumes the persisted conversation instead of creating an agent", async () => {
    const sdkSession = sessionWith([
      { type: "init", agentId: "agent-local-1", sessionId: "session-2", conversationId: "conversation-1", model: "gpt" },
      { type: "result", success: true, result: "ok", durationMs: 1, conversationId: "conversation-1" },
    ]);
    const client: LettaSdkClientLike = {
      createAgent: vi.fn(async () => "unused"),
      createSession: vi.fn(() => sdkSession),
      resumeSession: vi.fn(() => sdkSession),
    };

    await runLettaSdkTurn({
      prompt: "continue",
      config: resolveLettaCodeConfig({ backend: "local", lettaAgentId: "agent-local-1", cwd: "/work" }),
      sessionParams: { conversationId: "conversation-1", lettaAgentId: "agent-local-1", cwd: "/work", backend: "local" },
      env: { LETTA_MEMFS_DIR: "/memory" },
      onEvent: async () => undefined,
    }, { createClient: () => client });

    expect(client.createAgent).not.toHaveBeenCalled();
    expect(client.resumeSession).toHaveBeenCalledWith("conversation-1", expect.any(Object));
  });

  it("passes Doer MemFS and supported local session options to the app-server", async () => {
    const sdkSession = sessionWith([
      { type: "init", agentId: "agent-local-1", sessionId: "session-1", conversationId: "conversation-1", model: "ollama-cloud/kimi" },
      { type: "result", success: true, result: "ok", durationMs: 1, conversationId: "conversation-1" },
    ]);
    const client: LettaSdkClientLike = {
      createAgent: vi.fn(async () => "unused"),
      createSession: vi.fn(() => sdkSession),
      resumeSession: vi.fn(() => sdkSession),
    };

    const tools = [{
      name: "doer_test",
      label: "Doer Test",
      description: "test",
      parameters: { type: "object" },
      execute: vi.fn(async () => ({ content: [{ type: "text" as const, text: "ok" }] })),
    }];
    await runLettaSdkTurn({
      prompt: "use local tools",
      config: resolveLettaCodeConfig({
        backend: "local",
        lettaAgentId: "agent-local-1",
        model: "ollama-cloud/kimi",
        cwd: "/work",
        permissionMode: "unrestricted",
        allowedTools: ["Bash", "Read", "Write", "Edit"],
      }),
      env: {
        LETTA_MEMFS_DIR: "/doer/memory",
        DOER_API_KEY: "doer-key",
        DOER_BASE_URL: "http://127.0.0.1:3101/api",
        DOER_AGENT_STATE_DIR: "/doer/state",
      },
      tools,
      onEvent: async () => undefined,
    }, { createClient: () => client });

    expect(client.resumeSession).toHaveBeenCalledWith("agent-local-1", expect.objectContaining({
      cwd: "/work",
      model: "ollama-cloud/kimi",
      permissionMode: "unrestricted",
      env: expect.objectContaining({
        MEMORY_DIR: "/doer/memory",
        LETTA_MEMORY_DIR: "/doer/memory",
        LETTA_MEMORY_DIR_EXPLICIT: "1",
        LETTA_MEMFS_DIR: "/doer/memory",
        LETTA_LOCAL_BACKEND_DIR: "/doer/state/letta-local-backend",
        DOER_API_KEY: "doer-key",
        DOER_BASE_URL: "http://127.0.0.1:3101/api",
        DOER_AGENT_STATE_DIR: "/doer/state",
      }),
      tools,
    }));
  });

  it("returns an unsuccessful SDK result and always closes the session", async () => {
    const sdkSession = sessionWith([
      { type: "init", agentId: "agent-local-1", sessionId: "session-1", conversationId: "conversation-1", model: "gpt" },
      { type: "result", success: false, error: "max_steps", durationMs: 1, conversationId: "conversation-1" },
    ]);
    const client: LettaSdkClientLike = {
      createAgent: vi.fn(async () => "unused"),
      createSession: vi.fn(() => sdkSession),
      resumeSession: vi.fn(() => sdkSession),
    };

    const result = await runLettaSdkTurn({
      prompt: "work",
      config: resolveLettaCodeConfig({ backend: "local", lettaAgentId: "agent-local-1", cwd: "/work" }),
      env: { LETTA_MEMFS_DIR: "/memory" },
      onEvent: async () => undefined,
    }, { createClient: () => client });

    expect(result).toMatchObject({ success: false, summary: "max_steps" });
    expect(sdkSession.close).toHaveBeenCalledOnce();
  });

  it("closes and propagates SDK exceptions", async () => {
    const sdkSession = sessionWith([]);
    sdkSession.send.mockRejectedValueOnce(new Error("provider failed"));
    const client: LettaSdkClientLike = {
      createAgent: vi.fn(async () => "unused"),
      createSession: vi.fn(() => sdkSession),
      resumeSession: vi.fn(() => sdkSession),
    };

    await expect(runLettaSdkTurn({
      prompt: "work",
      config: resolveLettaCodeConfig({ backend: "local", lettaAgentId: "agent-local-1", cwd: "/work" }),
      env: { LETTA_MEMFS_DIR: "/memory" },
      onEvent: async () => undefined,
    }, { createClient: () => client })).rejects.toThrow("provider failed");
    expect(sdkSession.close).toHaveBeenCalledOnce();
  });

  it("falls back from a stale conversation to the canonical agent", async () => {
    const sdkSession = sessionWith([
      { type: "init", agentId: "agent-local-1", sessionId: "session-2", conversationId: "conversation-2", model: "gpt" },
      { type: "result", success: true, result: "recovered", durationMs: 1, conversationId: "conversation-2" },
    ]);
    const resumeSession = vi.fn((id: string) => {
      if (id === "conversation-stale") throw new Error("Conversation conversation-stale not found");
      return sdkSession;
    });
    const client: LettaSdkClientLike = {
      createAgent: vi.fn(async () => "unused"),
      createSession: vi.fn(() => sdkSession),
      resumeSession,
    };

    const result = await runLettaSdkTurn({
      prompt: "continue",
      config: resolveLettaCodeConfig({ backend: "local", lettaAgentId: "agent-local-1", cwd: "/work" }),
      sessionParams: { conversationId: "conversation-stale", lettaAgentId: "agent-local-1", cwd: "/work", backend: "local" },
      env: { LETTA_MEMFS_DIR: "/memory" },
      onEvent: async () => undefined,
    }, { createClient: () => client });

    expect(resumeSession).toHaveBeenNthCalledWith(1, "conversation-stale", expect.any(Object));
    expect(resumeSession).toHaveBeenNthCalledWith(2, "agent-local-1", expect.any(Object));
    expect(result.summary).toBe("recovered");
  });

  it("injects GROQ_API_KEY env var for local Groq agents", async () => {
    const sdkSession = sessionWith([
      { type: "init", agentId: "agent-local-1", sessionId: "session-1", conversationId: "conversation-1", model: "llama-3.3-70b-versatile" },
      { type: "result", success: true, result: "ok", durationMs: 1, conversationId: "conversation-1" },
    ]);
    const client: LettaSdkClientLike = {
      createAgent: vi.fn(async () => "unused"),
      createSession: vi.fn(() => sdkSession),
      resumeSession: vi.fn(() => sdkSession),
    };

    await runLettaSdkTurn({
      prompt: "work",
      config: resolveLettaCodeConfig({
        provider: "groq",
        model: "llama-3.3-70b-versatile",
        apiKey: "gsk-my-groq-key",
        backend: "local",
        cwd: "/work",
      }),
      env: { LETTA_MEMFS_DIR: "/memory" },
      onEvent: async () => undefined,
    }, { createClient: () => client });

    // The env passed to createAgent should include GROQ_API_KEY
    expect(client.createAgent).toHaveBeenCalledWith(expect.objectContaining({
      env: expect.objectContaining({
        GROQ_API_KEY: "gsk-my-groq-key",
      }),
    }));

    // baseUrl is set via LLM provider preset
    const createAgentCall = (client.createAgent as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(createAgentCall.env.LETTA_LLM_BASE_URL).toBe("https://api.groq.com/openai/v1");
  });

  it("does not inject GROQ_API_KEY for cloud-attached agents (uses LETTA_API_KEY instead)", async () => {
    const sdkSession = sessionWith([
      { type: "init", agentId: "agent-cloud-1", sessionId: "session-1", conversationId: "conversation-1", model: "gpt" },
      { type: "result", success: true, result: "ok", durationMs: 1, conversationId: "conversation-1" },
    ]);
    const client: LettaSdkClientLike = {
      createAgent: vi.fn(async () => "unused"),
      createSession: vi.fn(() => sdkSession),
      resumeSession: vi.fn(() => sdkSession),
    };

    await runLettaSdkTurn({
      prompt: "work",
      config: resolveLettaCodeConfig({
        mode: "online",
        agentId: "agent-cloud-1",
        apiKey: "cloud-key",
        provider: "groq",
        model: "gpt",
        cwd: "/work",
      }),
      env: { LETTA_MEMFS_DIR: "/memory" },
      onEvent: async () => undefined,
    }, { createClient: () => client, sweepStaleApprovals: vi.fn(async () => null) });

    // cloud-attached: env passed to resumeSession includes LETTA_API_KEY, NOT GROQ_API_KEY
    expect(client.resumeSession).toHaveBeenCalledWith("agent-cloud-1", expect.objectContaining({
      env: expect.objectContaining({
        LETTA_API_KEY: "cloud-key",
      }),
    }));
    const resumeCall = (client.resumeSession as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(resumeCall.env.GROQ_API_KEY).toBeUndefined();
  });

  it("sweeps a stale cloud pending approval and retries the turn", async () => {
    const wedgedSession: LettaSdkSessionLike = {
      agentId: "agent-cloud-1",
      sessionId: "session-wedged",
      conversationId: "conversation-1",
      send: vi.fn(async () => {
        throw new Error("Request failed with status 409 PENDING_APPROVAL: the agent is waiting for approval on a tool call");
      }),
      stream: async function* () { /* never reached */ },
      abort: vi.fn(async () => undefined),
      close: vi.fn(),
    };
    const healthySession = sessionWith([
      { type: "init", agentId: "agent-cloud-1", sessionId: "session-2", conversationId: "conversation-1", model: "gpt" },
      { type: "result", success: true, result: "ok", durationMs: 1, conversationId: "conversation-1" },
    ]);
    const client: LettaSdkClientLike = {
      createAgent: vi.fn(async () => "unused"),
      createSession: vi.fn(() => healthySession),
      resumeSession: vi.fn()
        .mockImplementationOnce(() => wedgedSession)
        .mockImplementationOnce(() => healthySession),
    };
    const sweepStaleApprovals = vi.fn(async () => ({ swept: ["chatcmpl-tool-aaa"] }));
    const onEvent = vi.fn(async () => undefined);

    const result = await runLettaSdkTurn({
      prompt: "continue",
      config: resolveLettaCodeConfig({
        backend: "cloud_attached",
        lettaAgentId: "agent-cloud-1",
        apiKey: "cloud-key",
        apiBaseUrl: "https://api.letta.com",
        cwd: "/work",
      }),
      sessionParams: { conversationId: "conversation-1", lettaAgentId: "agent-cloud-1", cwd: "/work", backend: "cloud_attached" },
      env: {},
      onEvent,
    }, { createClient: () => client, sweepStaleApprovals });

    expect(sweepStaleApprovals).toHaveBeenCalledWith({
      agentId: "agent-cloud-1",
      apiKey: "cloud-key",
      apiBaseUrl: "https://api.letta.com",
    });
    expect(client.resumeSession).toHaveBeenCalledTimes(2);
    expect(onEvent).toHaveBeenCalledWith({
      type: "stale_approval_sweep",
      toolCallIds: ["chatcmpl-tool-aaa"],
      outcome: "swept",
    });
    expect(result.success).toBe(true);
  });

  it("rethrows the original error when the sweep cannot clear the wedge", async () => {
    const wedgedSession: LettaSdkSessionLike = {
      agentId: "agent-cloud-1",
      sessionId: "session-wedged",
      conversationId: "conversation-1",
      send: vi.fn(async () => {
        throw new Error("Request failed with status 409 PENDING_APPROVAL: the agent is waiting for approval on a tool call");
      }),
      stream: async function* () { /* never reached */ },
      abort: vi.fn(async () => undefined),
      close: vi.fn(),
    };
    const client: LettaSdkClientLike = {
      createAgent: vi.fn(async () => "unused"),
      createSession: vi.fn(() => wedgedSession),
      resumeSession: vi.fn(() => wedgedSession),
    };
    const sweepStaleApprovals = vi.fn(async () => null);

    await expect(runLettaSdkTurn({
      prompt: "continue",
      config: resolveLettaCodeConfig({
        backend: "cloud_attached",
        lettaAgentId: "agent-cloud-1",
        apiKey: "cloud-key",
        apiBaseUrl: "https://api.letta.com",
        cwd: "/work",
      }),
      env: {},
      onEvent: async () => undefined,
    }, { createClient: () => client, sweepStaleApprovals })).rejects.toThrow("409");

    // Once proactively at turn start, once on the recovery path after the 409.
    expect(sweepStaleApprovals).toHaveBeenCalledTimes(2);
    // No blind retry against a conversation that is still wedged.
    expect(client.resumeSession).toHaveBeenCalledTimes(1);
  });

  it("never sweeps for local-backend agents", async () => {
    const failingSession: LettaSdkSessionLike = {
      agentId: "agent-local-1",
      sessionId: "session-1",
      conversationId: "conversation-1",
      send: vi.fn(async () => {
        throw new Error("Request failed with status 409 PENDING_APPROVAL: the agent is waiting for approval on a tool call");
      }),
      stream: async function* () { /* never reached */ },
      abort: vi.fn(async () => undefined),
      close: vi.fn(),
    };
    const client: LettaSdkClientLike = {
      createAgent: vi.fn(async () => "agent-local-1"),
      createSession: vi.fn(() => failingSession),
      resumeSession: vi.fn(() => failingSession),
    };
    const sweepStaleApprovals = vi.fn(async () => ({ swept: ["chatcmpl-tool-aaa"] }));

    await expect(runLettaSdkTurn({
      prompt: "work",
      config: resolveLettaCodeConfig({ backend: "local", lettaAgentId: "agent-local-1", cwd: "/work" }),
      env: {},
      onEvent: async () => undefined,
    }, { createClient: () => client, sweepStaleApprovals })).rejects.toThrow("409");

    expect(sweepStaleApprovals).not.toHaveBeenCalled();
  });

  it("sweeps stale cloud approvals before the turn starts", async () => {
    const sdkSession = sessionWith([
      { type: "init", agentId: "agent-cloud-1", sessionId: "session-1", conversationId: "conversation-1", model: "gpt" },
      { type: "result", success: true, result: "ok", durationMs: 1, conversationId: "conversation-1" },
    ]);
    const client: LettaSdkClientLike = {
      createAgent: vi.fn(async () => "unused"),
      createSession: vi.fn(() => sdkSession),
      resumeSession: vi.fn(() => sdkSession),
    };
    const sweepStaleApprovals = vi.fn(async () => ({ swept: ["chatcmpl-tool-old"] }));
    const onEvent = vi.fn(async () => undefined);

    const result = await runLettaSdkTurn({
      prompt: "work",
      config: resolveLettaCodeConfig({
        backend: "cloud_attached",
        lettaAgentId: "agent-cloud-1",
        apiKey: "cloud-key",
        apiBaseUrl: "https://api.letta.com",
        cwd: "/work",
      }),
      sessionParams: { conversationId: "conversation-1", lettaAgentId: "agent-cloud-1", cwd: "/work", backend: "cloud_attached" },
      env: {},
      onEvent,
    }, { createClient: () => client, sweepStaleApprovals });

    // One proactive sweep, no recovery retry — the turn starts clean even
    // when the harness swallows the 409 into a bare result error.
    expect(sweepStaleApprovals).toHaveBeenCalledTimes(1);
    expect(sweepStaleApprovals).toHaveBeenCalledWith({
      agentId: "agent-cloud-1",
      apiKey: "cloud-key",
      apiBaseUrl: "https://api.letta.com",
    });
    expect(client.resumeSession).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledWith({
      type: "stale_approval_sweep",
      toolCallIds: ["chatcmpl-tool-old"],
      outcome: "swept",
      phase: "turn_start",
    });
    expect(result.success).toBe(true);
  });

  it("emits no sweep event at turn start when the agent is clean", async () => {
    const sdkSession = sessionWith([
      { type: "init", agentId: "agent-cloud-1", sessionId: "session-1", conversationId: "conversation-1", model: "gpt" },
      { type: "result", success: true, result: "ok", durationMs: 1, conversationId: "conversation-1" },
    ]);
    const client: LettaSdkClientLike = {
      createAgent: vi.fn(async () => "unused"),
      createSession: vi.fn(() => sdkSession),
      resumeSession: vi.fn(() => sdkSession),
    };
    const sweepStaleApprovals = vi.fn(async () => ({ swept: [] as string[] }));
    const onEvent = vi.fn(async () => undefined);

    await runLettaSdkTurn({
      prompt: "work",
      config: resolveLettaCodeConfig({
        backend: "cloud_attached",
        lettaAgentId: "agent-cloud-1",
        apiKey: "cloud-key",
        apiBaseUrl: "https://api.letta.com",
        cwd: "/work",
      }),
      env: {},
      onEvent,
    }, { createClient: () => client, sweepStaleApprovals });

    expect(sweepStaleApprovals).toHaveBeenCalledTimes(1);
    expect(onEvent).not.toHaveBeenCalledWith(expect.objectContaining({ type: "stale_approval_sweep" }));
  });

  it("estimates cost from usage tokens when the provider reports none (known model)", async () => {
    const sdkSession = sessionWith([
      { type: "init", agentId: "agent-local-1", sessionId: "session-1", conversationId: "conversation-1", model: "moonshotai/kimi-k2-5" },
      {
        type: "stream_event",
        event: {
          message_type: "usage_statistics",
          prompt_tokens: 10000,
          completion_tokens: 5000,
          cached_input_tokens: 4000,
          step_count: 2,
        },
        uuid: "u1",
      },
      { type: "result", success: true, result: "done", durationMs: 10, conversationId: "conversation-1" },
    ]);
    const client: LettaSdkClientLike = {
      createAgent: vi.fn(async () => "agent-local-1"),
      createSession: vi.fn(() => sdkSession),
      resumeSession: vi.fn(() => sdkSession),
    };
    const onEvent = vi.fn(async () => undefined);

    const result = await runLettaSdkTurn({
      prompt: "work",
      config: resolveLettaCodeConfig({ backend: "local", model: "moonshotai/kimi-k2-5", cwd: "/work" }),
      env: { LETTA_MEMFS_DIR: "/memory" },
      onEvent,
    }, { createClient: () => client });

    // (6000 * $0.60 + 4000 * $0.15 + 5000 * $2.50) / 1M = $0.0167
    expect(result.costUsd).toBeCloseTo(0.0167, 6);
    expect(result.costEstimated).toBe(true);
    expect(result.usage).toEqual({ inputTokens: 10000, outputTokens: 5000, cachedTokens: 4000 });
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: "usage_statistics",
      inputTokens: 10000,
      outputTokens: 5000,
      cachedTokens: 4000,
      model: "moonshotai/kimi-k2-5",
    }));
  });

  it("reports no cost when usage exists but the model is unknown to the rate card", async () => {
    const sdkSession = sessionWith([
      { type: "init", agentId: "agent-local-1", sessionId: "session-1", conversationId: "conversation-1", model: "acme/mystery-9000" },
      {
        type: "stream_event",
        event: { message_type: "usage_statistics", prompt_tokens: 10000, completion_tokens: 5000 },
        uuid: "u1",
      },
      { type: "result", success: true, result: "done", durationMs: 10, conversationId: "conversation-1" },
    ]);
    const client: LettaSdkClientLike = {
      createAgent: vi.fn(async () => "agent-local-1"),
      createSession: vi.fn(() => sdkSession),
      resumeSession: vi.fn(() => sdkSession),
    };

    const result = await runLettaSdkTurn({
      prompt: "work",
      config: resolveLettaCodeConfig({ backend: "local", model: "acme/mystery-9000", cwd: "/work" }),
      env: { LETTA_MEMFS_DIR: "/memory" },
      onEvent: async () => undefined,
    }, { createClient: () => client });

    expect(result.costUsd).toBeNull();
    expect(result.costEstimated).toBe(false);
    expect(result.usage).toEqual({ inputTokens: 10000, outputTokens: 5000, cachedTokens: 0 });
  });

  it("prefers a provider-reported cost over the rate-card estimate", async () => {
    const sdkSession = sessionWith([
      { type: "init", agentId: "agent-local-1", sessionId: "session-1", conversationId: "conversation-1", model: "moonshotai/kimi-k2-5" },
      {
        type: "stream_event",
        event: { message_type: "usage_statistics", prompt_tokens: 10000, completion_tokens: 5000 },
        uuid: "u1",
      },
      { type: "result", success: true, result: "done", durationMs: 10, totalCostUsd: 0.42, conversationId: "conversation-1" },
    ]);
    const client: LettaSdkClientLike = {
      createAgent: vi.fn(async () => "agent-local-1"),
      createSession: vi.fn(() => sdkSession),
      resumeSession: vi.fn(() => sdkSession),
    };

    const result = await runLettaSdkTurn({
      prompt: "work",
      config: resolveLettaCodeConfig({ backend: "local", model: "moonshotai/kimi-k2-5", cwd: "/work" }),
      env: { LETTA_MEMFS_DIR: "/memory" },
      onEvent: async () => undefined,
    }, { createClient: () => client });

    expect(result.costUsd).toBe(0.42);
    expect(result.costEstimated).toBe(false);
    expect(result.usage).toEqual({ inputTokens: 10000, outputTokens: 5000, cachedTokens: 0 });
  });
});
