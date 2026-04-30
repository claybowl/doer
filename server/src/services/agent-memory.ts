import { and, desc, eq, gt, isNull, lt, or, sql } from "drizzle-orm";
import type { Db } from "@doerai/db";
import { agentMemories, agents } from "@doerai/db";
import { notFound, unprocessable } from "../errors.js";

export type MemoryType = "episodic" | "semantic" | "procedural";

export interface CreateMemoryInput {
  memoryType?: MemoryType;
  content: string;
  tags?: string[];
  issueId?: string;
  heartbeatRunId?: string;
  metadata?: Record<string, unknown>;
  expiresAt?: Date;
}

export interface MemorySearchOptions {
  query?: string;
  memoryType?: MemoryType;
  limit?: number;
  includeExpired?: boolean;
}

export function agentMemoryService(db: Db) {
  async function assertAgentBelongsToCompany(agentId: string, companyId: string) {
    const [agent] = await db
      .select({ id: agents.id, companyId: agents.companyId })
      .from(agents)
      .where(eq(agents.id, agentId));
    if (!agent) throw notFound("Agent not found");
    if (agent.companyId !== companyId) throw unprocessable("Agent does not belong to company");
  }

  return {
    create: async (companyId: string, agentId: string, input: CreateMemoryInput) => {
      await assertAgentBelongsToCompany(agentId, companyId);
      const [created] = await db
        .insert(agentMemories)
        .values({
          companyId,
          agentId,
          memoryType: input.memoryType ?? "episodic",
          content: input.content,
          tags: input.tags ?? [],
          issueId: input.issueId ?? null,
          heartbeatRunId: input.heartbeatRunId ?? null,
          metadata: input.metadata ?? {},
          expiresAt: input.expiresAt ?? null,
        })
        .returning();
      return created;
    },

    search: async (companyId: string, agentId: string, opts: MemorySearchOptions = {}) => {
      await assertAgentBelongsToCompany(agentId, companyId);
      const { query, memoryType, limit = 20, includeExpired = false } = opts;
      const now = new Date();

      const conditions = [
        eq(agentMemories.companyId, companyId),
        eq(agentMemories.agentId, agentId),
      ];

      if (memoryType) {
        conditions.push(eq(agentMemories.memoryType, memoryType));
      }

      if (!includeExpired) {
        conditions.push(
          or(isNull(agentMemories.expiresAt), gt(agentMemories.expiresAt, now))!,
        );
      }

      if (query && query.trim()) {
        // Full-text search using PostgreSQL tsvector
        conditions.push(
          sql`to_tsvector('english', ${agentMemories.content}) @@ plainto_tsquery('english', ${query.trim()})`,
        );
        const rows = await db
          .select({
            id: agentMemories.id,
            memoryType: agentMemories.memoryType,
            content: agentMemories.content,
            tags: agentMemories.tags,
            issueId: agentMemories.issueId,
            heartbeatRunId: agentMemories.heartbeatRunId,
            metadata: agentMemories.metadata,
            accessCount: agentMemories.accessCount,
            lastAccessedAt: agentMemories.lastAccessedAt,
            createdAt: agentMemories.createdAt,
            rank: sql<number>`ts_rank(to_tsvector('english', ${agentMemories.content}), plainto_tsquery('english', ${query.trim()}))`,
          })
          .from(agentMemories)
          .where(and(...conditions))
          .orderBy(desc(sql`rank`))
          .limit(limit);
        return rows;
      }

      // No query — return most recent
      const rows = await db
        .select({
          id: agentMemories.id,
          memoryType: agentMemories.memoryType,
          content: agentMemories.content,
          tags: agentMemories.tags,
          issueId: agentMemories.issueId,
          heartbeatRunId: agentMemories.heartbeatRunId,
          metadata: agentMemories.metadata,
          accessCount: agentMemories.accessCount,
          lastAccessedAt: agentMemories.lastAccessedAt,
          createdAt: agentMemories.createdAt,
          rank: sql<number>`1`,
        })
        .from(agentMemories)
        .where(and(...conditions))
        .orderBy(desc(agentMemories.createdAt))
        .limit(limit);
      return rows;
    },

    getById: async (companyId: string, agentId: string, memoryId: string) => {
      const [row] = await db
        .select()
        .from(agentMemories)
        .where(
          and(
            eq(agentMemories.id, memoryId),
            eq(agentMemories.agentId, agentId),
            eq(agentMemories.companyId, companyId),
          ),
        );
      return row ?? null;
    },

    recordAccess: async (memoryId: string) => {
      await db
        .update(agentMemories)
        .set({
          accessCount: sql`${agentMemories.accessCount} + 1`,
          lastAccessedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(agentMemories.id, memoryId));
    },

    delete: async (companyId: string, agentId: string, memoryId: string) => {
      const [deleted] = await db
        .delete(agentMemories)
        .where(
          and(
            eq(agentMemories.id, memoryId),
            eq(agentMemories.agentId, agentId),
            eq(agentMemories.companyId, companyId),
          ),
        )
        .returning({ id: agentMemories.id });
      if (!deleted) throw notFound("Memory entry not found");
      return deleted;
    },

    pruneExpired: async (companyId: string, agentId: string) => {
      const now = new Date();
      const deleted = await db
        .delete(agentMemories)
        .where(
          and(
            eq(agentMemories.companyId, companyId),
            eq(agentMemories.agentId, agentId),
            lt(agentMemories.expiresAt, now),
          ),
        )
        .returning({ id: agentMemories.id });
      return deleted.length;
    },

    pruneOld: async (companyId: string, agentId: string, olderThanDays: number) => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - olderThanDays);
      const deleted = await db
        .delete(agentMemories)
        .where(
          and(
            eq(agentMemories.companyId, companyId),
            eq(agentMemories.agentId, agentId),
            lt(agentMemories.createdAt, cutoff),
            eq(agentMemories.memoryType, "episodic"),
          ),
        )
        .returning({ id: agentMemories.id });
      return deleted.length;
    },

    assembleContext: async (
      companyId: string,
      agentId: string,
      opts: { limit?: number; memoryTypes?: MemoryType[] } = {},
    ) => {
      const { limit = 5, memoryTypes = ["semantic", "procedural", "episodic"] } = opts;
      const now = new Date();
      const rows = await db
        .select({
          id: agentMemories.id,
          memoryType: agentMemories.memoryType,
          content: agentMemories.content,
          tags: agentMemories.tags,
          createdAt: agentMemories.createdAt,
        })
        .from(agentMemories)
        .where(
          and(
            eq(agentMemories.companyId, companyId),
            eq(agentMemories.agentId, agentId),
            or(isNull(agentMemories.expiresAt), gt(agentMemories.expiresAt, now))!,
          ),
        )
        .orderBy(desc(agentMemories.accessCount), desc(agentMemories.createdAt))
        .limit(limit * memoryTypes.length);

      // Group by type and take top N per type
      const byType: Record<string, typeof rows> = {};
      for (const row of rows) {
        if (!memoryTypes.includes(row.memoryType as MemoryType)) continue;
        byType[row.memoryType] ??= [];
        if (byType[row.memoryType].length < limit) {
          byType[row.memoryType].push(row);
        }
      }

      return Object.values(byType).flat();
    },
  };
}
