export { agentConfigurationDoc } from "./shared/agent-config-doc.js";
export type {
  AgentFileAdapterConfig,
  AgentFileHarness,
  AfMemoryBlock,
  AfAgentSnapshot,
} from "./shared/types.js";
export {
  AGENT_FILE_HARNESSES,
  AGENT_FILE_HARNESS_LABELS,
  HARNESS_SUPPORTS_SKIP_PERMISSIONS,
  resolveHarness,
} from "./shared/types.js";

export const type = "agent_file";
export const label = "Agent File (.af)";
export const models: Array<{ id: string; label: string }> = [];

/**
 * Memfs capability — this adapter extracts memory blocks to a local directory.
 * Use fs-mount to symlink that directory into the agent's working dir,
 * or native-letta if you want Doer to observe an existing ~/.letta layout.
 */
export const memfsCapability = {
  supported: ["fs-mount", "native-letta", "none"] as const,
  default: "fs-mount" as const,
};
