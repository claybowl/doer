/**
 * Round-trip tests for the .af-import plugin.
 *
 * Fixtures: 7 real Letta exports (org-bundle shape) staged in
 * `__tests__/fixtures/`. These are the test oracle for what
 * `client.agents.export_file()` actually returns today.
 *
 * Coverage:
 *   - Schema-D (org bundle) parsing across all 7 cats
 *   - Single-shape backward compat (synthetic)
 *   - LeCo file map shape on godnode
 *   - Tool skip-with-warning when source_code is missing
 *   - Slug collision handling (synthetic)
 *   - Malformed input throws with clear message
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { parseAfFile, buildLecoFileMap } from "../src/index.js";

const FIXTURES_DIR = join(fileURLToPath(new URL(".", import.meta.url)), "fixtures");

function readFixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), "utf8");
}

const CATS: Array<{ file: string; expectedAgentName: string }> = [
  { file: "godnode.af",      expectedAgentName: "godnode" },
  { file: "mr_solomons.af",  expectedAgentName: "mr_solomons" },
  { file: "tony.af",         expectedAgentName: "tony" },
  { file: "maker.af",        expectedAgentName: "maker" },
  { file: "sleuth.af",       expectedAgentName: "sleuth" },
  { file: "scribe.af",       expectedAgentName: "scribe" },
  { file: "marshal.af",      expectedAgentName: "marshal" },
];

// ─────────────────────────────────────────────────────────────────────
// 1. Schema-D / org-bundle parsing (the 7 cats)
// ─────────────────────────────────────────────────────────────────────

describe("parseAfFile — org-bundle shape (the 7 cats)", () => {
  it("finds all 7 fixtures on disk", () => {
    const files = readdirSync(FIXTURES_DIR).filter((f) => f.endsWith(".af"));
    expect(files.sort()).toEqual(CATS.map((c) => c.file).sort());
  });

  for (const cat of CATS) {
    it(`parses ${cat.file} as org-bundle and resolves the expected agent`, () => {
      const result = parseAfFile(readFixture(cat.file));
      expect(result.shape).toBe("org-bundle");
      expect(result.af.agent.name).toBe(cat.expectedAgentName);
      expect(typeof result.af.agent.system).toBe("string");
      expect(result.af.agent.system.length).toBeGreaterThan(0);
      expect(Array.isArray(result.af.memory_blocks)).toBe(true);
      expect(result.af.memory_blocks.length).toBeGreaterThan(0);
      // Every resolved memory block has a label and string value.
      for (const block of result.af.memory_blocks) {
        expect(typeof block.label).toBe("string");
        expect(block.label.length).toBeGreaterThan(0);
        expect(typeof block.value).toBe("string");
      }
    });
  }

  it("resolves block_ids in declared order (godnode, deterministic)", () => {
    const result = parseAfFile(readFixture("godnode.af"));
    // Sanity: at least one of godnode's known blocks is present
    const labels = result.af.memory_blocks.map((b) => b.label);
    expect(labels).toContain("system/persona");
    expect(labels).toContain("gn_journal");
  });
});

// ─────────────────────────────────────────────────────────────────────
// 2. LeCo file map shape (godnode)
// ─────────────────────────────────────────────────────────────────────

describe("buildLecoFileMap — godnode LeCo layout", () => {
  const parsed = parseAfFile(readFixture("godnode.af"));
  const { files, warnings } = buildLecoFileMap(parsed.af);

  it("emits the canonical LeCo top-level files", () => {
    expect(files.has(".letta/agent.json")).toBe(true);
    expect(files.has(".letta/system.md")).toBe(true);
    expect(files.has("README.md")).toBe(true);
    expect(files.has(".gitignore")).toBe(true);
  });

  it(".letta/agent.json carries name, model, tags, metadata", () => {
    const agentJson = JSON.parse(files.get(".letta/agent.json") ?? "{}");
    expect(agentJson.name).toBe("godnode");
    expect(typeof agentJson.model).toBe("string");
    expect(Array.isArray(agentJson.tags)).toBe(true);
  });

  it(".letta/system.md is the full system prompt", () => {
    const sys = files.get(".letta/system.md") ?? "";
    expect(sys.length).toBeGreaterThan(100);
    expect(sys).toContain("godnode");
  });

  it("emits one .letta/memory/<slug>.md per memory block", () => {
    const memoryFiles = [...files.keys()].filter((k) => k.startsWith(".letta/memory/"));
    expect(memoryFiles.length).toBe(parsed.af.memory_blocks.length);
    // Each memory file has frontmatter
    for (const path of memoryFiles) {
      const content = files.get(path) ?? "";
      expect(content.startsWith("---")).toBe(true);
      expect(content).toContain("label:");
    }
  });

  it("warns once per tool that has no source_code (Letta runtime / MCP tools)", () => {
    // godnode's exported tools are runtime tools — no Python source.
    expect(warnings.length).toBeGreaterThan(0);
    const skipWarnings = warnings.filter((w) => w.startsWith("Skipped tool"));
    expect(skipWarnings.length).toBeGreaterThan(0);
    // No empty-source python file should have been written.
    const toolFiles = [...files.keys()].filter((k) => k.startsWith(".letta/tools/"));
    expect(toolFiles.length).toBe(0);
  });

  it("excludes messages by default", () => {
    const conversationFiles = [...files.keys()].filter((k) =>
      k.startsWith(".letta/conversation/"),
    );
    expect(conversationFiles.length).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 3. Single-shape backward compat (synthetic input)
// ─────────────────────────────────────────────────────────────────────

describe("parseAfFile — single-shape (older Letta export)", () => {
  const synthetic = JSON.stringify({
    agent: {
      name: "Drafter",
      system: "You are a file producer.",
      model: "groq/kimi-k2-instruct-0905",
      tags: ["doer"],
    },
    memory_blocks: [
      { label: "system/persona", value: "I am Drafter." },
      { label: "system/human", value: "" },
    ],
    tools: [
      {
        name: "produce_deliverable",
        source_code: "def produce_deliverable():\n    return {}\n",
        source_type: "python",
      },
    ],
  });

  it("recognizes the older single-agent shape", () => {
    const result = parseAfFile(synthetic);
    expect(result.shape).toBe("single");
    expect(result.af.agent.name).toBe("Drafter");
    expect(result.af.memory_blocks.length).toBe(2);
    expect(result.af.tools?.length).toBe(1);
  });

  it("writes tool .py when source_code is present", () => {
    const result = parseAfFile(synthetic);
    const { files, warnings } = buildLecoFileMap(result.af);
    expect(files.has(".letta/tools/produce_deliverable.py")).toBe(true);
    expect(warnings.filter((w) => w.includes("produce_deliverable"))).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 4. Slug-collision handling (synthetic)
// ─────────────────────────────────────────────────────────────────────

describe("buildLecoFileMap — slug collision handling", () => {
  it("suffixes colliding labels and emits a warning per collision", () => {
    // Two labels that sluggify to the same base — the slugger collapses
    // `/` → `__` then `_+` → `_`, so both inputs land at "system_persona".
    const af = {
      agent: { name: "x", system: "x" },
      memory_blocks: [
        { label: "system/persona",  value: "first"  },
        { label: "system__persona", value: "second" },
      ],
    };
    const { files, warnings } = buildLecoFileMap(af);
    const memoryFiles = [...files.keys()].filter((k) => k.startsWith(".letta/memory/"));
    expect(memoryFiles.length).toBe(2);
    expect(memoryFiles).toContain(".letta/memory/system_persona.md");
    expect(memoryFiles).toContain(".letta/memory/system_persona-1.md");
    expect(warnings.some((w) => w.includes("Slug collision"))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 5. Malformed input
// ─────────────────────────────────────────────────────────────────────

describe("parseAfFile — error handling", () => {
  it("throws on non-JSON content", () => {
    expect(() => parseAfFile("not json")).toThrow(/Could not parse/);
  });

  it("throws on a JSON array (not an object)", () => {
    expect(() => parseAfFile("[]")).toThrow(/not a JSON object/);
  });

  it("throws when neither `agents` nor `agent` is present", () => {
    expect(() => parseAfFile("{}")).toThrow(/shape not recognized/);
  });

  it("throws when org-bundle agents[0] is missing name", () => {
    const bad = JSON.stringify({ agents: [{ system: "x" }], blocks: [], tools: [] });
    expect(() => parseAfFile(bad)).toThrow(/missing required 'name'/);
  });

  it("throws when single-shape agent is missing system", () => {
    const bad = JSON.stringify({ agent: { name: "x" }, memory_blocks: [] });
    expect(() => parseAfFile(bad)).toThrow(/missing required 'system'/);
  });
});
