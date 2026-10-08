// ─── Letta .af → OpenCode Adapter — Shared Types ────────────────────────────

export interface LettaAfAdapterConfig {
  /** Absolute path to the .af file on disk */
  afPath: string;

  /**
   * Directory where memory blocks are extracted.
   * Set automatically by onHireApproved — do not set manually.
   * e.g. ~/.doer/agents/<agentId>/memory
   */
  memoryDir?: string;

  // ── Snapshot (populated from the .af on hire) ─────────────────────────────
  /** Human-readable agent name from the .af */
  agentName?: string;
  /** LLM handle — e.g. "anthropic/claude-sonnet-4-5" — overridable */
  model?: string;
  /** System prompt extracted from the .af */
  systemPrompt?: string;
  /** Memory block labels found in the .af, e.g. ["persona", "human"] */
  memoryBlockLabels?: string[];

  // ── OpenCode execution settings ───────────────────────────────────────────
  /**
   * Template for the user message sent on timer-triggered heartbeats.
   * Supports {{agent.id}}, {{agent.name}}, {{run.id}}, {{context.*}}.
   * Falls back to "Continue your Doer work." if empty.
   */
  heartbeatPrompt?: string;

  /**
   * Skip OpenCode interactive permission prompts.
   * Defaults to true for unattended Doer runs.
   */
  dangerouslySkipPermissions?: boolean;

  /** Run timeout in seconds (0 = no timeout) */
  timeoutSec?: number;

  /** SIGTERM grace period in seconds */
  graceSec?: number;

  /** Additional CLI args forwarded to opencode */
  extraArgs?: string[];

  /** Extra KEY=VALUE env vars forwarded to the opencode subprocess */
  env?: Record<string, string>;
}

/** A single memory block parsed from the .af file */
export interface AfMemoryBlock {
  label: string;
  value: string;
  description?: string;
  limit?: number;
}

/** Agent metadata + memory parsed from the .af file */
export interface AfAgentSnapshot {
  name: string;
  /** LLM handle from the .af llm_config, e.g. "openai/gpt-4o" */
  model: string;
  agentType: string;
  system?: string;
  tags?: string[];
  blocks: AfMemoryBlock[];
}
