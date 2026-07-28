// ─── letta_code Adapter — Shared Types ──────────────────────────────────────

/**
 * Legacy online shape. Normalized to SDK cloud-attached compatibility.
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
 * Legacy offline shape. Normalized to the local Agent SDK backend.
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

  /** Working directory for offline tools (bash, read, write, grep). Defaults to the process cwd. */
  cwd?: string;

  /** @deprecated Ignored. SDK permissions are provider-independent. */
  toolProfile?: "cloud_safe" | "privileged";

  /** @deprecated Ignored by the unified Agent SDK runtime. */
  cloudMemoryLabels?: string[];
}

/**
 * Unified letta_code adapter config.
 * SDK shape is canonical; mode-based shapes remain for stored-record migration.
 */
export type LettaCodeAdapterConfig = LettaCodeSdkConfig | LettaCodeOnlineConfig | LettaCodeOfflineConfig;

export type LettaCodeBackend = "local" | "cloud_attached";
export type LettaCodePermissionMode = "standard" | "acceptEdits" | "unrestricted";
export type LettaCodeReasoningEffort = "none" | "minimal" | "low" | "medium" | "high" | "xhigh";
export type LettaCodeSkillSource = "bundled" | "global" | "agent" | "project";

/** Canonical Agent SDK configuration. Legacy online/offline fields are normalized into this shape. */
export interface LettaCodeSdkConfig {
  backend?: LettaCodeBackend;
  lettaAgentId?: string;
  /** Provenance only; never used as the canonical local runtime ID. */
  sourceAgentId?: string;
  sourceCloudAgentId?: string;
  apiKey?: string;
  apiBaseUrl?: string;
  cwd?: string;
  model?: string;
  reasoningEffort?: LettaCodeReasoningEffort;
  permissionMode?: LettaCodePermissionMode;
  allowedTools?: string[];
  disallowedTools?: string[];
  skillSources?: LettaCodeSkillSource[];
  systemInfoReminder?: boolean;
  modsEnabled?: boolean;
  dreaming?: {
    trigger?: "off" | "step-count" | "compaction-event";
    behavior?: "reminder" | "auto-launch";
    stepCount?: number;
  };
  heartbeatPrompt?: string;
}

export type LettaCodeLlmProvider = "anthropic" | "openai" | "groq" | "nvidia" | "opencode_zen" | "ollama" | "ollama_cloud";

export interface ResolvedLettaCodeConfig extends Required<Pick<
  LettaCodeSdkConfig,
  "backend" | "permissionMode" | "allowedTools" | "disallowedTools" | "skillSources" | "modsEnabled"
>> {
  harnessBackend: "local" | "api";
  lettaAgentId: string;
  sourceCloudAgentId: string;
  apiKey: string;
  apiBaseUrl: string;
  cwd: string;
  model: string;
  /**
   * LLM provider for local-backend execution. Carried from the legacy offline
   * config's `provider` field so sessionEnvironment() can map the adapter
   * apiKey/baseUrl to the correct env var (GROQ_API_KEY, OPENAI_API_KEY, …)
   * instead of only LETTA_API_KEY (cloud-attached).
   */
  llmProvider: LettaCodeLlmProvider | null;
  /** Per-provider API key override (from adapterConfig.apiKey). */
  llmApiKey: string;
  /** Per-provider base URL override (from adapterConfig.baseUrl or preset). */
  llmBaseUrl: string;
  reasoningEffort?: LettaCodeReasoningEffort;
  systemInfoReminder?: boolean;
  dreaming?: LettaCodeSdkConfig["dreaming"];
  heartbeatPrompt: string;
}

export interface LettaCodeSessionParams {
  conversationId: string;
  lettaAgentId: string;
  cwd: string;
  backend: LettaCodeBackend;
}

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
