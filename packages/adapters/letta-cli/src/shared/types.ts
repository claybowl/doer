export interface LettaCliAdapterConfig {
  /** Letta agent ID — format: "agent-<uuid>" */
  agentId: string;
  /** Letta API key */
  apiKey: string;
  /** Base URL — defaults to https://api.letta.com */
  baseUrl?: string;
  /**
   * Backend flag passed to the letta-code CLI.
   * "api" = Letta Cloud; "local" = self-hosted server.
   * Default: "api"
   */
  backend?: "api" | "local";
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
