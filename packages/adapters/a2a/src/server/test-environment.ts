// ─── A2A Adapter — Environment Test ──────────────────────────────────────────

import type {
  AdapterEnvironmentTestContext,
  AdapterEnvironmentTestResult,
} from "@doerai/adapter-utils";
import type { A2aAdapterConfig } from "../shared/types.js";
import { A2aClient } from "./a2a-client.js";

export async function testEnvironment(
  ctx: AdapterEnvironmentTestContext,
): Promise<AdapterEnvironmentTestResult> {
  const config = ctx.config as unknown as A2aAdapterConfig;
  const testedAt = new Date().toISOString();

  if (!config.endpointUrl?.trim()) {
    return {
      adapterType: "a2a",
      status: "fail",
      testedAt,
      checks: [
        {
          code: "missing_endpoint_url",
          level: "error",
          message: "A2A Endpoint URL is required",
          hint: "Enter the base URL of the remote A2A agent (e.g. https://agent.example.com/a2a).",
        },
      ],
    };
  }

  const client = new A2aClient(config);

  try {
    const agentInfo = await client.fetchAgentCard();
    return {
      adapterType: "a2a",
      status: "pass",
      testedAt,
      checks: [
        {
          code: "agent_connected",
          level: "info",
          message: `Connected to A2A agent "${agentInfo.card.name}" (v${agentInfo.card.version})`,
          detail: `Skills: ${agentInfo.skills.length} · Streaming: ${agentInfo.capabilities.streaming ? "Yes" : "No"} · Transport: ${agentInfo.card.preferredTransport ?? "JSON-RPC"}`,
        },
        {
          code: "streaming_supported",
          level: agentInfo.capabilities.streaming ? "info" : "warn",
          message: agentInfo.capabilities.streaming
            ? "Agent supports streaming (live transcript)"
            : "Agent does NOT support streaming — transcript will appear all-at-once after completion",
        },
        {
          code: "skills_available",
          level: "info",
          message: `${agentInfo.skills.length} skill(s) available`,
          detail: agentInfo.skills.map((s) => s.name).join(", ") || "No detailed skill info",
        },
      ],
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      adapterType: "a2a",
      status: "fail",
      testedAt,
      checks: [
        {
          code: "agent_card_failed",
          level: "error",
          message: `Failed to fetch Agent Card: ${message}`,
          hint: "Verify the Endpoint URL is correct and the agent is reachable. The Agent Card is fetched from {endpointUrl}/.well-known/agent-card.json (or your custom Agent Card URL).",
        },
      ],
    };
  }
}
