import os from "node:os";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { and, asc, eq } from "drizzle-orm";
import type { Db } from "@doerai/db";
import { agents, companies, memfsBindings, memfsRoots } from "@doerai/db";
import type {
  MemfsBindingDTO,
  MemfsFileEntry,
  MemfsPermission,
  MemfsRootDTO,
  MemfsRootKind,
  MemfsStrategy,
  ResolvedMemfsBinding,
} from "@doerai/shared";
import { badRequest, conflict, notFound } from "../../errors.js";
import { LocalFsStore, type MemfsStore } from "./store.js";
import {
  commitMemoryChanges,
  getMemoryCommitDiff,
  listMemoryHistory,
  type MemoryCommit,
} from "./git-history.js";

const MAX_MEMORY_FILE_WRITE_BYTES = 512 * 1024;

type MemfsRootRow = typeof memfsRoots.$inferSelect;
type MemfsBindingRow = typeof memfsBindings.$inferSelect;
type AgentRow = typeof agents.$inferSelect;

const DEFAULT_LETTA_ROOT = path.join(os.homedir(), ".letta");

/**
 * Visible, predictable default memory location for an org:
 * `~/Doer/<org-slug>/memory`. Replaces the hidden `.letta-memory` default for
 * fs-mount agents. Letta-native agents keep DEFAULT_LETTA_ROOT (Letta owns
 * those reads/writes). See doc/plans/2026-06-09-capture-the-magic.md §1.1.
 */
function defaultVisibleRootPath(companyName: string): string {
  const slug =
    companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "company";
  return path.join(os.homedir(), "Doer", slug, "memory");
}

const SEED_AGENTS_MD = `# Working Memory

> This is your memory index. Keep it short and current — one line per pointer.
> Protocol: read this file first every run; update it before finishing.

## Me

(who you are — see persona.md once it exists)

## Projects

(nothing yet)

## People

(nothing yet)

## Terms

(nothing yet)
`;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeRootPath(input: string | undefined): string {
  const raw = (input ?? "").trim();
  if (!raw) return DEFAULT_LETTA_ROOT;
  if (raw === "~") return os.homedir();
  if (raw.startsWith("~/")) return path.join(os.homedir(), raw.slice(2));
  return raw;
}

export function extractLettaAgentId(agent: Pick<AgentRow, "adapterType" | "adapterConfig">): string | null {
  const config = asRecord(agent.adapterConfig);
  const directAgentId = asNonEmptyString(config?.lettaAgentId) ?? asNonEmptyString(config?.agentId);
  if (agent.adapterType === "letta_cloud" && directAgentId) return directAgentId;

  const env = asRecord(config?.env);
  const envAgentId = asNonEmptyString(env?.LETTA_AGENT_ID);
  return directAgentId ?? envAgentId;
}

