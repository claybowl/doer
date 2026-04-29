export { agentConfigurationDoc } from "./shared/agent-config-doc.js";
export type {
  LettaAfAdapterConfig,
  AfMemoryBlock,
  AfAgentSnapshot,
} from "./shared/types.js";

export const type = "letta_af_opencode";
export const label = "Letta .af (local via OpenCode)";
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
