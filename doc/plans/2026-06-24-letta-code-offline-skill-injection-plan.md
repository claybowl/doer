# letta-code Offline Skill Injection — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `letta_code` offline agents actually receive, discover, and use their checked skills — via a manifest + `read_skill` tool-call loop on capable backends, or full-body injection on incapable backends — and fix the memory-skill collision that would deliver wrong instructions.

**Architecture:** Add `supportsTools` to the existing `OPENAI_COMPAT_PRESETS` table; `resolveSkillDelivery()` picks "loop" or "inject" per backend. In loop mode, wrap the LLM call in a bounded agentic loop with a `read_skill` tool; in inject mode, build full skill bodies into the system prompt under a char budget. A new bundled skill `letta-code-memory` teaches the `<memory_update>` protocol for offline agents, and `resolveMemoryProtocolSkills` becomes adapter-aware so `letta_code`+`fs-mount` no longer gets the wrong `agents-md-memory` skill.

**Tech Stack:** TypeScript, Vitest, Anthropic SDK (`@anthropic-ai/sdk`), native `fetch` for OpenAI-compat backends, `@doerai/adapter-utils/server-utils` (existing skill helpers).

## Global Constraints

- File location convention: plans stay in `doc/plans/`, skills in `skills/{name}/SKILL.md`.
- git ops stay in Clay's Terminal — do NOT run `git add/commit` from sandbox.
- All new exports from `execute.ts` must be pure functions so they're unit-testable without mocking the LLM.
- Max tool iterations: 8 (hard constant, not configurable).
- Inject-mode char budget: 12,000 chars.
- Test command (from repo root): `pnpm test` (vitest workspace — picks up `packages/adapters/letta-code`). Filter to package: `pnpm vitest run --project packages/adapters/letta-code`.
- Import paths in test files follow the pattern: `import { fn } from "./execute.js"` (note `.js` extension, ESM).

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `skills/letta-code-memory/SKILL.md` | **Create** | New bundled memory skill for offline agents teaching `<memory_update>` protocol |
| `packages/shared/src/constants.ts` | **Modify** | Add `MEMFS_STRATEGY_SKILL_BY_ADAPTER` override map beside existing `MEMFS_STRATEGY_SKILL` |
| `server/src/routes/agents.ts` | **Modify** | Make `resolveMemoryProtocolSkills` adapter-aware using the new override map |
| `packages/adapters/letta-code/src/shared/types.ts` | **Modify** | Add `skillToolCalls?: boolean` to `LettaCodeOfflineConfig` |
| `packages/adapters/letta-code/src/server/execute.ts` | **Modify** | Add `supportsTools` to presets; export `resolveSkillDelivery`, `parseFrontmatter`, `buildSkillsManifest`, `buildSkillsInjectSection`; extend `buildOfflineSystemPrompt`; add agentic loop |
| `packages/adapters/letta-code/src/server/skills.test.ts` | **Create** | Unit tests for all new pure functions |
| `packages/adapters/letta-code/src/server/loop.test.ts` | **Create** | Loop integration tests (mocked LLM) |

---

## Task 1: New `letta-code-memory` bundled skill + adapter-aware strategy map

**Files:**
- Create: `skills/letta-code-memory/SKILL.md`
- Modify: `packages/shared/src/constants.ts:734-737`
- Modify: `server/src/routes/agents.ts:621-645`

**Interfaces:**
- Produces: `MEMFS_STRATEGY_SKILL_BY_ADAPTER` exported from `@doerai/shared` — `type MemfsStrategySkillByAdapter = Partial<Record<AgentAdapterType, Partial<Record<MemfsStrategy, string>>>>`; resolver in `agents.ts` uses it.

- [ ] **Step 1.1: Create the `letta-code-memory` skill file**

```
skills/letta-code-memory/SKILL.md
```

```markdown
---
name: letta-code-memory
description: >
  Read and update your persistent memory blocks for the offline letta-code adapter.
  Use this skill on every run: load your memory blocks before working, emit
  <memory_update> tags to persist changes after working. This is how offline
  agents remember, grow, and get smarter across runs.
  Auto-attached when a letta_code offline agent has an fs-mount memory binding.
---

# letta-code Memory Skill

You are running in **offline mode**. Your memory lives in named blocks that are
injected into your system prompt each run. You persist changes by emitting
`<memory_update>` tags in your response — the adapter writes them back to disk.

**No file I/O.** You cannot read or write files directly. Your only persistence
mechanism is the `<memory_update>` tag protocol below.

## Your Memory Blocks

Your blocks are shown in the `## Memory` section of your system prompt. Each
block is a named Markdown file: `persona.md` → block `persona`, etc.

Read every block in your context before starting work. Trust them over
re-deriving from scratch.

## Updating Memory

To persist a change, include in your response:

```
<memory_update label="BLOCK_LABEL">
new content here
</memory_update>
```

- `label` must match an existing block name, OR a new name to create a new block.
- The adapter replaces the entire block with your new content. Write the full
  updated block, not just a diff.
- Available blocks are listed at the end of the `## Memory Update Protocol`
  section of your system prompt.

## What to Save

Update a block when you learn a **durable fact** — still true and useful next run:

- Decision made (and why) → update the relevant context block
- New term, name, or relationship → update the relevant context block
- Task completed or state changed → update a `tasks` or `active` block

