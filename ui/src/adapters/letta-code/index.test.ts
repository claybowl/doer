import { describe, expect, it } from "vitest";
import { buildLettaCodeConfig } from "./index";

describe("buildLettaCodeConfig", () => {
  it("builds a local-canonical Agent SDK configuration", () => {
    expect(buildLettaCodeConfig({
      backend: "local",
      lettaAgentId: "agent-local-1",
      model: "openai-codex/gpt-5",
      reasoningEffort: "high",
      permissionMode: "unrestricted",
      allowedTools: ["Bash", "Read", "Write"],
      disallowedTools: [],
      skillSources: ["bundled", "global", "agent", "project"],
      modsEnabled: true,
    } as never)).toEqual({
      backend: "local",
      lettaAgentId: "agent-local-1",
      model: "openai-codex/gpt-5",
      reasoningEffort: "high",
      permissionMode: "unrestricted",
      allowedTools: ["Bash", "Read", "Write"],
      disallowedTools: [],
      skillSources: ["bundled", "global", "agent", "project"],
      modsEnabled: true,
    });
  });

  it("keeps Cloud compatibility credentials separate from model permissions", () => {
    expect(buildLettaCodeConfig({
      backend: "cloud_attached",
      lettaAgentId: "agent-cloud-1",
      apiKey: "secret",
      apiBaseUrl: "https://api.letta.com/",
      model: "ollama-cloud/kimi-k2.5",
      permissionMode: "unrestricted",
      modsEnabled: false,
    } as never)).toMatchObject({
      backend: "cloud_attached",
      lettaAgentId: "agent-cloud-1",
      apiKey: "secret",
      apiBaseUrl: "https://api.letta.com/",
      model: "ollama-cloud/kimi-k2.5",
      permissionMode: "unrestricted",
      modsEnabled: false,
    });
  });
});
