import type { HireApprovedPayload, HireApprovedHookResult } from "@doerai/adapter-utils";
import type { LettaCloudAdapterConfig } from "../shared/types.js";
import {
  attachTool,
  ensureDeliverableTool,
  fetchAgentSnapshot,
} from "./letta-client.js";

/**
 * On hire: fetch the Letta agent and snapshot its metadata into adapterConfig.
 * This populates agentName, model, agentType, systemPrompt, and tags
 * so the config panel pre-fills without a round-trip on first open.
 */
export async function onHireApproved(
  _payload: HireApprovedPayload,
  adapterConfig: Record<string, unknown>,
): Promise<HireApprovedHookResult> {
  const config = adapterConfig as unknown as LettaCloudAdapterConfig;

  if (!config.agentId || !config.apiKey) {
    return { ok: true }; // non-fatal — user can still configure manually
  }

  try {
    const snapshot = await fetchAgentSnapshot(config);

    // Ensure the shared `produce_deliverable` tool exists for this Letta
    // account, then attach it to the freshly-hired agent. This is the
    // per-agent handshake that lets the agent emit deliverables — without
    // attach, the agent wouldn't see the tool in its toolset. Fire-and-
    // log: a failure here shouldn't block the hire; the tool can be
    // re-attached later via a sync, and most of the agent's work is
    // possible without deliverables.
    try {
      const toolId = await ensureDeliverableTool(config);
      // Only attach if not already on the agent (Letta would error on
      // duplicate attach). Snapshot has the current attached-tool list.
      const alreadyAttached = snapshot.tools.some((t) => t.id === toolId);
      if (!alreadyAttached) {
        await attachTool(config, toolId);
      }
    } catch (err) {
      // Log to stderr so it shows up in server boot logs; don't fail the hire.
      // eslint-disable-next-line no-console
      console.warn(
        `[letta-cloud] Could not ensure+attach produce_deliverable tool for agent ${config.agentId}:`,
        err instanceof Error ? err.message : err,
      );
    }

    return {
      ok: true,
      detail: {
        adapterConfigPatch: {
          agentName: snapshot.agent.name,
          model: snapshot.agent.model,
          agentType: snapshot.agent.agentType,
          systemPrompt: snapshot.agent.system ?? "",
          tags: snapshot.agent.tags ?? [],
        },
      },
    };
  } catch {
    // Non-fatal — don't block hire if Letta Cloud is unreachable
    return {
      ok: true,
      error: "Could not connect to Letta Cloud to snapshot agent metadata. Config will populate on first open.",
    };
  }
}