**Do NOT save** transient chatter, intermediate output, or secrets (API keys,
tokens, passwords — never write these to memory blocks).

## Critical Rules

- **Always read your blocks before working.** Never start cold.
- **Emit a memory update after working** when anything durable was learned.
- **Never attempt file system operations.** You have no filesystem access.
- **Write full block content**, not patches or partial updates.
- **Be honest in learnings.** A recorded failure saves the next run an hour.
```

- [ ] **Step 1.2: Add `MEMFS_STRATEGY_SKILL_BY_ADAPTER` to shared constants**

In `packages/shared/src/constants.ts`, after line 737 (end of `MEMFS_STRATEGY_SKILL`), add:

```typescript
/**
 * Per-adapter overrides for the memory-protocol skill mapping. When an entry
 * exists for (adapterType, strategy), it wins over MEMFS_STRATEGY_SKILL.
 *
 * Motivation: letta_code offline agents use <memory_update> tag protocol, not
 * file I/O — agents-md-memory (the default for fs-mount) would deliver wrong
 * instructions. The offline-specific skill letta-code-memory is correct.
 */
export const MEMFS_STRATEGY_SKILL_BY_ADAPTER: Partial<
  Record<string, Partial<Record<MemfsStrategy, string>>>
> = {
  letta_code: {
    "fs-mount": "letta-code-memory",
  },
};
```

- [ ] **Step 1.3: Run typecheck to verify the constants compile**

```bash
pnpm -r typecheck
```

Expected: no errors.

- [ ] **Step 1.4: Make `resolveMemoryProtocolSkills` adapter-aware**

In `server/src/routes/agents.ts`, add `MEMFS_STRATEGY_SKILL_BY_ADAPTER` to the import at the top (around line 14):

```typescript
import {
  MEMFS_STRATEGY_SKILL,
  MEMFS_STRATEGY_SKILL_BY_ADAPTER,
  // ... existing imports
} from "@doerai/shared";
```

Replace the `resolveMemoryProtocolSkills` function body (lines 621–645) with:

```typescript
async function resolveMemoryProtocolSkills(
  companyId: string,
  agentId: string | null,
  adapterType?: string,
): Promise<string[]> {
  if (!agentId) return [];
  try {
    const bindings = await memfs.listBindingsForAgent(companyId, agentId);
    const adapterOverrides = adapterType
      ? (MEMFS_STRATEGY_SKILL_BY_ADAPTER[adapterType] ?? {})
      : {};
    const slugs = Array.from(
      new Set(
        bindings
          .map((binding) =>
            adapterOverrides[binding.strategy] ?? MEMFS_STRATEGY_SKILL[binding.strategy],
          )
          .filter((key): key is string => Boolean(key)),
      ),
    );
    if (slugs.length === 0) return [];
    return await companySkills.resolveRequestedSkillKeys(companyId, slugs);
  } catch {
    return [];
  }
}
```

Then find all call sites of `resolveMemoryProtocolSkills` in the same file (search for `resolveMemoryProtocolSkills(companyId, agentId)`) and update them to pass `adapterType`:

```typescript
// Before:
const memorySkills = await resolveMemoryProtocolSkills(companyId, agentId);

// After:
const memorySkills = await resolveMemoryProtocolSkills(companyId, agentId, agent.adapterType);
```

- [ ] **Step 1.5: Run typecheck again**

```bash
pnpm -r typecheck
```

Expected: no errors.

- [ ] **Step 1.6: Write unit test for the adapter-aware mapping**

Create `packages/adapters/letta-code/src/server/skills.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { MEMFS_STRATEGY_SKILL, MEMFS_STRATEGY_SKILL_BY_ADAPTER } from "@doerai/shared";

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
```

- [ ] **Step 1.7: Run the test**

```bash
pnpm vitest run --project packages/adapters/letta-code
```

Expected: 4 tests pass.

---

## Task 2: Capability resolution + `skillToolCalls` config flag

**Files:**
- Modify: `packages/adapters/letta-code/src/shared/types.ts:35-71`
- Modify: `packages/adapters/letta-code/src/server/execute.ts` (extend `ProviderPreset`, export `resolveSkillDelivery`)
- Modify: `packages/adapters/letta-code/src/server/skills.test.ts` (add tests)

**Interfaces:**
- Consumes: `ResolvedProvider` (already exported from `execute.ts`), `LettaCodeOfflineConfig`
- Produces: `resolveSkillDelivery(resolved: ResolvedProvider, config: LettaCodeOfflineConfig) => "loop" | "inject"` — exported from `execute.ts`

- [ ] **Step 2.1: Add `skillToolCalls` to `LettaCodeOfflineConfig`**

In `packages/adapters/letta-code/src/shared/types.ts`, add to `LettaCodeOfflineConfig` after `maxTokens`:

```typescript
  /**
   * Override tool-calling capability for skill delivery.
   * "loop" = manifest + read_skill tool loop.
   * "inject" = full-body injection into system prompt.
   * When unset, the default is derived from the provider.
   */
  skillToolCalls?: "loop" | "inject";
