import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { agents, companies, costEvents, createDb, heartbeatRuns } from "@doerai/db";
import {
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "./helpers/embedded-postgres.js";
import { costService } from "../services/costs.ts";

const embeddedPostgresSupport = await getEmbeddedPostgresTestSupport();
const describeEmbeddedPostgres = embeddedPostgresSupport.supported ? describe : describe.skip;

if (!embeddedPostgresSupport.supported) {
  console.warn(
    `Skipping embedded Postgres cost service tests on this host: ${embeddedPostgresSupport.reason ?? "unsupported environment"}`,
  );
}

describeEmbeddedPostgres("costService rollups (embedded postgres)", () => {
  let db!: ReturnType<typeof createDb>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;

  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("doer-costs-service-");
    db = createDb(tempDb.connectionString);
  }, 20_000);

  afterEach(async () => {
    await db.delete(costEvents);
    await db.delete(heartbeatRuns);
    await db.delete(agents);
    await db.delete(companies);
  });

  afterAll(async () => {
    await tempDb?.cleanup();
  });

  async function seedFixtures() {
    const companyId = randomUUID();
    const agentId = randomUUID();
    await db.insert(companies).values({
      id: companyId,
      name: "Doer",
      issuePrefix: `T${companyId.replace(/-/g, "").slice(0, 6).toUpperCase()}`,
      requireBoardApprovalForNewAgents: false,
    });
    await db.insert(agents).values({
      id: agentId,
      companyId,
      name: "CostAgent",
      role: "engineer",
      status: "active",
      adapterType: "letta_code",
      adapterConfig: {},
      runtimeConfig: {},
      permissions: {},
    });
    await db.insert(costEvents).values([
      {
        companyId,
        agentId,
        provider: "letta",
        biller: "letta",
        billingType: "unknown",
        model: "kimi-k2-5",
        inputTokens: 1000,
        outputTokens: 200,
        costCents: 5,
        occurredAt: new Date("2026-08-01T12:00:00.000Z"),
      },
      {
        companyId,
        agentId,
        provider: "letta",
        biller: "letta",
        billingType: "metered_api",
        model: "kimi-k2-5",
        inputTokens: 500,
        outputTokens: 100,
        costCents: 3,
        occurredAt: new Date("2026-08-05T12:00:00.000Z"),
      },
    ]);
    return { companyId, agentId };
  }

  it("byAgent works WITHOUT a date range (regression: 2026-08-09 500)", async () => {
    const { companyId, agentId } = await seedFixtures();
    const svc = costService(db);
    const rows = await svc.byAgent(companyId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.agentId).toBe(agentId);
    expect(rows[0]?.costCents).toBe(8);
  });

  it("byAgent works with a date range", async () => {
    const { companyId } = await seedFixtures();
    const svc = costService(db);
    const rows = await svc.byAgent(companyId, {
      from: new Date("2026-08-01T00:00:00.000Z"),
      to: new Date("2026-08-31T23:59:59.999Z"),
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.costCents).toBe(8);
  });

  // Historical root cause of the 2026-08-09 fleet 500: the v0.3.1 byAgent ran a
  // second query over heartbeat_runs casting `usage_json ->> 'inputTokens'`
  // straight to int. Old runs with non-integer token values (or sums overflowing
  // int4) made the unfiltered query throw; any ?from= filter excluded those old
  // runs, which is why the endpoint only 500'd without a date range. The current
  // byAgent derives everything from cost_events and must not depend on
  // heartbeat_runs.usageJson content at all.
  it("byAgent ignores malformed heartbeat_runs.usageJson that broke the v0.3.1 query", async () => {
    const { companyId, agentId } = await seedFixtures();
    await db.insert(heartbeatRuns).values({
      id: randomUUID(),
      companyId,
      agentId,
      status: "succeeded",
      startedAt: new Date("2026-05-01T10:00:00.000Z"),
      finishedAt: new Date("2026-05-01T10:05:00.000Z"),
      usageJson: { inputTokens: 12345.67, outputTokens: 89.1, billingType: "subscription" },
    });

    // The v0.3.1 query shape throws on this data — prove the trap is real.
    await expect(
      db.execute(
        sql`select coalesce(sum(case when coalesce((usage_json ->> 'billingType'), 'unknown') = 'subscription' then coalesce((usage_json ->> 'inputTokens')::int, 0) else 0 end), 0)::int from heartbeat_runs where company_id = ${companyId}`,
      ),
    ).rejects.toThrow();

    // The current implementation must be immune, with or without a range.
    const svc = costService(db);
    const unfiltered = await svc.byAgent(companyId);
    expect(unfiltered).toHaveLength(1);
    expect(unfiltered[0]?.agentId).toBe(agentId);
    expect(unfiltered[0]?.costCents).toBe(8);

    const filtered = await svc.byAgent(companyId, { from: new Date("2026-08-01T00:00:00.000Z") });
    expect(filtered).toHaveLength(1);
  });

  it("records rate-card estimates in the ledger, distinguishable from provider-billed amounts", async () => {
    const companyId = randomUUID();
    const agentId = randomUUID();
    await db.insert(companies).values({
      id: companyId,
      name: "Doer",
      issuePrefix: `T${companyId.replace(/-/g, "").slice(0, 6).toUpperCase()}`,
      requireBoardApprovalForNewAgents: false,
      budgetMonthlyCents: 1000,
    });
    await db.insert(agents).values({
      id: agentId,
      companyId,
      name: "LettaAgent",
      role: "engineer",
      status: "active",
      adapterType: "letta_code",
      adapterConfig: {},
      runtimeConfig: {},
      permissions: {},
    });

    const svc = costService(db);
    const estimated = await svc.createEvent(companyId, {
      heartbeatRunId: null,
      agentId,
      provider: "letta",
      biller: "letta",
      billingType: "unknown",
      model: "kimi-k2-5",
      inputTokens: 12_345,
      cachedInputTokens: 0,
      outputTokens: 678,
      costCents: 4,
      costEstimated: true,
      occurredAt: new Date(),
    });
    expect(estimated.costEstimated).toBe(true);

    const billed = await svc.createEvent(companyId, {
      heartbeatRunId: null,
      agentId,
      provider: "anthropic",
      biller: "anthropic",
      billingType: "metered_api",
      model: "claude-opus-4",
      inputTokens: 100,
      cachedInputTokens: 0,
      outputTokens: 50,
      costCents: 6,
      costEstimated: false,
      occurredAt: new Date(),
    });
    expect(billed.costEstimated).toBe(false);

    // Estimated spend counts toward the same totals/utilization as billed spend…
    const summary = await svc.summary(companyId);
    expect(summary.spendCents).toBe(10);
    expect(summary.estimatedCostCents).toBe(4);
    expect(summary.utilizationPercent).toBe(1);

    const byAgent = await svc.byAgent(companyId);
    expect(byAgent).toHaveLength(1);
    expect(byAgent[0]?.costCents).toBe(10);
    expect(byAgent[0]?.estimatedCostCents).toBe(4);

    const windows = await svc.windowSpend(companyId);
    const lettaWindows = windows.filter((row) => row.provider === "letta");
    expect(lettaWindows).toHaveLength(3);
    for (const row of lettaWindows) {
      expect(row.costCents).toBe(4);
      expect(row.estimatedCostCents).toBe(4);
    }
    const anthropicWindows = windows.filter((row) => row.provider === "anthropic");
    for (const row of anthropicWindows) {
      expect(row.costCents).toBe(6);
      expect(row.estimatedCostCents).toBe(0);
    }

    // …and flows into the monthly spend rollups used by budget enforcement.
    const [agentRow] = await db.select().from(agents).where(eq(agents.id, agentId));
    expect(agentRow?.spentMonthlyCents).toBe(10);
    const [companyRow] = await db.select().from(companies).where(eq(companies.id, companyId));
    expect(companyRow?.spentMonthlyCents).toBe(10);
  });
});
