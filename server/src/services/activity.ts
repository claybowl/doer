import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import type { Db } from "@doerai/db";
import { activityLog, heartbeatRuns, issues } from "@doerai/db";

export interface ActivityFilters {
  companyId: string;
  agentId?: string;
  entityType?: string;
  entityId?: string;
}

export function activityService(db: Db) {
  const issueIdAsText = sql<string>`${issues.id}::text`;
  return {
    list: (filters: ActivityFilters) => {
      const conditions = [eq(activityLog.companyId, filters.companyId)];

      if (filters.agentId) {
        conditions.push(eq(activityLog.agentId, filters.agentId));
      }
      if (filters.entityType) {
        conditions.push(eq(activityLog.entityType, filters.entityType));
      }
      if (filters.entityId) {
        conditions.push(eq(activityLog.entityId, filters.entityId));
      }

      return db
        .select({ activityLog })
        .from(activityLog)
        .leftJoin(
          issues,
          and(
            eq(activityLog.entityType, sql`'issue'`),
            eq(activityLog.entityId, issueIdAsText),
          ),
        )
        .where(
          and(
            ...conditions,
            or(
              sql`${activityLog.entityType} != 'issue'`,
              isNull(issues.hiddenAt),
            ),
          ),
        )
        .orderBy(desc(activityLog.createdAt))
        .then((rows) => rows.map((r) => r.activityLog));
    },

    forIssue: (issueId: string) =>
      db
        .select()
        .from(activityLog)
        .where(
          and(
            eq(activityLog.entityType, "issue"),
            eq(activityLog.entityId, issueId),
          ),
        )
        .orderBy(desc(activityLog.createdAt)),

    runsForIssue: (companyId: string, issueId: string) =>
      db
        .select({
          runId: heartbeatRuns.id,
          status: heartbeatRuns.status,
          agentId: heartbeatRuns.agentId,
          startedAt: heartbeatRuns.startedAt,
          finishedAt: heartbeatRuns.finishedAt,
          createdAt: heartbeatRuns.createdAt,
          invocationSource: heartbeatRuns.invocationSource,
          usageJson: heartbeatRuns.usageJson,
          resultJson: heartbeatRuns.resultJson,
        })
        .from(heartbeatRuns)
        .where(
          and(
            eq(heartbeatRuns.companyId, companyId),
            or(
              sql`${heartbeatRuns.contextSnapshot} ->> 'issueId' = ${issueId}`,
              sql`exists (
                select 1
                from ${activityLog}
                where ${activityLog.companyId} = ${companyId}
                  and ${activityLog.entityType} = 'issue'
                  and ${activityLog.entityId} = ${issueId}
                  and ${activityLog.runId} = ${heartbeatRuns.id}
              )`,
            ),
          ),
        )
        .orderBy(desc(heartbeatRuns.createdAt)),

    issuesForRun: async (runId: string) => {
      const run = await db
        .select({
          companyId: heartbeatRuns.companyId,
          contextSnapshot: heartbeatRuns.contextSnapshot,
        })
        .from(heartbeatRuns)
        .where(eq(heartbeatRuns.id, runId))
        .then((rows) => rows[0] ?? null);
      if (!run) return [];

      const fromActivity = await db
        .selectDistinctOn([issueIdAsText], {
          issueId: issues.id,
          identifier: issues.identifier,
          title: issues.title,
          status: issues.status,
          priority: issues.priority,
        })
        .from(activityLog)
        .innerJoin(issues, eq(activityLog.entityId, issueIdAsText))
        .where(
          and(
            eq(activityLog.companyId, run.companyId),
            eq(activityLog.runId, runId),
            eq(activityLog.entityType, "issue"),
            isNull(issues.hiddenAt),
          ),
        )
        .orderBy(issueIdAsText);

      const context = run.contextSnapshot;
      const contextIssueId =
        context && typeof context === "object" && typeof (context as Record<string, unknown>).issueId === "string"
          ? ((context as Record<string, unknown>).issueId as string)
          : null;
      if (!contextIssueId) return fromActivity;
      if (fromActivity.some((issue) => issue.issueId === contextIssueId)) return fromActivity;

      const fromContext = await db
        .select({
          issueId: issues.id,
          identifier: issues.identifier,
          title: issues.title,
          status: issues.status,
          priority: issues.priority,
        })
        .from(issues)
        .where(
          and(
            eq(issues.companyId, run.companyId),
            eq(issues.id, contextIssueId),
            isNull(issues.hiddenAt),
          ),
        )
        .then((rows) => rows[0] ?? null);

      if (!fromContext) return fromActivity;
      return [fromContext, ...fromActivity];
    },

    create: (data: typeof activityLog.$inferInsert) =>
      db
        .insert(activityLog)
        .values(data)
        .returning()
        .then((rows) => rows[0]),

    handoffTrail: async (issueId: string) => {
      const issue = await db
        .select()
        .from(issues)
        .where(eq(issues.id, issueId))
        .then((rows) => rows[0] ?? null);
      if (!issue) return [];

      const companyId = issue.companyId;

      // Fetch all activity events for this issue
      const activities = await db
        .select()
        .from(activityLog)
        .where(
          and(
            eq(activityLog.entityType, "issue"),
            eq(activityLog.entityId, issueId),
          ),
        )
        .orderBy(activityLog.createdAt);

      // Fetch all runs linked to this issue
      const runs = await db
        .select({
          runId: heartbeatRuns.id,
          status: heartbeatRuns.status,
          agentId: heartbeatRuns.agentId,
          startedAt: heartbeatRuns.startedAt,
          finishedAt: heartbeatRuns.finishedAt,
          createdAt: heartbeatRuns.createdAt,
          invocationSource: heartbeatRuns.invocationSource,
          contextSnapshot: heartbeatRuns.contextSnapshot,
        })
        .from(heartbeatRuns)
        .where(
          and(
            eq(heartbeatRuns.companyId, companyId),
            or(
              sql`${heartbeatRuns.contextSnapshot} ->> 'issueId' = ${issueId}`,
              sql`exists (
                select 1
                from ${activityLog}
                where ${activityLog.companyId} = ${companyId}
                  and ${activityLog.entityType} = 'issue'
                  and ${activityLog.entityId} = ${issueId}
                  and ${activityLog.runId} = ${heartbeatRuns.id}
              )`,
            ),
          ),
        )
        .orderBy(heartbeatRuns.createdAt);

      // Collect all agent IDs involved
      const agentIds = new Set<string>();
      if (issue.assigneeAgentId) agentIds.add(issue.assigneeAgentId);
      for (const a of activities) {
        if (a.agentId) agentIds.add(a.agentId);
      }
      for (const r of runs) {
        if (r.agentId) agentIds.add(r.agentId);
      }

      // Fetch agent names
      const agentMap = new Map<string, { name: string; role: string | null; icon: string | null }>();
      if (agentIds.size > 0) {
        const agentRows = await db
          .select({
            id: sql<string>`${sql.raw("id")}`,
            name: sql<string>`${sql.raw("name")}`,
            role: sql<string | null>`${sql.raw("role")}`,
            icon: sql<string | null>`${sql.raw("icon")}`,
          })
          .from(sql.raw("agents"))
          .where(sql`id IN (${sql.join([...agentIds].map((id) => sql`${id}`), sql`,`)})`);
        for (const a of agentRows) {
          agentMap.set(a.id, { name: a.name, role: a.role, icon: a.icon });
        }
      }

      // Build unified timeline
      const events: Array<{
        id: string;
        type: string;
        timestamp: string;
        agentId: string | null;
        agentName: string | null;
        agentIcon: string | null;
        runId: string | null;
        runStatus: string | null;
        summary: string;
        detail: string | null;
        delegatedToAgentId: string | null;
        delegatedToAgentName: string | null;
      }> = [];

      // Add run events
      for (const run of runs) {
        const agent = run.agentId ? agentMap.get(run.agentId) : null;
        const startedAt = run.startedAt ?? run.createdAt;
        events.push({
          id: `run-start-${run.runId}`,
          type: "run_started",
          timestamp: new Date(startedAt).toISOString(),
          agentId: run.agentId,
          agentName: agent?.name ?? null,
          agentIcon: agent?.icon ?? null,
          runId: run.runId,
          runStatus: run.status,
          summary: `${agent?.name ?? "Agent"} started a run`,
          detail: null,
          delegatedToAgentId: null,
          delegatedToAgentName: null,
        });

        if (run.finishedAt) {
          events.push({
            id: `run-finish-${run.runId}`,
            type: run.status === "succeeded" ? "run_completed" : "run_failed",
            timestamp: new Date(run.finishedAt).toISOString(),
            agentId: run.agentId,
            agentName: agent?.name ?? null,
            agentIcon: agent?.icon ?? null,
            runId: run.runId,
            runStatus: run.status,
            summary: `${agent?.name ?? "Agent"} ${run.status === "succeeded" ? "completed" : run.status === "failed" ? "failed" : run.status === "cancelled" ? "cancelled" : "finished"} the run`,
            detail: null,
            delegatedToAgentId: null,
            delegatedToAgentName: null,
          });
        }
      }

      // Add activity events
      for (const act of activities) {
        const agent = act.agentId ? agentMap.get(act.agentId) : null;
        let type = "activity";
        let summary = act.action;
        let delegatedToAgentId: string | null = null;
        let delegatedToAgentName: string | null = null;

        if (act.action === "issue.checked_out") {
          type = "checkout";
          summary = `${agent?.name ?? "Agent"} checked out the issue`;
        } else if (act.action === "issue.comment_added") {
          type = "comment";
          summary = `${agent?.name ?? "Someone"} added a comment`;
          const details = act.details as Record<string, unknown> | null;
          if (details?.body) {
            // Truncate long comments
            const body = String(details.body);
            // detail set below
          }
        } else if (act.action === "issue.updated") {
          const details = act.details as Record<string, unknown> | null;
          if (details?.assigneeAgentId && details.assigneeAgentId !== issue.assigneeAgentId) {
            type = "delegation";
            const newAgent = agentMap.get(details.assigneeAgentId as string);
            delegatedToAgentId = details.assigneeAgentId as string;
            delegatedToAgentName = newAgent?.name ?? null;
            summary = `${agent?.name ?? "Agent"} delegated to ${newAgent?.name ?? "another agent"}`;
          } else if (details?.status) {
            type = "status_change";
            summary = `${agent?.name ?? "Someone"} changed status to ${details.status}`;
          } else {
            type = "update";
            summary = `${agent?.name ?? "Someone"} updated the issue`;
          }
        } else if (act.action === "issue.created") {
          type = "created";
          summary = `${agent?.name ?? "Someone"} created the issue`;
        } else if (act.action === "issue.attachment_added") {
          type = "artifact";
          summary = `${agent?.name ?? "Someone"} added an attachment`;
        } else if (act.action === "issue.document_created") {
          type = "artifact";
          summary = `${agent?.name ?? "Someone"} created a document`;
        }

        events.push({
          id: act.id,
          type,
          timestamp: new Date(act.createdAt).toISOString(),
          agentId: act.agentId,
          agentName: agent?.name ?? null,
          agentIcon: agent?.icon ?? null,
          runId: act.runId,
          runStatus: null,
          summary,
          detail: act.details ? JSON.stringify(act.details).slice(0, 200) : null,
          delegatedToAgentId,
          delegatedToAgentName,
        });
      }

      // Sort chronologically
      events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      return events;
    },
  };
}
