import { Router } from "express";
import type { Db } from "@doerai/db";
import { agents } from "@doerai/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { sandboxExecutionService } from "../services/sandbox-execution.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";
import { notFound } from "../errors.js";

const startRunSchema = z.object({
  command: z.string().optional(),
  toolCalls: z
    .array(
      z.object({
        tool: z.enum(["bash_command", "read_file", "write_file", "list_dir"]),
        params: z.record(z.unknown()),
      }),
    )
    .optional(),
  env: z.record(z.string()).optional(),
  cwd: z.string().optional(),
  timeoutSec: z.number().int().min(1).max(300).optional(),
}).refine(
  (body) => body.command !== undefined || (body.toolCalls && body.toolCalls.length > 0),
  { message: "Either command or at least one toolCall must be provided" },
);

export function runRoutes(db: Db) {
  const router = Router();
  const svc = sandboxExecutionService(db);

  // POST /api/agents/:id/run — trigger sandboxed execution
  router.post("/agents/:id/run", validate(startRunSchema), async (req, res) => {
    const agentId = req.params.id as string;

    const agent = await db
      .select({ id: agents.id, companyId: agents.companyId })
      .from(agents)
      .where(eq(agents.id, agentId))
      .then((rows) => rows[0] ?? null);

    if (!agent) {
      throw notFound("Agent not found");
    }

    assertCompanyAccess(req, agent.companyId);

    const body = req.body as z.infer<typeof startRunSchema>;
    const runId = await svc.startRun({
      agentId: agent.id,
      companyId: agent.companyId,
      command: body.command,
      toolCalls: body.toolCalls,
      env: body.env,
      cwd: body.cwd,
      timeoutSec: body.timeoutSec,
    });

    res.status(202).json({ runId });
  });

  // GET /api/runs/:id — get run status and output
  router.get("/runs/:id", async (req, res) => {
    const runId = req.params.id as string;
    const run = await svc.getRunStatus(runId);
    if (!run) {
      throw notFound("Run not found");
    }
    assertCompanyAccess(req, run.companyId);
    res.json(run);
  });

  // POST /api/runs/:id/cancel — cancel a running sandbox
  router.post("/runs/:id/cancel", async (req, res) => {
    const runId = req.params.id as string;
    const run = await svc.getRunStatus(runId);
    if (!run) {
      throw notFound("Run not found");
    }
    assertCompanyAccess(req, run.companyId);

    if (run.status !== "running" && run.status !== "queued") {
      res.status(409).json({ error: `Run is not active (status: ${run.status})` });
      return;
    }

    const cancelled = await svc.cancelRun(runId);
    res.json({ cancelled, runId });
  });

  return router;
}
