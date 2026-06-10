import { Router } from "express";
import type { Db } from "@doerai/db";
import {
  createMemfsRootSchema,
  updateMemfsRootSchema,
  createMemfsBindingSchema,
  updateMemfsBindingSchema,
} from "@doerai/shared";
import { validate } from "../middleware/validate.js";
import { memfsService } from "../services/memfs/memfs-service.js";
import { logActivity } from "../services/index.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";
import { badRequest } from "../errors.js";

export function memfsRoutes(db: Db) {
  const router = Router();
  const svc = memfsService(db);

  // ---- Roots ----

  router.get("/companies/:companyId/memfs/roots", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    res.json(await svc.listRoots(companyId));
  });

  router.post(
    "/companies/:companyId/memfs/roots",
    validate(createMemfsRootSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      const root = await svc.createRoot(companyId, req.body);
      const actor = getActorInfo(req);
      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        action: "memfs.root.created",
        entityType: "memfs_root",
        entityId: root.id,
        details: { rootPath: root.rootPath, kind: root.kind, label: root.label },
      });
      res.status(201).json(root);
    },
  );

  router.get("/companies/:companyId/memfs/roots/:rootId", async (req, res) => {
    const companyId = req.params.companyId as string;
    const rootId = req.params.rootId as string;
    assertCompanyAccess(req, companyId);
    res.json(await svc.getRoot(companyId, rootId));
  });

  router.patch(
    "/companies/:companyId/memfs/roots/:rootId",
    validate(updateMemfsRootSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      const rootId = req.params.rootId as string;
      assertCompanyAccess(req, companyId);
      const root = await svc.updateRoot(companyId, rootId, req.body);
      const actor = getActorInfo(req);
      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        action: "memfs.root.updated",
        entityType: "memfs_root",
        entityId: root.id,
        details: req.body,
      });
      res.json(root);
    },
  );

  router.delete("/companies/:companyId/memfs/roots/:rootId", async (req, res) => {
    const companyId = req.params.companyId as string;
    const rootId = req.params.rootId as string;
    assertCompanyAccess(req, companyId);
    await svc.removeRoot(companyId, rootId);
    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "memfs.root.deleted",
      entityType: "memfs_root",
      entityId: rootId,
    });
    res.status(204).send();
  });

  // ---- Bindings ----

  router.get("/companies/:companyId/memfs/bindings", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    res.json(await svc.listBindingsForCompany(companyId));
  });

  router.get("/companies/:companyId/agents/:agentId/memfs/bindings", async (req, res) => {
    const companyId = req.params.companyId as string;
    const agentId = req.params.agentId as string;
    assertCompanyAccess(req, companyId);
    res.json(await svc.listBindingsForAgent(companyId, agentId));
  });

  router.post(
    "/companies/:companyId/memfs/bindings",
    validate(createMemfsBindingSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      const binding = await svc.createBinding(companyId, req.body);
      const actor = getActorInfo(req);
      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        action: "memfs.binding.created",
        entityType: "memfs_binding",
        entityId: binding.id,
        details: {
          agentId: binding.agentId,
          rootId: binding.rootId,
          pathPrefix: binding.pathPrefix,
          strategy: binding.strategy,
        },
      });
      res.status(201).json(binding);
    },
  );

  router.get("/companies/:companyId/memfs/bindings/:bindingId", async (req, res) => {
    const companyId = req.params.companyId as string;
    const bindingId = req.params.bindingId as string;
    assertCompanyAccess(req, companyId);
    res.json(await svc.getBinding(companyId, bindingId));
  });

  router.patch(
    "/companies/:companyId/memfs/bindings/:bindingId",
    validate(updateMemfsBindingSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      const bindingId = req.params.bindingId as string;
      assertCompanyAccess(req, companyId);
      const binding = await svc.updateBinding(companyId, bindingId, req.body);
      const actor = getActorInfo(req);
      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        action: "memfs.binding.updated",
        entityType: "memfs_binding",
        entityId: binding.id,
        details: req.body,
      });
      res.json(binding);
    },
  );

  router.delete("/companies/:companyId/memfs/bindings/:bindingId", async (req, res) => {
    const companyId = req.params.companyId as string;
    const bindingId = req.params.bindingId as string;
    assertCompanyAccess(req, companyId);
    await svc.removeBinding(companyId, bindingId);
    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "memfs.binding.deleted",
      entityType: "memfs_binding",
      entityId: bindingId,
    });
    res.status(204).send();
  });

  // ---- Files (read-only) ----

  router.get("/companies/:companyId/memfs/roots/:rootId/files", async (req, res) => {
    const companyId = req.params.companyId as string;
    const rootId = req.params.rootId as string;
    assertCompanyAccess(req, companyId);

    const prefix = typeof req.query.prefix === "string" ? req.query.prefix : "";
    const recursive = req.query.recursive === "true" || req.query.recursive === "1";
    const files = await svc.listFiles(companyId, rootId, { prefix, recursive });
    res.json(files);
  });

  router.get("/companies/:companyId/memfs/roots/:rootId/file", async (req, res) => {
    const companyId = req.params.companyId as string;
    const rootId = req.params.rootId as string;
    assertCompanyAccess(req, companyId);

    const relPath = typeof req.query.path === "string" ? req.query.path : "";
    if (relPath.length === 0) throw badRequest("query parameter 'path' is required");

    const stat = await svc.statFile(companyId, rootId, relPath);
    if (!stat) {
      res.status(404).json({ error: "Memfs file not found" });
      return;
    }
    if (stat.isDirectory) {
      res.status(400).json({ error: "path points to a directory; use /files to list" });
      return;
    }

    const buf = await svc.readFile(companyId, rootId, relPath);
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Length", String(buf.byteLength));
    res.setHeader("X-Memfs-Path", stat.path);
    res.setHeader("X-Memfs-Modified-At", stat.modifiedAt);
    res.send(buf);
  });

  // ---- Writes + history (capture-the-magic Phase 1.3 / 1.4) ----

  router.put("/companies/:companyId/memfs/roots/:rootId/file", async (req, res) => {
    const companyId = req.params.companyId as string;
    const rootId = req.params.rootId as string;
    assertCompanyAccess(req, companyId);

    const relPath = typeof req.body?.path === "string" ? req.body.path : "";
    const content = typeof req.body?.content === "string" ? req.body.content : null;
    if (relPath.length === 0) throw badRequest("body field 'path' is required");
    if (content === null) throw badRequest("body field 'content' (string) is required");
    const commitMessage =
      typeof req.body?.commitMessage === "string" ? req.body.commitMessage : undefined;

    const result = await svc.writeFile(companyId, rootId, relPath, content, { commitMessage });
    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "memfs.file.written",
      entityType: "memfs_root",
      entityId: rootId,
      details: {
        path: relPath,
        byteLength: Buffer.byteLength(content, "utf8"),
        commitSha: result.commitSha,
      },
    });
    res.json(result);
  });

  router.get("/companies/:companyId/memfs/roots/:rootId/history", async (req, res) => {
    const companyId = req.params.companyId as string;
    const rootId = req.params.rootId as string;
    assertCompanyAccess(req, companyId);

    const pathScope = typeof req.query.path === "string" ? req.query.path : undefined;
    const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;
    const commits = await svc.listHistory(companyId, rootId, {
      pathScope,
      limit: Number.isFinite(limit) ? limit : undefined,
    });
    res.json(commits);
  });

  router.get(
    "/companies/:companyId/memfs/roots/:rootId/history/:sha/diff",
    async (req, res) => {
      const companyId = req.params.companyId as string;
      const rootId = req.params.rootId as string;
      const sha = req.params.sha as string;
      assertCompanyAccess(req, companyId);

      const pathScope = typeof req.query.path === "string" ? req.query.path : undefined;
      const diff = await svc.getCommitDiff(companyId, rootId, sha, { pathScope });
      if (diff === null) {
        res.status(404).json({ error: "Commit not found or root has no history" });
        return;
      }
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.send(diff);
    },
  );

  return router;
}
