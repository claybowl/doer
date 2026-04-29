import { and, asc, eq } from "drizzle-orm";
import type { Db } from "@doerai/db";
import { agents, memfsBindings, memfsRoots } from "@doerai/db";
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

type MemfsRootRow = typeof memfsRoots.$inferSelect;
type MemfsBindingRow = typeof memfsBindings.$inferSelect;

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

  async function requireAgentForCompany(companyId: string, agentId: string): Promise<string> {
    const row = await db
      .select({ id: agents.id, companyId: agents.companyId })
      .from(agents)
      .where(eq(agents.id, agentId))
      .then((rows) => rows[0] ?? null);
    if (!row || row.companyId !== companyId) {
      throw notFound(`agent ${agentId} not found for company ${companyId}`);
    }
    return row.id;
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
    // ---- Roots ----

    listRoots: async (companyId: string): Promise<MemfsRootDTO[]> => {
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
      data: { kind?: MemfsRootKind; rootPath: string; label?: string },
    ): Promise<MemfsRootDTO> => {
      const rootPath = data.rootPath.trim();
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
      if (data.rootPath !== undefined) patch.rootPath = data.rootPath.trim();
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
      await requireAgentForCompany(companyId, agentId);
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
        pathPrefix: string;
        strategy?: MemfsStrategy;
        permission?: MemfsPermission;
        mountAs?: string | null;
        label?: string | null;
      },
    ): Promise<ResolvedMemfsBinding> => {
      await requireAgentForCompany(companyId, data.agentId);
      const root = await requireRootForCompany(companyId, data.rootId);

      const existing = await db
        .select()
        .from(memfsBindings)
        .where(
          and(
            eq(memfsBindings.agentId, data.agentId),
            eq(memfsBindings.rootId, data.rootId),
            eq(memfsBindings.pathPrefix, data.pathPrefix),
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
          pathPrefix: data.pathPrefix,
          strategy: data.strategy ?? "fs-mount",
          permission: data.permission ?? "read",
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
  };
}

export type MemfsService = ReturnType<typeof memfsService>;
