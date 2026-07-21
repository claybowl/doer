import { describe, expect, it, vi } from "vitest";
import type { ProviderConnection } from "@doerai/shared";
import { discoverAgents, discoverModels } from "./discovery.js";

const now = new Date("2026-07-21T00:00:00.000Z");
const baseConnection: ProviderConnection = {
  id: "11111111-1111-4111-8111-111111111111",
  companyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  name: "Personal Letta",
  providerType: "letta",
  authMode: "api_key",
  secretId: "22222222-2222-4222-8222-222222222222",
  lettaBaseUrl: "https://api.letta.com",
  providerBaseUrl: null,
  isDefault: true,
  metadata: {},
  createdAt: now,
  updatedAt: now,
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("provider discovery", () => {
  it("normalizes Letta models by handle and provider", async () => {
    const fetch = vi.fn(async () =>
      response([
        { handle: "ollama/qwen3", display_name: "Qwen 3", provider_type: "ollama" },
      ]),
    );

    const models = await discoverModels(baseConnection, "letta-key", { fetch });

    expect(models).toEqual([{ id: "ollama/qwen3", label: "Qwen 3", provider: "ollama" }]);
    expect(fetch).toHaveBeenCalledWith(
      "https://api.letta.com/v1/models/",
      expect.objectContaining({ headers: { authorization: "Bearer letta-key" } }),
    );
  });

  it("lists local Ollama tags without a cloud credential", async () => {
    const connection: ProviderConnection = {
      ...baseConnection,
      providerType: "ollama",
      authMode: "none",
      secretId: null,
      providerBaseUrl: "http://127.0.0.1:11434",
    };
    const fetch = vi.fn(async () => response({ models: [{ name: "qwen3:latest" }] }));

    const models = await discoverModels(connection, null, { fetch });

    expect(models[0]?.id).toBe("ollama/qwen3:latest");
    expect(fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:11434/api/tags",
      expect.objectContaining({ headers: {} }),
    );
  });

  it("deduplicates and sorts Letta agents", async () => {
    const fetch = vi.fn(async () =>
      response({
        agents: [
          { id: "agent-b", name: "Zeta", model: "openai/gpt-5" },
          { id: "agent-a", name: "Alpha", model: null },
          { id: "agent-a", name: "Alpha duplicate" },
        ],
      }),
    );

    const agents = await discoverAgents(baseConnection, "letta-key", { fetch });

    expect(agents.map((agent) => agent.id)).toEqual(["agent-a", "agent-b"]);
  });

  it("does not expose provider response bodies in errors", async () => {
    const fetch = vi.fn(async () => response({ error: "letta-key leaked" }, 401));

    await expect(discoverModels(baseConnection, "letta-key", { fetch })).rejects.toThrow(
      "Provider request failed (401)",
    );
    await expect(discoverModels(baseConnection, "letta-key", { fetch })).rejects.not.toThrow(
      "letta-key leaked",
    );
  });
});
