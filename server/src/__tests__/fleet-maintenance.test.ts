import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  activityLog,
  agentRuntimeState,
  agents,
  agentWakeupRequests,
  companies,
  createDb,
  heartbeatRuns,
  issues,
} from "@doerai/db";
import {
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "./helpers/embedded-postgres.js";
import { heartbeatService } from "../services/heartbeat.ts";

const embeddedPostgresSupport = await getEmbeddedPostgresTestSupport();
const describeEmbeddedPostgres = embeddedPostgresSupport.supported ? describe : describe.skip;

if (!embeddedPostgresSupport.supported) {
  console.warn(
    `Skipping embedded Postgres fleet maintenance tests on this host: ${embeddedPostgresSupport.reason ?? "unsupported environment"}`,
  );
}

describeEmbeddedPostgres("fleet maintenance sweeps", () => {
  let db!: ReturnType<typeof createDb>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;

  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("doer-fleet-maintenance-");
    db = createDb(tempDb.connectionString);
  }, 20_000);

  afterEach(async () => {
    await db.delete(activityLog);
    await db.delete(issues);
    await db.delete(heartbeatRuns);
    await db.delete(agentWakeupRequests);
    await db.delete(agentRuntimeState);
    await db.delete(agents);
    await db.delete(companies);
  });

  afterAll(async () => {
    await tempDb?.cleanup();
  });

  async function seedCompany() {
    const companyId = randomUUID();
    const issuePrefix = `T${companyId.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
    await db.insert(companies).values({
      id: companyId,
      name: "Doer",
      issuePrefix,
      requireBoardApprovalForNewAgents: false,
    });
    return { companyId, issuePrefix };
  }

  async function seedAgent(input: {
    companyId: string;
    status: string;
    lastRunStatus?: string | null;
    withRuntimeState?: boolean;
  }) {
    const agentId = randomUUID();
    await db.insert(agents).values({
      id: agentId,
      companyId: input.companyId,
      name: `Agent-${agentId.slice(0, 6)}`,
      role: "engineer",
      status: input.status,
      adapterType: "codex_local",
      adapterConfig: {},
      runtimeConfig: {},
      permissions: {},
    });
    if (input.withRuntimeState !== false) {
      await db.insert(agentRuntimeState).values({
        agentId,
        companyId: input.companyId,
        adapterType: "codex_local",
        lastRunStatus: input.lastRunStatus ?? null,
      });
    }
    return agentId;
  }

  describe("resetStaleErrorAgents", () => {
    it("resets error agents whose last run succeeded back to idle and logs the reset", async () => {
      const { companyId } = await seedCompany();
      const agentId = await seedAgent({ companyId, status: "error", lastRunStatus: "succeeded" });
      const heartbeat = heartbeatService(db);

      const result = await heartbeat.resetStaleErrorAgents({ minErrorAgeMs: 0 });
      expect(result.reset).toBe(1);
      expect(result.agentIds).toEqual([agentId]);

      const agent = await db
        .select()
        .from(agents)
        .where(eq(agents.id, agentId))
        .then((rows) => rows[0]);
      expect(agent.status).toBe("idle");

      const logEntries = await db
        .select()
        .from(activityLog)
        .where(and(eq(activityLog.entityId, agentId), eq(activityLog.action, "agent.status_auto_reset")));
      expect(logEntries).toHaveLength(1);
      expect(logEntries[0]?.companyId).toBe(companyId);
      expect(logEntries[0]?.actorType).toBe("system");
      expect(logEntries[0]?.details).toMatchObject({
        fromStatus: "error",
        toStatus: "idle",
        reason: "last_run_succeeded",
      });

      // Idempotent: a second sweep finds nothing to reset.
      const second = await heartbeat.resetStaleErrorAgents({ minErrorAgeMs: 0 });
      expect(second.reset).toBe(0);
    });

    it("leaves error agents alone when the last run failed or no runtime state exists", async () => {
      const { companyId } = await seedCompany();
      const failedAgentId = await seedAgent({ companyId, status: "error", lastRunStatus: "failed" });
      const noStateAgentId = await seedAgent({ companyId, status: "error", withRuntimeState: false });
      const runningAgentId = await seedAgent({ companyId, status: "running", lastRunStatus: "succeeded" });
      const heartbeat = heartbeatService(db);

      const result = await heartbeat.resetStaleErrorAgents({ minErrorAgeMs: 0 });
      expect(result.reset).toBe(0);

      const rows = await db.select().from(agents);
      const byId = new Map(rows.map((row) => [row.id, row.status]));
      expect(byId.get(failedAgentId)).toBe("error");
      expect(byId.get(noStateAgentId)).toBe("error");
      expect(byId.get(runningAgentId)).toBe("running");
    });

    it("respects the minimum error age before resetting", async () => {
      const { companyId } = await seedCompany();
      const agentId = await seedAgent({ companyId, status: "error", lastRunStatus: "succeeded" });
      const heartbeat = heartbeatService(db);

      // Agent just transitioned to error; a 1-hour minimum age must skip it.
      const result = await heartbeat.resetStaleErrorAgents({ minErrorAgeMs: 60 * 60 * 1000 });
      expect(result.reset).toBe(0);

      await db
        .update(agents)
        .set({ updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) })
        .where(eq(agents.id, agentId));

      const aged = await heartbeat.resetStaleErrorAgents({ minErrorAgeMs: 60 * 60 * 1000 });
      expect(aged.reset).toBe(1);
    });
  });

  describe("reapStaleExecutionLocks", () => {
    async function seedLockedIssue(input: {
      companyId: string;
      issuePrefix: string;
      agentId: string;
      runStatus: string | null;
      lockedAt: Date;
      executionRunIdNull?: boolean;
    }) {
      const runId = randomUUID();
      const issueId = randomUUID();
      if (input.runStatus != null) {
        await db.insert(heartbeatRuns).values({
          id: runId,
          companyId: input.companyId,
          agentId: input.agentId,
          invocationSource: "assignment",
          triggerDetail: "system",
          status: input.runStatus,
          contextSnapshot: { issueId },
          startedAt: input.lockedAt,
        });
      }
      await db.insert(issues).values({
        id: issueId,
        companyId: input.companyId,
        title: "Locked issue",
        status: "in_progress",
        priority: "medium",
        assigneeAgentId: input.agentId,
        checkoutRunId: input.runStatus != null ? runId : null,
        executionRunId: input.executionRunIdNull || input.runStatus == null ? null : runId,
        executionAgentNameKey: "agent",
        executionLockedAt: input.lockedAt,
        issueNumber: 1,
        identifier: `${input.issuePrefix}-1`,
      });
      return { issueId, runId };
    }

    it("releases stale locks whose runs are dead and logs the release", async () => {
      const { companyId, issuePrefix } = await seedCompany();
      const agentId = await seedAgent({ companyId, status: "idle", withRuntimeState: false });
      const staleLockedAt = new Date(Date.now() - 3 * 60 * 60 * 1000);
      const { issueId, runId } = await seedLockedIssue({
        companyId,
        issuePrefix,
        agentId,
        runStatus: "failed",
        lockedAt: staleLockedAt,
      });
      const heartbeat = heartbeatService(db);

      const result = await heartbeat.reapStaleExecutionLocks({ staleThresholdMs: 2 * 60 * 60 * 1000 });
      expect(result.released).toBe(1);
      expect(result.issueIds).toEqual([issueId]);
      expect(result.skippedLive).toBe(0);

      const issue = await db
        .select()
        .from(issues)
        .where(eq(issues.id, issueId))
        .then((rows) => rows[0]);
      expect(issue.executionRunId).toBeNull();
      expect(issue.checkoutRunId).toBeNull();
      expect(issue.executionLockedAt).toBeNull();
      expect(issue.executionAgentNameKey).toBeNull();

      const logEntries = await db
        .select()
        .from(activityLog)
        .where(and(eq(activityLog.entityId, issueId), eq(activityLog.action, "issue.execution_lock_reaped")));
      expect(logEntries).toHaveLength(1);
      expect(logEntries[0]?.details).toMatchObject({
        previousExecutionRunId: runId,
        executionRunStatus: "failed",
        staleThresholdMs: 2 * 60 * 60 * 1000,
      });

      // Idempotent: second sweep has nothing to release.
      const second = await heartbeat.reapStaleExecutionLocks({ staleThresholdMs: 2 * 60 * 60 * 1000 });
      expect(second.released).toBe(0);
    });

    it("never reaps a lock whose heartbeat run is still live", async () => {
      const { companyId, issuePrefix } = await seedCompany();
      const agentId = await seedAgent({ companyId, status: "running", withRuntimeState: false });
      const { issueId } = await seedLockedIssue({
        companyId,
        issuePrefix,
        agentId,
        runStatus: "running",
        lockedAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
      });
      const heartbeat = heartbeatService(db);

      const result = await heartbeat.reapStaleExecutionLocks({ staleThresholdMs: 2 * 60 * 60 * 1000 });
      expect(result.released).toBe(0);
      expect(result.skippedLive).toBe(1);

      const issue = await db
        .select()
        .from(issues)
        .where(eq(issues.id, issueId))
        .then((rows) => rows[0]);
      expect(issue.executionRunId).not.toBeNull();
      expect(issue.executionLockedAt).not.toBeNull();
    });

    it("keeps locks younger than the staleness threshold", async () => {
      const { companyId, issuePrefix } = await seedCompany();
      const agentId = await seedAgent({ companyId, status: "idle", withRuntimeState: false });
      const { issueId } = await seedLockedIssue({
        companyId,
        issuePrefix,
        agentId,
        runStatus: "failed",
        lockedAt: new Date(Date.now() - 10 * 60 * 1000),
      });
      const heartbeat = heartbeatService(db);

      const result = await heartbeat.reapStaleExecutionLocks({ staleThresholdMs: 2 * 60 * 60 * 1000 });
      expect(result.released).toBe(0);

      const issue = await db
        .select()
        .from(issues)
        .where(eq(issues.id, issueId))
        .then((rows) => rows[0]);
      expect(issue.executionLockedAt).not.toBeNull();
    });

    it("releases stale locks that have no execution run at all", async () => {
      const { companyId, issuePrefix } = await seedCompany();
      const agentId = await seedAgent({ companyId, status: "idle", withRuntimeState: false });
      const { issueId } = await seedLockedIssue({
        companyId,
        issuePrefix,
        agentId,
        runStatus: null,
        lockedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      });
      const heartbeat = heartbeatService(db);

      const result = await heartbeat.reapStaleExecutionLocks({ staleThresholdMs: 2 * 60 * 60 * 1000 });
      expect(result.released).toBe(1);

      const issue = await db
        .select()
        .from(issues)
        .where(eq(issues.id, issueId))
        .then((rows) => rows[0]);
      expect(issue.executionLockedAt).toBeNull();
    });
  });
});
