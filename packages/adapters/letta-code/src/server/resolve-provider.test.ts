import { describe, it, expect, afterEach } from "vitest";
import { resolveProvider } from "./execute.js";

const ENV_KEYS = ["ANTHROPIC_API_KEY", "GROQ_API_KEY", "NVIDIA_API_KEY", "OPENCODE_API_KEY", "OLLAMA_API_KEY", "OPENAI_API_KEY"];
afterEach(() => { for (const k of ENV_KEYS) delete process.env[k]; });

describe("resolveProvider", () => {
  it("defaults to anthropic with its native SDK shape", () => {
    const r = resolveProvider({ apiKey: "sk-ant-x" }, {});
    expect(r.kind).toBe("anthropic");
    expect(r.label).toBe("Anthropic");
    expect(r.apiKey).toBe("sk-ant-x");
    expect(r.providerKey).toBeNull();
  });

  it("maps groq to its OpenAI-compatible preset base URL", () => {
    const r = resolveProvider({ provider: "groq" }, { GROQ_API_KEY: "gsk_test" });
    expect(r.kind).toBe("openai_compat");
    expect(r.baseUrl).toBe("https://api.groq.com/openai/v1");
    expect(r.apiKey).toBe("gsk_test");
    expect(r.envKey).toBe("GROQ_API_KEY");
    expect(r.providerKey).toBe("groq");
  });

  it("uses each provider's preset endpoint", () => {
    expect(resolveProvider({ provider: "nvidia" }, { NVIDIA_API_KEY: "k" }).baseUrl).toBe("https://integrate.api.nvidia.com/v1");
    expect(resolveProvider({ provider: "opencode_zen" }, { OPENCODE_API_KEY: "k" }).baseUrl).toBe("https://opencode.ai/zen/v1");
    expect(resolveProvider({ provider: "ollama_cloud" }, { OLLAMA_API_KEY: "k" }).baseUrl).toBe("https://ollama.com/v1");
  });

  it("treats local ollama as keyless with a placeholder token", () => {
    const r = resolveProvider({ provider: "ollama" }, {});
    expect(r.baseUrl).toBe("http://localhost:11434/v1");
    expect(r.envKey).toBeNull();
    expect(r.apiKey).toBe("ollama"); // harmless placeholder so the header exists
  });

  it("returns null apiKey when a required key is missing", () => {
    const r = resolveProvider({ provider: "groq" }, {});
    expect(r.apiKey).toBeNull();
  });

  it("prefers an explicit baseUrl override over the preset", () => {
    const r = resolveProvider({ provider: "openai", baseUrl: "https://my-proxy.local/v1" }, { OPENAI_API_KEY: "k" });
    expect(r.baseUrl).toBe("https://my-proxy.local/v1");
  });

  it("key precedence: explicit config beats the Doer env binding", () => {
    const r = resolveProvider({ provider: "groq", apiKey: "explicit" }, { GROQ_API_KEY: "from-binding" });
    expect(r.apiKey).toBe("explicit");
  });

  it("falls back to the Doer env binding when config has no key", () => {
    const r = resolveProvider({ provider: "nvidia" }, { NVIDIA_API_KEY: "from-binding" });
    expect(r.apiKey).toBe("from-binding");
  });

  it("rejects an Ollama Cloud key embedded in adapter config", () => {
    expect(() => resolveProvider({ provider: "ollama_cloud", apiKey: "plaintext" }, { OLLAMA_API_KEY: "bound" })).toThrow(
      "OLLAMA_API_KEY must come from an environment or secret binding",
    );
  });
});