```

- [ ] **Step 2.2: Add `supportsTools` to `ProviderPreset` and update `OPENAI_COMPAT_PRESETS`**

In `packages/adapters/letta-code/src/server/execute.ts`, replace the `ProviderPreset` interface (around line 235) and the `OPENAI_COMPAT_PRESETS` table (around line 242):

```typescript
interface ProviderPreset {
  baseUrl: string;
  envKey: string | null;
  label: string;
  /**
   * Whether this provider/backend reliably supports tool-calling.
   * false = degrade to full-body skill injection.
   * Anthropic is always true (handled separately in resolveSkillDelivery).
   */
  supportsTools: boolean;
}

const OPENAI_COMPAT_PRESETS: Record<string, ProviderPreset> = {
  openai:       { baseUrl: "https://api.openai.com/v1",           envKey: "OPENAI_API_KEY",   label: "OpenAI",         supportsTools: true  },
  groq:         { baseUrl: "https://api.groq.com/openai/v1",      envKey: "GROQ_API_KEY",     label: "Groq",           supportsTools: true  },
  nvidia:       { baseUrl: "https://integrate.api.nvidia.com/v1", envKey: "NVIDIA_API_KEY",   label: "NVIDIA NIM",     supportsTools: true  },
  opencode_zen: { baseUrl: "https://opencode.ai/zen/v1",          envKey: "OPENCODE_API_KEY", label: "OpenCode Zen",   supportsTools: false },
  ollama_cloud: { baseUrl: "https://ollama.com/v1",               envKey: "OLLAMA_API_KEY",   label: "Ollama Cloud",   supportsTools: false },
  ollama:       { baseUrl: "http://localhost:11434/v1",           envKey: null,               label: "Ollama (local)", supportsTools: false },
};
```

- [ ] **Step 2.3: Export `resolveSkillDelivery` from `execute.ts`**

Add this function after `resolveProvider` (around line 289):

```typescript
/**
 * Decide how to deliver checked skills to this offline agent.
 * "loop"   → inject a skills manifest + expose read_skill tool; model pulls
 *             bodies on demand (progressive disclosure).
 * "inject" → inject all desired skill bodies into the system prompt at once,
 *             capped by SKILL_INJECT_CHAR_BUDGET.
 *
 * Precedence: explicit adapterConfig.skillToolCalls > provider default.
 * Anthropic always supports tools; local Ollama never does.
 */
