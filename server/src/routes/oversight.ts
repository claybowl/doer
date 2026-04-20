import { Router } from "express";
import { and, eq, gte, inArray } from "drizzle-orm";
import type { Db } from "@doerai/db";
import { activityLog, agents, goals } from "@doerai/db";
import { assertCompanyAccess } from "./authz.js";
import type { OversightData, OversightAgent } from "@doerai/shared";

const WINDOW_DAYS = 7;

export function oversightRoutes(db: Db) {
	const router = Router();

	router.get("/companies/:companyId/oversight", async (req, res) => {
		const companyId = req.params.companyId as string;
		assertCompanyAccess(req, companyId);

		const windowStart = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

		const [agentRows, goalRows, activityRows] = await Promise.all([
			db
				.select()
				.from(agents)
				.where(eq(agents.companyId, companyId)),
			db
				.select()
				.from(goals)
				.where(
					and(
						eq(goals.companyId, companyId),
						inArray(goals.status, ["active", "in_progress", "planned"]),
					),
				),
			db
				.select()
				.from(activityLog)
				.where(
					and(
						eq(activityLog.companyId, companyId),
						gte(activityLog.createdAt, windowStart),
					),
				)
				.orderBy(activityLog.createdAt),
		]);

		const oversightAgents: OversightAgent[] = agentRows.map((agent) => {
			const agentGoals = goalRows.filter((g) => g.ownerAgentId === agent.id);
			const agentActivity = activityRows.filter((a) => a.agentId === agent.id);

			return {
				id: agent.id,
				name: agent.name,
				title: agent.title,
				role: agent.role,
				status: agent.status,
				budgetMonthlyCents: agent.budgetMonthlyCents,
				spentMonthlyCents: agent.spentMonthlyCents,
				activeGoals: agentGoals.map((g) => ({
					id: g.id,
					title: g.title,
					description: g.description,
					status: g.status,
					level: g.level,
					parentId: g.parentId,
				})),
				recentActivity: agentActivity.map((a) => ({
					id: a.id,
					action: a.action,
					entityType: a.entityType,
					entityId: a.entityId,
					details: a.details,
					createdAt: a.createdAt,
				})),
			};
		});

		const result: OversightData = {
			agents: oversightAgents,
			windowDays: WINDOW_DAYS,
			generatedAt: new Date(),
		};

		res.json(result);
	});

	return router;
}
