import type {
  AdapterEnvironmentTestContext,
  AdapterEnvironmentTestResult,
} from "@paperclipai/adapter-utils";
import type { LettaCloudAdapterConfig } from "../shared/types.js";
import { fetchAgentSnapshot } from "./letta-client.js";

export async function testEnvironment(
  ctx: AdapterEnvironmentTestContext,
): Promise<AdapterEnvironmentTestResult> {
  const config = ctx.config as LettaCloudAdapterConfig;
  const testedAt = new Date().toISOString();

  if (!config.apiKey?.trim()) {
    return {
      adapterType: "letta_cloud",
      status: "fail",
      testedAt,
      checks: [
        {
          code: "missing_api_key",
          level: "error",
          message: "Letta API key is required",
          hint: "Add your Letta Cloud API key to the adapter config.",
        },
      ],
    };
  }

  if (!config.agentId?.trim()) {
    return {
      adapterType: "letta_cloud",
      status: "fail",
      testedAt,
      checks: [
        {
          code: "missing_agent_id",
          level: "error",
          message: "Agent ID is required",
          hint: "Paste a Letta agent ID — format: agent-xxxxxxxx-xxxx-...",
        },
      ],
    };
  }

  try {
    const snapshot = await fetchAgentSnapshot(config);
    return {
      adapterType: "letta_cloud",
      status: "pass",
      testedAt,
      checks: [
        {
          code: "agent_connected",
          level: "info",
          message: `Connected to agent "${snapshot.agent.name}"`,
          detail: `Model: ${snapshot.agent.model} · Type: ${snapshot.agent.agentType} · Blocks: ${snapshot.blocks.length} · Tools: ${snapshot.tools.length}`,
        },
      ],
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const isAuth = message.toLowerCase().includes("401") || message.toLowerCase().includes("unauthorized");
    const isNotFound = message.toLowerCase().includes("404") || message.toLowerCase().includes("not found");

    return {
      adapterType: "letta_cloud",
      status: "fail",
      testedAt,
      checks: [
        {
          code: isAuth ? "auth_failed" : isNotFound ? "agent_not_found" : "connection_failed",
          level: "error",
          message: isAuth
            ? "Authentication failed — check your API key"
            : isNotFound
              ? `Agent not found: ${config.agentId}`
              : `Connection failed: ${message}`,
          hint: isAuth
            ? "Verify your Letta Cloud API key at https://app.letta.com/settings"
            : isNotFound
              ? "Verify the agent ID exists in your Letta Cloud workspace"
              : "Check that the base URL is correct and the Letta API is reachable",
        },
      ],
    };
  }
}