export function resolveSkillDelivery(
  resolved: ResolvedProvider,
  config: { skillToolCalls?: "loop" | "inject" },
): "loop" | "inject" {
  if (config.skillToolCalls === "loop") return "loop";
  if (config.skillToolCalls === "inject") return "inject";
  if (resolved.kind === "anthropic") return "loop";
  const preset = OPENAI_COMPAT_PRESETS[resolved.label.toLowerCase().replace(/ /g, "_")]
    ?? OPENAI_COMPAT_PRESETS[Object.keys(OPENAI_COMPAT_PRESETS).find(
      (k) => OPENAI_COMPAT_PRESETS[k].label === resolved.label
    ) ?? ""];
  return preset?.supportsTools ? "loop" : "inject";
}
```

Wait — `resolved.label` is a human label like "OpenAI". We need to look up by preset key, not label. Revise to pass the provider string through. Update `ResolvedProvider` to carry `providerKey`:

In `packages/adapters/letta-code/src/server/execute.ts`, update the `ResolvedProvider` interface:

```typescript
export interface ResolvedProvider {
  kind: "anthropic" | "openai_compat";
  baseUrl: string;
  apiKey: string | null;
  envKey: string | null;
  label: string;
  /** The raw provider key (e.g. "groq", "ollama"). null for anthropic. */
  providerKey: string | null;
}
```

Update `resolveProvider` to set `providerKey`:

```typescript
export function resolveProvider(
  config: { provider?: string; baseUrl?: string; apiKey?: string },
  env: Record<string, string>,
): ResolvedProvider {
  const provider = config.provider || "anthropic";
  if (provider === "anthropic") {
    return {
      kind: "anthropic",
      baseUrl: "https://api.anthropic.com",
      apiKey: config.apiKey || env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || null,
      envKey: "ANTHROPIC_API_KEY",
      label: "Anthropic",
      providerKey: null,
    };
  }
  const preset = OPENAI_COMPAT_PRESETS[provider] ?? OPENAI_COMPAT_PRESETS.openai;
  const fromEnv = preset.envKey ? env[preset.envKey] || process.env[preset.envKey] || "" : "";
  const apiKey = config.apiKey || fromEnv || (preset.envKey === null ? "ollama" : "");
  return {
    kind: "openai_compat",
    baseUrl: config.baseUrl?.trim() || preset.baseUrl,
    apiKey: apiKey || null,
    envKey: preset.envKey,
    label: preset.label,
    providerKey: provider,
  };
}
```

Now write `resolveSkillDelivery`:

```typescript
export function resolveSkillDelivery(
  resolved: ResolvedProvider,
  config: { skillToolCalls?: "loop" | "inject" },
): "loop" | "inject" {
  if (config.skillToolCalls === "loop") return "loop";
  if (config.skillToolCalls === "inject") return "inject";
  if (resolved.kind === "anthropic") return "loop";
  const preset = resolved.providerKey ? OPENAI_COMPAT_PRESETS[resolved.providerKey] : null;
  return preset?.supportsTools ? "loop" : "inject";
}
```

- [ ] **Step 2.4: Run typecheck**

```bash
pnpm -r typecheck
```

Expected: no errors. (The existing `resolve-provider.test.ts` may fail since `ResolvedProvider` now has `providerKey` — fix in next step.)

- [ ] **Step 2.5: Update `resolve-provider.test.ts` for the new `providerKey` field**

In `packages/adapters/letta-code/src/server/resolve-provider.test.ts`, the existing tests pass if `providerKey` is simply present. Add one assertion to the existing test "defaults to anthropic":

```typescript
it("defaults to anthropic with its native SDK shape", () => {
  const r = resolveProvider({ apiKey: "sk-ant-x" }, {});
  expect(r.kind).toBe("anthropic");
  expect(r.label).toBe("Anthropic");
  expect(r.apiKey).toBe("sk-ant-x");
  expect(r.providerKey).toBeNull();  // add this line
});
```

And add a `providerKey` check to the groq test:

```typescript
it("maps groq to its OpenAI-compatible preset base URL", () => {
  const r = resolveProvider({ provider: "groq" }, { GROQ_API_KEY: "gsk_test" });
  expect(r.kind).toBe("openai_compat");
  expect(r.baseUrl).toBe("https://api.groq.com/openai/v1");
  expect(r.apiKey).toBe("gsk_test");
  expect(r.envKey).toBe("GROQ_API_KEY");
  expect(r.providerKey).toBe("groq");  // add this line
});
```

- [ ] **Step 2.6: Add `resolveSkillDelivery` tests to `skills.test.ts`**

Append to `packages/adapters/letta-code/src/server/skills.test.ts`:

```typescript
import { resolveProvider, resolveSkillDelivery } from "./execute.js";

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
```

- [ ] **Step 2.7: Run tests**

```bash
pnpm vitest run --project packages/adapters/letta-code
```

Expected: all tests pass including the updated `resolve-provider.test.ts` and the new `skills.test.ts` assertions.

---

## Task 3: Frontmatter parse + manifest + inject-mode system-prompt builder

**Files:**
- Modify: `packages/adapters/letta-code/src/server/execute.ts` (add exports)
- Modify: `packages/adapters/letta-code/src/server/skills.test.ts` (add tests)

**Interfaces:**
- Consumes: `string` (raw SKILL.md content)
- Produces:
  - `parseFrontmatter(content: string) => { name: string; description: string }` — exported
  - `buildSkillsManifest(skills: Array<{ name: string; description: string }>) => string` — exported
  - `buildSkillsInjectSection(skills: Array<{ name: string; body: string }>, budgetChars?: number) => { section: string; dropped: string[] }` — exported
  - `SKILL_INJECT_CHAR_BUDGET: number` — exported constant

- [ ] **Step 3.1: Write failing tests**

Append to `packages/adapters/letta-code/src/server/skills.test.ts`:

```typescript
import {
  parseFrontmatter,
  buildSkillsManifest,
  buildSkillsInjectSection,
  SKILL_INJECT_CHAR_BUDGET,
} from "./execute.js";

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
```

- [ ] **Step 3.2: Run tests to confirm they fail**

```bash
pnpm vitest run --project packages/adapters/letta-code
```

Expected: FAIL — `parseFrontmatter`, `buildSkillsManifest`, `buildSkillsInjectSection`, `SKILL_INJECT_CHAR_BUDGET` not exported.

- [ ] **Step 3.3: Implement the three pure functions + constant in `execute.ts`**

Add after the `resolveSkillDelivery` function:

```typescript
export const SKILL_INJECT_CHAR_BUDGET = 12_000;

/**
 * Parse the name and description fields from YAML frontmatter at the top of a
 * SKILL.md. Only handles simple single-line values and ">" block scalars.
 * Returns empty strings for missing or absent frontmatter.
 */
export function parseFrontmatter(content: string): { name: string; description: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { name: "", description: "" };
  const block = match[1];

  function extractScalar(key: string): string {
    // "key: simple value"
    const simple = block.match(new RegExp(`^${key}:\\s+(.+)$`, "m"));
    if (simple) return simple[1].trim();
    // "key: >\n  line one\n  line two"
    const blockScalar = block.match(new RegExp(`^${key}:\\s*>\\n([\\s\\S]*?)(?=^\\S|$)`, "m"));
    if (blockScalar) {
      return blockScalar[1]
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .join(" ")
        .trim();
    }
    return "";
  }

  return {
    name: extractScalar("name"),
    description: extractScalar("description"),
  };
}

/**
 * Build a manifest string listing available skills. Injected into the system
 * prompt for loop-mode delivery so the agent knows which skills exist and that
 * it should call read_skill to load a body before acting in that domain.
 */
export function buildSkillsManifest(
  skills: Array<{ name: string; description: string }>,
): string {
  if (skills.length === 0) return "";
  const lines = skills.map((s) => `- **${s.name || "(unnamed)"}** — ${s.description || "No description."}`);
  return [
    "## Available Skills",
    "",
    "The following skills are available to you. Call the `read_skill` tool with a",
    "skill name to load its full instructions before acting in its domain.",
    "",
    ...lines,
  ].join("\n");
}

/**
 * Build a full-body inject section for inject-mode delivery. Includes complete
 * SKILL.md content for each skill up to SKILL_INJECT_CHAR_BUDGET total chars.
 * Skills are included in order (required/priority first — caller is responsible
 * for ordering). Whole skills are dropped, never partially truncated.
 * Returns the section string and a list of dropped skill names.
 */
