import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { Router } from "express";
import { z } from "zod";
import type { Db } from "@doerai/db";
import { exportAgentFile, fetchAgentSnapshot } from "@doerai/adapter-letta-cloud/server";
import {
  createLocalAgentFromSnapshot,
  resolveLettaCodeConfig,
  runLettaSdkTurn,
} from "@doerai/adapter-letta-code/server";
import { notFound, unprocessable } from "../errors.js";
import { accessService } from "../services/access.js";
import { agentService } from "../services/agents.js";
import { logActivity } from "../services/activity-log.js";
import { memfsService } from "../services/memfs/memfs-service.js";
import { scrubAgentFileSecrets } from "../services/letta-portability.js";
import { assertBoard, assertCompanyAccess, getActorInfo } from "./authz.js";

const migrationBodySchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  permissionMode: z.enum(["standard", "acceptEdits", "unrestricted"]).optional(),
});
const execFileAsync = promisify(execFile);

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export interface LettaMigrationPreview {
  sourceDoerAgentId: string;
  sourceLettaAgentId: string;
  sourceWillBeModified: false;
  targetAdapterType: "letta_code";
  targetBackend: "local";
  targetName: string;
  targetWillReceiveNewDoerId: true;
  targetWillReceiveNewLettaId: true;
  memoryLocation: "Doer MemFS";
  toolsLocation: "Doer machine";
}

export function buildLettaMigrationPreview(source: {
  id: string;
  name: string;
  adapterType: string;
  adapterConfig: Record<string, unknown>;
}, requestedName?: string): LettaMigrationPreview {
  const sourceAgentId = stringValue(source.adapterConfig.lettaAgentId)
    ?? stringValue(source.adapterConfig.agentId);
  const cloudAttached = source.adapterType === "letta_cloud"
    || (source.adapterType === "letta_code" && source.adapterConfig.backend === "cloud_attached")
    || (source.adapterType === "letta_code" && source.adapterConfig.mode === "online");
  if (!cloudAttached || !sourceAgentId) {
    throw unprocessable("Only a Cloud-attached Letta agent can be migrated to a local canonical agent");
  }
  return {
    sourceDoerAgentId: source.id,
    sourceLettaAgentId: sourceAgentId,
    sourceWillBeModified: false,
    targetAdapterType: "letta_code" as const,
    targetBackend: "local" as const,
    targetName: requestedName?.trim() || `${source.name} (Local)`,
    targetWillReceiveNewDoerId: true,
    targetWillReceiveNewLettaId: true,
    memoryLocation: "Doer MemFS",
    toolsLocation: "Doer machine",
  };
}

