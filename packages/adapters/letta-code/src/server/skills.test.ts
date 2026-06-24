import { describe, it, expect } from "vitest";
import { MEMFS_STRATEGY_SKILL, MEMFS_STRATEGY_SKILL_BY_ADAPTER } from "@doerai/shared";
import { resolveProvider, resolveSkillDelivery } from "./execute.js";
import {
  parseFrontmatter,
  buildSkillsManifest,
  buildSkillsInjectSection,
  SKILL_INJECT_CHAR_BUDGET,
} from "./execute.js";

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

describe("parseFrontmatter", () => {
  it("extracts name and description from valid YAML frontmatter", () => {
    const content = `---\nname: my-skill\ndescription: Does something useful\n---\n\n# Body`;
    const result = parseFrontmatter(content);
    expect(result.name).toBe("my-skill");
    expect(result.description).toBe("Does something useful");
  });

  it("handles multi-line description with > block scalar", () => {
    const content = `---\nname: test\ndescription: >\n  Line one\n  line two\n---\n`;
    const result = parseFrontmatter(content);
    expect(result.name).toBe("test");
    expect(result.description).toContain("Line one");
  });

  it("returns empty strings when frontmatter is absent", () => {
    const result = parseFrontmatter("# No frontmatter here\nJust content.");
    expect(result.name).toBe("");
    expect(result.description).toBe("");
  });

  it("returns empty strings when a key is missing", () => {
    const result = parseFrontmatter("---\nname: only-name\n---\n");
    expect(result.name).toBe("only-name");
    expect(result.description).toBe("");
  });
});

describe("buildSkillsManifest", () => {
  it("builds a manifest with name and description entries", () => {
    const skills = [
      { name: "doer", description: "Core Doer operations" },
      { name: "deliverable", description: "Produce user-facing files" },
    ];
    const manifest = buildSkillsManifest(skills);
    expect(manifest).toContain("doer");
    expect(manifest).toContain("Core Doer operations");
    expect(manifest).toContain("deliverable");
    expect(manifest).toContain("read_skill");
  });

  it("returns empty string when no skills given", () => {
    expect(buildSkillsManifest([])).toBe("");
  });
});

describe("buildSkillsInjectSection", () => {
  const BIG = "x".repeat(3000);
  const SMALL = "small body";

  it("returns all skills when total size is within budget", () => {
    const skills = [
      { name: "a", body: SMALL },
      { name: "b", body: SMALL },
    ];
    const { section, dropped } = buildSkillsInjectSection(skills, 10000);
    expect(section).toContain("a");
    expect(section).toContain("b");
    expect(dropped).toHaveLength(0);
  });

  it("drops whole skills (never partial) when budget exceeded", () => {
    const skills = [
      { name: "first", body: BIG },
      { name: "second", body: BIG },
      { name: "third", body: BIG },
      { name: "fourth", body: BIG },
      { name: "fifth", body: BIG },
    ];
    const { section, dropped } = buildSkillsInjectSection(skills, SKILL_INJECT_CHAR_BUDGET);
    expect(dropped.length).toBeGreaterThan(0);
    // Dropped skills must not appear in the section
    for (const name of dropped) {
      expect(section).not.toContain(name);
    }
  });

  it("SKILL_INJECT_CHAR_BUDGET is 12000", () => {
    expect(SKILL_INJECT_CHAR_BUDGET).toBe(12000);
  });

  it("returns empty section when no skills given", () => {
    const { section, dropped } = buildSkillsInjectSection([], 10000);
    expect(section).toBe("");
    expect(dropped).toHaveLength(0);
  });
});
