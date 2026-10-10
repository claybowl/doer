import os from "node:os";
import path from "node:path";

const DEFAULT_INSTANCE_ID = "default";
const INSTANCE_ID_RE = /^[a-zA-Z0-9_-]+$/;
const PATH_SEGMENT_RE = /^[a-zA-Z0-9_-]+$/;
const FRIENDLY_PATH_SEGMENT_RE = /[^a-zA-Z0-9._-]+/g;

function expandHomePrefix(value: string): string {
  if (value === "~") return os.homedir();
  if (value.startsWith("~/")) return path.resolve(os.homedir(), value.slice(2));
  return value;
}

export function resolvePaperclipHomeDir(): string {
  const envHome = process.env.DOER_HOME?.trim();
  if (envHome) return path.resolve(expandHomePrefix(envHome));
  return path.resolve(os.homedir(), ".doer");
}

export function resolvePaperclipInstanceId(): string {
  const raw = process.env.DOER_INSTANCE_ID?.trim() || DEFAULT_INSTANCE_ID;
  if (!INSTANCE_ID_RE.test(raw)) {
    throw new Error(`Invalid DOER_INSTANCE_ID '${raw}'.`);
  }
  return raw;
}

/** Directories the packaged macOS app cannot read (com.apple.provenance / TCC). */
const MACOS_SANDBOXED_DIRS = ["Desktop", "Documents", "Downloads"] as const;

/**
 * Adapter config keys that hold a filesystem path Doer hands to a subprocess.
 * A packaged, provenance-signed Electron binary is denied `fs.readdir()` and
 * `readFile()` under these locations (EPERM), which surfaces at run time as an
 * unexplained permission failure rather than a configuration error.
 */
const PATH_BEARING_CONFIG_KEYS = [
  "memoryDir",
  "cwd",
  "afPath",
  "instructionsFilePath",
  "instructionsRootPath",
  "instructionsEntryFile",
] as const;

function isInside(child: string, parent: string): boolean {
  const rel = path.relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

/**
 * Report adapter config paths that the packaged app will not be able to read.
 *
 * Returns one message per offending path, or an empty array when the config is
 * clean. Non-blocking by design: a dev build can legitimately use these paths,
 * and rejecting outright would strand agents that already point at them. The
 * caller surfaces the warning so the user learns about it at write time rather
 * than from a run-time EPERM.
 */
export function findSandboxedAdapterPaths(adapterConfig: unknown): string[] {
  if (!adapterConfig || typeof adapterConfig !== "object" || Array.isArray(adapterConfig)) {
    return [];
  }
  const config = adapterConfig as Record<string, unknown>;
  const warnings: string[] = [];

  for (const key of PATH_BEARING_CONFIG_KEYS) {
    const raw = config[key];
    if (typeof raw !== "string" || !raw.trim()) continue;
    const resolved = path.resolve(expandHomePrefix(raw.trim()));

    // Only the packaged macOS app is sandboxed this way.
    if (process.platform !== "darwin") continue;

    for (const dir of MACOS_SANDBOXED_DIRS) {
      if (isInside(resolved, path.join(os.homedir(), dir))) {
        warnings.push(
          `adapterConfig.${key} points inside ~/${dir}. The packaged Doer desktop app is ` +
          `signed with com.apple.provenance and macOS denies it filesystem access there (EPERM), ` +
          `so agent runs will fail at runtime. Use a path under ~/, under the Doer instance ` +
          `directory, or a memfs fs-mount binding instead.`,
        );
        break;
      }
    }
  }

  return warnings;
}

export function resolvePaperclipInstanceRoot(): string {
  return path.resolve(resolvePaperclipHomeDir(), "instances", resolvePaperclipInstanceId());
}

export function resolveDefaultConfigPath(): string {
  return path.resolve(resolvePaperclipInstanceRoot(), "config.json");
}

export function resolveDefaultEmbeddedPostgresDir(): string {
  return path.resolve(resolvePaperclipInstanceRoot(), "db");
}

export function resolveDefaultLogsDir(): string {
  return path.resolve(resolvePaperclipInstanceRoot(), "logs");
}

export function resolveDefaultSecretsKeyFilePath(): string {
  return path.resolve(resolvePaperclipInstanceRoot(), "secrets", "master.key");
}

export function resolveDefaultStorageDir(): string {
  return path.resolve(resolvePaperclipInstanceRoot(), "data", "storage");
}

export function resolveDefaultBackupDir(): string {
  return path.resolve(resolvePaperclipInstanceRoot(), "data", "backups");
}

export function resolveDefaultAgentWorkspaceDir(agentId: string): string {
  const trimmed = agentId.trim();
  if (!PATH_SEGMENT_RE.test(trimmed)) {
    throw new Error(`Invalid agent id for workspace path '${agentId}'.`);
  }
  return path.resolve(resolvePaperclipInstanceRoot(), "workspaces", "agents", trimmed);
}

export function resolveLegacyAgentWorkspaceDir(agentId: string): string {
  const trimmed = agentId.trim();
  if (!PATH_SEGMENT_RE.test(trimmed)) {
    throw new Error(`Invalid agent id for workspace path '${agentId}'.`);
  }
  return path.resolve(resolvePaperclipInstanceRoot(), "workspaces", trimmed);
}

function sanitizeFriendlyPathSegment(value: string | null | undefined, fallback = "_default"): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return fallback;
  const sanitized = trimmed
    .replace(FRIENDLY_PATH_SEGMENT_RE, "-")
    .replace(/^-+|-+$/g, "");
  return sanitized || fallback;
}

export function resolveManagedProjectWorkspaceDir(input: {
  companyId: string;
  projectId: string;
  repoName?: string | null;
}): string {
  const companyId = input.companyId.trim();
  const projectId = input.projectId.trim();
  if (!companyId || !projectId) {
    throw new Error("Managed project workspace path requires companyId and projectId.");
  }
  return path.resolve(
    resolvePaperclipInstanceRoot(),
    "projects",
    sanitizeFriendlyPathSegment(companyId, "company"),
    sanitizeFriendlyPathSegment(projectId, "project"),
    sanitizeFriendlyPathSegment(input.repoName, "_default"),
  );
}

export function resolveHomeAwarePath(value: string): string {
  return path.resolve(expandHomePrefix(value));
}

export function resolveCompanyOutputsDir(companyId: string): string {
  return path.resolve(resolvePaperclipInstanceRoot(), "companies", companyId, "outputs");
}
