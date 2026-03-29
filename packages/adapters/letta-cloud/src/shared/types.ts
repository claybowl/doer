// ─── Letta Cloud Adapter — Shared Types ────────────────────────────────────

export interface LettaCloudAdapterConfig {
  /** Letta Cloud agent ID — format: "agent-<uuid>" */
  agentId: string;
  /** Letta Cloud API key (stored encrypted by Paperclip) */
  apiKey: string;
  /** Base URL — defaults to https://api.letta.com. Set for self-hosted. */
  baseUrl?: string;

  // ── Snapshot (fetched on hire, refreshed on config load) ─────────────────
  /** Human-readable agent name from Letta Cloud */
  agentName?: string;
  /** LLM handle, e.g. "anthropic/claude-sonnet-4-5" */
  model?: string;
  /** Agent type — "memgpt_agent" | "react_agent" | etc. */
  agentType?: string;
  /** Agent system prompt (display + edit) */
  systemPrompt?: string;
  /** Tags from Letta Cloud */
  tags?: string[];

  // ── Model settings ────────────────────────────────────────────────────────
  temperature?: number;
  maxTokens?: number;
}

export interface LettaMemoryBlock {
  id: string;
  /** e.g. "human", "persona", "mission", or any custom label */
  label: string;
  /** The actual content */
  value: string;
  /** Description shown as hint in the editor */
  description?: string;
  readOnly?: boolean;
  /** Character limit for this block */
  limit?: number;
}

export interface LettaTool {
  id: string;
  name: string;
  description?: string;
  /** "custom" | "letta_core" | "external_integration" | etc. */
  toolType?: string;
  tags?: string[];
  defaultRequiresApproval?: boolean;
}

export interface LettaAgentSnapshot {
  agent: {
    id: string;
    name: string;
    model: string;
    agentType: string;
    system?: string;
    tags?: string[];
  };
  blocks: LettaMemoryBlock[];
  tools: LettaTool[];
}
