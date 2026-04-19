import os from "node:os";
import path from "node:path";
import type { Db } from "@paperclipai/db";
import type { MemfsRootKind, ResolvedMemfsBinding } from "@paperclipai/shared";
import { logger } from "../../middleware/logger.js";
import { memfsService } from "./memfs-service.js";
import { resolveMemfsStrategies } from "./strategies/index.js";
import type { MemfsMountResult } from "./strategies/types.js";

/**
 * Summary of a single successful memfs mount. Attached to adapterEnv as
 * `PAPERCLIP_MEMFS_MOUNTS` (JSON) so downstream gremlins can discover
 * their mounted memory roots without hitting the DB.
 */
export interface MemfsMountSummary {
  bindingId: string;
  label: string;
  mountedPath: string;
  strategy: string;
  rootKind: MemfsRootKind;
  rootLabel: string;
  pathPrefix: string;
}

export interface ApplyMemfsBindingsInput {
  db: Db;
  agent: { id: string; companyId: string };
  adapterType: string;
  /** Mutated in-place with LETTA_MEMFS_DIR + PAPERCLIP_MEMFS_MOUNTS on success. */
  adapterEnv: Record<string, string>;
  workingDirectory: string;
  onLog?: (stream: "stdout" | "stderr", chunk: string) => Promise<void> | void;
}

export interface ApplyMemfsBindingsResult {
  results: MemfsMountResult[];
  mounted: MemfsMountSummary[];
}

/**
 * Load the agent's declared memfs bindings, apply each via its strategy, and
 * expose successful mounts to the adapter via adapterEnv. Replaces the legacy
 * `LETTA_AGENT_ID → ~/.letta/agents/<id>/memory` copy shim previously inlined
 * in heartbeat.ts.
 *
 * Behavior:
 *  - If the agent has declared bindings, they drive mounts.
 *  - If no bindings exist but `LETTA_AGENT_ID` is set, synthesize an ephemeral
 *    fs-mount binding at `~/.letta/agents/<id>/memory` for backward-compat.
 *  - Successful mounts populate:
 *      - `LETTA_MEMFS_DIR` (first success; backward-compat for gremlin code)
 *      - `PAPERCLIP_MEMFS_MOUNTS` (JSON array of all mounts; forward-compat)
 */
