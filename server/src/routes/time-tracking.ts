import { Router } from "express";
import type { Db } from "@doerai/db";
import { eq, and, gte, lt, sql, desc } from "drizzle-orm";
import { timeEntries } from "@doerai/db";
import { assertCompanyAccess, getActorInfo } from "./authz.js";
import { logger } from "../middleware/logger.js";

export function timeTrackingRoutes(db: Db) {
  const router = Router();

  // ─── List time entries for a company ──────────────────────────────────────
  router.get("/companies/:companyId/time-entries", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const source = req.query.source as string | undefined;

    const conditions = [eq(timeEntries.companyId, companyId)];
    if (startDate) conditions.push(gte(timeEntries.startedAt, new Date(startDate)));
    if (endDate) conditions.push(lt(timeEntries.startedAt, new Date(endDate)));
    if (source) conditions.push(eq(timeEntries.source, source));

    const result = await db
      .select()
      .from(timeEntries)
      .where(and(...conditions))
      .orderBy(desc(timeEntries.startedAt));

    res.json(result);
  });

  // ─── List time entries for an issue ────────────────────────────────────────
  router.get("/companies/:companyId/issues/:issueId/time-entries", async (req, res) => {
    const companyId = req.params.companyId as string;
    const issueId = req.params.issueId as string;
    assertCompanyAccess(req, companyId);

    const result = await db
      .select()
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.companyId, companyId),
          eq(timeEntries.issueId, issueId),
        ),
      )
      .orderBy(desc(timeEntries.startedAt));

    res.json(result);
  });

  // ─── Start a timer (create a time entry) ──────────────────────────────────
  router.post("/companies/:companyId/time-entries", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const actor = getActorInfo(req);

    const { issueId, agentId, userId, source, billingType, description, estimatedMs } = req.body;

    if (!issueId) {
      res.status(400).json({ error: "issueId is required" });
      return;
    }

    // Stop any running timers for this issue first
    await db
      .update(timeEntries)
      .set({
        status: "completed",
        endedAt: new Date(),
        durationMs: sql`EXTRACT(EPOCH FROM (NOW() - ${timeEntries.startedAt})) * 1000`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(timeEntries.companyId, companyId),
          eq(timeEntries.issueId, issueId),
          eq(timeEntries.status, "running"),
        ),
      );

    const [entry] = await db
      .insert(timeEntries)
      .values({
        companyId,
        issueId,
        agentId: agentId ?? (actor.actorType === "agent" ? actor.actorId : null),
        userId: userId ?? (actor.actorType === "user" ? actor.actorId : null),
        source: source ?? (actor.actorType === "agent" ? "agent" : "human"),
        status: "running",
        billingType: billingType ?? "billable",
        description: description ?? null,
        estimatedMs: estimatedMs ?? null,
        startedAt: new Date(),
      })
      .returning();

    res.status(201).json(entry);
  });

  // ─── Update/stop a time entry ──────────────────────────────────────────────
  router.patch("/companies/:companyId/time-entries/:entryId", async (req, res) => {
    const companyId = req.params.companyId as string;
    const entryId = req.params.entryId as string;
    assertCompanyAccess(req, companyId);

    const { status, billingType, description, endedAt, estimatedMs } = req.body;

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (status) updates.status = status;
    if (billingType) updates.billingType = billingType;
    if (description !== undefined) updates.description = description;
    if (estimatedMs !== undefined) updates.estimatedMs = estimatedMs;

    if (endedAt || status === "completed" || status === "cancelled") {
      updates.endedAt = endedAt ? new Date(endedAt) : new Date();
      // Calculate duration
      const [existing] = await db
        .select()
        .from(timeEntries)
        .where(eq(timeEntries.id, entryId));
      if (existing) {
        const end = updates.endedAt as Date;
        updates.durationMs = end.getTime() - existing.startedAt.getTime();
      }
    }

    const [updated] = await db
      .update(timeEntries)
      .set(updates)
      .where(eq(timeEntries.id, entryId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Time entry not found" });
      return;
    }

    res.json(updated);
  });

  // ─── Delete a time entry ───────────────────────────────────────────────────
  router.delete("/companies/:companyId/time-entries/:entryId", async (req, res) => {
    const companyId = req.params.companyId as string;
    const entryId = req.params.entryId as string;
    assertCompanyAccess(req, companyId);

    await db
      .delete(timeEntries)
      .where(eq(timeEntries.id, entryId));

    res.status(204).send();
  });

  // ─── Time summary for a company or issue ──────────────────────────────────
  router.get("/companies/:companyId/time-summary", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const result = await db
      .select({
        totalMs: sql<number>`COALESCE(SUM(${timeEntries.durationMs}), 0)`,
        billableMs: sql<number>`COALESCE(SUM(CASE WHEN ${timeEntries.billingType} = 'billable' THEN ${timeEntries.durationMs} ELSE 0 END), 0)`,
        nonBillableMs: sql<number>`COALESCE(SUM(CASE WHEN ${timeEntries.billingType} = 'non_billable' THEN ${timeEntries.durationMs} ELSE 0 END), 0)`,
        entryCount: sql<number>`COUNT(*)`,
        agentMs: sql<number>`COALESCE(SUM(CASE WHEN ${timeEntries.source} = 'agent' THEN ${timeEntries.durationMs} ELSE 0 END), 0)`,
        humanMs: sql<number>`COALESCE(SUM(CASE WHEN ${timeEntries.source} = 'human' THEN ${timeEntries.durationMs} ELSE 0 END), 0)`,
      })
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.companyId, companyId),
          eq(timeEntries.status, "completed"),
        ),
      );

    const row = result[0] ?? {};
    res.json({
      totalMs: Number(row.totalMs ?? 0),
      billableMs: Number(row.billableMs ?? 0),
      nonBillableMs: Number(row.nonBillableMs ?? 0),
      entryCount: Number(row.entryCount ?? 0),
      bySource: {
        agent: Number(row.agentMs ?? 0),
        human: Number(row.humanMs ?? 0),
      },
    });
  });

  // ─── Time summary for a specific issue ─────────────────────────────────────
  router.get("/companies/:companyId/issues/:issueId/time-summary", async (req, res) => {
    const companyId = req.params.companyId as string;
    const issueId = req.params.issueId as string;
    assertCompanyAccess(req, companyId);

    const result = await db
      .select({
        totalMs: sql<number>`COALESCE(SUM(${timeEntries.durationMs}), 0)`,
        billableMs: sql<number>`COALESCE(SUM(CASE WHEN ${timeEntries.billingType} = 'billable' THEN ${timeEntries.durationMs} ELSE 0 END), 0)`,
        nonBillableMs: sql<number>`COALESCE(SUM(CASE WHEN ${timeEntries.billingType} = 'non_billable' THEN ${timeEntries.durationMs} ELSE 0 END), 0)`,
        entryCount: sql<number>`COUNT(*)`,
        agentMs: sql<number>`COALESCE(SUM(CASE WHEN ${timeEntries.source} = 'agent' THEN ${timeEntries.durationMs} ELSE 0 END), 0)`,
        humanMs: sql<number>`COALESCE(SUM(CASE WHEN ${timeEntries.source} = 'human' THEN ${timeEntries.durationMs} ELSE 0 END), 0)`,
      })
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.companyId, companyId),
          eq(timeEntries.issueId, issueId),
          eq(timeEntries.status, "completed"),
        ),
      );

    const row = result[0] ?? {};
    res.json({
      totalMs: Number(row.totalMs ?? 0),
      billableMs: Number(row.billableMs ?? 0),
      nonBillableMs: Number(row.nonBillableMs ?? 0),
      entryCount: Number(row.entryCount ?? 0),
      bySource: {
        agent: Number(row.agentMs ?? 0),
        human: Number(row.humanMs ?? 0),
      },
    });
  });

  // ─── Time by agent ─────────────────────────────────────────────────────────
  router.get("/companies/:companyId/time-tracking/by-agent", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const result = await db
      .select({
        agentId: timeEntries.agentId,
        totalMs: sql<number>`COALESCE(SUM(${timeEntries.durationMs}), 0)`,
        taskCount: sql<number>`COUNT(DISTINCT ${timeEntries.issueId})`,
      })
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.companyId, companyId),
          eq(timeEntries.status, "completed"),
        ),
      )
      .groupBy(timeEntries.agentId);

    res.json(result.map((r) => ({
      agentId: r.agentId,
      agentName: null, // Would need join with agents table
      totalMs: Number(r.totalMs ?? 0),
      taskCount: Number(r.taskCount ?? 0),
      thisWeekMs: 0, // Would need additional query
    })));
  });

  // ─── Time by project ───────────────────────────────────────────────────────
  router.get("/companies/:companyId/time-tracking/by-project", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    // Time entries don't have a projectId directly; need to join through issues
    const result = await db
      .select({
        totalMs: sql<number>`COALESCE(SUM(${timeEntries.durationMs}), 0)`,
        billableMs: sql<number>`COALESCE(SUM(CASE WHEN ${timeEntries.billingType} = 'billable' THEN ${timeEntries.durationMs} ELSE 0 END), 0)`,
        entryCount: sql<number>`COUNT(*)`,
      })
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.companyId, companyId),
          eq(timeEntries.status, "completed"),
        ),
      );

    // Simplified: returns overall summary grouped by project would need issue join
    const row = result[0] ?? {};
    res.json([{
      projectId: "all",
      projectName: "All Projects",
      totalMs: Number(row.totalMs ?? 0),
      billableMs: Number(row.billableMs ?? 0),
      entryCount: Number(row.entryCount ?? 0),
    }]);
  });

  // ─── Weekly timesheet ──────────────────────────────────────────────────────
  router.get("/companies/:companyId/timesheet", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const weekStartStr = req.query.weekStart as string | undefined;
    const weekStart = weekStartStr ? new Date(weekStartStr) : new Date();
    // Normalize to Monday
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const entries = await db
      .select()
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.companyId, companyId),
          gte(timeEntries.startedAt, weekStart),
          lt(timeEntries.startedAt, weekEnd),
        ),
      )
      .orderBy(desc(timeEntries.startedAt));

    // Build byDay map
    const byDay: Record<string, number> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      byDay[d.toISOString().split("T")[0]] = 0;
    }
    let totalMs = 0;
    for (const entry of entries) {
      const key = new Date(entry.startedAt).toISOString().split("T")[0];
      const ms = entry.durationMs ?? 0;
      if (byDay[key] !== undefined) byDay[key] += ms;
      totalMs += ms;
    }

    res.json({
      weekStart,
      weekEnd,
      entries: entries.map((e) => ({
        id: e.id,
        issueId: e.issueId,
        issueTitle: "", // Would need issue join
        issueIdentifier: null,
        agentName: null,
        userName: e.userId,
        source: e.source,
        billingType: e.billingType,
        description: e.description,
        startedAt: e.startedAt,
        endedAt: e.endedAt,
        durationMs: e.durationMs,
      })),
      totalMs,
      byDay,
    });
  });

  return router;
}
