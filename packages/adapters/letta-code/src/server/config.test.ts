import { describe, expect, it } from "vitest";
import { resolveLettaCodeConfig, resolveLettaCodeSession } from "./config.js";

describe("resolveLettaCodeConfig", () => {
  it("defaults to a local canonical agent with standard permissions", () => {
    const config = resolveLettaCodeConfig({});
    expect(config).toMatchObject({
      backend: "local",
      harnessBackend: "local",
      permissionMode: "standard",
      skillSources: ["bundled", "global", "agent", "project"],
      modsEnabled: true,
    });
    expect(config.dreaming).toBeUndefined();
  });

  it("normalizes the legacy online mode to cloud-attached local execution", () => {
    expect(resolveLettaCodeConfig({
      mode: "online",
      agentId: "agent-cloud-1",
      apiKey: "secret",
      baseUrl: "https://api.letta.example/",
    })).toMatchObject({
      backend: "cloud_attached",
      harnessBackend: "api",
      lettaAgentId: "agent-cloud-1",
      apiKey: "secret",
      apiBaseUrl: "https://api.letta.example",
    });
  });

  it("infers Constellation mode for existing non-local agent IDs", () => {
    expect(resolveLettaCodeConfig({
      lettaAgentId: "agent-constellation-1",
    })).toMatchObject({
      backend: "cloud_attached",
      harnessBackend: "api",
      lettaAgentId: "agent-constellation-1",
    });
  });

  it("keeps local agent identities local", () => {
    expect(resolveLettaCodeConfig({
      lettaAgentId: "agent-local-1",
    })).toMatchObject({
      backend: "local",
      harnessBackend: "local",
    });
  });

  it("does not couple a remote model to tool permissions", () => {
    expect(resolveLettaCodeConfig({
      backend: "local",
      model: "ollama-cloud/kimi-k2.5",
      permissionMode: "unrestricted",
      allowedTools: ["Bash", "Read", "Edit"],
    })).toMatchObject({
      model: "ollama-cloud/kimi-k2.5",
      permissionMode: "unrestricted",
      allowedTools: ["Bash", "Read", "Edit"],
    });
  });

  it("sanitizes optional dreaming configuration", () => {
    expect(resolveLettaCodeConfig({
      dreaming: { trigger: "step-count", behavior: "auto-launch", stepCount: 12, secret: "ignored" },
    }).dreaming).toEqual({ trigger: "step-count", behavior: "auto-launch", stepCount: 12 });
  });

  it("carries llmProvider/llmApiKey for a Groq offline agent", () => {
    const config = resolveLettaCodeConfig({
      provider: "groq",
      model: "llama-3.3-70b-versatile",
      apiKey: "gsk-my-key",
      baseUrl: "https://api.groq.com/openai/v1",
    });
    expect(config).toMatchObject({
      llmProvider: "groq",
      llmApiKey: "gsk-my-key",
      llmBaseUrl: "https://api.groq.com/openai/v1",
    });
  });

  it("falls back to the Groq preset baseUrl when none is provided", () => {
    const config = resolveLettaCodeConfig({
      provider: "groq",
      model: "llama-3.3-70b-versatile",
      apiKey: "gsk-my-key",
    });
    expect(config.llmProvider).toBe("groq");
    expect(config.llmApiKey).toBe("gsk-my-key");
    expect(config.llmBaseUrl).toBe("https://api.groq.com/openai/v1");
  });

  it("sets llmProvider to null for anthropic (uses its own env var)", () => {
    const config = resolveLettaCodeConfig({
      provider: "anthropic",
      model: "claude-sonnet-4-6",
    });
    expect(config.llmProvider).toBe("anthropic");
    expect(config.llmApiKey).toBe("");
    expect(config.llmBaseUrl).toBe("");
  });

  it("sets llmProvider to null for unknown provider values", () => {
    const config = resolveLettaCodeConfig({
      provider: "luna",
      apiKey: "ln-key",
    });
    expect(config.llmProvider).toBeNull();
    expect(config.llmApiKey).toBe("ln-key");
  });

  it("resolves llm fields regardless of backend (env mapping gated in sessionEnvironment)", () => {
    const config = resolveLettaCodeConfig({
      mode: "online",
      agentId: "agent-cloud-1",
      apiKey: "gsk-groq-key",
      provider: "groq",
    });
    expect(config.backend).toBe("cloud_attached");
    expect(config.llmProvider).toBe("groq");
    expect(config.llmApiKey).toBe("gsk-groq-key");
  });

  it("resolves OpenRouter baseUrl override for groq agents", () => {
    // This tests the scenario where the stored baseUrl was wrong (openrouter)
    // and the config keeps the stored value as an explicit override.
    const config = resolveLettaCodeConfig({
      provider: "groq",
      model: "llama-3.3-70b-versatile",
      apiKey: "gsk-key",
      baseUrl: "https://openrouter.ai/api/v1",
    });
    expect(config.llmBaseUrl).toBe("https://openrouter.ai/api/v1");
    expect(config.llmBaseUrl).not.toBe("https://api.groq.com/openai/v1");
  });
});

describe("resolveLettaCodeSession", () => {
  it("rejects a conversation created in another working directory", () => {
    expect(resolveLettaCodeSession({
      conversationId: "conv-1",
      lettaAgentId: "agent-local-1",
      cwd: "/old",
      backend: "local",
    }, "/new", "local")).toBeNull();
  });

  it("returns a sanitized compatible conversation", () => {
    expect(resolveLettaCodeSession({
      conversationId: "conv-1",
      lettaAgentId: "agent-local-1",
      cwd: "/work/../work",
      backend: "local",
      ignored: "value",
    }, "/work", "local")).toEqual({
      conversationId: "conv-1",
      lettaAgentId: "agent-local-1",
      cwd: "/work",
      backend: "local",
    });
  });

  it("rejects a conversation from another backend", () => {
    expect(resolveLettaCodeSession({
      conversationId: "conv-1",
      lettaAgentId: "agent-cloud-1",
      cwd: "/work",
      backend: "cloud_attached",
    }, "/work", "local")).toBeNull();
  });
});
