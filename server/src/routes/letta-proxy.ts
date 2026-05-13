/**
 * Letta Cloud proxy routes
 *
 * These endpoints sit server-side so the Letta API key never touches the browser.
 * The key is read from the agent's adapterConfig (stored encrypted in the DB).
 *
 * Routes:
 *   GET   /agents/:papercipAgentId/letta                → snapshot (agent + blocks + tools)
 *   PATCH /agents/:papercipAgentId/letta/memory         → update a memory block by label
 *   PATCH /agents/:papercipAgentId/letta/tools/attach   → attach a tool by ID
 *   PATCH /agents/:papercipAgentId/letta/tools/detach   → detach a tool by ID
 */

import { Router } from "express";
import type { Request, Response } from "express";
import type { Db } from "@doerai/db";
import {
  fetchAgentSnapshot,
  updateMemoryBlock,
  attachTool,
  detachTool,
  sendChatMessage,
} from "@doerai/adapter-letta-cloud/server";
import type { LettaCloudAdapterConfig } from "@doerai/adapter-letta-cloud";
import { agentService } from "../services/index.js";
import { notFound } from "../errors.js";

export function lettaProxyRoutes(db: Db) {
  const svc = agentService(db);

  async function getAgentAdapterConfig(agentId: string): Promise<LettaCloudAdapterConfig> {
    const agent = await svc.getById(agentId);
    if (!agent) throw notFound("Agent not found");
    if (agent.adapterType !== "letta_cloud") {
      throw new Error(`Agent ${agentId} is not a letta_cloud adapter (got: ${agent.adapterType})`);
    }
    return agent.adapterConfig as unknown as LettaCloudAdapterConfig;
  }

  function errorStatus(message: string): number {
    if (message.includes("not found") || message.includes("Not found")) return 404;
    return 500;
  }

  const router = Router();

  /** GET /agents/:papercipAgentId/letta */
  router.get("/:papercipAgentId/letta", async (req: Request, res: Response) => {
    try {
      const config = await getAgentAdapterConfig(String(req.params.papercipAgentId));
      const snapshot = await fetchAgentSnapshot(config);
      res.json(snapshot);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(errorStatus(message)).json({ error: message });
    }
  });

  /** PATCH /agents/:papercipAgentId/letta/memory */
  router.patch("/:papercipAgentId/letta/memory", async (req: Request, res: Response) => {
    const { blockLabel, value } = req.body as { blockLabel?: string; value?: string };
    if (!blockLabel || value === undefined) {
      res.status(400).json({ error: "blockLabel and value are required" });
      return;
    }
    try {
      const config = await getAgentAdapterConfig(String(req.params.papercipAgentId));
      await updateMemoryBlock(config, blockLabel, value);
      res.json({ ok: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(errorStatus(message)).json({ error: message });
    }
  });

  /** PATCH /agents/:papercipAgentId/letta/tools/attach */
  router.patch("/:papercipAgentId/letta/tools/attach", async (req: Request, res: Response) => {
    const { toolId } = req.body as { toolId?: string };
    if (!toolId) {
      res.status(400).json({ error: "toolId is required" });
      return;
    }
    try {
      const config = await getAgentAdapterConfig(String(req.params.papercipAgentId));
      await attachTool(config, toolId);
      res.json({ ok: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(errorStatus(message)).json({ error: message });
    }
  });

  /** PATCH /agents/:papercipAgentId/letta/tools/detach */
  router.patch("/:papercipAgentId/letta/tools/detach", async (req: Request, res: Response) => {
    const { toolId } = req.body as { toolId?: string };
    if (!toolId) {
      res.status(400).json({ error: "toolId is required" });
      return;
    }
    try {
      const config = await getAgentAdapterConfig(String(req.params.papercipAgentId));
      await detachTool(config, toolId);
      res.json({ ok: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(errorStatus(message)).json({ error: message });
    }
  });

  /** POST /agents/:papercipAgentId/letta/chat */
  router.post("/:papercipAgentId/letta/chat", async (req: Request, res: Response) => {
    const { message } = req.body as { message?: string };
    if (!message?.trim()) {
      res.status(400).json({ error: "message is required" });
      return;
    }
    try {
      const config = await getAgentAdapterConfig(String(req.params.papercipAgentId));
      const messages = await sendChatMessage(config, message.trim());
      res.json({ messages });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      res.status(errorStatus(errMsg)).json({ error: errMsg });
    }
  });

  return router;
}
