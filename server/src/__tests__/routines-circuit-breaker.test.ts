import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  activityLog,
  agents,
  companies,
  createDb,
  heartbeatRuns,
  issues,
  projects,
  routineRuns,
  routines,
  routineTriggers,
} from "@doerai/db";
import {
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "./helpers/embedded-postgres.js";
import { issueService } from "../services/issues.ts";
import { routineService } from "../services/routines.ts";

const embeddedPostgresSupport = await getEmbeddedPostgresTestSupport();
const describeEmbeddedPostgres = embeddedPostgresSupport.supported ? describe : describe.skip;

if (!embeddedPostgresSupport.supported) {
  console.warn(
    `Skipping embedded Postgres routine circuit-breaker tests on this host: ${embeddedPostgresSupport.reason ?? "unsupported environment"}`,
  );
}

const CIRCUIT_BREAKER_MAX_OPEN_ISSUES = 2;

describeEmbeddedPostgres("routine circuit breaker", () => {
  let db!: ReturnType<typeof createDb>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;

  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("doer-routine-breaker-");
    db = createDb(tempDb.connectionString);
  }, 20_000);

  afterEach(async () => {
    await db.delete(activityLog);
    await db.delete(routineRuns);
    await db.delete(routineTriggers);
    await db.delete(routines);
    await db.delete(heartbeatRuns);
    await db.delete(issues);
    await db.delete(projects);
    await db.delete(agents);
    await db.delete(companies);
  });

  afterAll(async () => {
    await tempDb?.cleanup();
  });

  async function seedFixture() {
    const companyId = randomUUID();
    const agentId = randomUUID();
    const projectId = randomUUID();
    const issuePrefix = `T${companyId.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
    const wakeups: Array<{ agentId: string; issueId: string | null }> = [];

    await db.insert(companies).values({
      id: companyId,
      name: "Doer",
      issuePrefix,
      requireBoardApprovalForNewAgents: false,
    });

    await db.insert(agents).values({
      id: agentId,
      companyId,
      name: "CodexCoder",
      role: "engineer",
      status: "active",
      adapterType: "codex_local",
      adapterConfig: {},
      runtimeConfig: {},
      permissions: {},
    });

    await db.insert(projects).values({
      id: projectId,
      companyId,
      name: "Routines",
      status: "in_progress",
    });

    const svc = routineService(db, {
      circuitBreakerMaxOpenIssues: CIRCUIT_BREAKER_MAX_OPEN_ISSUES,
      heartbeat: {
        wakeup: async (wakeupAgentId, wakeupOpts) => {
          const issueId =
            (typeof wakeupOpts.payload?.issueId === "string" && wakeupOpts.payload.issueId) ||
            (typeof wakeupOpts.contextSnapshot?.issueId === "string" && wakeupOpts.contextSnapshot.issueId) ||
            null;
          wakeups.push({ agentId: wakeupAgentId, issueId });
          if (!issueId) return null;
          const queuedRunId = randomUUID();
          await db.insert(heartbeatRuns).values({
            id: queuedRunId,
            companyId,
            agentId: wakeupAgentId,
            invocationSource: wakeupOpts.source ?? "assignment",
            triggerDetail: wakeupOpts.triggerDetail ?? null,
            status: "queued",
            contextSnapshot: { ...(wakeupOpts.contextSnapshot ?? {}), issueId },
          });
          await db
            .update(issues)
            .set({ executionRunId: queuedRunId, executionLockedAt: new Date() })
            .where(eq(issues.id, issueId));
          return { id: queuedRunId };
        },
      },
    });
    const issueSvc = issueService(db);
    const routine = await svc.create(
      companyId,
      {
        projectId,
        goalId: null,
        parentIssueId: null,
        title: "runaway routine",
        description: "Spawns issues forever",
        assigneeAgentId: agentId,
        priority: "medium",
        status: "active",
        concurrencyPolicy: "coalesce_if_active",
        catchUpPolicy: "skip_missed",
      },
      {},
    );

    return { companyId, agentId, projectId, routine, svc, issueSvc, wakeups };
  }

  async function seedOpenRoutineIssues(
    fixture: Awaited<ReturnType<typeof seedFixture>>,
    count: number,
  ) {
    for (let i = 0; i < count; i += 1) {
      await fixture.issueSvc.create(fixture.companyId, {
        projectId: fixture.routine.projectId,
        title: `${fixture.routine.title} #${i + 1}`,
        description: fixture.routine.description,
        status: "todo",
        priority: fixture.routine.priority,
        assigneeAgentId: fixture.routine.assigneeAgentId,
        originKind: "routine_execution",
        originId: fixture.routine.id,
        originRunId: randomUUID(),
      });
    }
  }

  it("auto-pauses a runaway routine that crosses the open-issue threshold with zero completions", async () => {
    const fixture = await seedFixture();
    // Threshold is 2; a runaway routine with 3 open spawned issues must trip.
    await seedOpenRoutineIssues(fixture, 3);

    const run = await fixture.svc.runRoutine(fixture.routine.id, { source: "manual" });

    expect(run.status).toBe("failed");
    expect(run.failureReason).toContain("circuit_breaker");
    expect(run.failureReason).toContain("3 open spawned issues");

    const paused = await fixture.svc.get(fixture.routine.id);
    expect(paused?.status).toBe("paused");

    // No new issue was spawned and no wakeup was enqueued.
    const routineIssues = await db
      .select({ id: issues.id })
      .from(issues)
      .where(eq(issues.originId, fixture.routine.id));
    expect(routineIssues).toHaveLength(3);
    expect(fixture.wakeups).toHaveLength(0);

    const logEntries = await db
      .select()
      .from(activityLog)
      .where(
        and(
          eq(activityLog.entityId, fixture.routine.id),
          eq(activityLog.action, "routine.circuit_breaker_tripped"),
        ),
      );
    expect(logEntries).toHaveLength(1);
    expect(logEntries[0]?.companyId).toBe(fixture.companyId);
    expect(logEntries[0]?.actorType).toBe("system");
    expect(logEntries[0]?.details).toMatchObject({
      openIssueCount: 3,
      completedSinceLastSpawn: 0,
      threshold: CIRCUIT_BREAKER_MAX_OPEN_ISSUES,
      routineStatus: "paused",
    });

    // A second dispatch attempt stays blocked but does not spam the activity log.
    const secondRun = await fixture.svc.runRoutine(fixture.routine.id, { source: "manual" });
    expect(secondRun.status).toBe("failed");
    const logEntriesAfter = await db
      .select()
      .from(activityLog)
      .where(eq(activityLog.action, "routine.circuit_breaker_tripped"));
    expect(logEntriesAfter).toHaveLength(1);
  });

  it("does not trip when the routine is completing work since its last spawn", async () => {
    const fixture = await seedFixture();
    await seedOpenRoutineIssues(fixture, 3);

    const lastEnqueuedAt = new Date(Date.now() - 60 * 60 * 1000);
    await db
      .update(routines)
      .set({ lastEnqueuedAt })
      .where(eq(routines.id, fixture.routine.id));

    await db.insert(routineRuns).values({
      id: randomUUID(),
      companyId: fixture.companyId,
      routineId: fixture.routine.id,
      triggerId: null,
      source: "schedule",
      status: "completed",
      triggeredAt: new Date(),
      completedAt: new Date(),
    });

    const routine = await fixture.svc.get(fixture.routine.id);
    const svc = routineService(db, {
      circuitBreakerMaxOpenIssues: CIRCUIT_BREAKER_MAX_OPEN_ISSUES,
      heartbeat: {
        wakeup: async () => null,
      },
    });
    const run = await svc.runRoutine(fixture.routine.id, { source: "manual" });

    expect(run.status).toBe("issue_created");
    const after = await fixture.svc.get(fixture.routine.id);
    expect(after?.status).toBe("active");
    expect(routine?.lastEnqueuedAt).not.toBeNull();
  });

  it("does not trip below the open-issue threshold", async () => {
    const fixture = await seedFixture();
    await seedOpenRoutineIssues(fixture, CIRCUIT_BREAKER_MAX_OPEN_ISSUES);

    const run = await fixture.svc.runRoutine(fixture.routine.id, { source: "manual" });

    expect(run.status).toBe("issue_created");
    const after = await fixture.svc.get(fixture.routine.id);
    expect(after?.status).toBe("active");

    const logEntries = await db
      .select()
      .from(activityLog)
      .where(eq(activityLog.action, "routine.circuit_breaker_tripped"));
    expect(logEntries).toHaveLength(0);
  });
});
