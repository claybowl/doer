import { and, desc, eq, gte, isNotNull, isNull, lte, ne, sql, count, sum } from "drizzle-orm";
import type { Db } from "@doerai/db";
import { timeEntries, issues, agents, projects } from "@doerai/db";
import { notFound, unprocessable } from "../errors.js";

/**
 * Time tracking service — handles CRUD for time entries and reporting aggregations.
 *
 * Agent auto-tracking: startAgentTimer / stopAgentTimer are called by the heartbeat
 * service when a run starts/completes on an issue. No human interaction needed.
 *
 * Human manual tracking: startManualTimer / stopTimer / updateEntry are called via
 * the REST API from the UI timer component.
 */
export function timeTrackingService(db: Db) {
  return {
    // ─── Agent auto-tracking ──────────────────────────────────────────

    /**
     * Start an automatic timer when an agent begins work on an issue.
     * Called from heartbeat service when a run starts.
     */
    startAgentTimer: async (params: {
      companyId: string;
      issueId: string;
      agentId: string;
      heartbeatRunId: string;
      projectId?: string | null;
    }) => {
      // Stop any existing running timer for this issue+agent
      await db
        .update(timeEntries)
        .set({
          status: "stopped",
          stoppedAt: new Date(),
          durationMs: sql`extract(epoch from (now() - ${timeEntries.startedAt})) * 1000::int`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(timeEntries.companyId, params.companyId),
            eq(timeEntries.issueId, params.issueId),
            eq(timeEntries.agentId, params.agentId),
            eq(timeEntries.status, "running"),
          ),
        );

      const entry = await db
        .insert(timeEntries)
        .values({
          companyId: params.companyId,
          issueId: params.issueId,
          agentId: params.agentId,
          heartbeatRunId: params.heartbeatRunId,
          projectId: params.projectId ?? null,
          source: "agent_auto",
          status: "running",
          startedAt: new Date(),
        })
        .returning()
        .then((rows) => rows[0]);

      return entry;
    },

    /**
     * Stop an agent's running timer when a heartbeat run completes.
     * Called from heartbeat service when a run finishes.
     */
    stopAgentTimer: async (params: {
      companyId: string;
      heartbeatRunId: string;
    }) => {
      const entries = await db
        .update(timeEntries)
        .set({
          status: "stopped",
          stoppedAt: new Date(),
          durationMs: sql`extract(epoch from (now() - ${timeEntries.startedAt})) * 1000::int`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(timeEntries.companyId, params.companyId),
            eq(timeEntries.heartbeatRunId, params.heartbeatRunId),
            eq(timeEntries.status, "running"),
          ),
        )
        .returning();

      return entries;
    },

    // ─── Human manual tracking ─────────────────────────────────────────

    /**
     * Start a manual timer for a human user on an issue.
     */
    startManualTimer: async (params: {
      companyId: string;
      issueId: string;
      userId: string;
      description?: string;
      billable?: boolean;
      billingCode?: string | null;
    }) => {
      // Verify issue exists and belongs to company
      const issue = await db
        .select()
        .from(issues)
        .where(and(eq(issues.id, params.issueId), eq(issues.companyId, params.companyId)))
        .then((rows) => rows[0]);

      if (!issue) throw notFound("Issue not found");

      // Stop any existing running timer for this user+issue
      await db
        .update(timeEntries)
        .set({
          status: "stopped",
          stoppedAt: new Date(),
          durationMs: sql`extract(epoch from (now() - ${timeEntries.startedAt})) * 1000::int`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(timeEntries.companyId, params.companyId),
            eq(timeEntries.issueId, params.issueId),
            eq(timeEntries.userId, params.userId),
            eq(timeEntries.status, "running"),
          ),
        );

      const entry = await db
        .insert(timeEntries)
        .values({
          companyId: params.companyId,
          issueId: params.issueId,
          projectId: issue.projectId,
          source: "manual",
          userId: params.userId,
          status: "running",
          startedAt: new Date(),
          description: params.description ?? null,
          billable: params.billable ?? true,
          billingCode: params.billingCode ?? issue.billingCode ?? null,
        })
        .returning()
        .then((rows) => rows[0]);

      return entry;
    },

    /**
     * Stop a running timer by entry ID.
     */
    stopTimer: async (companyId: string, entryId: string, description?: string) => {
      const existing = await db
        .select()
        .from(timeEntries)
        .where(and(eq(timeEntries.id, entryId), eq(timeEntries.companyId, companyId)))
        .then((rows) => rows[0]);

      if (!existing) throw notFound("Time entry not found");
      if (existing.status === "stopped") throw unprocessable("Timer is already stopped");

      const updateData: Record<string, unknown> = {
        status: "stopped",
        stoppedAt: new Date(),
        durationMs: sql`extract(epoch from (now() - ${timeEntries.startedAt})) * 1000::int`,
        updatedAt: new Date(),
      };

      if (description !== undefined) {
        updateData.description = description;
      }

      const entry = await db
        .update(timeEntries)
        .set(updateData)
        .where(eq(timeEntries.id, entryId))
        .returning()
        .then((rows) => rows[0]);

      return entry;
    },

    // ─── CRUD ──────────────────────────────────────────────────────────

    /**
     * Get a single time entry by ID.
     */
    getById: async (companyId: string, entryId: string) => {
      const entry = await db
        .select()
        .from(timeEntries)
        .where(and(eq(timeEntries.id, entryId), eq(timeEntries.companyId, companyId)))
        .then((rows) => rows[0]);

      return entry ?? null;
    },

    /**
     * List time entries with optional filters, including joined relations.
     */
    list: async (params: {
      companyId: string;
      issueId?: string;
      agentId?: string;
      projectId?: string;
      source?: string;
      status?: string;
      billable?: boolean;
      from?: Date;
      to?: Date;
      limit?: number;
      offset?: number;
    }) => {
      const conditions = [eq(timeEntries.companyId, params.companyId)];

      if (params.issueId) conditions.push(eq(timeEntries.issueId, params.issueId));
      if (params.agentId) conditions.push(eq(timeEntries.agentId, params.agentId));
      if (params.projectId) conditions.push(eq(timeEntries.projectId, params.projectId));
      if (params.source) conditions.push(eq(timeEntries.source, params.source));
      if (params.status) conditions.push(eq(timeEntries.status, params.status));
      if (params.billable !== undefined) conditions.push(eq(timeEntries.billable, params.billable));
      if (params.from) conditions.push(gte(timeEntries.startedAt, params.from));
      if (params.to) conditions.push(lte(timeEntries.startedAt, params.to));

      const limit = params.limit ?? 100;
      const offset = params.offset ?? 0;

      const rows = await db
        .select({
          entry: timeEntries,
          issueTitle: issues.title,
          issueIdentifier: issues.identifier,
          issueStatus: issues.status,
          agentName: agents.name,
          agentRole: agents.role,
          projectName: projects.name,
        })
        .from(timeEntries)
        .leftJoin(issues, eq(timeEntries.issueId, issues.id))
        .leftJoin(agents, eq(timeEntries.agentId, agents.id))
        .leftJoin(projects, eq(timeEntries.projectId, projects.id))
        .where(and(...conditions))
        .orderBy(desc(timeEntries.startedAt))
        .limit(limit)
        .offset(offset);

      return rows.map((r) => ({
        ...r.entry,
        issueTitle: r.issueTitle,
        issueIdentifier: r.issueIdentifier,
        issueStatus: r.issueStatus,
        agentName: r.agentName,
        agentRole: r.agentRole,
        projectName: r.projectName,
      }));
    },

    /**
     * Update a time entry (edit description, billable flag, manually adjust duration).
     */
    updateEntry: async (
      companyId: string,
      entryId: string,
      patch: {
        description?: string | null;
        billable?: boolean;
        billingCode?: string | null;
        durationMs?: number;
      },
    ) => {
      const existing = await db
        .select()
        .from(timeEntries)
        .where(and(eq(timeEntries.id, entryId), eq(timeEntries.companyId, companyId)))
        .then((rows) => rows[0]);

      if (!existing) throw notFound("Time entry not found");

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (patch.description !== undefined) updateData.description = patch.description;
      if (patch.billable !== undefined) updateData.billable = patch.billable;
      if (patch.billingCode !== undefined) updateData.billingCode = patch.billingCode;
      if (patch.durationMs !== undefined) updateData.durationMs = patch.durationMs;

      const entry = await db
        .update(timeEntries)
        .set(updateData)
        .where(eq(timeEntries.id, entryId))
        .returning()
        .then((rows) => rows[0]);

      return entry;
    },

    /**
     * Delete a time entry.
     */
    deleteEntry: async (companyId: string, entryId: string) => {
      const result = await db
        .delete(timeEntries)
        .where(and(eq(timeEntries.id, entryId), eq(timeEntries.companyId, companyId)))
        .returning();

      return result.length > 0;
    },

    // ─── Reporting ─────────────────────────────────────────────────────

    /**
     * Get a time summary for a company within an optional date range.
     */
    getSummary: async (companyId: string, from?: Date, to?: Date) => {
      const conditions = [eq(timeEntries.companyId, companyId)];
      if (from) conditions.push(gte(timeEntries.startedAt, from));
      if (to) conditions.push(lte(timeEntries.startedAt, to));

      const [row] = await db
        .select({
          totalMs: sql<number>`coalesce(sum(${timeEntries.durationMs}), 0)::int`,
          agentMs: sql<number>`coalesce(sum(case when ${timeEntries.source} = 'agent_auto' then ${timeEntries.durationMs} else 0 end), 0)::int`,
          humanMs: sql<number>`coalesce(sum(case when ${timeEntries.source} = 'manual' then ${timeEntries.durationMs} else 0 end), 0)::int`,
          billableMs: sql<number>`coalesce(sum(case when ${timeEntries.billable} then ${timeEntries.durationMs} else 0 end), 0)::int`,
          nonBillableMs: sql<number>`coalesce(sum(case when not ${timeEntries.billable} then ${timeEntries.durationMs} else 0 end), 0)::int`,
          entryCount: count(),
          runningCount: sql<number>`coalesce(sum(case when ${timeEntries.status} = 'running' then 1 else 0 end), 0)::int`,
        })
        .from(timeEntries)
        .where(and(...conditions));

      return {
        companyId,
        totalMs: Number(row?.totalMs ?? 0),
        agentMs: Number(row?.agentMs ?? 0),
        humanMs: Number(row?.humanMs ?? 0),
        billableMs: Number(row?.billableMs ?? 0),
        nonBillableMs: Number(row?.nonBillableMs ?? 0),
        entryCount: Number(row?.entryCount ?? 0),
        runningCount: Number(row?.runningCount ?? 0),
      };
    },

    /**
     * Aggregate time by agent for a company.
     */
    getByAgent: async (companyId: string, from?: Date, to?: Date) => {
      const conditions = [eq(timeEntries.companyId, companyId)];
      if (from) conditions.push(gte(timeEntries.startedAt, from));
      if (to) conditions.push(lte(timeEntries.startedAt, to));

      const rows = await db
        .select({
          agentId: timeEntries.agentId,
          agentName: agents.name,
          agentRole: agents.role,
          totalMs: sql<number>`coalesce(sum(${timeEntries.durationMs}), 0)::int`,
          entryCount: count(),
          taskCount: sql<number>`count(distinct ${timeEntries.issueId})::int`,
          billableMs: sql<number>`coalesce(sum(case when ${timeEntries.billable} then ${timeEntries.durationMs} else 0 end), 0)::int`,
        })
        .from(timeEntries)
        .leftJoin(agents, eq(timeEntries.agentId, agents.id))
        .where(and(...conditions))
        .groupBy(timeEntries.agentId, agents.name, agents.role)
        .orderBy(desc(sql`coalesce(sum(${timeEntries.durationMs}), 0)`));

      return rows.map((r) => ({
        agentId: r.agentId,
        agentName: r.agentName,
        agentRole: r.agentRole,
        totalMs: Number(r.totalMs),
        entryCount: Number(r.entryCount),
        taskCount: Number(r.taskCount),
        billableMs: Number(r.billableMs),
        avgPerTaskMs: Number(r.taskCount) > 0 ? Number(r.totalMs) / Number(r.taskCount) : 0,
      }));
    },

    /**
     * Aggregate time by project for a company.
     */
    getByProject: async (companyId: string, from?: Date, to?: Date) => {
      const conditions = [eq(timeEntries.companyId, companyId)];
      if (from) conditions.push(gte(timeEntries.startedAt, from));
      if (to) conditions.push(lte(timeEntries.startedAt, to));

      const rows = await db
        .select({
          projectId: timeEntries.projectId,
          projectName: projects.name,
          totalMs: sql<number>`coalesce(sum(${timeEntries.durationMs}), 0)::int`,
          entryCount: count(),
          taskCount: sql<number>`count(distinct ${timeEntries.issueId})::int`,
          billableMs: sql<number>`coalesce(sum(case when ${timeEntries.billable} then ${timeEntries.durationMs} else 0 end), 0)::int`,
        })
        .from(timeEntries)
        .leftJoin(projects, eq(timeEntries.projectId, projects.id))
        .where(and(...conditions))
        .groupBy(timeEntries.projectId, projects.name)
        .orderBy(desc(sql`coalesce(sum(${timeEntries.durationMs}), 0)`));

      return rows.map((r) => ({
        projectId: r.projectId,
        projectName: r.projectName,
        totalMs: Number(r.totalMs),
        entryCount: Number(r.entryCount),
        taskCount: Number(r.taskCount),
        billableMs: Number(r.billableMs),
      }));
    },

    /**
     * Aggregate time by issue (task) for a company, including estimated vs actual.
     */
    getByIssue: async (companyId: string, from?: Date, to?: Date) => {
      const conditions = [eq(timeEntries.companyId, companyId)];
      if (from) conditions.push(gte(timeEntries.startedAt, from));
      if (to) conditions.push(lte(timeEntries.startedAt, to));

      const rows = await db
        .select({
          issueId: timeEntries.issueId,
          issueTitle: issues.title,
          issueIdentifier: issues.identifier,
          issueStatus: issues.status,
          estimatedMinutes: issues.estimatedMinutes,
          totalMs: sql<number>`coalesce(sum(${timeEntries.durationMs}), 0)::int`,
          entryCount: count(),
          agentMs: sql<number>`coalesce(sum(case when ${timeEntries.source} = 'agent_auto' then ${timeEntries.durationMs} else 0 end), 0)::int`,
          humanMs: sql<number>`coalesce(sum(case when ${timeEntries.source} = 'manual' then ${timeEntries.durationMs} else 0 end), 0)::int`,
        })
        .from(timeEntries)
        .leftJoin(issues, eq(timeEntries.issueId, issues.id))
        .where(and(...conditions))
        .groupBy(timeEntries.issueId, issues.title, issues.identifier, issues.status, issues.estimatedMinutes)
        .orderBy(desc(sql`coalesce(sum(${timeEntries.durationMs}), 0)`));

      return rows.map((r) => {
        const estimatedMs = r.estimatedMinutes ? r.estimatedMinutes * 60 * 1000 : null;
        return {
          issueId: r.issueId,
          issueTitle: r.issueTitle,
          issueIdentifier: r.issueIdentifier,
          issueStatus: r.issueStatus,
          totalMs: Number(r.totalMs),
          entryCount: Number(r.entryCount),
          agentMs: Number(r.agentMs),
          humanMs: Number(r.humanMs),
          estimatedMinutes: r.estimatedMinutes,
          varianceMs: estimatedMs !== null ? Number(r.totalMs) - estimatedMs : null,
        };
      });
    },

    /**
     * Get a weekly timesheet for a human user.
     */
    getWeeklyTimesheet: async (companyId: string, userId?: string, weekStart?: string) => {
      // Default to current week (Monday)
      const now = new Date();
      const day = now.getUTCDay(); // 0 = Sunday
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const start = weekStart ? new Date(weekStart) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diffToMonday));
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 7);

      const conditions = [
        eq(timeEntries.companyId, companyId),
        eq(timeEntries.source, "manual"),
        gte(timeEntries.startedAt, start),
        lte(timeEntries.startedAt, end),
      ];

      if (userId) {
        conditions.push(eq(timeEntries.userId, userId));
      }

      const rows = await db
        .select({
          userId: timeEntries.userId,
          issueId: timeEntries.issueId,
          issueTitle: issues.title,
          issueIdentifier: issues.identifier,
          projectName: projects.name,
          startedAt: timeEntries.startedAt,
          durationMs: timeEntries.durationMs,
          billable: timeEntries.billable,
          description: timeEntries.description,
        })
        .from(timeEntries)
        .leftJoin(issues, eq(timeEntries.issueId, issues.id))
        .leftJoin(projects, eq(timeEntries.projectId, projects.id))
        .where(and(...conditions))
        .orderBy(desc(timeEntries.startedAt));

      // Group by day
      const dailyTotals: Record<string, number> = {};
      const totalMs = rows.reduce((acc, r) => {
        const dayKey = r.startedAt.toISOString().slice(0, 10);
        const dur = Number(r.durationMs ?? 0);
        dailyTotals[dayKey] = (dailyTotals[dayKey] ?? 0) + dur;
        return acc + dur;
      }, 0);

      const billableMs = rows
        .filter((r) => r.billable)
        .reduce((acc, r) => acc + Number(r.durationMs ?? 0), 0);

      const timesheetRows = rows.map((r) => ({
        userId: r.userId ?? "",
        issueId: r.issueId,
        issueTitle: r.issueTitle ?? "",
        issueIdentifier: r.issueIdentifier,
        projectName: r.projectName,
        date: r.startedAt.toISOString().slice(0, 10),
        totalMs: Number(r.durationMs ?? 0),
        entryCount: 1,
        billable: r.billable,
        description: r.description,
      }));

      return {
        userId: userId ?? "",
        weekStart: start.toISOString(),
        weekEnd: end.toISOString(),
        totalMs,
        billableMs,
        rows: timesheetRows,
        dailyTotals,
      };
    },

    /**
     * Get total time for a specific issue.
     */
    getIssueTime: async (companyId: string, issueId: string) => {
      const [row] = await db
        .select({
          totalMs: sql<number>`coalesce(sum(${timeEntries.durationMs}), 0)::int`,
          agentMs: sql<number>`coalesce(sum(case when ${timeEntries.source} = 'agent_auto' then ${timeEntries.durationMs} else 0 end), 0)::int`,
          humanMs: sql<number>`coalesce(sum(case when ${timeEntries.source} = 'manual' then ${timeEntries.durationMs} else 0 end), 0)::int`,
          entryCount: count(),
          runningCount: sql<number>`coalesce(sum(case when ${timeEntries.status} = 'running' then 1 else 0 end), 0)::int`,
        })
        .from(timeEntries)
        .where(and(eq(timeEntries.companyId, companyId), eq(timeEntries.issueId, issueId)));

      return {
        totalMs: Number(row?.totalMs ?? 0),
        agentMs: Number(row?.agentMs ?? 0),
        humanMs: Number(row?.humanMs ?? 0),
        entryCount: Number(row?.entryCount ?? 0),
        runningCount: Number(row?.runningCount ?? 0),
      };
    },

    /**
     * Get running timers for a company (for nav bar indicator).
     */
    getRunningTimers: async (companyId: string) => {
      const rows = await db
        .select({
          id: timeEntries.id,
          issueId: timeEntries.issueId,
          issueTitle: issues.title,
          issueIdentifier: issues.identifier,
          startedAt: timeEntries.startedAt,
          source: timeEntries.source,
          userId: timeEntries.userId,
          agentId: timeEntries.agentId,
          agentName: agents.name,
        })
        .from(timeEntries)
        .leftJoin(issues, eq(timeEntries.issueId, issues.id))
        .leftJoin(agents, eq(timeEntries.agentId, agents.id))
        .where(and(eq(timeEntries.companyId, companyId), eq(timeEntries.status, "running")));

      return rows;
    },
  };
}
