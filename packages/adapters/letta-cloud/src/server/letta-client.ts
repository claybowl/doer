import Letta from "@letta-ai/letta-client";
import type { LettaCloudAdapterConfig, LettaMemoryBlock, LettaTool, LettaAgentSnapshot } from "../shared/types.js";

const LETTA_CLOUD_BASE = "https://api.letta.com";

export function getLettaClient(config: LettaCloudAdapterConfig): Letta {
  return new Letta({
    apiKey: config.apiKey,
    baseURL: config.baseUrl?.trim() || LETTA_CLOUD_BASE,
  });
}

/** Fetch agent metadata + all memory blocks + all tools in one shot */
export async function fetchAgentSnapshot(config: LettaCloudAdapterConfig): Promise<LettaAgentSnapshot> {
  const client = getLettaClient(config);

  const [agent, rawBlocks, rawTools] = await Promise.all([
    client.agents.retrieve(config.agentId),
    client.agents.blocks.list(config.agentId),
    client.agents.tools.list(config.agentId),
  ]);

  const blocks: LettaMemoryBlock[] = rawBlocks.map((b: Record<string, unknown>) => ({
    id: String(b.id ?? ""),
    label: String(b.label ?? ""),
    value: String(b.value ?? ""),
    description: b.description ? String(b.description) : undefined,
    readOnly: Boolean(b.read_only ?? false),
    limit: typeof b.limit === "number" ? b.limit : undefined,
  }));

  const tools: LettaTool[] = rawTools.map((t: Record<string, unknown>) => ({
    id: String(t.id ?? ""),
    name: String(t.name ?? ""),
    description: t.description ? String(t.description) : undefined,
    toolType: t.tool_type ? String(t.tool_type) : undefined,
    tags: Array.isArray(t.tags) ? t.tags.map(String) : [],
    defaultRequiresApproval: Boolean(t.default_requires_approval ?? false),
  }));

  return {
    agent: {
      id: String((agent as Record<string, unknown>).id ?? ""),
      name: String((agent as Record<string, unknown>).name ?? ""),
      model: String((agent as Record<string, unknown>).model ?? ""),
      agentType: String((agent as Record<string, unknown>).agent_type ?? ""),
      system: (agent as Record<string, unknown>).system ? String((agent as Record<string, unknown>).system) : undefined,
      tags: Array.isArray((agent as Record<string, unknown>).tags) ? ((agent as Record<string, unknown>).tags as unknown[]).map(String) : [],
    },
    blocks,
    tools,
  };
}

/** Update a single memory block by label */
export async function updateMemoryBlock(
  config: LettaCloudAdapterConfig,
  blockLabel: string,
  value: string,
): Promise<void> {
  const client = getLettaClient(config);
  await client.agents.blocks.update(config.agentId, blockLabel as "human", { value });
}

/** Attach a tool by tool ID */
export async function attachTool(config: LettaCloudAdapterConfig, toolId: string): Promise<void> {
  const client = getLettaClient(config);
  await client.agents.tools.attach(config.agentId, toolId);
}

/** Detach a tool by tool ID */
export async function detachTool(config: LettaCloudAdapterConfig, toolId: string): Promise<void> {
  const client = getLettaClient(config);
  await client.agents.tools.detach(config.agentId, toolId);
}
