// ─── Agent File (.af) Adapter — Shared Types ───────────────────────────────

/**
 * Local CLI harness that executes the unpacked .af agent.
 *
 * The .af format itself is harness-agnostic: unpacking to memfs, writing
 * AGENTS.md, and building the memory bootstrap are identical regardless of
 * which CLI runs the turn. Only the final execute delegate differs.
 */
export type AgentFileHarness = "opencode" | "pi" | "claude" | "codex";

export const AGENT_FILE_HARNESSES: readonly AgentFileHarness[] = ["opencode", "pi", "claude", "codex"];

/** Human-readable labels for the harness picker. */
export const AGENT_FILE_HARNESS_LABELS: Record<AgentFileHarness, string> = {
  opencode: "OpenCode",
  pi: "Pi",
  claude: "Claude Code",
  codex: "Codex",
};

/** Harnesses that accept `dangerouslySkipPermissions` in their config. */
export const HARNESS_SUPPORTS_SKIP_PERMISSIONS: ReadonlySet<AgentFileHarness> = new Set<AgentFileHarness>([
  "opencode",
  "claude",
]);

/** Resolve the configured harness, defaulting to opencode for pre-harness configs. */
export function resolveHarness(value: unknown): AgentFileHarness {
  return typeof value === "string" && (AGENT_FILE_HARNESSES as readonly string[]).includes(value)
    ? (value as AgentFileHarness)
    : "opencode";
}

export interface AgentFileAdapterConfig {
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

  // ── Harness selection ─────────────────────────────────────────────────────
  /**
   * Which local CLI runs the turn. Defaults to "opencode", which is what every
   * agent created before this field existed is already running.
   */
  harness?: AgentFileHarness;

  /** Working directory for the harness process (non-opencode harnesses expect this) */
  cwd?: string;

  // ── Execution settings ────────────────────────────────────────────────────
  /**
   * Template for the user message sent on timer-triggered heartbeats.
   * Supports {{agent.id}}, {{agent.name}}, {{run.id}}, {{context.*}}.
   * Falls back to "Continue your Doer work." if empty.
   */
  heartbeatPrompt?: string;

  /**
   * Skip interactive permission prompts.
   * Defaults to true for unattended Doer runs.
   * Only sent to harnesses that support it (opencode, claude).
   */
  dangerouslySkipPermissions?: boolean;

  /** Run timeout in seconds (0 = no timeout) */
  timeoutSec?: number;

  /** SIGTERM grace period in seconds */
  graceSec?: number;

  /** Additional CLI args forwarded to the harness */
  extraArgs?: string[];

  /** Extra KEY=VALUE env vars forwarded to the harness subprocess */
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
