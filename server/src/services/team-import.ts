import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Db } from "@doerai/db";
import type {
  TeamImportAgentResult,
  TeamImportResult,
  TeamManifest,
  TeamManifestAgent,
  TeamSummary,
} from "@doerai/shared";
import { blockFilename, unpackAgentFile } from "@doerai/adapter-letta-af-opencode/server";
import { badRequest, notFound } from "../errors.js";
import { logger } from "../middleware/logger.js";
import { agentService } from "./agents.js";
import { logActivity } from "./activity-log.js";
import { commitMemoryChanges } from "./memfs/git-history.js";
import { memfsService } from "./memfs/memfs-service.js";

/**
 * Starter Team importer — capture-the-magic Phase 2.2.
 *
 * Hires a manifest of .af agents in order, wires reportsTo by slug, unpacks
 * each agent's memory into the org's VISIBLE memory root (so the Memory tab
 * and History work day one), seeds shared coordination files under SHARED/,
 * and git-commits each hire. Heartbeats default OFF so a freshly hired team
 * never burns budget idle — the user flips them on when ready.
 */

const DEFAULT_ADAPTER_TYPE = "letta_af_opencode";
const SHARED_PREFIX = "SHARED";

/** Patterns that look like credentials. Imported memory must never carry keys. */
const SECRET_PATTERNS: RegExp[] = [
  /sk-[A-Za-z0-9_-]{20,}/g,
  /(api[_-]?key|token|secret|password)\s*[:=]\s*["']?[A-Za-z0-9_\-/.+]{16,}["']?/gi,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
];

function scrubSecrets(content: string): { content: string; found: boolean } {
  let found = false;
  let scrubbed = content;
  for (const pattern of SECRET_PATTERNS) {
    scrubbed = scrubbed.replace(pattern, () => {
      found = true;
      return "[REDACTED-ON-IMPORT]";
    });
  }
  return { content: scrubbed, found };
}

function resolveTeamsRoots(): string[] {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  return [
    path.resolve(moduleDir, "../../teams"),
    path.resolve(process.cwd(), "teams"),
    path.resolve(moduleDir, "../../../teams"),
  ];
}

function isSafeRelative(p: string): boolean {
  return !path.isAbsolute(p) && !p.split(/[\\/]/).includes("..");
}

function parseManifest(raw: string, source: string): TeamManifest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw badRequest(`team manifest is not valid JSON: ${source}`);
  }
  const m = parsed as Partial<TeamManifest>;
  if (!m || typeof m.id !== "string" || !m.id.trim()) throw badRequest(`team manifest missing 'id': ${source}`);
  if (typeof m.name !== "string" || !m.name.trim()) throw badRequest(`team manifest missing 'name': ${source}`);
  if (!Array.isArray(m.agents) || m.agents.length === 0) {
    throw badRequest(`team manifest needs a non-empty 'agents' array: ${source}`);
  }
  const slugs = new Set<string>();
  for (const a of m.agents) {
    if (!a || typeof a.slug !== "string" || !a.slug.trim()) {
      throw badRequest(`every team agent needs a 'slug': ${source}`);
    }
    if (slugs.has(a.slug)) throw badRequest(`duplicate agent slug '${a.slug}': ${source}`);
    slugs.add(a.slug);
    if (typeof a.af !== "string" || !isSafeRelative(a.af)) {
      throw badRequest(`agent '${a.slug}' needs a safe relative 'af' path: ${source}`);
    }
    if (typeof a.role !== "string" || !a.role.trim()) {
      throw badRequest(`agent '${a.slug}' needs a 'role': ${source}`);
    }
    if (a.reportsTo != null && !slugs.has(a.reportsTo)) {
      throw badRequest(
        `agent '${a.slug}' reportsTo '${a.reportsTo}' which is not an earlier team member — order matters: ${source}`,
      );
    }
  }
  return m as TeamManifest;
}

async function findTeamDir(teamId: string): Promise<string | null> {
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(teamId)) return null;
  for (const root of resolveTeamsRoots()) {
    const dir = path.join(root, teamId);
    const manifest = path.join(dir, "team.json");
    try {
      await fs.access(manifest);
      return dir;
    } catch {
      // keep looking
    }
  }
  return null;
}

async function loadManifestFromDir(dir: string): Promise<TeamManifest> {
  const manifestPath = path.join(dir, "team.json");
  const raw = await fs.readFile(manifestPath, "utf8");
  return parseManifest(raw, manifestPath);
}

