import { and, desc, eq, isNull } from "drizzle-orm";
import type { Db } from "@doerai/db";
import { deliverables } from "@doerai/db";
import type {
  Deliverable,
  DeliverableKind,
  DeliverableListQuery,
  UpdateDeliverablePayload,
} from "@doerai/shared";
import { notFound } from "../errors.js";

/**
 * Deliverable service — DB-only concerns.
 *
 * Follows the split used by `assetService` + routes/assets.ts: the service
 * owns the `deliverables` row (insert/update/query/soft-delete), while
 * routes coordinate between the generic `StorageService` (for the actual
 * file bytes) and this service. Keeping storage out of here means the
 * service is trivially testable against a fake Db and doesn't need to
 * know whether bytes live on local disk, S3, or a mock.
 *
 * Scope invariant: every read here filters by `companyId` where relevant.
 * Routes additionally call `assertCompanyAccess(req, companyId)` before
 * calling in, so by the time we hit these methods we've already confirmed
 * the caller is allowed to see this company's data.
 */

type DeliverableRow = typeof deliverables.$inferSelect;
type DeliverableInsert = typeof deliverables.$inferInsert;

function rowToDto(row: DeliverableRow): Deliverable {
  return {
    id: row.id,
    companyId: row.companyId,
    projectId: row.projectId,
    issueId: row.issueId,
    routineRunId: row.routineRunId,
    producedByAgentId: row.producedByAgentId,
    producedByRunId: row.producedByRunId,
    kind: row.kind as DeliverableKind,
    filename: row.filename,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    checksumSha256: row.checksumSha256,
    storagePath: row.storagePath,
    title: row.title,
    description: row.description,
    clientVisible: row.clientVisible,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    producedAt: row.producedAt,
    promotedAt: row.promotedAt,
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Fields the route assembles from the multipart upload + metadata. The
 * route calls `storage.putFile(...)` first, then hands us the result
 * (objectKey → storagePath, sizeBytes, sha256, contentType) merged with
 * the agent-provided metadata.
 */
export interface CreateDeliverableInput {
  companyId: string;

  kind: DeliverableKind;
  filename: string;
  contentType: string;
  sizeBytes: number;
  checksumSha256: string;
  storagePath: string; // objectKey from storage.putFile

  title: string;
  description: string | null;

  projectId: string | null;
  issueId: string | null;
  routineRunId: string | null;
  producedByAgentId: string | null;
  producedByRunId: string | null;

  metadata: Record<string, unknown>;
}

export function deliverableService(db: Db) {
  return {
    /**
     * Insert a new deliverable row. Idempotent on `storagePath`: if the
     * unique index fires, the post-run scanner can call this without
     * fear of double-promotion.
     */
    create: async (input: CreateDeliverableInput): Promise<Deliverable> => {
      const row: DeliverableInsert = {
        companyId: input.companyId,
        projectId: input.projectId,
        issueId: input.issueId,
        routineRunId: input.routineRunId,
        producedByAgentId: input.producedByAgentId,
        producedByRunId: input.producedByRunId,
        kind: input.kind,
        filename: input.filename,
        contentType: input.contentType,
        sizeBytes: input.sizeBytes,
        checksumSha256: input.checksumSha256,
        storagePath: input.storagePath,
        title: input.title,
        description: input.description,
        metadata: input.metadata,
        // clientVisible defaults false at the schema level; we don't override.
      };

      const inserted = await db
        .insert(deliverables)
        .values(row)
        .returning()
        .then((rows) => rows[0]);
      if (!inserted) {
        throw new Error("Failed to insert deliverable");
      }
      return rowToDto(inserted);
    },

    /**
     * List deliverables for a company. Filters are AND'd. By default hides
     * soft-deleted rows (`deletedAt IS NULL`); set `includeDeleted=true`
     * to see everything.
     */
    list: async (
      companyId: string,
      filters: DeliverableListQuery = {},
    ): Promise<Deliverable[]> => {
      const conditions = [eq(deliverables.companyId, companyId)];
      if (filters.projectId) {
        conditions.push(eq(deliverables.projectId, filters.projectId));
      }
      if (filters.issueId) {
        conditions.push(eq(deliverables.issueId, filters.issueId));
      }
      if (filters.agentId) {
        conditions.push(eq(deliverables.producedByAgentId, filters.agentId));
      }
      if (filters.kind) {
        conditions.push(eq(deliverables.kind, filters.kind));
      }
      if (filters.clientVisible !== undefined) {
        conditions.push(eq(deliverables.clientVisible, filters.clientVisible));
      }
      if (!filters.includeDeleted) {
        conditions.push(isNull(deliverables.deletedAt));
      }

      const rows = await db
        .select()
        .from(deliverables)
        .where(and(...conditions))
        .orderBy(desc(deliverables.producedAt))
        .limit(filters.limit ?? 200);

      return rows.map(rowToDto);
    },

    /**
     * Get a single deliverable by id, regardless of company. Callers MUST
     * check `result.companyId` via `assertCompanyAccess(req, result.companyId)`
     * before trusting the result. Soft-deleted rows are returned (UI may
     * want to show history); callers filter as needed.
     */
    getById: async (id: string): Promise<Deliverable | null> => {
      const row = await db
        .select()
        .from(deliverables)
        .where(eq(deliverables.id, id))
        .then((rows) => rows[0] ?? null);
      return row ? rowToDto(row) : null;
    },

    /**
     * Get a deliverable scoped to a company (convenience for the portal
     * download path). Returns null if id doesn't exist OR belongs to a
     * different company — route converts to 404.
     */
    getForCompany: async (
      companyId: string,
      id: string,
    ): Promise<Deliverable | null> => {
      const row = await db
        .select()
        .from(deliverables)
        .where(
          and(eq(deliverables.id, id), eq(deliverables.companyId, companyId)),
        )
        .then((rows) => rows[0] ?? null);
      return row ? rowToDto(row) : null;
    },

    /**
     * Patch a deliverable. Handles `clientVisible` specially: the first
     * time it flips true, set `promotedAt = now()`. Subsequent flips
     * (visible→hidden→visible) do NOT update promotedAt — the first
     * publish timestamp is sticky, which matters for portal sort order
     * and audit.
     */
    update: async (
      id: string,
      patch: UpdateDeliverablePayload,
    ): Promise<Deliverable | null> => {
      const existing = await db
        .select()
        .from(deliverables)
        .where(eq(deliverables.id, id))
        .then((rows) => rows[0] ?? null);
      if (!existing) return null;

      const now = new Date();
      const set: Partial<DeliverableInsert> = { updatedAt: now };
      if (patch.title !== undefined) set.title = patch.title;
      if (patch.description !== undefined) set.description = patch.description;
      if (patch.metadata !== undefined) set.metadata = patch.metadata;
      if (patch.clientVisible !== undefined) {
        set.clientVisible = patch.clientVisible;
        if (patch.clientVisible && !existing.promotedAt) {
          set.promotedAt = now;
        }
      }

      const updated = await db
        .update(deliverables)
        .set(set)
        .where(eq(deliverables.id, id))
        .returning()
        .then((rows) => rows[0] ?? null);
      return updated ? rowToDto(updated) : null;
    },

    /**
     * Soft delete. Sets `deletedAt = now()` and flips `clientVisible`
     * false so any live portal sessions stop serving the file on next
     * refresh. The object in storage is NOT deleted — v1.1 adds a GC
     * worker that hard-deletes files whose deliverable rows have been
     * deletedAt for longer than DELIVERABLE_DEFAULT_RETENTION_DAYS.
     */
    softDelete: async (id: string): Promise<Deliverable | null> => {
      const now = new Date();
      const updated = await db
        .update(deliverables)
        .set({ deletedAt: now, clientVisible: false, updatedAt: now })
        .where(and(eq(deliverables.id, id), isNull(deliverables.deletedAt)))
        .returning()
        .then((rows) => rows[0] ?? null);
      return updated ? rowToDto(updated) : null;
    },

    /**
     * Restore a soft-deleted deliverable. Useful for the "I accidentally
     * deleted this" flow in Fernweh. Does NOT re-promote — callers must
     * explicitly flip `clientVisible` afterward.
     */
    restore: async (id: string): Promise<Deliverable | null> => {
      const now = new Date();
      const updated = await db
        .update(deliverables)
        .set({ deletedAt: null, updatedAt: now })
        .where(eq(deliverables.id, id))
        .returning()
        .then((rows) => rows[0] ?? null);
      return updated ? rowToDto(updated) : null;
    },

    /**
     * Assert a deliverable exists and belongs to the given company.
     * Throws 404 if missing or cross-company. Routes call this before
     * any mutating operation that takes just an id.
     */
    requireForCompany: async (
      companyId: string,
      id: string,
    ): Promise<Deliverable> => {
      const row = await db
        .select()
        .from(deliverables)
        .where(
          and(eq(deliverables.id, id), eq(deliverables.companyId, companyId)),
        )
        .then((rows) => rows[0] ?? null);
      if (!row) {
        throw notFound(`Deliverable ${id} not found for company ${companyId}`);
      }
      return rowToDto(row);
    },
  };
}