export function lettaMigrationRoutes(db: Db): Router {
  const router = Router();
  const agents = agentService(db);
  const access = accessService(db);
  const memfs = memfsService(db);

  router.post("/companies/:companyId/agents/:agentId/letta-migration/preview", async (req, res) => {
    const companyId = req.params.companyId as string;
    const agentId = req.params.agentId as string;
    assertCompanyAccess(req, companyId);
    assertBoard(req);
    const body = migrationBodySchema.parse(req.body ?? {});
    const source = await agents.getById(agentId);
    if (!source || source.companyId !== companyId) throw notFound("Source agent not found");
    res.json(buildLettaMigrationPreview({
      id: source.id,
      name: source.name,
      adapterType: source.adapterType,
      adapterConfig: source.adapterConfig as Record<string, unknown>,
    }, body.name));
  });

  router.post("/companies/:companyId/agents/:agentId/letta-migration/apply", async (req, res) => {
    const companyId = req.params.companyId as string;
    const agentId = req.params.agentId as string;
    assertCompanyAccess(req, companyId);
    assertBoard(req);
    const body = migrationBodySchema.parse(req.body ?? {});
    const source = await agents.getById(agentId);
    if (!source || source.companyId !== companyId) throw notFound("Source agent not found");
    const sourceConfig = source.adapterConfig as Record<string, unknown>;
    const preview = buildLettaMigrationPreview({
      id: source.id,
      name: source.name,
      adapterType: source.adapterType,
      adapterConfig: sourceConfig,
    }, body.name);
    const permissionMode = body.permissionMode
      ?? (sourceConfig.permissionMode === "acceptEdits" || sourceConfig.permissionMode === "unrestricted"
        ? sourceConfig.permissionMode
        : "standard");
    const cloudConfig = {
      agentId: preview.sourceLettaAgentId,
      apiKey: stringValue(sourceConfig.apiKey) ?? "",
      baseUrl: stringValue(sourceConfig.apiBaseUrl) ?? stringValue(sourceConfig.baseUrl),
    };
    const [snapshot, rawAgentFile] = await Promise.all([
      fetchAgentSnapshot(cloudConfig),
      exportAgentFile(cloudConfig),
    ]);
    let created = await agents.create(companyId, {
      name: preview.targetName,
      role: source.role,
      title: source.title,
      icon: source.icon,
      reportsTo: source.reportsTo,
      capabilities: source.capabilities,
      adapterType: "letta_code",
      adapterConfig: {
        backend: "local",
        sourceAgentId: preview.sourceLettaAgentId,
        sourceCloudAgentId: preview.sourceLettaAgentId,
        model: snapshot.agent.model || stringValue(sourceConfig.model),
        permissionMode,
      },
      runtimeConfig: source.runtimeConfig,
      budgetMonthlyCents: source.budgetMonthlyCents,
      permissions: source.permissions,
      metadata: source.metadata,
    });
    try {
      await access.ensureMembership(companyId, "agent", created.id, "member", "active");
      await access.setPrincipalPermission(companyId, "agent", created.id, "tasks:assign", true, req.actor.userId ?? null);
      const binding = await memfs.ensureDefaultAgentMemoryBinding(companyId, created.id, {
        agentSlug: created.urlKey,
      });
      if (!binding) throw new Error("Could not create the target MemFS binding");
      const memoryDir = path.join(binding.rootPath, ...binding.pathPrefix.split("/").filter(Boolean));
      const localAgentId = await createLocalAgentFromSnapshot({
        name: snapshot.agent.name || created.name,
        model: snapshot.agent.model || stringValue(sourceConfig.model),
        systemPrompt: snapshot.agent.system,
        blocks: snapshot.blocks.map((block) => ({
          label: block.label,
          value: block.value,
          description: block.description,
          readOnly: block.readOnly,
          limit: block.limit,
        })),
      }, { memoryDir, permissionMode });
      const importArchiveDir = path.join(memoryDir, "imports");
      await mkdir(importArchiveDir, { recursive: true });
      let parsedAgentFile: unknown;
      try {
        parsedAgentFile = JSON.parse(rawAgentFile);
      } catch {
        throw new Error("Letta Cloud returned an invalid AgentFile export");
      }
      await writeFile(
        path.join(importArchiveDir, "source-agent.af"),
        `${JSON.stringify(scrubAgentFileSecrets(parsedAgentFile), null, 2)}\n`,
        { mode: 0o600 },
      );
      await execFileAsync("git", ["-C", memoryDir, "add", "imports/source-agent.af"]);
      await execFileAsync("git", [
        "-C", memoryDir,
        "-c", "user.name=Doer Letta Migration",
        "-c", "user.email=letta-migration@doer.local",
        "commit", "-m", "Archive source Letta AgentFile",
      ]);
      const adapterConfig = {
        backend: "local" as const,
        lettaAgentId: localAgentId,
        sourceAgentId: preview.sourceLettaAgentId,
        sourceCloudAgentId: preview.sourceLettaAgentId,
        model: snapshot.agent.model || stringValue(sourceConfig.model),
        permissionMode,
      };
      const smoke = await runLettaSdkTurn({
        prompt: "Migration smoke check. Reply with OK without changing memory.",
        config: resolveLettaCodeConfig(adapterConfig),
        env: { LETTA_MEMFS_DIR: memoryDir },
        onEvent: async () => undefined,
      });
      if (!smoke.success) throw new Error(smoke.summary || "Local Letta smoke check failed");
      created = await agents.update(created.id, { adapterConfig }) ?? created;
      const actor = getActorInfo(req);
      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        runId: actor.runId,
        action: "agent.letta_migrated_local",
        entityType: "agent",
        entityId: created.id,
        details: {
          sourceDoerAgentId: source.id,
          sourceLettaAgentId: preview.sourceLettaAgentId,
          localLettaAgentId: localAgentId,
          sourceModified: false,
        },
      });
      res.status(201).json({ preview, agent: created, localLettaAgentId: localAgentId });
    } catch (error) {
      await agents.remove(created.id).catch(() => null);
      throw error;
    }
  });

  return router;
}
