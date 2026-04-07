import type { HireApprovedPayload, HireApprovedHookResult } from "@paperclipai/adapter-utils";
import type { LettaCloudAdapterConfig } from "../shared/types.js";
import { fetchAgentSnapshot } from "./letta-client.js";

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
