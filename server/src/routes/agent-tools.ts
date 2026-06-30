import { Router } from "express";
import type { Db } from "@doerai/db";
import { DELIVERABLE_KINDS } from "@doerai/shared";
import type { DeliverableKind } from "@doerai/shared";
import { assertCompanyAccess, getActorInfo } from "./authz.js";
import { writeOutputFile } from "../services/company-outputs.js";
import { badRequest } from "../errors.js";

/**
 * Built-in agent tool endpoints.
 *
 * POST /companies/:companyId/agent-tools/write-output
 *   Writes text content to the company outputs directory, creates a
 *   Deliverable row, and returns a download URL.  Callable by any
 *   authenticated agent via the DOER_API_URL environment variable.
 */
export function agentToolRoutes(db: Db) {
  const router = Router();

  router.post("/companies/:companyId/agent-tools/write-output", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const actor = getActorInfo(req);

    const { title, content, kind, description, issueId, projectId } = req.body as Record<string, unknown>;

    if (typeof title !== "string" || title.trim().length === 0) {
      throw badRequest("title is required");
    }
    if (typeof content !== "string" || content.length === 0) {
      throw badRequest("content is required");
    }

    const resolvedKind: DeliverableKind =
      typeof kind === "string" && (DELIVERABLE_KINDS as readonly string[]).includes(kind)
        ? (kind as DeliverableKind)
        : "md";

    const result = await writeOutputFile(db, {
      companyId,
      title: title.trim(),
      content,
      kind: resolvedKind,
      description: typeof description === "string" ? description : null,
      producedByAgentId: actor.agentId ?? null,
      producedByRunId: actor.runId ?? null,
      issueId: typeof issueId === "string" ? issueId : null,
      projectId: typeof projectId === "string" ? projectId : null,
    });

    res.status(201).json({
      success: true,
      deliverableId: result.deliverableId,
      filename: result.filename,
      path: result.absPath,
      downloadUrl: result.downloadUrl,
    });
  });

  return router;
}
