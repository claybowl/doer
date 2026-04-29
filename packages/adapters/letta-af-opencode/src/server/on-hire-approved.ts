import os from "node:os";
import path from "node:path";
import type { HireApprovedPayload, HireApprovedHookResult } from "@doerai/adapter-utils";
import type { LettaAfAdapterConfig } from "../shared/types.js";
import { unpackAgentFile, validateAfPath } from "./af-import.js";

/**
 * On hire: unpack the .af file and extract memory blocks into a stable
 * per-agent directory under ~/.doer/agents/<agentId>/memory/.
 *
 * What this does:
 *   1. Validates the .af path
 *   2. Extracts memory blocks to `~/.doer/agents/<agentId>/memory/`
 *   3. Writes AGENTS.md (identity + memory map) to the same directory
 *   4. Patches adapterConfig with: memoryDir, agentName, model,
 *      systemPrompt, memoryBlockLabels
 *
 * Non-fatal: a failed unpack logs a warning and returns ok:true so the
 * hire isn't blocked. The user can re-trigger via testEnvironment once
 * the .af path is corrected.
 */
export async function onHireApproved(
  payload: HireApprovedPayload,
  adapterConfig: Record<string, unknown>,
): Promise<HireApprovedHookResult> {
  const config = adapterConfig as unknown as LettaAfAdapterConfig;

  const validationError = await validateAfPath(config.afPath ?? "");
  if (validationError) {
    return {
      ok: true,
      error: `Could not unpack .af on hire: ${validationError}. Update afPath in the config panel to trigger re-extraction.`,
    };
  }

  const memoryDir = path.join(os.homedir(), ".doer", "agents", payload.agentId, "memory");

  try {
    const { snapshot } = await unpackAgentFile(config.afPath, memoryDir);

    // eslint-disable-next-line no-console
    console.log(
      `[letta-af-opencode] Unpacked agent "${snapshot.name}" (${snapshot.blocks.length} blocks) → ${memoryDir}`,
    );

    return {
      ok: true,
      detail: {
        adapterConfigPatch: {
          memoryDir,
          agentName: snapshot.name,
          model: config.model || snapshot.model,
          systemPrompt: snapshot.system ?? "",
          memoryBlockLabels: snapshot.blocks.map((b) => b.label),
        },
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.warn(`[letta-af-opencode] onHireApproved failed for agent ${payload.agentId}: ${message}`);
    return {
      ok: true,
      error: `Could not unpack .af: ${message}. Check the file path and try re-hiring.`,
    };
  }
}
