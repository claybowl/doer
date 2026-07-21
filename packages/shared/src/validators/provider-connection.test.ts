import { describe, expect, it } from "vitest";
import { createProviderConnectionSchema } from "./provider-connection.js";

describe("createProviderConnectionSchema", () => {
  it("defaults Letta Cloud endpoints", () => {
    const parsed = createProviderConnectionSchema.parse({
      name: "Personal Letta",
      providerType: "letta",
      authMode: "api_key",
      secretId: "e5bd2bd2-a9d1-4cd4-a90b-20718967ca35",
    });

    expect(parsed.lettaBaseUrl).toBe("https://api.letta.com");
  });

  it("rejects a secret from an unsupported auth mode", () => {
    expect(() =>
      createProviderConnectionSchema.parse({
        name: "Local Ollama",
        providerType: "ollama",
        authMode: "none",
        secretId: "e5bd2bd2-a9d1-4cd4-a90b-20718967ca35",
      }),
    ).toThrow();
  });
});
