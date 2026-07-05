export interface LettaCliAdapterConfig {
  /** Letta agent ID — format: "agent-<uuid>" (or "agent-local-<uuid>" for backend "local") */
  agentId: string;
  /** Letta API key. Required for backend "api"; not needed for backend "local". */
  apiKey?: string;
  /** Base URL — defaults to https://api.letta.com */
  baseUrl?: string;
  /**
   * Backend flag passed to the letta-code CLI.
   * "api" = Letta Cloud; "local" = local embedded backend (no Letta credentials required).
   * Default: "api"
   */
  backend?: "api" | "local";
  /**
   * Model handle to pass as `--model` on every invocation, e.g. "ollama/llama3.2:latest"
   * or "ollama-cloud/gemma4:31b". Overrides (and persists as) the agent's model in the
   * Letta backend. Leave unset to use whatever model the agent already has.
   */
  model?: string;
  /**
   * Path to the letta CLI binary.
   * Default: "letta" (resolved via PATH — package @letta-ai/letta-code installs as 'letta')
   */
  command?: string;
  /** Heartbeat prompt for timer-triggered wakes. Falls back to "Hello". */
  heartbeatPrompt?: string;
  /** Run timeout in seconds. 0 = no limit. */
  timeoutSec?: number;
  /** Grace period after SIGTERM before SIGKILL. Default: 20s */
  graceSec?: number;
}