function toMemfsRoot(row: MemfsRootRow): MemfsRootDTO {
  return {
    id: row.id,
    companyId: row.companyId,
    kind: row.kind as MemfsRootKind,
    rootPath: row.rootPath,
    label: row.label,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toMemfsBinding(row: MemfsBindingRow): MemfsBindingDTO {
  return {
    id: row.id,
    agentId: row.agentId,
    rootId: row.rootId,
    pathPrefix: row.pathPrefix,
    strategy: row.strategy as MemfsStrategy,
    permission: row.permission as MemfsPermission,
    mountAs: row.mountAs ?? null,
    label: row.label ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toResolvedBinding(binding: MemfsBindingRow, root: MemfsRootRow): ResolvedMemfsBinding {
  return {
    ...toMemfsBinding(binding),
    rootPath: root.rootPath,
    rootKind: root.kind as MemfsRootKind,
    rootLabel: root.label,
  };
}

/**
 * Build a MemfsStore instance for a given root row. V1 only knows about
 * local filesystem roots; future kinds (`mcp`, `git-hosted`) will dispatch here.
 */
export function buildStoreForRoot(root: MemfsRootRow): MemfsStore {
  switch (root.kind) {
    case "local-fs":
      return new LocalFsStore(root.rootPath);
    default:
      throw badRequest(`unsupported memfs root kind: ${root.kind}`);
  }
}

export interface MemfsServiceFileFilter {
  prefix?: string;
  recursive?: boolean;
}

export function memfsService(db: Db) {
  async function requireRootForCompany(companyId: string, rootId: string): Promise<MemfsRootRow> {
    const row = await db
      .select()
      .from(memfsRoots)
      .where(and(eq(memfsRoots.id, rootId), eq(memfsRoots.companyId, companyId)))
      .then((rows) => rows[0] ?? null);
    if (!row) throw notFound(`memfs root ${rootId} not found for company ${companyId}`);
    return row;
  }

  async function requireAgentForCompany(companyId: string, agentId: string): Promise<AgentRow> {
    const row = await db
      .select()
      .from(agents)
      .where(eq(agents.id, agentId))
      .then((rows) => rows[0] ?? null);
    if (!row || row.companyId !== companyId) {
      throw notFound(`agent ${agentId} not found for company ${companyId}`);
    }
    return row;
  }

  async function ensureDefaultRoot(companyId: string): Promise<MemfsRootRow> {
    const existing = await db
      .select()
      .from(memfsRoots)
      .where(and(eq(memfsRoots.companyId, companyId), eq(memfsRoots.rootPath, DEFAULT_LETTA_ROOT)))
      .orderBy(asc(memfsRoots.createdAt))
      .then((rows) => rows[0] ?? null);
    if (existing) return existing;

    const inserted = await db
      .insert(memfsRoots)
      .values({
        companyId,
        kind: "local-fs",
        rootPath: DEFAULT_LETTA_ROOT,
        label: "letta",
      })
      .returning()
      .then((rows) => rows[0] ?? null);

    if (inserted) return inserted;
    const fallback = await db
      .select()
      .from(memfsRoots)
      .where(and(eq(memfsRoots.companyId, companyId), eq(memfsRoots.rootPath, DEFAULT_LETTA_ROOT)))
      .orderBy(asc(memfsRoots.createdAt))
      .then((rows) => rows[0] ?? null);
    if (!fallback) throw conflict(`failed to ensure default memfs root for company ${companyId}`);
    return fallback;
  }

  async function ensureDefaultVisibleRoot(companyId: string): Promise<MemfsRootRow> {
    const company = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .then((rows) => rows[0] ?? null);
    if (!company) throw notFound(`company ${companyId} not found`);

    const rootPath = defaultVisibleRootPath(company.name);
    const existing = await db
      .select()
      .from(memfsRoots)
      .where(and(eq(memfsRoots.companyId, companyId), eq(memfsRoots.rootPath, rootPath)))
      .orderBy(asc(memfsRoots.createdAt))
      .then((rows) => rows[0] ?? null);
    if (existing) return existing;

    await mkdir(rootPath, { recursive: true });
    const inserted = await db
      .insert(memfsRoots)
      .values({
        companyId,
        kind: "local-fs",
        rootPath,
        label: "memory",
      })
      .returning()
      .then((rows) => rows[0] ?? null);
    if (inserted) return inserted;

    const fallback = await db
      .select()
      .from(memfsRoots)
      .where(and(eq(memfsRoots.companyId, companyId), eq(memfsRoots.rootPath, rootPath)))
      .orderBy(asc(memfsRoots.createdAt))
      .then((rows) => rows[0] ?? null);
    if (!fallback) throw conflict(`failed to ensure default visible memfs root for company ${companyId}`);
    return fallback;
  }

  /**
   * Give a newly created fs-mount agent its memory home: a namespaced folder
   * under the org's visible memory root, seeded with an AGENTS.md stub, bound
   * read-write and mounted as `memory`. Idempotent; returns the existing
   * binding when one is already present for this agent on the visible root.
   */
  async function ensureDefaultAgentMemoryBinding(
    companyId: string,
    agentId: string,
    options: { agentSlug?: string } = {},
  ): Promise<ResolvedMemfsBinding | null> {
    const agent = await requireAgentForCompany(companyId, agentId);
    const root = await ensureDefaultVisibleRoot(companyId);

    const existingForRoot = await db
      .select()
      .from(memfsBindings)
      .where(and(eq(memfsBindings.agentId, agent.id), eq(memfsBindings.rootId, root.id)))
      .then((rows) => rows[0] ?? null);
    if (existingForRoot) return toResolvedBinding(existingForRoot, root);

    const slugBase =
      options.agentSlug?.trim() ||
      agent.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48) ||
      "agent";

    // Human-readable namespace; suffix with a short id only on collision.
    let pathPrefix = path.posix.join("agents", slugBase);
    const collision = await db
      .select()
      .from(memfsBindings)
      .where(and(eq(memfsBindings.rootId, root.id), eq(memfsBindings.pathPrefix, pathPrefix)))
      .then((rows) => rows[0] ?? null);
    if (collision && collision.agentId !== agent.id) {
      pathPrefix = path.posix.join("agents", `${slugBase}-${agent.id.slice(0, 8)}`);
    }

    const memoryDir = path.join(root.rootPath, ...pathPrefix.split("/"));
    await mkdir(memoryDir, { recursive: true });
    await writeFile(path.join(memoryDir, "AGENTS.md"), SEED_AGENTS_MD, { flag: "wx" }).catch(() => {
      // Already seeded — leave existing memory untouched.
    });

    const inserted = await db
      .insert(memfsBindings)
      .values({
        agentId: agent.id,
        rootId: root.id,
        pathPrefix,
        strategy: "fs-mount",
        permission: "read-write",
        mountAs: "memory",
        label: "memory",
      })
      .returning()
      .then((rows) => rows[0] ?? null);
    return inserted ? toResolvedBinding(inserted, root) : null;
  }

  async function ensureAutomaticLettaBinding(companyId: string, agentId: string): Promise<ResolvedMemfsBinding | null> {
    const agent = await requireAgentForCompany(companyId, agentId);
    const lettaAgentId = extractLettaAgentId(agent);
    if (!lettaAgentId) return null;

    const root = await ensureDefaultRoot(companyId);
    // Local-backend agents (created via `letta --backend local agents create`)
    // always get IDs prefixed "agent-local-" and live under a different MemFS
    // root than Letta Cloud clones — without this branch every local-backend
    // agent got a binding pointing at a cloud path that never exists.
    const pathPrefix = lettaAgentId.startsWith("agent-local-")
      ? path.posix.join("lc-local-backend", "memfs", lettaAgentId, "memory")
      : path.posix.join("agents", lettaAgentId, "memory");

    const existing = await db
      .select()
      .from(memfsBindings)
      .where(
        and(
          eq(memfsBindings.agentId, agent.id),
          eq(memfsBindings.rootId, root.id),
          eq(memfsBindings.pathPrefix, pathPrefix),
        ),
      )
      .then((rows) => rows[0] ?? null);
    if (existing) return toResolvedBinding(existing, root);

    const inserted = await db
      .insert(memfsBindings)
      .values({
        agentId: agent.id,
        rootId: root.id,
        pathPrefix,
        strategy: "fs-mount",
        permission: "read",
        mountAs: ".letta-memory",
        label: "letta",
      })
      .returning()
      .then((rows) => rows[0] ?? null);

    if (inserted) return toResolvedBinding(inserted, root);
    const fallback = await db
      .select()
      .from(memfsBindings)
      .where(
        and(
          eq(memfsBindings.agentId, agent.id),
          eq(memfsBindings.rootId, root.id),
          eq(memfsBindings.pathPrefix, pathPrefix),
        ),
      )
      .then((rows) => rows[0] ?? null);
    return fallback ? toResolvedBinding(fallback, root) : null;
  }

  async function requireBindingForCompany(
    companyId: string,
    bindingId: string,
  ): Promise<{ binding: MemfsBindingRow; root: MemfsRootRow }> {
    const rows = await db
      .select({ binding: memfsBindings, root: memfsRoots, agentCompanyId: agents.companyId })
      .from(memfsBindings)
      .innerJoin(memfsRoots, eq(memfsBindings.rootId, memfsRoots.id))
      .innerJoin(agents, eq(memfsBindings.agentId, agents.id))
      .where(eq(memfsBindings.id, bindingId));
    const row = rows[0] ?? null;
    if (!row || row.agentCompanyId !== companyId || row.root.companyId !== companyId) {
      throw notFound(`memfs binding ${bindingId} not found for company ${companyId}`);
    }
    return { binding: row.binding, root: row.root };
  }

  return {
    ensureAutomaticLettaBinding,
    ensureDefaultVisibleRoot: async (companyId: string): Promise<MemfsRootDTO> =>
      toMemfsRoot(await ensureDefaultVisibleRoot(companyId)),
    ensureDefaultAgentMemoryBinding,

    // ---- Roots ----

    listRoots: async (companyId: string): Promise<MemfsRootDTO[]> => {
      await ensureDefaultRoot(companyId);
      const rows = await db
        .select()
        .from(memfsRoots)
        .where(eq(memfsRoots.companyId, companyId))
        .orderBy(asc(memfsRoots.createdAt));
      return rows.map(toMemfsRoot);
    },

    getRoot: async (companyId: string, rootId: string): Promise<MemfsRootDTO> => {
      const row = await requireRootForCompany(companyId, rootId);
      return toMemfsRoot(row);
    },

    createRoot: async (
      companyId: string,
      data: { kind?: MemfsRootKind; rootPath?: string; label?: string },
    ): Promise<MemfsRootDTO> => {
      const rootPath = normalizeRootPath(data.rootPath);
      if (rootPath.length === 0) throw badRequest("rootPath must not be empty");

      const existing = await db
        .select()
        .from(memfsRoots)
        .where(and(eq(memfsRoots.companyId, companyId), eq(memfsRoots.rootPath, rootPath)))
        .then((rows) => rows[0] ?? null);
      if (existing) {
        throw conflict(`memfs root already registered for path: ${rootPath}`, {
          existingRootId: existing.id,
        });
      }

      const inserted = await db
        .insert(memfsRoots)
        .values({
          companyId,
          kind: data.kind ?? "local-fs",
          rootPath,
          label: data.label ?? "letta",
        })
        .returning();
      return toMemfsRoot(inserted[0]!);
    },

    updateRoot: async (
      companyId: string,
      rootId: string,
      data: Partial<{ kind: MemfsRootKind; rootPath: string; label: string }>,
    ): Promise<MemfsRootDTO> => {
      await requireRootForCompany(companyId, rootId);
      const patch: Partial<typeof memfsRoots.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (data.kind !== undefined) patch.kind = data.kind;
      if (data.rootPath !== undefined) patch.rootPath = normalizeRootPath(data.rootPath);
      if (data.label !== undefined) patch.label = data.label;
      const updated = await db
        .update(memfsRoots)
        .set(patch)
        .where(and(eq(memfsRoots.id, rootId), eq(memfsRoots.companyId, companyId)))
        .returning();
      return toMemfsRoot(updated[0]!);
    },

    removeRoot: async (companyId: string, rootId: string): Promise<void> => {
      await requireRootForCompany(companyId, rootId);
      await db
        .delete(memfsRoots)
        .where(and(eq(memfsRoots.id, rootId), eq(memfsRoots.companyId, companyId)));
    },

    // ---- Bindings ----

    listBindingsForCompany: async (companyId: string): Promise<ResolvedMemfsBinding[]> => {
      const companyAgents = await db
        .select({ id: agents.id })
        .from(agents)
        .where(eq(agents.companyId, companyId));
      for (const companyAgent of companyAgents) {
        await ensureAutomaticLettaBinding(companyId, companyAgent.id);
      }

      const rows = await db
        .select({ binding: memfsBindings, root: memfsRoots })
        .from(memfsBindings)
        .innerJoin(memfsRoots, eq(memfsBindings.rootId, memfsRoots.id))
        .innerJoin(agents, eq(memfsBindings.agentId, agents.id))
        .where(eq(agents.companyId, companyId))
        .orderBy(asc(memfsBindings.createdAt));
      return rows
        .filter((r) => r.root.companyId === companyId)
        .map((r) => toResolvedBinding(r.binding, r.root));
    },

    listBindingsForAgent: async (
      companyId: string,
      agentId: string,
    ): Promise<ResolvedMemfsBinding[]> => {
      await ensureAutomaticLettaBinding(companyId, agentId);
      const rows = await db
        .select({ binding: memfsBindings, root: memfsRoots })
        .from(memfsBindings)
        .innerJoin(memfsRoots, eq(memfsBindings.rootId, memfsRoots.id))
        .where(eq(memfsBindings.agentId, agentId))
        .orderBy(asc(memfsBindings.createdAt));
      return rows
        .filter((r) => r.root.companyId === companyId)
        .map((r) => toResolvedBinding(r.binding, r.root));
    },

    getBinding: async (companyId: string, bindingId: string): Promise<ResolvedMemfsBinding> => {
      const { binding, root } = await requireBindingForCompany(companyId, bindingId);
      return toResolvedBinding(binding, root);
    },

    createBinding: async (
      companyId: string,
      data: {
        agentId: string;
        rootId: string;
        pathPrefix?: string;
        strategy?: MemfsStrategy;
        permission?: MemfsPermission;
        mountAs?: string | null;
        label?: string | null;
      },
    ): Promise<ResolvedMemfsBinding> => {
      const agent = await requireAgentForCompany(companyId, data.agentId);
      const root = await requireRootForCompany(companyId, data.rootId);
      const computedPathPrefix = data.pathPrefix?.trim() || (() => {
        const lettaAgentId = extractLettaAgentId(agent);
        return lettaAgentId ? path.posix.join("agents", lettaAgentId, "memory") : "";
      })();
      if (!computedPathPrefix) {
        throw badRequest("pathPrefix is required (or configure a Letta agentId on this agent for automatic path binding)");
      }

      const existing = await db
        .select()
        .from(memfsBindings)
        .where(
          and(
            eq(memfsBindings.agentId, data.agentId),
            eq(memfsBindings.rootId, data.rootId),
            eq(memfsBindings.pathPrefix, computedPathPrefix),
          ),
        )
        .then((rows) => rows[0] ?? null);
      if (existing) {
        throw conflict("memfs binding already exists for (agent, root, pathPrefix)", {
          existingBindingId: existing.id,
        });
      }

      const inserted = await db
        .insert(memfsBindings)
        .values({
          agentId: data.agentId,
          rootId: data.rootId,
          pathPrefix: computedPathPrefix,
          strategy: data.strategy ?? "fs-mount",
          // A binding only grants access under its own pathPrefix — the
          // agent's namespace by construction — so writes default on. This is
          // what lets memory actually change after a run ("capture the magic"
          // Phase 1.2). The automatic Letta binding stays read-only above:
          // Letta's runtime owns those writes.
          permission: data.permission ?? "read-write",
          mountAs: data.mountAs ?? null,
          label: data.label ?? null,
        })
        .returning();
      return toResolvedBinding(inserted[0]!, root);
    },

    updateBinding: async (
      companyId: string,
      bindingId: string,
      data: Partial<{
        pathPrefix: string;
        strategy: MemfsStrategy;
        permission: MemfsPermission;
        mountAs: string | null;
        label: string | null;
      }>,
    ): Promise<ResolvedMemfsBinding> => {
      const { binding, root } = await requireBindingForCompany(companyId, bindingId);
      const patch: Partial<typeof memfsBindings.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (data.pathPrefix !== undefined) patch.pathPrefix = data.pathPrefix;
      if (data.strategy !== undefined) patch.strategy = data.strategy;
      if (data.permission !== undefined) patch.permission = data.permission;
      if (data.mountAs !== undefined) patch.mountAs = data.mountAs;
      if (data.label !== undefined) patch.label = data.label;
      const updated = await db
        .update(memfsBindings)
        .set(patch)
        .where(eq(memfsBindings.id, binding.id))
        .returning();
      return toResolvedBinding(updated[0]!, root);
    },

    removeBinding: async (companyId: string, bindingId: string): Promise<void> => {
      const { binding } = await requireBindingForCompany(companyId, bindingId);
      await db.delete(memfsBindings).where(eq(memfsBindings.id, binding.id));
    },

    // ---- Files (read-through via MemfsStore) ----

    listFiles: async (
      companyId: string,
      rootId: string,
      filter: MemfsServiceFileFilter = {},
    ): Promise<MemfsFileEntry[]> => {
      const root = await requireRootForCompany(companyId, rootId);
      const store = buildStoreForRoot(root);
      return store.list(filter.prefix ?? "", { recursive: filter.recursive === true });
    },

    readFile: async (companyId: string, rootId: string, relPath: string): Promise<Buffer> => {
      const root = await requireRootForCompany(companyId, rootId);
      const store = buildStoreForRoot(root);
      return store.read(relPath);
    },

    statFile: async (
      companyId: string,
      rootId: string,
      relPath: string,
    ): Promise<MemfsFileEntry | null> => {
      const root = await requireRootForCompany(companyId, rootId);
      const store = buildStoreForRoot(root);
      return store.stat(relPath);
    },

    // ---- Writes + history (capture-the-magic Phase 1.3 / 1.4) ----

    writeFile: async (
      companyId: string,
      rootId: string,
      relPath: string,
      content: string,
      options: { commitMessage?: string } = {},
    ): Promise<{ entry: MemfsFileEntry | null; commitSha: string | null }> => {
      const root = await requireRootForCompany(companyId, rootId);
      const store = buildStoreForRoot(root);
      if (!store.write) {
        throw badRequest(`memfs root kind ${root.kind} does not support writes`);
      }
      if (Buffer.byteLength(content, "utf8") > MAX_MEMORY_FILE_WRITE_BYTES) {
        throw badRequest(
          `memory file exceeds the ${MAX_MEMORY_FILE_WRITE_BYTES / 1024}KB write limit`,
        );
      }
      await store.write(relPath, content);
      const commitSha = await commitMemoryChanges(
        root.rootPath,
        options.commitMessage?.trim() || `memory: update ${relPath}`,
        relPath,
      );
      return { entry: await store.stat(relPath), commitSha };
    },

    listHistory: async (
      companyId: string,
      rootId: string,
      options: { pathScope?: string; limit?: number } = {},
    ): Promise<MemoryCommit[]> => {
      const root = await requireRootForCompany(companyId, rootId);
      if (root.kind !== "local-fs") return [];
      return listMemoryHistory(root.rootPath, options);
    },

    getCommitDiff: async (
      companyId: string,
      rootId: string,
      sha: string,
      options: { pathScope?: string } = {},
    ): Promise<string | null> => {
      const root = await requireRootForCompany(companyId, rootId);
      if (root.kind !== "local-fs") return null;
      return getMemoryCommitDiff(root.rootPath, sha, options);
    },
  };
}

export type MemfsService = ReturnType<typeof memfsService>;