export async function applyMemfsBindingsToWorkspace(
  input: ApplyMemfsBindingsInput,
): Promise<ApplyMemfsBindingsResult> {
  const { db, agent, adapterType, adapterEnv, workingDirectory, onLog } = input;

  const svc = memfsService(db);
  let bindings: ResolvedMemfsBinding[] = [];
  try {
    bindings = await svc.listBindingsForAgent(agent.companyId, agent.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn({ err, agentId: agent.id }, "memfs binding lookup failed; continuing without memfs");
    await onLog?.("stderr", `[paperclip] memfs binding lookup failed (non-fatal): ${msg}\n`);
  }

  // Back-compat: if no explicit bindings and LETTA_AGENT_ID is set, synthesize
  // a default fs-mount binding that targets the user's local Letta memory dir.
  const lettaAgentId = (adapterEnv["LETTA_AGENT_ID"] ?? "").trim();
  if (bindings.length === 0 && lettaAgentId) {
    const synthetic = synthesizeLegacyLettaBinding(lettaAgentId);
    if (synthetic) {
      bindings = [synthetic];
      await onLog?.(
        "stdout",
        `[paperclip] memfs: no bindings found; using legacy fs-mount for LETTA_AGENT_ID=${lettaAgentId}\n`,
      );
    }
  }

  if (bindings.length === 0) {
    return { results: [], mounted: [] };
  }

  const results = await resolveMemfsStrategies(bindings, {
    workingDirectory,
    adapterType,
  });

  const mounted: MemfsMountSummary[] = [];
  for (const result of results) {
    if (result.ok && result.mountedPath) {
      const binding = bindings.find((b) => b.id === result.bindingId);
      const label = binding?.label || binding?.rootLabel || path.basename(result.mountedPath);
      mounted.push({
        bindingId: result.bindingId,
        label,
        mountedPath: result.mountedPath,
        strategy: result.strategy,
        rootKind: binding?.rootKind ?? "local-fs",
        rootLabel: binding?.rootLabel ?? label,
        pathPrefix: binding?.pathPrefix ?? "",
      });
      await onLog?.("stdout", `[paperclip] memfs mounted (${result.strategy}): ${result.mountedPath} — ${result.note}\n`);
    } else {
      await onLog?.(
        "stderr",
        `[paperclip] memfs mount skipped (${result.strategy}/${result.bindingId}): ${result.note}\n`,
      );
    }
  }

  if (mounted.length > 0) {
    // Backward-compat: gremlins previously read LETTA_MEMFS_DIR. Point it at
    // the first successful fs-mount so existing code continues to find memory.
    const primary = mounted.find((m) => m.strategy === "fs-mount") ?? mounted[0];
    if (primary) {
      adapterEnv["LETTA_MEMFS_DIR"] = primary.mountedPath;
    }
    adapterEnv["PAPERCLIP_MEMFS_MOUNTS"] = JSON.stringify(mounted);
  }

  return { results, mounted };
}

/**
 * Best-effort teardown — invokes `unmount` on each binding's strategy. Safe to
 * call even when `applyMemfsBindingsToWorkspace` was not called (no-op on empty
 * bindings list). Errors are logged, never thrown.
 *
 * Only unmounts explicit DB-backed bindings. Legacy synthetic bindings
 * (`LETTA_AGENT_ID` fallback) don't need explicit teardown — their symlinks
 * live inside the execution cwd, which is torn down with the workspace.
 */
export async function unmountMemfsBindingsFromWorkspace(input: {
  db: Db;
  agent: { id: string; companyId: string };
  adapterType: string;
  workingDirectory: string;
}): Promise<void> {
  const { db, agent, adapterType, workingDirectory } = input;
  const svc = memfsService(db);
  let bindings: ResolvedMemfsBinding[] = [];
  try {
    bindings = await svc.listBindingsForAgent(agent.companyId, agent.id);
  } catch (err) {
    logger.warn({ err, agentId: agent.id }, "memfs binding lookup failed during unmount");
    return;
  }
  if (bindings.length === 0) return;

  const { getMemfsStrategy } = await import("./strategies/index.js");
  for (const binding of bindings) {
    const strategy = getMemfsStrategy(binding.strategy);
    if (!strategy) continue;
    try {
      await strategy.unmount(binding, { workingDirectory, adapterType });
    } catch (err) {
      logger.warn(
        { err, bindingId: binding.id, strategy: binding.strategy },
        "memfs unmount failed; continuing",
      );
    }
  }
}

/**
 * Build an ephemeral `ResolvedMemfsBinding` for the legacy
 * `LETTA_AGENT_ID → ~/.letta/agents/<id>/memory` convention. Returns null if
 * the agent id is empty. Not persisted — only used for the duration of the run.
 */
function synthesizeLegacyLettaBinding(lettaAgentId: string): ResolvedMemfsBinding | null {
  if (!lettaAgentId) return null;
  const now = new Date().toISOString();
  const lettaHome = path.join(os.homedir(), ".letta");
  return {
    id: `legacy:${lettaAgentId}`,
    agentId: lettaAgentId,
    rootId: `legacy-root:${lettaAgentId}`,
    pathPrefix: path.posix.join("agents", lettaAgentId, "memory"),
    strategy: "fs-mount",
    permission: "read",
    mountAs: ".letta-memory",
    label: "letta",
    createdAt: now,
    updatedAt: now,
    rootPath: lettaHome,
    rootKind: "local-fs",
    rootLabel: "letta",
  };
}
