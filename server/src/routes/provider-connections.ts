import { Router } from "express";
import type { Db } from "@doerai/db";
import {
  createProviderConnectionSchema,
  updateProviderConnectionSchema,
} from "@doerai/shared";
import { validate } from "../middleware/validate.js";
import { logActivity, providerConnectionService } from "../services/index.js";
import { assertBoard, assertCompanyAccess } from "./authz.js";

export function providerConnectionRoutes(db: Db) {
  const router = Router();
  const service = providerConnectionService(db);

  router.get("/companies/:companyId/provider-connections", async (req, res) => {
    assertBoard(req);
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    res.json(await service.list(companyId));
  });

  router.post(
    "/companies/:companyId/provider-connections",
    validate(createProviderConnectionSchema),
    async (req, res) => {
      assertBoard(req);
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      const created = await service.create(companyId, req.body);
      await logActivity(db, {
        companyId,
        actorType: "user",
        actorId: req.actor.userId ?? "board",
        action: "provider_connection.created",
        entityType: "provider_connection",
        entityId: created.id,
        details: { name: created.name, providerType: created.providerType },
      });
      res.status(201).json(created);
    },
  );

  router.patch(
    "/provider-connections/:id",
    validate(updateProviderConnectionSchema),
    async (req, res) => {
      assertBoard(req);
      const id = req.params.id as string;
      const existing = await service.getById(id);
      if (!existing) {
        res.status(404).json({ error: "Provider connection not found" });
        return;
      }
      assertCompanyAccess(req, existing.companyId);
      const updated = await service.update(id, req.body);
      await logActivity(db, {
        companyId: existing.companyId,
        actorType: "user",
        actorId: req.actor.userId ?? "board",
        action: "provider_connection.updated",
        entityType: "provider_connection",
        entityId: id,
        details: { name: updated?.name, providerType: updated?.providerType },
      });
      res.json(updated);
    },
  );

  router.delete("/provider-connections/:id", async (req, res) => {
    assertBoard(req);
    const id = req.params.id as string;
    const existing = await service.getById(id);
    if (!existing) {
      res.status(404).json({ error: "Provider connection not found" });
      return;
    }
    assertCompanyAccess(req, existing.companyId);
    const removed = await service.remove(id);
    await logActivity(db, {
      companyId: removed.companyId,
      actorType: "user",
      actorId: req.actor.userId ?? "board",
      action: "provider_connection.deleted",
      entityType: "provider_connection",
      entityId: removed.id,
      details: { name: removed.name, providerType: removed.providerType },
    });
    res.json({ ok: true });
  });

  return router;
}