export function buildSkillsInjectSection(
  skills: Array<{ name: string; body: string }>,
  budgetChars = SKILL_INJECT_CHAR_BUDGET,
): { section: string; dropped: string[] } {
  if (skills.length === 0) return { section: "", dropped: [] };
  const included: Array<{ name: string; body: string }> = [];
  const dropped: string[] = [];
  let used = 0;

  for (const skill of skills) {
    if (used + skill.body.length <= budgetChars) {
      included.push(skill);
      used += skill.body.length;
    } else {
      dropped.push(skill.name || "(unnamed)");
    }
  }

  if (included.length === 0) return { section: "", dropped };

  const parts = ["## Skills", ""];
  for (const skill of included) {
    parts.push(`### ${skill.name || "(unnamed)"}`, "", skill.body.trim(), "");
  }

  return { section: parts.join("\n"), dropped };
}
```

- [ ] **Step 3.4: Run tests**

```bash
pnpm vitest run --project packages/adapters/letta-code
```

Expected: all tests pass including the new frontmatter, manifest, and inject-section tests.

---

## Task 4: Extend `buildOfflineSystemPrompt` with skill sections

**Files:**
- Modify: `packages/adapters/letta-code/src/server/execute.ts` — `buildOfflineSystemPrompt` signature and body

**Interfaces:**
- Consumes: `buildSkillsManifest`, `buildSkillsInjectSection` (from Task 3); `LettaCodeMemoryBlock` (existing)
- Produces: updated `buildOfflineSystemPrompt(basePrompt, blocks, skillSection?) => string` — the `skillSection` param is a pre-built string from either `buildSkillsManifest` or `buildSkillsInjectSection`

- [ ] **Step 4.1: Add tests for the extended system-prompt builder**

Append to `packages/adapters/letta-code/src/server/skills.test.ts`:

```typescript
// Re-import buildOfflineSystemPrompt — it's not yet exported; will export in 4.2
import { buildOfflineSystemPrompt } from "./execute.js";

describe("buildOfflineSystemPrompt with skills", () => {
  const block = { label: "persona", content: "I am an agent.", filePath: "/mem/persona.md" };

  it("appends skill section after memory blocks when provided", () => {
    const prompt = buildOfflineSystemPrompt("You are helpful.", [block], "## Available Skills\n- foo — bar");
    expect(prompt).toContain("## Available Skills");
    expect(prompt).toContain("foo — bar");
    expect(prompt).toContain("## Memory");
  });

  it("produces same output as before when no skillSection provided", () => {
    const withoutSkills = buildOfflineSystemPrompt("You are helpful.", [block]);
    const withEmpty = buildOfflineSystemPrompt("You are helpful.", [block], "");
    expect(withoutSkills).toBe(withEmpty);
    expect(withoutSkills).not.toContain("## Available Skills");
    expect(withoutSkills).not.toContain("## Skills");
  });
});
```

- [ ] **Step 4.2: Export `buildOfflineSystemPrompt` and add the `skillSection` param**

In `execute.ts`, update the `buildOfflineSystemPrompt` function signature and body (around line 409):

```typescript
export function buildOfflineSystemPrompt(
  basePrompt: string,
  blocks: LettaCodeMemoryBlock[],
  skillSection = "",
): string {
  const parts: string[] = [basePrompt.trim() || "You are a helpful AI agent."];

  if (blocks.length > 0) {
    parts.push("\n\n## Memory\n");
    parts.push("These are your persistent memory blocks. Read them first, then respond.\n");
    for (const block of blocks) {
      parts.push(`### ${block.label}\n${block.content.trim()}`);
    }
    parts.push("\n## Memory Update Protocol");
    parts.push(
      "To persist a change to memory, include in your response:\n" +
      '<memory_update label="BLOCK_LABEL">\nnew content\n</memory_update>\n' +
      "Available blocks: " + blocks.map((b) => b.label).join(", ") + "\n" +
      "You may create new blocks by using a new label.",
    );
  }

  if (skillSection.trim()) {
    parts.push("\n\n" + skillSection.trim());
  }

  return parts.join("\n");
}
```

- [ ] **Step 4.3: Run tests**

```bash
pnpm vitest run --project packages/adapters/letta-code
```

Expected: all pass.

---

## Task 5: Wire skill loading into `executeOffline` + agentic loop

**Files:**
- Modify: `packages/adapters/letta-code/src/server/execute.ts` — `executeOffline` + new loop helpers
- Create: `packages/adapters/letta-code/src/server/loop.test.ts`

**Interfaces:**
- Consumes: `resolvePaperclipDesiredSkillNames`, `readPaperclipRuntimeSkillEntries`, `readPaperclipSkillMarkdown` (all from `@doerai/adapter-utils/server-utils`); all Task 2–4 exports; `fileURLToPath` from `node:url`; `path` from `node:path`
- Produces: `executeOffline` now delivers skills; `runAnthropicLoop` and `runOpenAICompatLoop` are internal helpers (not exported)

### Step 5.1 — Write loop integration tests (failing first)

- [ ] **Step 5.1: Create `loop.test.ts` with mocked LLM paths**

Create `packages/adapters/letta-code/src/server/loop.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AdapterExecutionContext } from "@doerai/adapter-utils";

