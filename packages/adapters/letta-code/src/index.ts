export type {
  LettaCodeAdapterConfig,
  LettaCodeSdkConfig,
  LettaCodeBackend,
  LettaCodeOnlineConfig,
  LettaCodeOfflineConfig,
  LettaCodeMemoryBlock,
  LettaCodeMemoryUpdate,
} from "./shared/types.js";
export { parseLettaCodeStdoutLine } from "./ui/adapter.js";

export const models = [
  { id: "openai-codex/gpt-5", label: "ChatGPT Subscription (via Letta)" },
  { id: "ollama/llama3.2", label: "Ollama Local (via Letta)" },
  { id: "ollama-cloud/kimi-k2.5", label: "Ollama Cloud (via Letta)" },
] as const;

export const memfsCapability = {
  // Canonical strategy id is "fs-mount" (hyphen) — must match MEMFS_STRATEGIES
  // in @doerai/shared. A prior "fs_mount" typo made the UI offer an invalid
  // strategy, so fs-mount bindings couldn't be created for letta_code agents.
  supported: ["none", "fs-mount"],
  default: "fs-mount",
} as const;

export const agentConfigurationDoc = `
# letta_code Adapter

The unified adapter runs the official Letta Agent SDK through a local app-server.
Shell, filesystem, and Doer external tools always execute on the Doer machine.
Model choice is independent from \`permissionMode\`; Ollama Cloud does not disable
local tools.

## Local canonical backend

Use \`backend: "local"\`. Leave \`lettaAgentId\` blank on the first run to create
a new \`agent-local-*\` identity. Doer scopes Letta local-backend state to the
agent workspace and points Letta MemFS at the agent's fs-mount memory binding.

## Cloud-attached compatibility

Use \`backend: "cloud_attached"\` with an existing Constellation \`lettaAgentId\`.
Authenticate with \`letta /connect\` on the Doer machine or provide \`apiKey\`.
This mode still runs harness tools locally. Importing a Cloud agent into a new
local canonical identity is the preferred portable setup.

## Models, permissions, skills, and mods

- \`model\` accepts any Letta model handle, including ChatGPT subscription,
  local Ollama, Ollama Cloud, and BYOK models configured through Letta.
- \`permissionMode\`: \`standard\`, \`acceptEdits\`, or \`unrestricted\`.
- \`allowedTools\` and \`disallowedTools\` apply directly to Letta Code tools.
- \`skillSources\` selects bundled, global, agent, and project skills.
- Installed Letta Code mods load normally unless \`modsEnabled\` is false.
- Doer never installs, removes, or reloads mods during agent execution.
`.trim();