export function teamImportService(db: Db) {
  const agents = agentService(db);
  const memfs = memfsService(db);

  async function listTeams(): Promise<TeamSummary[]> {
    const summaries = new Map<string, TeamSummary>();
    for (const root of resolveTeamsRoots()) {
      let entries: string[] = [];
      try {
        entries = await fs.readdir(root);
      } catch {
        continue;
      }
      for (const entry of entries) {
        if (summaries.has(entry)) continue;
        const dir = path.join(root, entry);
        let manifest: TeamManifest;
        try {
          manifest = await loadManifestFromDir(dir);
        } catch {
          continue;
        }
        const missingFiles: string[] = [];
        for (const a of manifest.agents) {
          try {
            await fs.access(path.join(dir, a.af));
          } catch {
            missingFiles.push(a.af);
          }
        }
        summaries.set(entry, {
          id: manifest.id,
          name: manifest.name,
          description: manifest.description ?? null,
          agentCount: manifest.agents.length,
          agentNames: manifest.agents.map((a) => a.name ?? a.slug),
          packs: manifest.packs ?? [],
          ready: missingFiles.length === 0,
          missingFiles,
        });
      }
    }
    return Array.from(summaries.values()).sort((a, b) => a.id.localeCompare(b.id));
  }

  async function importAgent(
    companyId: string,
    teamDir: string,
    manifest: TeamManifest,
    entry: TeamManifestAgent,
    reportsToId: string | null,
  ): Promise<TeamImportAgentResult> {
    const warnings: string[] = [];
    const afPath = path.join(teamDir, entry.af);

    const created = await agents.create(companyId, {
      name: entry.name ?? entry.slug,
      role: entry.role,
      title: entry.title ?? null,
      reportsTo: reportsToId,
      adapterType: entry.adapterType ?? manifest.defaultAdapterType ?? DEFAULT_ADAPTER_TYPE,
      adapterConfig: { afPath, ...(entry.adapterConfig ?? {}) },
      // Conservative by default: a freshly hired team must not burn budget
      // idle. The user enables heartbeats per agent when ready.
      runtimeConfig: { heartbeat: { enabled: false } },
      status: "idle",
      spentMonthlyCents: 0,
      lastHeartbeatAt: null,
    });

    // Memory home in the org's visible root: ~/Doer/<org>/memory/agents/<slug>
    const binding = await memfs.ensureDefaultAgentMemoryBinding(companyId, created.id, {
      agentSlug: entry.slug,
    });
    if (!binding) {
      warnings.push(`No memory binding could be created for '${entry.slug}'.`);
      return {
        slug: entry.slug,
        agentId: created.id,
        name: created.name,
        memoryPathPrefix: "",
        warnings,
      };
    }

    const memoryDir = path.join(binding.rootPath, ...binding.pathPrefix.split("/"));
    const { snapshot } = await unpackAgentFile(afPath, memoryDir);

    // Never let imported memory carry credentials.
    for (const block of snapshot.blocks) {
      const filePath = path.join(memoryDir, blockFilename(block.label));
      try {
        const content = await fs.readFile(filePath, "utf8");
        const scrubbed = scrubSecrets(content);
        if (scrubbed.found) {
          await fs.writeFile(filePath, scrubbed.content, "utf8");
          warnings.push(
            `Memory block '${block.label}' of '${entry.slug}' contained something that looked like a credential — redacted on import.`,
          );
        }
      } catch {
        // unreadable block file — skip scrub
      }
    }

    // Patch adapter config the same way the single-agent hire hook does, but
    // pointed at the visible memory home instead of a hidden ~/.doer path.
    await agents.update(created.id, {
      adapterConfig: {
        afPath,
        ...(entry.adapterConfig ?? {}),
        memoryDir,
        agentName: snapshot.name,
        model:
          (entry.adapterConfig?.model as string | undefined) ??
          (snapshot.model !== "unknown" ? snapshot.model : undefined),
        systemPrompt: snapshot.system ?? "",
        memoryBlockLabels: snapshot.blocks.map((b) => b.label),
      },
    });

    await commitMemoryChanges(
      binding.rootPath,
      `hired ${created.name} (team ${manifest.id})`,
      binding.pathPrefix,
    );

    return {
      slug: entry.slug,
      agentId: created.id,
      name: created.name,
      memoryPathPrefix: binding.pathPrefix,
      warnings,
    };
  }

  async function seedSharedBlocks(
    companyId: string,
    manifest: TeamManifest,
    agentIds: string[],
  ): Promise<{ sharedPathPrefix: string | null; warnings: string[] }> {
    const blocks = manifest.sharedBlocks ?? [];
    if (blocks.length === 0) return { sharedPathPrefix: null, warnings: [] };
    const warnings: string[] = [];

    const root = await memfs.ensureDefaultVisibleRoot(companyId);
    const sharedDir = path.join(root.rootPath, SHARED_PREFIX);
    await fs.mkdir(sharedDir, { recursive: true });

    for (const block of blocks) {
      const slug = block.replace(/[^a-z0-9_-]+/gi, "_");
      const filePath = path.join(sharedDir, `${slug}.md`);
      const stub = [
        `# ${block}`,
        "",
        `> Shared coordination block for team '${manifest.id}'.`,
        "> Agents write here by convention — direction flows down, documentation flows up.",
        "",
      ].join("\n");
      await fs.writeFile(filePath, stub, { flag: "wx" }).catch(() => {
        // already exists — never clobber live coordination state
      });
    }

    // Every team member gets a read-write binding to SHARED so the
    // delegation chain has a home. Conflicts (already bound) are fine.
    for (const agentId of agentIds) {
      try {
        await memfs.createBinding(companyId, {
          agentId,
          rootId: root.id,
          pathPrefix: SHARED_PREFIX,
          strategy: "fs-mount",
          permission: "read-write",
          mountAs: "shared",
          label: "shared",
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes("already exists")) {
          warnings.push(`Could not bind SHARED for agent ${agentId}: ${msg}`);
        }
      }
    }

    await commitMemoryChanges(
      root.rootPath,
      `seed shared blocks (team ${manifest.id})`,
      SHARED_PREFIX,
    );
    return { sharedPathPrefix: SHARED_PREFIX, warnings };
  }

  async function importTeam(
    companyId: string,
    teamId: string,
    actor: { actorType: "user" | "agent" | "system"; actorId: string; agentId: string | null },
  ): Promise<TeamImportResult> {
    const teamDir = await findTeamDir(teamId);
    if (!teamDir) throw notFound(`team '${teamId}' not found in any teams directory`);
    const manifest = await loadManifestFromDir(teamDir);

    const results: TeamImportAgentResult[] = [];
    const idBySlug = new Map<string, string>();

    for (const entry of manifest.agents) {
      const reportsToId = entry.reportsTo ? (idBySlug.get(entry.reportsTo) ?? null) : null;
      let result: TeamImportAgentResult;
      try {
        result = await importAgent(companyId, teamDir, manifest, entry, reportsToId);
      } catch (err) {
        // No partial teams: terminate anything we already hired, then rethrow.
        for (const hired of results) {
          await agents
            .update(hired.agentId, { status: "terminated" })
            .catch(() => undefined);
        }
        logger.warn(
          { companyId, teamId: manifest.id, failedSlug: entry.slug, rolledBack: results.length },
          "team import failed; hired agents terminated",
        );
        throw err;
      }
      idBySlug.set(entry.slug, result.agentId);
      results.push(result);

      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        action: "agent.hired_from_team",
        entityType: "agent",
        entityId: result.agentId,
        details: {
          teamId: manifest.id,
          slug: result.slug,
          name: result.name,
          memoryPathPrefix: result.memoryPathPrefix,
          warnings: result.warnings,
        },
      });
    }

    const shared = await seedSharedBlocks(
      companyId,
      manifest,
      results.map((r) => r.agentId),
    );

    const importResult: TeamImportResult = {
      teamId: manifest.id,
      companyId,
      agents: results,
      sharedPathPrefix: shared.sharedPathPrefix,
      warnings: [...shared.warnings],
    };

    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "team.imported",
      entityType: "company",
      entityId: companyId,
      details: {
        teamId: manifest.id,
        agentCount: results.length,
        agentIds: results.map((r) => r.agentId),
        warnings: importResult.warnings,
      },
    });

    logger.info(
      { companyId, teamId: manifest.id, agentCount: results.length },
      "team import complete",
    );
    return importResult;
  }

  return { listTeams, importTeam };
}

export type TeamImportService = ReturnType<typeof teamImportService>;