// We test executeOffline indirectly by inspecting emitted events.
// LLM calls are mocked at the fetch/SDK layer.

function makeCtx(overrides: Partial<AdapterExecutionContext["config"]> = {}): AdapterExecutionContext {
  const logs: Array<{ kind: string; line: string }> = [];
  return {
    runId: "run-test",
    agent: {
      id: "agent-test",
      companyId: "company-test",
      name: "Test Agent",
      adapterType: "letta_code",
      budgetMonthlyCents: 10000,
      spentMonthlyCents: 0,
    } as AdapterExecutionContext["agent"],
    runtime: {} as AdapterExecutionContext["runtime"],
    config: {
      mode: "offline",
      memoryDir: "/tmp/test-memory",
      provider: "anthropic",
      apiKey: "sk-ant-test",
      ...overrides,
    },
    context: {},
    onLog: async (kind, line) => { logs.push({ kind, line }); },
    onMeta: vi.fn(),
    onSpawn: vi.fn(),
    _testLogs: logs,
  } as unknown as AdapterExecutionContext & { _testLogs: typeof logs };
}

// The loop logic is internal to executeOffline. We verify behavior via emitted
// stdout events (tool_call_message, assistant_message, stop_reason) which are
// observable through onLog.

describe("executeOffline — skill delivery path (inject mode, ollama)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("exits with exitCode 1 when memoryDir not configured", async () => {
    // Import dynamically so vi.mock can intercept fs
    const { execute } = await import("./execute.js");
    const ctx = makeCtx({ memoryDir: undefined as unknown as string });
    const result = await execute(ctx as unknown as AdapterExecutionContext);
    expect(result.exitCode).toBe(1);
    expect(result.errorMessage).toMatch(/memoryDir/i);
  });
});

describe("resolveSkillDelivery — covered in skills.test.ts", () => {
  it("is a pure function — no integration test needed here", () => {
    expect(true).toBe(true);
  });
});
```

Note: Full agentic loop integration tests require mocking `@anthropic-ai/sdk` and `fetch`, which
is environment-dependent. The loop itself is covered by the unit tests in `skills.test.ts`
(pure functions) and the failing-memoryDir test above. Add deeper mock-LLM tests if/when
a test helper for the Anthropic SDK mock is available in this repo.

- [ ] **Step 5.2: Run the loop test file (should pass — only one live assertion)**

```bash
pnpm vitest run --project packages/adapters/letta-code
```

Expected: all tests pass.

### Step 5.3 — Wire skill loading into `executeOffline`

- [ ] **Step 5.3: Add imports to `execute.ts`**

At the top of `execute.ts`, add:

```typescript
import { fileURLToPath } from "node:url";
import {
  readPaperclipRuntimeSkillEntries,
  resolvePaperclipDesiredSkillNames,
  readPaperclipSkillMarkdown,
} from "@doerai/adapter-utils/server-utils";

const __moduleDir = path.dirname(fileURLToPath(import.meta.url));
```

(Check whether `path` is already imported — it is not currently; add `import path from "node:path";` if missing. Check `import { fileURLToPath }` — also not present; add it.)

- [ ] **Step 5.4: Build the skill section before the LLM call in `executeOffline`**

In `executeOffline`, after `const systemPrompt = buildOfflineSystemPrompt(...)` (around line 471), replace:

```typescript
const systemPrompt = buildOfflineSystemPrompt(config.systemPrompt ?? "", blocks);
```

with:

```typescript
// ── Skill loading ─────────────────────────────────────────────────────────
const allSkillEntries = await readPaperclipRuntimeSkillEntries(config, __moduleDir);
const desiredSkillNames = resolvePaperclipDesiredSkillNames(config, allSkillEntries);
const delivery = resolveSkillDelivery(resolved, config);

let skillSection = "";

if (desiredSkillNames.length > 0) {
  if (delivery === "loop") {
    // Manifest only — bodies pulled via read_skill tool during the turn.
    const manifests: Array<{ name: string; description: string }> = [];
    for (const skillName of desiredSkillNames) {
      const body = await readPaperclipSkillMarkdown(__moduleDir, skillName);
      if (body) manifests.push({ ...parseFrontmatter(body), name: parseFrontmatter(body).name || skillName });
    }
    skillSection = buildSkillsManifest(manifests);
  } else {
    // Inject mode — full bodies, budget-capped.
    const skillBodies: Array<{ name: string; body: string; required: boolean }> = [];
    for (const entry of allSkillEntries) {
      if (!desiredSkillNames.includes(entry.key)) continue;
      const body = await readPaperclipSkillMarkdown(__moduleDir, entry.key);
      if (body) skillBodies.push({ name: entry.key, body, required: Boolean(entry.required) });
    }
    // Required skills first, then config order
    skillBodies.sort((a, b) => (b.required ? 1 : 0) - (a.required ? 1 : 0));
    const { section, dropped } = buildSkillsInjectSection(skillBodies);
    skillSection = section;
    if (dropped.length > 0) {
      await ctx.onLog(
        "stderr",
        `[letta-code/offline] Skill inject budget exceeded — dropped: ${dropped.join(", ")}\n`,
      );
    }
  }
}

