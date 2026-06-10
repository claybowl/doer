import { Router } from "express";
import type { Db } from "@doerai/db";
import { teamImportService } from "../services/team-import.js";
import { planEnforcementService } from "../services/plan-enforcement.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";

/**
 * Starter Teams — list bundled team manifests and import one into a company.
 * Import hires real agents, so it enforces the same plan limits as single
 * hires and writes the activity log per core invariant (inside the service).
 */
export function teamRoutes(db: Db) {
  const router = Router();
  const svc = teamImportService(db);
  const planEnforcement = planEnforcementService(db);

  router.get("/companies/:companyId/teams", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    res.json(await svc.listTeams());
  });

  router.post("/companies/:companyId/teams/:teamId/import", async (req, res) => {
    const companyId = req.params.companyId as string;
    const teamId = req.params.teamId as string;
    assertCompanyAccess(req, companyId);
    await planEnforcement.assertCanCreateAgent(companyId);

    const actor = getActorInfo(req);
    const result = await svc.importTeam(companyId, teamId, {
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
    });
    res.status(201).json(result);
  });

  return router;
}
