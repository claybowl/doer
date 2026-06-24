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

  /** LLM model string — e.g. "claude-sonnet-4-6", "llama-3.3-70b-versatile", "gpt-oss:20b" */
  model?: string;

  /**
   * LLM provider. "anthropic" uses the Anthropic SDK; every other value is an
   * OpenAI-compatible backend reached over /v1/chat/completions with a preset
   * base URL (override with `baseUrl`). Defaults to "anthropic".
   */
  provider?: "anthropic" | "openai" | "groq" | "nvidia" | "opencode_zen" | "ollama" | "ollama_cloud";

  /**
   * Base URL override for OpenAI-compatible providers. Blank uses the provider's
   * preset (e.g. Groq → https://api.groq.com/openai/v1). Ignored for "anthropic".
   */
  baseUrl?: string;

  /** API key override. Falls back to the provider's env var (e.g. GROQ_API_KEY). */
  apiKey?: string;

  /** Base system prompt / persona. Memory block content appended below. */
  systemPrompt?: string;

  /** Template for timer-triggered heartbeats. Falls back to "Hello". */
  heartbeatPrompt?: string;

  temperature?: number;
  maxTokens?: number;

  /**
   * Override tool-calling capability for skill delivery.
   * "loop" = manifest + read_skill tool loop.
   * "inject" = full-body injection into system prompt.
   * When unset, the default is derived from the provider.
   */
  skillToolCalls?: "loop" | "inject";
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
