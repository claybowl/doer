import { and, asc, count, eq, isNull } from "drizzle-orm";
import type { Db } from "@doerai/db";
import { goals, issues } from "@doerai/db";

type GoalReader = Pick<Db, "select">;

export async function getDefaultCompanyGoal(db: GoalReader, companyId: string) {
  const activeRootGoal = await db
    .select()
    .from(goals)
    .where(
      and(
        eq(goals.companyId, companyId),
        eq(goals.level, "company"),
        eq(goals.status, "active"),
        isNull(goals.parentId),
      ),
    )
    .orderBy(asc(goals.createdAt))
    .then((rows) => rows[0] ?? null);
  if (activeRootGoal) return activeRootGoal;

  const anyRootGoal = await db
    .select()
    .from(goals)
    .where(
      and(
        eq(goals.companyId, companyId),
        eq(goals.level, "company"),
        isNull(goals.parentId),
      ),
    )
    .orderBy(asc(goals.createdAt))
    .then((rows) => rows[0] ?? null);
  if (anyRootGoal) return anyRootGoal;

  return db
    .select()
    .from(goals)
    .where(and(eq(goals.companyId, companyId), eq(goals.level, "company")))
    .orderBy(asc(goals.createdAt))
    .then((rows) => rows[0] ?? null);
}

export async function getGoalProgress(db: Db, goalId: string) {
  // Count issues linked to this goal by status
  const issueCounts = await db
    .select({ status: issues.status, cnt: count() })
    .from(issues)
    .where(eq(issues.goalId, goalId))
    .groupBy(issues.status);

  const issueCount = issueCounts.reduce((sum, r) => sum + Number(r.cnt), 0);
  const doneCount = issueCounts.filter((r) => r.status === "done").reduce((sum, r) => sum + Number(r.cnt), 0);
  const inProgressCount = issueCounts.filter((r) => r.status === "in_progress").reduce((sum, r) => sum + Number(r.cnt), 0);
  const todoCount = issueCounts.filter((r) => r.status === "todo").reduce((sum, r) => sum + Number(r.cnt), 0);
  const percentComplete = issueCount > 0 ? Math.round((doneCount / issueCount) * 100) : 0;

  // Count child goals
  const childGoals = await db
    .select({ status: goals.status, cnt: count() })
    .from(goals)
    .where(eq(goals.parentId, goalId))
    .groupBy(goals.status);

  const childGoalCount = childGoals.reduce((sum, r) => sum + Number(r.cnt), 0);
  const childGoalsAchieved = childGoals.filter((r) => r.status === "achieved").reduce((sum, r) => sum + Number(r.cnt), 0);

  return { goalId, issueCount, doneCount, inProgressCount, todoCount, percentComplete, childGoalCount, childGoalsAchieved };
}

export function goalService(db: Db) {
  return {
    list: (companyId: string, filters?: { level?: string; status?: string }) => {
      const conditions = [eq(goals.companyId, companyId)];
      if (filters?.level) conditions.push(eq(goals.level, filters.level));
      if (filters?.status) conditions.push(eq(goals.status, filters.status));
      return db.select().from(goals).where(and(...conditions));
    },

    getById: (id: string) =>
      db
        .select()
        .from(goals)
        .where(eq(goals.id, id))
        .then((rows) => rows[0] ?? null),

    getDefaultCompanyGoal: (companyId: string) => getDefaultCompanyGoal(db, companyId),

    getProgress: (goalId: string) => getGoalProgress(db, goalId),

    create: (companyId: string, data: Omit<typeof goals.$inferInsert, "companyId">) =>
      db
        .insert(goals)
        .values({ ...data, companyId })
        .returning()
        .then((rows) => rows[0]),

    update: (id: string, data: Partial<typeof goals.$inferInsert>) =>
      db
        .update(goals)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(goals.id, id))
        .returning()
        .then((rows) => rows[0] ?? null),

    remove: async (id: string) => {
      return db.transaction(async (tx) => {
        // Nullify child goals so they become root goals rather than orphaning with a broken FK
        await tx.update(goals).set({ parentId: null }).where(eq(goals.parentId, id));
        // Nullify issues that reference this goal
        await tx.update(issues).set({ goalId: null }).where(eq(issues.goalId, id));
        // Now safe to delete
        const rows = await tx.delete(goals).where(eq(goals.id, id)).returning();
        return rows[0] ?? null;
      });
    },
  };
}
