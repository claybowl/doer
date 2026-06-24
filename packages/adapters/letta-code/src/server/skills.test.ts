import { describe, it, expect } from "vitest";
import { MEMFS_STRATEGY_SKILL, MEMFS_STRATEGY_SKILL_BY_ADAPTER } from "@doerai/shared";
import { resolveProvider, resolveSkillDelivery } from "./execute.js";

describe("MEMFS_STRATEGY_SKILL_BY_ADAPTER", () => {
  it("letta_code + fs-mount resolves to letta-code-memory, not agents-md-memory", () => {
    const overrides = MEMFS_STRATEGY_SKILL_BY_ADAPTER["letta_code"] ?? {};
    expect(overrides["fs-mount"]).toBe("letta-code-memory");
    expect(MEMFS_STRATEGY_SKILL["fs-mount"]).toBe("agents-md-memory");
  });

  it("letta_code override wins when both maps have the same strategy key", () => {
    const adapterOverrides = MEMFS_STRATEGY_SKILL_BY_ADAPTER["letta_code"] ?? {};
    const result = adapterOverrides["fs-mount"] ?? MEMFS_STRATEGY_SKILL["fs-mount"];
    expect(result).toBe("letta-code-memory");
  });

  it("falls back to global map for adapters not in the override map", () => {
    const adapterOverrides = MEMFS_STRATEGY_SKILL_BY_ADAPTER["claude_local"] ?? {};
    const result = adapterOverrides["fs-mount"] ?? MEMFS_STRATEGY_SKILL["fs-mount"];
    expect(result).toBe("agents-md-memory");
  });

  it("native-letta is not overridden for letta_code (no offline native-letta path)", () => {
    const overrides = MEMFS_STRATEGY_SKILL_BY_ADAPTER["letta_code"] ?? {};
    expect(overrides["native-letta"]).toBeUndefined();
  });
});

describe("resolveSkillDelivery", () => {
  it("anthropic always returns loop", () => {
    const r = resolveProvider({ apiKey: "sk-ant" }, {});
    expect(resolveSkillDelivery(r, {})).toBe("loop");
  });

  it("groq returns loop (supportsTools: true)", () => {
    const r = resolveProvider({ provider: "groq" }, { GROQ_API_KEY: "k" });
    expect(resolveSkillDelivery(r, {})).toBe("loop");
  });

  it("openai returns loop (supportsTools: true)", () => {
    const r = resolveProvider({ provider: "openai" }, { OPENAI_API_KEY: "k" });
    expect(resolveSkillDelivery(r, {})).toBe("loop");
  });

  it("ollama (local) returns inject (supportsTools: false)", () => {
    const r = resolveProvider({ provider: "ollama" }, {});
    expect(resolveSkillDelivery(r, {})).toBe("inject");
  });

  it("ollama_cloud returns inject (supportsTools: false)", () => {
    const r = resolveProvider({ provider: "ollama_cloud" }, { OLLAMA_API_KEY: "k" });
    expect(resolveSkillDelivery(r, {})).toBe("inject");
  });

  it("opencode_zen returns inject (supportsTools: false)", () => {
    const r = resolveProvider({ provider: "opencode_zen" }, { OPENCODE_API_KEY: "k" });
    expect(resolveSkillDelivery(r, {})).toBe("inject");
  });

  it("explicit 'loop' override wins over provider default", () => {
    const r = resolveProvider({ provider: "ollama" }, {});
    expect(resolveSkillDelivery(r, { skillToolCalls: "loop" })).toBe("loop");
  });

  it("explicit 'inject' override wins over anthropic default", () => {
    const r = resolveProvider({ apiKey: "sk-ant" }, {});
    expect(resolveSkillDelivery(r, { skillToolCalls: "inject" })).toBe("inject");
  });
});
