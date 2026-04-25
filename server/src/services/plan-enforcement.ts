import type { Db } from "@doerai/db";
import { agents, companies, companyMemberships, usageRecords } from "@doerai/db";
import { eq, and, count, sql } from "drizzle-orm";
import { HttpError } from "../errors.js";
import { PLAN_LIMITS, type Plan } from "./stripe-billing.js";

export class PlanLimitError extends HttpError {
  constructor(message: string) {
    super(402, message);
    this.name = "PlanLimitError";
  }
}

export function planEnforcementService(db: Db) {
  async function getCompanyBillingState(companyId: string) {
    const [company] = await db.select().from(companies).where(eq(companies.id, companyId));
    if (!company) throw new Error("Company not found");
    return company;
  }

  function isWithinGracePeriod(company: { gracePeriodEnd: Date | null }): boolean {
    if (!company.gracePeriodEnd) return false;
    return company.gracePeriodEnd > new Date();
  }

  async function assertCanCreateAgent(companyId: string): Promise<void> {
    const company = await getCompanyBillingState(companyId);

    if (company.planStatus === "canceled" && !isWithinGracePeriod(company)) {
      throw new PlanLimitError("Subscription canceled. Please renew to continue creating agents.");
    }

    const plan = (company.plan ?? "free") as Plan;
    const limits = PLAN_LIMITS[plan];
    if (limits.maxAgents === Infinity) return;

    const [{ agentCount }] = await db
      .select({ agentCount: count() })
      .from(agents)
      .where(and(eq(agents.companyId, companyId), eq(agents.status, "active")));

    if (agentCount >= limits.maxAgents) {
      throw new PlanLimitError(
        `Agent limit reached (${limits.maxAgents}) for ${plan} plan. Upgrade to add more agents.`,
      );
    }
  }

  async function assertCanAddSeat(companyId: string): Promise<void> {
    const company = await getCompanyBillingState(companyId);

    if (company.planStatus === "canceled" && !isWithinGracePeriod(company)) {
      throw new PlanLimitError("Subscription canceled. Please renew to continue adding seats.");
    }

    const plan = (company.plan ?? "free") as Plan;
    const limits = PLAN_LIMITS[plan];
    if (limits.maxSeats === Infinity) return;

    const [{ seatCount }] = await db
      .select({ seatCount: count() })
      .from(companyMemberships)
      .where(and(eq(companyMemberships.companyId, companyId), eq(companyMemberships.status, "active")));

    if (seatCount >= limits.maxSeats) {
      throw new PlanLimitError(
        `Seat limit reached (${limits.maxSeats}) for ${plan} plan. Upgrade to add more members.`,
      );
    }
  }

  async function recordAgentTaskCompletion(companyId: string, agentHours: number): Promise<void> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Try insert first; if period record exists, increment
    const inserted = await db
      .insert(usageRecords)
      .values({ companyId, periodStart, agentHours: String(agentHours) })
      .onConflictDoNothing()
      .returning({ id: usageRecords.id });

    if (inserted.length === 0) {
      await db
        .update(usageRecords)
        .set({ agentHours: sql`agent_hours + ${agentHours}` })
        .where(
          and(
            eq(usageRecords.companyId, companyId),
            eq(usageRecords.periodStart, periodStart),
          ),
        );
    }
  }

  async function recordToolExecution(companyId: string): Promise<void> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const inserted = await db
      .insert(usageRecords)
      .values({ companyId, periodStart, toolExecs: 1 })
      .onConflictDoNothing()
      .returning({ id: usageRecords.id });

    if (inserted.length === 0) {
      await db
        .update(usageRecords)
        .set({ toolExecs: sql`tool_execs + 1` })
        .where(
          and(
            eq(usageRecords.companyId, companyId),
            eq(usageRecords.periodStart, periodStart),
          ),
        );
    }
  }

  return {
    assertCanCreateAgent,
    assertCanAddSeat,
    recordAgentTaskCompletion,
    recordToolExecution,
  };
}
