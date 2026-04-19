export { agentConfigurationDoc } from "./shared/agent-config-doc.js";
export type { LettaCloudAdapterConfig, LettaMemoryBlock, LettaTool, LettaAgentSnapshot } from "./shared/types.js";

export const models = []; // Models are dynamic per-agent; populated from Letta Cloud

// Memfs capability declaration — see doc/plans/2026-04-17-memfs-memory.md.
// Letta runtime ingests ~/.letta directly; Doer only observes.
export const memfsCapability = {
  supported: ["native-letta", "none"] as const,
  default: "native-letta" as const,
};
