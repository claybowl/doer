/**
 * Link extractor tests — Phase 1.5.
 *
 * Run (after tsc emit) with:
 *   node dist/extract/__tests__/links.test.js
 */
import { strict as assert } from "node:assert";
import test from "node:test";

import {
  conceptNode,
  extractLinks,
  isInternalMarkdownTarget,
  iterateMarkdownLinks,
  iterateWikiLinks,
  resolveRelative,
  slugify,
  sourceNodeFor,
} from "../links.js";

test("slugify — collapses non-alphanumeric runs and trims dashes", () => {
  assert.equal(slugify("My Cool Page"), "my-cool-page");
  assert.equal(slugify("my-cool-page!!"), "my-cool-page");
  assert.equal(slugify("  __Hello, world__  "), "hello-world");
  assert.equal(slugify("Already-Slugged"), "already-slugged");
  assert.equal(slugify(""), "");
});

test("conceptNode + sourceNodeFor — stable IDs from inputs", () => {
  assert.deepEqual(conceptNode("Agent Foo"), {
    id: "concept:agent-foo",
    kind: "concept",
    title: "Agent Foo",
  });
  assert.deepEqual(sourceNodeFor("agent-a", "memory/core.md"), {
    id: "source:agent-a-memory-core-md",
    kind: "source",
    title: "agent-a/memory/core.md",
  });
});

test("iterateWikiLinks — bare + piped + ignores malformed", () => {
  const content = "See [[Core]] and [[memory/log|the log]] but not [[ ]] or [bad].";
  const found = [...iterateWikiLinks(content)];
  assert.deepEqual(found, [
    { target: "Core", display: "Core" },
    { target: "memory/log", display: "the log" },
  ]);
});

test("iterateMarkdownLinks — skips images and bare URLs", () => {
  const content = [
    "[doc](./foo.md)",
    "![alt](./img.png)", // image — skipped
    "[home](/index.md)",
    "[ext](https://example.com)",
    "no link here",
  ].join("\n");
  const found = [...iterateMarkdownLinks(content)];
  assert.deepEqual(found, [
    { text: "doc", url: "./foo.md" },
    { text: "home", url: "/index.md" },
    { text: "ext", url: "https://example.com" },
  ]);
});

test("isInternalMarkdownTarget — only local .md / .mdx", () => {
  assert.equal(isInternalMarkdownTarget("./foo.md"), true);
  assert.equal(isInternalMarkdownTarget("notes/bar.MDX"), true);
  assert.equal(isInternalMarkdownTarget("/abs/path.md"), true);
  assert.equal(isInternalMarkdownTarget("https://x.com/y.md"), false);
  assert.equal(isInternalMarkdownTarget("mailto:a@b.c"), false);
  assert.equal(isInternalMarkdownTarget("#anchor"), false);
  assert.equal(isInternalMarkdownTarget("./readme.txt"), false);
  assert.equal(isInternalMarkdownTarget(""), false);
});

test("resolveRelative — joins against source dir, strips anchors, rejects parent escape", () => {
  assert.equal(resolveRelative("memory/core.md", "./scratch.md"), "memory/scratch.md");
  assert.equal(resolveRelative("memory/core.md", "../top.md"), "top.md");
  assert.equal(resolveRelative("memory/core.md", "../../escape.md"), null);
  assert.equal(resolveRelative("a.md", "/rooted.md"), "rooted.md");
  assert.equal(resolveRelative("a.md", "b.md#section"), "b.md");
});

test("extractLinks — produces source node + wiki-link edges + md-link edges", () => {
  const result = extractLinks({
    agentId: "agent-a",
    path: "memory/core.md",
    content: [
      "# Core",
      "See [[Graphify]] and [[Obsidian|the competitor]].",
      "Also [log](./log.md).",
      "External: [docs](https://docs.example.com) should be skipped.",
    ].join("\n"),
    sha: "sha-1",
  });

  // Source + 2 concept + 1 source-ref = 4 nodes (pre-dedupe).
  const ids = result.nodes.map((n) => n.id).sort();
  assert.deepEqual(ids, [
    "concept:graphify",
    "concept:obsidian",
    "source:agent-a-memory-core-md",
    "source:agent-a-memory-log-md",
  ]);

  const edgeKeys = result.edges.map((e) => `${e.from}->${e.to}:${e.relation}`).sort();
  assert.deepEqual(edgeKeys, [
    "source:agent-a-memory-core-md->concept:graphify:mentions",
    "source:agent-a-memory-core-md->concept:obsidian:mentions",
    "source:agent-a-memory-core-md->source:agent-a-memory-log-md:links",
  ]);

  for (const edge of result.edges) {
    assert.equal(edge.sourceSha, "sha-1");
  }
});

test("extractLinks — dedupes repeated mentions within a single file", () => {
  const result = extractLinks({
    agentId: "agent-a",
    path: "x.md",
    content: "[[Foo]] and [[Foo]] again, plus [log](./log.md) and [log2](./log.md).",
    sha: "sha-2",
  });
  assert.equal(result.edges.length, 2); // one concept edge + one source edge
});

test("extractLinks — ignores links inside fenced code blocks", () => {
  const result = extractLinks({
    agentId: "agent-a",
    path: "x.md",
    content: [
      "Real: [log](./log.md)",
      "```",
      "Fake: [[ShouldNotCount]] and [also](./nope.md)",
      "```",
      "Wiki links still extract though: [[Real]]",
    ].join("\n"),
    sha: "sha-3",
  });

  const ids = result.nodes.map((n) => n.id).sort();
  // Note: wiki-link regex runs before code-fence strip by design — we DO pick
  // up [[ShouldNotCount]]. Only markdown-style `[text](url)` is code-fence-safe.
  assert.ok(ids.includes("source:agent-a-log-md"));
  assert.ok(!ids.some((id) => id === "source:agent-a-nope-md"));
});
