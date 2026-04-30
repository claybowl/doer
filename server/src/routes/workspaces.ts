import { Router } from "express";
import { z } from "zod";
import type { Db } from "@doerai/db";
import { createProjectSchema } from "@doerai/shared";
import { validate } from "../middleware/validate.js";
import { companyService, projectService, logActivity } from "../services/index.js";
import { assertCompanyAccess, assertBoard, getActorInfo } from "./authz.js";

const createWorkspaceSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).max(10).regex(/^[A-Z0-9]+$/, "Slug must be uppercase letters and numbers only").optional(),
  description: z.string().nullable().optional(),
});

const updateWorkspaceSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
});

function toWorkspaceShape(company: {
  id: string;
  name: string;
  description: string | null;
  issuePrefix: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: unknown;
}) {
  return {
    id: company.id,
    name: company.name,
    slug: company.issuePrefix,
    description: company.description,
    status: company.status,
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
  };
}

export function workspaceRoutes(db: Db) {
  const router = Router();
  const companies = companyService(db);
  const projects = projectService(db);

  // GET /api/workspaces — list accessible workspaces
  router.get("/workspaces", async (req, res) => {
    if (req.actor.type === "none") {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (req.actor.type === "agent") {
      const companyId = req.actor.companyId;
      if (!companyId) {
        res.json([]);
        return;
      }
      const company = await companies.getById(companyId);
      res.json(company ? [toWorkspaceShape(company)] : []);
      return;
    }
    // Board user — filter to accessible companies
    const all = await companies.list();
    const isAdmin = req.actor.source === "local_implicit" || req.actor.isInstanceAdmin;
    const allowed = isAdmin ? all : all.filter((c) => (req.actor.companyIds ?? []).includes(c.id));
    res.json(allowed.map(toWorkspaceShape));
  });

  // GET /api/workspaces/:wsId — get workspace
  router.get("/workspaces/:wsId", async (req, res) => {
    const wsId = req.params.wsId as string;
    assertCompanyAccess(req, wsId);
    const company = await companies.getById(wsId);
    if (!company) {
      res.status(404).json({ error: "Workspace not found" });
      return;
    }
    res.json(toWorkspaceShape(company));
  });

  // POST /api/workspaces — create workspace (board only)
  router.post("/workspaces", validate(createWorkspaceSchema), async (req, res) => {
    assertBoard(req);
    const { name, slug, description } = req.body as z.infer<typeof createWorkspaceSchema>;
    const company = await companies.create({
      name,
      description: description ?? null,
      ...(slug ? { issuePrefix: slug } : {}),
    } as Parameters<typeof companies.create>[0]);

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId: company.id,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "workspace.created",
      entityType: "company",
      entityId: company.id,
      details: { name: company.name },
    });

    res.status(201).json(toWorkspaceShape(company));
  });

  // PATCH /api/workspaces/:wsId — update workspace
  router.patch("/workspaces/:wsId", validate(updateWorkspaceSchema), async (req, res) => {
    const wsId = req.params.wsId as string;
    assertCompanyAccess(req, wsId);
    const existing = await companies.getById(wsId);
    if (!existing) {
      res.status(404).json({ error: "Workspace not found" });
      return;
    }
    const { name, description } = req.body as z.infer<typeof updateWorkspaceSchema>;
    const updated = await companies.update(wsId, {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
    });

    if (!updated) {
      res.status(404).json({ error: "Workspace not found" });
      return;
    }

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId: wsId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "workspace.updated",
      entityType: "company",
      entityId: wsId,
      details: req.body,
    });

    res.json(toWorkspaceShape(updated));
  });

  // DELETE /api/workspaces/:wsId — archive workspace (soft delete)
  router.delete("/workspaces/:wsId", async (req, res) => {
    assertBoard(req);
    const wsId = req.params.wsId as string;
    const existing = await companies.getById(wsId);
    if (!existing) {
      res.status(404).json({ error: "Workspace not found" });
      return;
    }
    assertCompanyAccess(req, wsId);
    await companies.update(wsId, { status: "archived" } as Parameters<typeof companies.update>[1]);

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId: wsId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "workspace.archived",
      entityType: "company",
      entityId: wsId,
      details: { reason: "user_deleted" },
    });

    res.status(204).end();
  });

  // GET /api/workspaces/:wsId/projects — list projects in workspace
  router.get("/workspaces/:wsId/projects", async (req, res) => {
    const wsId = req.params.wsId as string;
    assertCompanyAccess(req, wsId);
    const result = await projects.list(wsId);
    res.json(result);
  });

  // POST /api/workspaces/:wsId/projects — create project in workspace
  router.post("/workspaces/:wsId/projects", validate(createProjectSchema), async (req, res) => {
    const wsId = req.params.wsId as string;
    assertCompanyAccess(req, wsId);

    type CreateProjectPayload = Parameters<typeof projects.create>[1] & {
      workspace?: Parameters<typeof projects.createWorkspace>[1];
    };
    const { workspace, ...projectData } = req.body as CreateProjectPayload;
    const project = await projects.create(wsId, projectData);

    let createdWorkspaceId: string | null = null;
    if (workspace) {
      const ws = await projects.createWorkspace(project.id, workspace);
      if (!ws) {
        await projects.remove(project.id);
        res.status(422).json({ error: "Invalid project workspace payload" });
        return;
      }
      createdWorkspaceId = ws.id;
    }

    const hydratedProject = workspace ? await projects.getById(project.id) : project;
    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId: wsId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "project.created",
      entityType: "project",
      entityId: project.id,
      details: { name: project.name, workspaceId: createdWorkspaceId },
    });

    res.status(201).json(hydratedProject ?? project);
  });

  return router;
}
