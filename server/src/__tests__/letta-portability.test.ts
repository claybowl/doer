import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createMemfsBundle,
  migrateCloudAgentToLocal,
  restoreMemfsBundle,
  sha256,
  scrubLettaPortableConfig,
  scrubAgentFileSecrets,
  validateLettaArtifact,
} from "../services/letta-portability.js";

const execFileAsync = promisify(execFile);
const cleanup: string[] = [];

afterEach(async () => {
  await Promise.all(cleanup.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("Letta portable artifact", () => {
  it("validates versioned relative paths and checksums", () => {
    const digest = sha256(Buffer.from("bundle"));
    expect(validateLettaArtifact({
      version: 1,
      memfsBundlePath: "agents/alice/letta/memfs.bundle",
      sha256: digest,
      sourceAgentId: "agent-local-source",
    })).toMatchObject({ version: 1, sha256: digest });

    expect(() => validateLettaArtifact({ version: 1, memfsBundlePath: "../../secret", sha256: digest })).toThrow(/portable path/i);
    expect(() => validateLettaArtifact({ version: 1, memfsBundlePath: "/tmp/secret", sha256: digest })).toThrow(/portable path/i);
    expect(() => validateLettaArtifact({ version: 1, memfsBundlePath: "agents/a/memfs.bundle", sha256: "bad" })).toThrow(/checksum/i);
  });

  it("removes secrets and machine-specific paths from adapter metadata", () => {
    expect(scrubLettaPortableConfig({
      backend: "local",
      apiKey: "secret",
      nested: { accessToken: "token", model: "ollama/kimi" },
      cwd: "/Users/source/work",
      memoryDir: "/Users/source/memory",
    })).toEqual({ backend: "local", nested: { model: "ollama/kimi" } });
  });

  it("scrubs secret-shaped AgentFile environment records", () => {
    expect(scrubAgentFileSecrets({
      environment_variables: [
        { key: "OPENAI_API_KEY", value: "secret" },
        { key: "DISPLAY_NAME", value: "Alice" },
      ],
      apiKey: "also-secret",
    })).toEqual({
      environment_variables: [
        { key: "OPENAI_API_KEY", value: null },
        { key: "DISPLAY_NAME", value: "Alice" },
      ],
      apiKey: null,
    });
  });

  it("round-trips the full MemFS Git history", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "doer-letta-portability-"));
    cleanup.push(root);
    const source = path.join(root, "source");
    const bundle = path.join(root, "memfs.bundle");
    const restored = path.join(root, "restored");
    await mkdir(path.join(source, "system"), { recursive: true });
    await execFileAsync("git", ["init", source]);
    await execFileAsync("git", ["-C", source, "config", "user.email", "agent@doer.local"]);
    await execFileAsync("git", ["-C", source, "config", "user.name", "Doer Agent"]);
    await writeFile(path.join(source, "system", "persona.md"), "first\n");
    await execFileAsync("git", ["-C", source, "add", "."]);
    await execFileAsync("git", ["-C", source, "commit", "-m", "first memory"]);
    await writeFile(path.join(source, "system", "persona.md"), "second\n");
    await execFileAsync("git", ["-C", source, "commit", "-am", "second memory"]);

    const artifact = await createMemfsBundle(source, bundle, "agents/alice/letta/memfs.bundle");
    await restoreMemfsBundle(bundle, restored, artifact);

    expect(await readFile(path.join(restored, "system", "persona.md"), "utf8")).toBe("second\n");
    const { stdout } = await execFileAsync("git", ["-C", restored, "rev-list", "--count", "HEAD"]);
    expect(stdout.trim()).toBe("2");
  });

  it("exports only an agent subtree from a shared MemFS repository", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "doer-letta-subtree-"));
    cleanup.push(root);
    const source = path.join(root, "source");
    const alice = path.join(source, "agents", "alice");
    const bob = path.join(source, "agents", "bob");
    const bundle = path.join(root, "alice.bundle");
    const restored = path.join(root, "restored");
    await mkdir(alice, { recursive: true });
    await mkdir(bob, { recursive: true });
    await execFileAsync("git", ["init", source]);
    await execFileAsync("git", ["-C", source, "config", "user.email", "agent@doer.local"]);
    await execFileAsync("git", ["-C", source, "config", "user.name", "Doer Agent"]);
    await writeFile(path.join(alice, "persona.md"), "alice one\n");
    await writeFile(path.join(bob, "persona.md"), "private bob\n");
    await execFileAsync("git", ["-C", source, "add", "."]);
    await execFileAsync("git", ["-C", source, "commit", "-m", "first"]);
    await writeFile(path.join(alice, "persona.md"), "alice two\n");
    await execFileAsync("git", ["-C", source, "commit", "-am", "alice second"]);

    const artifact = await createMemfsBundle(alice, bundle, "agents/alice/letta/memfs.bundle");
    await restoreMemfsBundle(bundle, restored, artifact);

    expect(await readFile(path.join(restored, "persona.md"), "utf8")).toBe("alice two\n");
    await expect(readFile(path.join(restored, "agents", "bob", "persona.md"), "utf8")).rejects.toThrow();
    const { stdout } = await execFileAsync("git", ["-C", restored, "rev-list", "--count", "HEAD"]);
    expect(stdout.trim()).toBe("2");
  });

  it("rejects a checksum mismatch without activating a destination", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "doer-letta-corrupt-"));
    cleanup.push(root);
    const bundle = path.join(root, "bad.bundle");
    const destination = path.join(root, "restored");
    await writeFile(bundle, "not a git bundle");

    await expect(restoreMemfsBundle(bundle, destination, {
      version: 1,
      memfsBundlePath: "agents/a/letta/memfs.bundle",
      sha256: sha256(Buffer.from("different")),
    })).rejects.toThrow(/checksum/i);
    await expect(readFile(path.join(destination, "system", "persona.md"))).rejects.toThrow();
  });

  it("clones a Cloud snapshot into a distinct local canonical identity", async () => {
    const snapshot = {
      name: "Constellation Alice",
      model: "openai-codex/gpt-5",
      systemPrompt: "Work carefully.",
      blocks: [
        { label: "persona", value: "I remember." },
        { label: "project", value: "Ship Doer." },
      ],
    };
    const exportCloudSnapshot = vi.fn(async () => snapshot);
    const createLocalAgent = vi.fn(async () => "agent-local-new");
    const smokeLocalAgent = vi.fn(async () => ({ success: true }));

    const migrated = await migrateCloudAgentToLocal({
      sourceAgentId: "agent-cloud-source",
      permissionMode: "unrestricted",
    }, { exportCloudSnapshot, createLocalAgent, smokeLocalAgent });

    expect(exportCloudSnapshot).toHaveBeenCalledOnce();
    expect(createLocalAgent).toHaveBeenCalledWith(snapshot);
    expect(smokeLocalAgent).toHaveBeenCalledWith("agent-local-new");
    expect(migrated).toEqual({
      localAgentId: "agent-local-new",
      adapterConfig: {
        backend: "local",
        lettaAgentId: "agent-local-new",
        sourceAgentId: "agent-cloud-source",
        sourceCloudAgentId: "agent-cloud-source",
        model: "openai-codex/gpt-5",
        permissionMode: "unrestricted",
      },
    });
  });

  it("rejects a migration when the local smoke check fails", async () => {
    await expect(migrateCloudAgentToLocal({ sourceAgentId: "agent-cloud-source" }, {
      exportCloudSnapshot: async () => ({ name: "Alice", blocks: [] }),
      createLocalAgent: async () => "agent-local-new",
      smokeLocalAgent: async () => ({ success: false, error: "cannot resume" }),
    })).rejects.toThrow(/smoke check.*cannot resume/i);
  });
});
