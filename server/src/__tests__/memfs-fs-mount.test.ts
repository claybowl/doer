import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ResolvedMemfsBinding } from "@doerai/shared";
import { resolveMemfsStrategies } from "../services/memfs/strategies/index.js";
import { fsMountStrategy } from "../services/memfs/strategies/fs-mount.js";

async function mkTempDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function seedSource(rootDir: string, pathPrefix: string): Promise<string> {
  const dir = path.join(rootDir, pathPrefix);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "persona.md"), "i am the guard dog of the donjon", "utf8");
  return dir;
}

function buildBinding(overrides: Partial<ResolvedMemfsBinding> & {
  rootPath: string;
  pathPrefix: string;
}): ResolvedMemfsBinding {
  const now = new Date().toISOString();
  return {
    id: "binding-1",
    agentId: "agent-1",
    rootId: "root-1",
    pathPrefix: overrides.pathPrefix,
    strategy: "fs-mount",
    permission: "read",
    mountAs: null,
    label: "letta",
    createdAt: now,
    updatedAt: now,
    rootPath: overrides.rootPath,
    rootKind: "local-fs",
    rootLabel: "letta",
    ...overrides,
  };
}

describe("memfs fs-mount strategy", () => {
  let rootDir: string;
  let workingDir: string;

  beforeEach(async () => {
    rootDir = await mkTempDir("doer-memfs-root-");
    workingDir = await mkTempDir("doer-memfs-cwd-");
  });

  afterEach(async () => {
    await fs.rm(rootDir, { recursive: true, force: true });
    await fs.rm(workingDir, { recursive: true, force: true });
  });

  it("creates a symlink inside the working directory that points at the source", async () => {
    const sourceAbs = await seedSource(rootDir, "agents/a-123/memory");

    const result = await fsMountStrategy.mount(
      buildBinding({
        rootPath: rootDir,
        pathPrefix: "agents/a-123/memory",
        label: "letta",
      }),
      { workingDirectory: workingDir, adapterType: "letta_cloud" },
    );

    expect(result.ok).toBe(true);
    expect(result.strategy).toBe("fs-mount");
    expect(result.mountedPath).toBe(path.join(workingDir, ".memory", "letta"));

    const mountStat = await fs.lstat(result.mountedPath!);
    expect(mountStat.isSymbolicLink()).toBe(true);

    const mountedContents = await fs.readFile(
      path.join(result.mountedPath!, "persona.md"),
      "utf8",
    );
    expect(mountedContents).toContain("guard dog");

    const linkTarget = await fs.readlink(result.mountedPath!);
    const resolvedTarget = path.resolve(path.dirname(result.mountedPath!), linkTarget);
    expect(resolvedTarget).toBe(sourceAbs);
  });

  it("honors binding.mountAs override", async () => {
    await seedSource(rootDir, "agents/a-456/memory");

    const result = await fsMountStrategy.mount(
      buildBinding({
        rootPath: rootDir,
        pathPrefix: "agents/a-456/memory",
        mountAs: ".letta-memory",
        label: "dondog",
      }),
      { workingDirectory: workingDir, adapterType: "claude_local" },
    );

    expect(result.ok).toBe(true);
    expect(result.mountedPath).toBe(path.join(workingDir, ".letta-memory"));
  });

  it("returns ok=false when the source does not exist", async () => {
    const result = await fsMountStrategy.mount(
      buildBinding({
        rootPath: rootDir,
        pathPrefix: "agents/missing/memory",
      }),
      { workingDirectory: workingDir, adapterType: "letta_cloud" },
    );

    expect(result.ok).toBe(false);
    expect(result.note).toMatch(/does not exist/i);
  });

  it("is idempotent — re-mounting an existing symlink returns ok", async () => {
    await seedSource(rootDir, "agents/a-789/memory");
    const ctx = { workingDirectory: workingDir, adapterType: "letta_cloud" };
    const binding = buildBinding({
      rootPath: rootDir,
      pathPrefix: "agents/a-789/memory",
    });

    const first = await fsMountStrategy.mount(binding, ctx);
    expect(first.ok).toBe(true);

    const second = await fsMountStrategy.mount(binding, ctx);
    expect(second.ok).toBe(true);
    expect(second.mountedPath).toBe(first.mountedPath);
    expect(second.note).toMatch(/already present/i);
  });

  it("unmount removes the symlink but leaves the source untouched", async () => {
    const sourceAbs = await seedSource(rootDir, "agents/a-999/memory");
    const ctx = { workingDirectory: workingDir, adapterType: "letta_cloud" };
    const binding = buildBinding({
      rootPath: rootDir,
      pathPrefix: "agents/a-999/memory",
    });

    const mounted = await fsMountStrategy.mount(binding, ctx);
    expect(mounted.ok).toBe(true);

    await fsMountStrategy.unmount(binding, ctx);

    await expect(fs.lstat(mounted.mountedPath!)).rejects.toThrow();
    const sourceStat = await fs.stat(sourceAbs);
    expect(sourceStat.isDirectory()).toBe(true);
  });
});

describe("resolveMemfsStrategies orchestrator", () => {
  let rootDir: string;
  let workingDir: string;

  beforeEach(async () => {
    rootDir = await mkTempDir("doer-memfs-orch-root-");
    workingDir = await mkTempDir("doer-memfs-orch-cwd-");
  });

  afterEach(async () => {
    await fs.rm(rootDir, { recursive: true, force: true });
    await fs.rm(workingDir, { recursive: true, force: true });
  });

  it("applies each binding through its declared strategy", async () => {
    await seedSource(rootDir, "agents/orc-1/memory");
    await seedSource(rootDir, "agents/orc-2/memory");

    const bindings: ResolvedMemfsBinding[] = [
      buildBinding({
        id: "b1",
        rootPath: rootDir,
        pathPrefix: "agents/orc-1/memory",
        label: "orc-one",
      }),
      buildBinding({
        id: "b2",
        rootPath: rootDir,
        pathPrefix: "agents/orc-2/memory",
        label: "orc-two",
      }),
    ];

    const results = await resolveMemfsStrategies(bindings, {
      workingDirectory: workingDir,
      adapterType: "claude_local",
    });

    expect(results).toHaveLength(2);
    expect(results.every((r) => r.ok)).toBe(true);
    expect(results.map((r) => r.mountedPath)).toEqual([
      path.join(workingDir, ".memory", "orc-one"),
      path.join(workingDir, ".memory", "orc-two"),
    ]);
  });

  it("records an unimplemented-strategy note without throwing", async () => {
    const bindings: ResolvedMemfsBinding[] = [
      buildBinding({
        id: "b1",
        rootPath: rootDir,
        pathPrefix: "agents/missing/memory",
        strategy: "mcp-server",
      }),
    ];

    const results = await resolveMemfsStrategies(bindings, {
      workingDirectory: workingDir,
      adapterType: "claude_local",
    });

    expect(results).toHaveLength(1);
    expect(results[0]!.ok).toBe(false);
    expect(results[0]!.note).toMatch(/not implemented/i);
  });
});
