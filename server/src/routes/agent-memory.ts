import { Router } from "express";
import type { Db } from "@doerai/db";
import { agentMemoryService, type MemoryType } from "../services/agent-memory.js";
import { agentService } from "../services/index.js";
import { assertCompanyAccess } from "./authz.js";

const VALID_MEMORY_TYPES = new Set<MemoryType>(["episodic", "semantic", "procedural"]);

function isValidMemoryType(v: unknown): v is MemoryType {
  return typeof v === "string" && VALID_MEMORY_TYPES.has(v as MemoryType);
}

export function agentMemoryRoutes(db: Db) {
  const router = Router();
  const memorySvc = agentMemoryService(db);
  const agentSvc = agentService(db);

  /** POST /api/agents/:agentId/memory */
  router.post("/agents/:agentId/memory", async (req, res) => {
    try {
      const agentId = req.params.agentId;
      const agent = await agentSvc.getById(agentId);
      if (!agent) { res.status(404).json({ error: "Agent not found" }); return; }

      assertCompanyAccess(req, agent.companyId);

      const { content, memoryType, tags, issueId, heartbeatRunId, metadata, expiresAt } =
        req.body as Record<string, unknown>;

      if (typeof content !== "string" || !content.trim()) {
        res.status(400).json({ error: "content is required" });
        return;
      }
      if (memoryType !== undefined && !isValidMemoryType(memoryType)) {
        res.status(400).json({ error: "memoryType must be episodic, semantic, or procedural" });
        return;
      }

      const entry = await memorySvc.create(agent.companyId, agentId, {
        content: content.trim(),
        memoryType: isValidMemoryType(memoryType) ? memoryType : "episodic",
        tags: Array.isArray(tags) ? tags.filter((t): t is string => typeof t === "string") : [],
        issueId: typeof issueId === "string" ? issueId : undefined,
        heartbeatRunId: typeof heartbeatRunId === "string" ? heartbeatRunId : undefined,
        metadata: metadata && typeof metadata === "object" ? (metadata as Record<string, unknown>) : {},
        expiresAt: typeof expiresAt === "string" ? new Date(expiresAt) : undefined,
      });

      res.status(201).json(entry);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const status = msg.includes("not found") ? 404 : msg.includes("forbidden") ? 403 : 500;
      res.status(status).json({ error: msg });
    }
  });

  /** GET /api/agents/:agentId/memory */
  router.get("/agents/:agentId/memory", async (req, res) => {
    try {
      const agentId = req.params.agentId;
      const agent = await agentSvc.getById(agentId);
      if (!agent) { res.status(404).json({ error: "Agent not found" }); return; }

      assertCompanyAccess(req, agent.companyId);

      const query = typeof req.query.q === "string" ? req.query.q : undefined;
      const memoryType = isValidMemoryType(req.query.type) ? req.query.type : undefined;
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const includeExpired = req.query.includeExpired === "true";

      const memories = await memorySvc.search(agent.companyId, agentId, {
        query,
        memoryType,
        limit,
        includeExpired,
      });

      res.json({ memories, total: memories.length });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const status = msg.includes("not found") ? 404 : msg.includes("forbidden") ? 403 : 500;
      res.status(status).json({ error: msg });
    }
  });

  /** DELETE /api/agents/:agentId/memory/:entryId */
  router.delete("/agents/:agentId/memory/:entryId", async (req, res) => {
    try {
      const agentId = req.params.agentId;
      const agent = await agentSvc.getById(agentId);
      if (!agent) { res.status(404).json({ error: "Agent not found" }); return; }

      assertCompanyAccess(req, agent.companyId);

      await memorySvc.delete(agent.companyId, agentId, req.params.entryId);
      res.json({ ok: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const status = msg.includes("not found") ? 404 : msg.includes("forbidden") ? 403 : 500;
      res.status(status).json({ error: msg });
    }
  });

  /** POST /api/agents/:agentId/memory/prune */
  router.post("/agents/:agentId/memory/prune", async (req, res) => {
    try {
      const agentId = req.params.agentId;
      const agent = await agentSvc.getById(agentId);
      if (!agent) { res.status(404).json({ error: "Agent not found" }); return; }

      assertCompanyAccess(req, agent.companyId);

      const olderThanDays = Number(req.body?.olderThanDays) || 30;
      const [expiredCount, oldCount] = await Promise.all([
        memorySvc.pruneExpired(agent.companyId, agentId),
        memorySvc.pruneOld(agent.companyId, agentId, olderThanDays),
      ]);

      res.json({ pruned: expiredCount + oldCount, expiredCount, oldCount });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const status = msg.includes("not found") ? 404 : msg.includes("forbidden") ? 403 : 500;
      res.status(status).json({ error: msg });
    }
  });

  return router;
}
