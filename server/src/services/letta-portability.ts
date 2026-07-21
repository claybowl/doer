import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, realpath, rename, rm } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { CompanyPortabilityLettaArtifact } from "@doerai/shared";

export interface LettaCloudSnapshot {
  name: string;
  model?: string;
  systemPrompt?: string;
  blocks: Array<{ label: string; value: string; description?: string; readOnly?: boolean; limit?: number }>;
}

export interface LettaCloudMigrationInput {
  sourceAgentId: string;
  permissionMode?: "standard" | "acceptEdits" | "unrestricted";
}

export interface LettaCloudMigrationDependencies {
  exportCloudSnapshot(sourceAgentId: string): Promise<LettaCloudSnapshot>;
  createLocalAgent(snapshot: LettaCloudSnapshot): Promise<string>;
  smokeLocalAgent(localAgentId: string): Promise<{ success: boolean; error?: string }>;
}

export async function migrateCloudAgentToLocal(
  input: LettaCloudMigrationInput,
  dependencies: LettaCloudMigrationDependencies,
) {
  const sourceAgentId = input.sourceAgentId.trim();
  if (!sourceAgentId) throw new Error("A source Letta agent ID is required");
  const snapshot = await dependencies.exportCloudSnapshot(sourceAgentId);
  const localAgentId = await dependencies.createLocalAgent(snapshot);
  if (!localAgentId.startsWith("agent-local-") || localAgentId === sourceAgentId) {
    throw new Error("Letta migration did not create a distinct local agent identity");
  }
  const smoke = await dependencies.smokeLocalAgent(localAgentId);
  if (!smoke.success) {
    throw new Error(`Letta local smoke check failed${smoke.error ? `: ${smoke.error}` : ""}`);
  }
  return {
    localAgentId,
    adapterConfig: {
      backend: "local" as const,
      lettaAgentId: localAgentId,
      sourceAgentId,
      sourceCloudAgentId: sourceAgentId,
      ...(snapshot.model ? { model: snapshot.model } : {}),
      permissionMode: input.permissionMode ?? "standard" as const,
    },
  };
}

const execFileAsync = promisify(execFile);
const SECRET_KEY = /(?:api[_-]?key|access[_-]?token|refresh[_-]?token|authorization|password|secret)$/i;
const MACHINE_PATH_KEY = /(?:cwd|memoryDir|stateDir|workspaceDir|homeDir|localBackendDir)$/i;

export function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function portablePath(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.includes("\\") || value.includes("\0")) {
    throw new Error(`${field} must be a portable path`);
  }
  const normalized = path.posix.normalize(value);
  if (path.posix.isAbsolute(value) || normalized === ".." || normalized.startsWith("../") || normalized !== value) {
    throw new Error(`${field} must be a portable path`);
  }
  return normalized;
}

export function validateLettaArtifact(value: unknown): CompanyPortabilityLettaArtifact {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid Letta artifact manifest");
  const raw = value as Record<string, unknown>;
  if (raw.version !== 1) throw new Error("Unsupported Letta artifact version");
  const memfsBundlePath = portablePath(raw.memfsBundlePath, "memfsBundlePath");
  if (!memfsBundlePath) throw new Error("memfsBundlePath must be a portable path");
  if (typeof raw.sha256 !== "string" || !/^[a-f0-9]{64}$/i.test(raw.sha256)) {
    throw new Error("Invalid Letta artifact checksum");
  }
  const agentFilePath = portablePath(raw.agentFilePath, "agentFilePath");
  return {
    version: 1,
    memfsBundlePath,
    sha256: raw.sha256.toLowerCase(),
    ...(agentFilePath ? { agentFilePath } : {}),
    ...(typeof raw.sourceAgentId === "string" && raw.sourceAgentId.trim()
      ? { sourceAgentId: raw.sourceAgentId.trim() }
      : {}),
  };
}

export function scrubLettaPortableConfig(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(scrubLettaPortableConfig);
  if (!value || typeof value !== "object") return value;
  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_KEY.test(key) || MACHINE_PATH_KEY.test(key)) continue;
    output[key] = scrubLettaPortableConfig(entry);
  }
  return output;
}

/** Defense in depth for AgentFile env records whose secret name is stored as data. */
export function scrubAgentFileSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(scrubAgentFileSecrets);
  if (!value || typeof value !== "object") return value;
  const source = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  const namedSecret = typeof source.key === "string" && SECRET_KEY.test(source.key)
    || typeof source.name === "string" && SECRET_KEY.test(source.name);
  for (const [key, entry] of Object.entries(source)) {
    if (SECRET_KEY.test(key)) {
      output[key] = null;
    } else if (namedSecret && key === "value") {
      output[key] = null;
    } else {
      output[key] = scrubAgentFileSecrets(entry);
    }
  }
  return output;
}

async function resolveRepositoryLocation(repoDir: string): Promise<{ root: string; relativePath: string }> {
  const expected = await realpath(repoDir);
  const { stdout } = await execFileAsync("git", ["-C", expected, "rev-parse", "--show-toplevel"]);
  const root = await realpath(stdout.trim());
  const relativePath = path.relative(root, expected);
  if (relativePath === ".." || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
    throw new Error("MemFS path must be inside its Git repository");
  }
  return { root, relativePath };
}

export async function createMemfsBundle(
  repoDir: string,
  outputPath: string,
  portableBundlePath: string,
  sourceAgentId?: string,
): Promise<CompanyPortabilityLettaArtifact> {
  const { root, relativePath } = await resolveRepositoryLocation(repoDir);
  await mkdir(path.dirname(outputPath), { recursive: true });
  if (!relativePath) {
    await execFileAsync("git", ["-C", root, "bundle", "create", outputPath, "--all"]);
  } else {
    const staging = await mkdtemp(path.join(path.dirname(outputPath), ".memfs-filter-"));
    const filtered = path.join(staging, "repo");
    try {
      await execFileAsync("git", ["clone", "--no-local", root, filtered]);
      await execFileAsync(
        "git",
        ["-C", filtered, "filter-branch", "--force", "--prune-empty", "--subdirectory-filter", relativePath, "--", "--all"],
        { env: { ...process.env, FILTER_BRANCH_SQUELCH_WARNING: "1" } },
      );
      await execFileAsync("git", ["-C", filtered, "bundle", "create", outputPath, "--all"]);
    } finally {
      await rm(staging, { recursive: true, force: true });
    }
  }
  const contents = await readFile(outputPath);
  return validateLettaArtifact({
    version: 1,
    memfsBundlePath: portableBundlePath,
    sha256: sha256(contents),
    sourceAgentId,
  });
}

export async function restoreMemfsBundle(
  bundlePath: string,
  destination: string,
  artifactValue: unknown,
): Promise<void> {
  const artifact = validateLettaArtifact(artifactValue);
  const contents = await readFile(bundlePath);
  if (sha256(contents) !== artifact.sha256) throw new Error("Letta MemFS bundle checksum mismatch");

  const parent = path.dirname(destination);
  await mkdir(parent, { recursive: true });
  const stagingRoot = await mkdtemp(path.join(parent, `.${path.basename(destination)}.staging-`));
  const stagedRepo = path.join(stagingRoot, "repo");
  try {
    await execFileAsync("git", ["clone", bundlePath, stagedRepo]);
    await execFileAsync("git", ["-C", stagedRepo, "bundle", "verify", bundlePath]);
    await rename(stagedRepo, destination);
  } finally {
    await rm(stagingRoot, { recursive: true, force: true });
  }
}
