// ─── A2A Adapter — Main Package Exports ──────────────────────────────────────

export { agentConfigurationDoc } from "./shared/agent-config-doc.js";
export type {
  A2aAdapterConfig,
  A2aCreateConfigValues,
  A2aAgentCard,
  A2aAgentSkill,
  A2aAgentCapabilities,
  A2aAgentInfo,
  A2aMessage,
  A2aTask,
  A2aTaskState,
  A2aArtifact,
  A2aPart,
  A2aStreamEvent,
  A2aTaskStatusUpdateEvent,
  A2aTaskArtifactUpdateEvent,
  A2aJsonRpcRequest,
  A2aJsonRpcResponse,
} from "./shared/types.js";

export const models = []; // Models come from the remote Agent Card

// Memfs capability — the A2A adapter delegates execution to a remote agent,
// so Doer only observes (no local fs-mount memory).
export const memfsCapability = {
  supported: ["none"] as const,
  default: "none" as const,
};