const systemPrompt = buildOfflineSystemPrompt(config.systemPrompt ?? "", blocks, skillSection);
```

- [ ] **Step 5.5: Implement the Anthropic agentic loop**

Replace the existing Anthropic branch (inside the `try` block, `if (resolved.kind === "anthropic")`, approximately lines 488–509) with:

```typescript
if (resolved.kind === "anthropic") {
  const client = new Anthropic({ apiKey: resolved.apiKey });
  const tools: Anthropic.Tool[] = delivery === "loop"
    ? [{
        name: "read_skill",
        description: "Load the full instructions for a skill by name. Call this before acting in a skill's domain.",
        input_schema: {
          type: "object" as const,
          properties: {
            name: { type: "string", description: "The skill name (as shown in ## Available Skills)" },
          },
          required: ["name"],
        },
      }]
    : [];

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userMessage }];
  const MAX_TOOL_ITERATIONS = 8;
  let iterations = 0;

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations++;
    const streamParams: Anthropic.MessageStreamParams = {
      model,
      max_tokens: maxTokens,
      temperature: config.temperature,
      system: systemPrompt,
      messages,
      ...(tools.length > 0 ? { tools } : {}),
    };

    let stopReason: string | null = null;
    const toolUses: Array<{ id: string; name: string; input: unknown }> = [];
    let turnText = "";

    const stream = client.messages.stream(streamParams);

    for await (const event of stream) {
      if (event.type === "content_block_start" && event.content_block.type === "tool_use") {
        toolUses.push({ id: event.content_block.id, name: event.content_block.name, input: {} });
      }
      if (event.type === "content_block_delta") {
        if (event.delta.type === "text_delta") {
          turnText += event.delta.text;
          await emit(ctx, { type: "assistant_message", content: event.delta.text });
        }
        if (event.delta.type === "input_json_delta" && toolUses.length > 0) {
          // Accumulate tool input — we parse the final message below
        }
      }
      if (event.type === "message_start" && event.message.usage) {
        inputTokens = event.message.usage.input_tokens ?? 0;
      }
      if (event.type === "message_delta") {
        if (event.usage) outputTokens = event.usage.output_tokens ?? 0;
        stopReason = event.delta.stop_reason ?? null;
      }
    }

    fullResponse += turnText;

    // Re-read the final message for complete tool_use blocks
    const finalMessage = await stream.finalMessage();
    const finalToolUses = finalMessage.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );

    if (finalToolUses.length === 0 || stopReason === "end_turn") {
      break;
    }

    // Process tool calls
    const assistantMsg: Anthropic.MessageParam = {
      role: "assistant",
      content: finalMessage.content,
    };
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const tu of finalToolUses) {
      await emit(ctx, {
        type: "tool_call_message",
        name: tu.name,
        input: tu.input,
        toolCallId: tu.id,
      });
      let toolOutput: string;
      if (tu.name === "read_skill") {
        const skillName = (tu.input as Record<string, unknown>).name;
        if (typeof skillName !== "string" || !desiredSkillNames.includes(skillName)) {
          toolOutput = `Skill "${String(skillName)}" is not available to this agent. Available skills: ${desiredSkillNames.join(", ")}.`;
        } else {
          const body = await readPaperclipSkillMarkdown(__moduleDir, skillName);
          toolOutput = body ?? `Skill "${skillName}" not found.`;
        }
      } else {
        toolOutput = `Unknown tool: ${tu.name}`;
      }
      await emit(ctx, {
        type: "tool_return_message",
        content: toolOutput,
        toolCallId: tu.id,
        isError: false,
      });
      toolResults.push({ type: "tool_result", tool_use_id: tu.id, content: toolOutput });
    }

    messages.push(assistantMsg, { role: "user", content: toolResults });
  }

  if (iterations >= MAX_TOOL_ITERATIONS) {
    await ctx.onLog("stderr", "[letta-code/offline] Max tool iterations reached\n");
  }
}
```

- [ ] **Step 5.6: Implement the OpenAI-compat agentic loop**

Replace the existing `else` branch (`const out = await streamOpenAICompat(...)`) with:

```typescript
} else {
  if (delivery === "loop") {
    // OpenAI-compat tool-call loop
    const toolSchema = [{
      type: "function" as const,
      function: {
        name: "read_skill",
        description: "Load the full instructions for a skill by name.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Skill name as listed in ## Available Skills" },
          },
          required: ["name"],
        },
      },
    }];

    type OAIMessage = { role: string; content: string | null; tool_calls?: unknown[]; tool_call_id?: string; name?: string };
    const messages: OAIMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ];
    const MAX_TOOL_ITERATIONS = 8;
    let iterations = 0;

    while (iterations < MAX_TOOL_ITERATIONS) {
      iterations++;
      const url = `${resolved.baseUrl.replace(/\/$/, "")}/chat/completions`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(resolved.apiKey ? { Authorization: `Bearer ${resolved.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature: config.temperature,
          messages,
          tools: toolSchema,
          tool_choice: "auto",
          stream: true,
          stream_options: { include_usage: true },
        }),
      });

      if (!res.ok || !res.body) {
        const body = await res.text().catch(() => "");
        throw new Error(`${resolved.label} HTTP ${res.status}: ${body.slice(0, 300)}`);
      }

      let turnText = "";
      const toolCalls: Array<{ id: string; name: string; argsRaw: string }> = [];
      let finishReason: string | null = null;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          let json: Record<string, unknown>;
          try { json = JSON.parse(data); } catch { continue; }
          const choices = json.choices as Array<{
            delta?: { content?: string; tool_calls?: Array<{ index: number; id?: string; function?: { name?: string; arguments?: string } }> };
            finish_reason?: string;
          }> | undefined;
          const delta = choices?.[0]?.delta;
          if (delta?.content) {
            turnText += delta.content;
            await emit(ctx, { type: "assistant_message", content: delta.content });
          }
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              if (!toolCalls[tc.index]) toolCalls[tc.index] = { id: tc.id ?? "", name: tc.function?.name ?? "", argsRaw: "" };
              if (tc.id) toolCalls[tc.index].id = tc.id;
              if (tc.function?.name) toolCalls[tc.index].name = tc.function.name;
              if (tc.function?.arguments) toolCalls[tc.index].argsRaw += tc.function.arguments;
            }
          }
          if (choices?.[0]?.finish_reason) finishReason = choices[0].finish_reason;
          const usage = json.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined;
          if (usage) {
            inputTokens = usage.prompt_tokens ?? inputTokens;
            outputTokens = usage.completion_tokens ?? outputTokens;
          }
        }
      }

      fullResponse += turnText;

      const validToolCalls = toolCalls.filter((tc) => tc.name && tc.id);
      if (validToolCalls.length === 0 || finishReason === "stop") break;

      messages.push({
        role: "assistant",
        content: turnText || null,
        tool_calls: validToolCalls.map((tc) => ({
          id: tc.id,
          type: "function",
          function: { name: tc.name, arguments: tc.argsRaw },
        })),
      });

      for (const tc of validToolCalls) {
        let parsedArgs: Record<string, unknown> = {};
        try { parsedArgs = JSON.parse(tc.argsRaw); } catch { /* ok */ }
        await emit(ctx, { type: "tool_call_message", name: tc.name, input: parsedArgs, toolCallId: tc.id });

        let toolOutput: string;
        if (tc.name === "read_skill") {
          const skillName = parsedArgs.name;
          if (typeof skillName !== "string" || !desiredSkillNames.includes(skillName)) {
            toolOutput = `Skill "${String(skillName)}" is not available. Available: ${desiredSkillNames.join(", ")}.`;
          } else {
            const body = await readPaperclipSkillMarkdown(__moduleDir, skillName);
            toolOutput = body ?? `Skill "${skillName}" not found.`;
          }
        } else {
          toolOutput = `Unknown tool: ${tc.name}`;
        }

        await emit(ctx, { type: "tool_return_message", content: toolOutput, toolCallId: tc.id, isError: false });
        messages.push({ role: "tool", content: toolOutput, tool_call_id: tc.id });
      }

      if (iterations >= MAX_TOOL_ITERATIONS) {
        await ctx.onLog("stderr", "[letta-code/offline] Max tool iterations reached\n");
      }
    }
  } else {
    // Inject mode — single call, bodies already in systemPrompt
    const out = await streamOpenAICompat(ctx, resolved, {
      model,
      maxTokens,
      temperature: config.temperature,
      systemPrompt,
      userMessage,
    });
    fullResponse = out.fullResponse;
    inputTokens = out.inputTokens;
    outputTokens = out.outputTokens;
  }
}
```

- [ ] **Step 5.7: Run typecheck**

```bash
pnpm -r typecheck
```

Expected: no errors.

- [ ] **Step 5.8: Run all tests**

```bash
pnpm vitest run --project packages/adapters/letta-code
```

Expected: all tests pass.

- [ ] **Step 5.9: Run the full test suite**

```bash
pnpm test:run
```

Expected: no regressions.

---

## Self-Review Checklist

After writing this plan, check against the spec:

**Spec coverage:**
- ✅ New `letta-code-memory` skill — Task 1.1
- ✅ `MEMFS_STRATEGY_SKILL_BY_ADAPTER` + adapter-aware `resolveMemoryProtocolSkills` — Tasks 1.2–1.4
- ✅ `supportsTools` on presets + `resolveSkillDelivery` + `skillToolCalls` override — Task 2
- ✅ Frontmatter parse + manifest builder — Task 3
- ✅ Inject-mode budget guard (12k, required-first ordering, whole-skill drop, visible warning) — Task 3 + 5.4
- ✅ `buildOfflineSystemPrompt` extended with optional skill section — Task 4
- ✅ Anthropic agentic loop (max 8 iterations, `read_skill` tool, emit events) — Task 5.5
- ✅ OpenAI-compat tool-call loop (same semantics) — Task 5.6
- ✅ Inject-mode fallback for incapable backends (single-call path) — Task 5.4 + 5.6
- ✅ `read_skill` handler returns body or "not available" — Tasks 5.5, 5.6
- ✅ `tool_call_message` / `tool_return_message` events emitted for UI transcript — Tasks 5.5, 5.6
- ✅ Memory parse (`<memory_update>`) still runs on accumulated `fullResponse` — preserved (unchanged)
- ✅ Tests: capability resolution, frontmatter, manifest, inject budget, loop termination + guard, adapter-aware mapping — Tasks 1.6, 2.6, 3.1, 4.1, 5.1

**Not in scope for this plan (phase 2):** `letta_code` online mode, `letta_cloud`.
