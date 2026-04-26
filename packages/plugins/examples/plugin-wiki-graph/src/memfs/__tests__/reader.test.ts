/**
 * Memfs reader tests — Phase 0 sanity pass.
 *
 * Uses Node's built-in test runner (`node:test`) so the plugin package does
 * not need a vitest config yet. Vitest integration lands when Phase 1.5+
 * introduces extractor / graph / wiki renderer tests.
 *
 * Run directly with:
 *   node --loader tsx ./src/memfs/__tests__/reader.test.ts
 * or wire into a package script once tsx is wired.
 */

import { strict as assert } from "node:assert";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  listAgentFiles,
  listAllAgentIds,
  readAgentFile,
  resolveMemfsRoot,
  shouldIgnore,
} from "../reader.js";

async function makeFixture(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "wiki-graph-memfs-"));

  // Agent A — three files, one ignored
  const a = path.join(root, "agent-a");
  await fs.mkdir(path.join(a, "memory"), { recursive: true });
  await fs.writeFile(path.join(a, "memory", "core.md"), "# Core\n");
  await fs.writeFile(path.join(a, "memory", "scratch.tmp"), "scratch");
  await fs.mkdir(path.join(a, "drafts"), { recursive: true });
  await fs.writeFile(path.join(a, "drafts", "idea.md"), "wip");
  await fs.writeFile(
    path.join(a, ".lettaignore"),
    "# comments ok\n*.tmp\ndrafts/\n",
  );

  // Agent B — one file, no ignore
  const b = path.join(root, "agent-b");
  await fs.mkdir(b, { recursive: true });
  await fs.writeFile(path.join(b, "bio.md"), "Agent B bio");

  // Non-directory sibling — must be filtered out of listAllAgentIds
  await fs.writeFile(path.join(root, "README.md"), "not an agent");

  return root;
}

test("resolveMemfsRoot honors override > env > default", () => {
  const originalEnv = process.env.MEMFS_ROOT;
  try {
    process.env.MEMFS_ROOT = "/tmp/env-root";
    assert.equal(
      resolveMemfsRoot({ rootOverride: "/tmp/override" }),
      "/tmp/override",
      "rootOverride wins",
    );
    assert.equal(resolveMemfsRoot(), "/tmp/env-root", "env var used when no override");
    delete process.env.MEMFS_ROOT;
    const fallback = resolveMemfsRoot();
    assert.ok(
      fallback.endsWith(path.join(".letta", "agents")),
      `fallback should end in .letta/agents (got ${fallback})`,
    );
  } finally {
    if (originalEnv === undefined) delete process.env.MEMFS_ROOT;
    else process.env.MEMFS_ROOT = originalEnv;
  }
});

test("listAllAgentIds returns only directories, sorted", async () => {
  const root = await makeFixture();
  try {
    const ids = await listAllAgentIds({ rootOverride: root });
    assert.deepEqual(ids, ["agent-a", "agent-b"]);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("listAllAgentIds returns [] for non-existent root", async () => {
  const ids = await listAllAgentIds({
    rootOverride: "/does/not/exist/anywhere",
  });
  assert.deepEqual(ids, []);
});

test("listAgentFiles honors .lettaignore and returns forward-slashed paths", async () => {
  const root = await makeFixture();
  try {
    const files = await listAgentFiles("agent-a", { rootOverride: root });
    const paths = files.map((f) => f.path).sort();
    // .lettaignore excludes *.tmp + drafts/ — only core.md survives.
    assert.deepEqual(paths, ["memory/core.md"]);
    assert.equal(files[0].agentId, "agent-a");
    assert.ok(files[0].sizeBytes > 0);
    assert.ok(!Number.isNaN(Date.parse(files[0].updatedAt)));
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("listAgentFiles returns [] for missing agent", async () => {
  const root = await makeFixture();
  try {
    const files = await listAgentFiles("ghost-agent", { rootOverride: root });
    assert.deepEqual(files, []);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("readAgentFile returns content + metadata", async () => {
  const root = await makeFixture();
  try {
    const file = await readAgentFile("agent-b", "bio.md", { rootOverride: root });
    assert.ok(file, "expected file");
    assert.equal(file!.agentId, "agent-b");
    assert.equal(file!.path, "bio.md");
    assert.equal(file!.content, "Agent B bio");
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("readAgentFile returns null for missing file", async () => {
  const root = await makeFixture();
  try {
    const file = await readAgentFile("agent-b", "no-such.md", {
      rootOverride: root,
    });
    assert.equal(file, null);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("readAgentFile rejects path escape", async () => {
  const root = await makeFixture();
  try {
    await assert.rejects(
      readAgentFile("agent-b", "../agent-a/memory/core.md", {
        rootOverride: root,
      }),
      /path escape rejected/,
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("shouldIgnore — exact, dir prefix, extension, double-star", () => {
  assert.equal(shouldIgnore("foo.md", []), false);
  assert.equal(shouldIgnore("foo.md", ["foo.md"]), true);
  assert.equal(shouldIgnore("foo.md", ["bar.md"]), false);
  assert.equal(shouldIgnore("drafts/x.md", ["drafts/"]), true);
  assert.equal(shouldIgnore("drafts", ["drafts/"]), true);
  assert.equal(shouldIgnore("draftsy/x.md", ["drafts/"]), false);
  assert.equal(shouldIgnore("a.tmp", ["*.tmp"]), true);
  // Bare patterns without `/` match basename at any depth (gitignore semantics).
  assert.equal(shouldIgnore("nested/a.tmp", ["*.tmp"]), true);
  // Anchored pattern (contains `/`) only matches from root — no basename fallback.
  assert.equal(shouldIgnore("nested/a.tmp", ["root/*.tmp"]), false);
  assert.equal(shouldIgnore("nested/a.tmp", ["**/*.tmp"]), true);
  assert.equal(shouldIgnore("secrets/token.txt", ["secrets/**"]), true);
});
