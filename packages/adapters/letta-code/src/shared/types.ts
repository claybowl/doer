// ─── letta_code Adapter — Shared Types ──────────────────────────────────────

/**
 * Online mode: connects to a Letta server (api.letta.com, self-hosted, etc.)
 * using the official letta-client SDK. Behaves like letta_cloud but lives
 * inside letta_code so users have one unified "Letta agent" adapter.
 */
export interface LettaCodeOnlineConfig {
  mode: "online";

  /** Letta agent ID — format: "agent-<uuid>" */
  agentId: string;
  /** Letta API key */
  apiKey: string;
  /** Base URL — defaults to https://api.letta.com. Set for self-hosted. */
  baseUrl?: string;

  // ── Snapshot metadata (fetched on first use) ──────────────────────────────
  agentName?: string;
  model?: string;
  agentType?: string;
  systemPrompt?: string;

  /** Template for timer-triggered heartbeats. Falls back to "Hello". */
  heartbeatPrompt?: string;

  temperature?: number;
  maxTokens?: number;
}

/**
 * Offline mode: loads memory blocks from local .md files, calls Anthropic or
 * OpenAI directly in-process. No external server, no PostgreSQL, no Docker.
 */
export interface LettaCodeOfflineConfig {
  mode: "offline";

  /**
   * Absolute path to the directory containing memory block .md files.
   * Each *.md file is one named block: `persona.md` → block "persona".
   */
  memoryDir: string;

  /** LLM model string — e.g. "claude-sonnet-4-6" or "gpt-4o" */
  model?: string;

  /** LLM provider. Defaults to "anthropic". */
  provider?: "anthropic" | "openai";

  /** API key override. Falls back to ANTHROPIC_API_KEY / OPENAI_API_KEY. */
  apiKey?: string;

  /** Base system prompt / persona. Memory block content appended below. */
  systemPrompt?: string;

  /** Template for timer-triggered heartbeats. Falls back to "Hello". */
  heartbeatPrompt?: string;

  temperature?: number;
  maxTokens?: number;
}

/**
 * Unified letta_code adapter config.
 * Discriminated on `mode` — "online" talks to a Letta server,
 * "offline" runs entirely in-process from local .md files.
 */
export type LettaCodeAdapterConfig = LettaCodeOnlineConfig | LettaCodeOfflineConfig;

// ── Offline-mode helpers ──────────────────────────────────────────────────

export interface LettaCodeMemoryBlock {
  /** Block label — derived from filename without extension */
  label: string;
  content: string;
  filePath: string;
}

export interface LettaCodeMemoryUpdate {
  label: string;
  content: string;
}
