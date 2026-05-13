import fs from "node:fs/promises";
import path from "node:path";
import { resolveDefaultAgentWorkspaceDir, resolveLegacyAgentWorkspaceDir } from "../home-paths.js";

const AGENT_WORKSPACE_SCHEMA_VERSION = 1;

const WORKSPACE_SUBDIRS = [
  "memory",
  "instructions",
  "skills",
  "tools",
  "runs",
  "outputs",
  "state",
] as const;

type WorkspaceSubdir = (typeof WORKSPACE_SUBDIRS)[number];

export interface AgentWorkspaceAgentRef {
  id: string;
  companyId: string;
  name: string;
  adapterConfig?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

export interface AgentWorkspaceManifest {
  schemaVersion: number;
  agentId: string;
  companyId: string;
  agentName: string;
  lettaAgentId: string | null;
  managedHosted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgentWorkspaceSummary {
  agentId: string;
  companyId: string;
  rootPath: string;
  legacyRootPath: string;
  manifestPath: string;
  manifest: AgentWorkspaceManifest | null;
  lettaAgentId: string | null;
  managedHosted: boolean;
  exists: boolean;
  legacyExists: boolean;
  directories: Record<WorkspaceSubdir, { path: string; exists: boolean }>;
  warnings: string[];
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function extractLettaAgentId(agent: AgentWorkspaceAgentRef): string | null {
  const config = readRecord(agent.adapterConfig) ?? {};
  const fromConfig = readString(config.agentId) ?? readString(config.lettaAgentId);
  if (fromConfig) return fromConfig;
  const env = readRecord(config.env);
  return readString(env?.LETTA_AGENT_ID) ?? null;
}

function isManagedHosted(agent: AgentWorkspaceAgentRef): boolean {
  const metadata = readRecord(agent.metadata) ?? {};
  const config = readRecord(agent.adapterConfig) ?? {};
  return metadata.managedHosted === true || metadata.managedBy === "donjon" || config.managedHosted === true;
}

async function pathIsDirectory(dir: string) {
  return fs.stat(dir).then((stats) => stats.isDirectory()).catch(() => false);
}

async function readManifest(manifestPath: string): Promise<AgentWorkspaceManifest | null> {
  try {
    const raw = await fs.readFile(manifestPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    const record = readRecord(parsed);
    if (!record) return null;
    return {
      schemaVersion: typeof record.schemaVersion === "number" ? record.schemaVersion : 0,
      agentId: readString(record.agentId) ?? "",
      companyId: readString(record.companyId) ?? "",
      agentName: readString(record.agentName) ?? "",
      lettaAgentId: readString(record.lettaAgentId),
      managedHosted: record.managedHosted === true,
      createdAt: readString(record.createdAt) ?? new Date(0).toISOString(),
      updatedAt: readString(record.updatedAt) ?? new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

function buildPaths(agentId: string) {
  const rootPath = resolveDefaultAgentWorkspaceDir(agentId);
  const legacyRootPath = resolveLegacyAgentWorkspaceDir(agentId);
  const manifestPath = path.join(rootPath, "workspace.json");
  const directories = Object.fromEntries(
    WORKSPACE_SUBDIRS.map((key) => [key, { path: path.join(rootPath, key), exists: false }]),
  ) as AgentWorkspaceSummary["directories"];
  return { rootPath, legacyRootPath, manifestPath, directories };
}

export function agentWorkspaceService() {
  async function inspect(agent: AgentWorkspaceAgentRef): Promise<AgentWorkspaceSummary> {
    const paths = buildPaths(agent.id);
    const [exists, legacyExists, manifest] = await Promise.all([
      pathIsDirectory(paths.rootPath),
      pathIsDirectory(paths.legacyRootPath),
      readManifest(paths.manifestPath),
    ]);
    const directoryEntries = await Promise.all(
      WORKSPACE_SUBDIRS.map(async (key) => [key, {
        path: paths.directories[key].path,
        exists: await pathIsDirectory(paths.directories[key].path),
      }] as const),
    );
    const warnings: string[] = [];
    if (legacyExists) {
      warnings.push(`Legacy workspace path exists: ${paths.legacyRootPath}`);
    }
    if (!exists) warnings.push("Native agent workspace has not been created yet.");
    return {
      agentId: agent.id,
      companyId: agent.companyId,
      rootPath: paths.rootPath,
      legacyRootPath: paths.legacyRootPath,
      manifestPath: paths.manifestPath,
      manifest,
      lettaAgentId: extractLettaAgentId(agent),
      managedHosted: isManagedHosted(agent),
      exists,
      legacyExists,
      directories: Object.fromEntries(directoryEntries) as AgentWorkspaceSummary["directories"],
      warnings,
    };
  }

  async function ensure(agent: AgentWorkspaceAgentRef): Promise<AgentWorkspaceSummary> {
    const paths = buildPaths(agent.id);
    await fs.mkdir(paths.rootPath, { recursive: true });
    await Promise.all(WORKSPACE_SUBDIRS.map((key) => fs.mkdir(paths.directories[key].path, { recursive: true })));

    const existingManifest = await readManifest(paths.manifestPath);
    const now = new Date().toISOString();
    const manifest: AgentWorkspaceManifest = {
      schemaVersion: AGENT_WORKSPACE_SCHEMA_VERSION,
      agentId: agent.id,
      companyId: agent.companyId,
      agentName: agent.name,
      lettaAgentId: extractLettaAgentId(agent),
      managedHosted: isManagedHosted(agent),
      createdAt: existingManifest?.createdAt ?? now,
      updatedAt: now,
    };
    await fs.writeFile(paths.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    return inspect(agent);
  }

  return {
    inspect,
    ensure,
  };
}

export { WORKSPACE_SUBDIRS };
