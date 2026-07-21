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
