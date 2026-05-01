/**
 * TypeScript shape of the Letta .af agent file format.
 *
 * Letta has shipped two distinct on-disk shapes:
 *   1. "single" — `{ agent, memory_blocks, tools, ... }`. Documented in
 *      Letta's earlier spec; matches the Drafter sample observed
 *      2026-04-26.
 *   2. "org bundle" — `{ agents: [...], blocks: [...], tools: [...],
 *      groups, sources, files, mcp_servers, skills, metadata,
 *      created_at }`. Verified against 7 fresh exports 2026-04-27 —
 *      what `client.agents.export_file()` returns today. Blocks and
 *      tools live at top-level; the agent references them by id via
 *      `agents[0].block_ids` / `agents[0].tool_ids`.
 *
 * `parseAfFile()` detects which shape it received and normalizes the
 * org-bundle into `AfFile` so the rest of the plugin (unpack.ts) only
 * has to think about one shape.
 *
 * Neither shape carries a top-level version field; shape detection IS
 * our version discriminator. If Letta ships a third shape, add a third
 * branch in `parseAfFile()` rather than rewriting `AfFile`.
 */

export interface AfFile {
  agent: AfAgent;
  memory_blocks: AfMemoryBlock[];
  tools?: AfTool[];
  archival_memory?: AfArchivalEntry[];
  /** Conversation history. Often excluded for privacy. */
  messages?: AfMessage[];
  /** Anything else Letta tacked on; preserve verbatim on round-trip. */
  [key: string]: unknown;
}

/**
 * Letta's current org-bundle export shape. The agent the user wants is
 * `agents[0]` (Letta exports a single agent per file as a single-element
 * array — multi-agent bundles are an open question; we take the first
 * and warn if there are more). Memory blocks and tools live at the top
 * level and are referenced by id from the agent.
 */
export interface AfOrgBundle {
  agents: AfBundledAgent[];
  blocks?: AfBundledBlock[];
  tools?: AfBundledTool[];
  groups?: unknown[];
  files?: unknown[];
  sources?: unknown[];
  mcp_servers?: unknown[];
  skills?: unknown[];
  metadata?: Record<string, unknown>;
  created_at?: string;
  [key: string]: unknown;
}

export interface AfBundledAgent extends AfAgent {
  block_ids?: string[];
  tool_ids?: string[];
  /** Sometimes inline (older bundles); usually empty in current export. */
  memory_blocks?: AfMemoryBlock[];
  /** Sometimes inline; usually empty in current export. */
  tools?: AfTool[];
  /** Letta's current export puts the model handle inside llm_config, not at top level. */
  llm_config?: {
    handle?: string;
    model?: string;
    [key: string]: unknown;
  };
  /** Same story for embedding. */
  embedding_config?: {
    handle?: string;
    embedding_model?: string;
    [key: string]: unknown;
  };
}

export interface AfBundledBlock extends AfMemoryBlock {
  id?: string;
}

export interface AfBundledTool extends AfTool {
  id?: string;
}

export interface AfAgent {
  name: string;
  /** Full system prompt, including any agent-specific persona text. */
  system: string;
  /** Letta model handle, e.g. "groq/kimi-k2-instruct-0905". */
  model?: string;
  /** Letta embedding handle. */
  embedding?: string;
  /** "memgpt" / "react" / etc. — Letta agent template type. */
  agent_type?: string;
  description?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface AfMemoryBlock {
  /** Stable label, e.g. "system/persona" or "df_journal". */
  label: string;
  value: string;
  read_only?: boolean;
  /** Maximum character count for the block. */
  limit?: number;
  description?: string;
}

export interface AfTool {
  name: string;
  /** Python source code for the tool. */
  source_code: string;
  source_type?: "python" | string;
  description?: string;
  args_json_schema?: Record<string, unknown>;
  tags?: string[];
  return_char_limit?: number;
}

export interface AfArchivalEntry {
  text: string;
  metadata?: Record<string, unknown>;
}

export interface AfMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | unknown;
  timestamp?: string;
  [key: string]: unknown;
}

// ── Plugin worker job contracts ─────────────────────────────────────────

export interface AfImportJobInput {
  /** Raw .af content as JSON text. */
  afContent: string;
  /** Absolute target directory. Must be empty or non-existent unless `overwrite: true`. */
  targetDirectory: string;
  options?: {
    /** Run `git init` + initial commit after unpack. Default: true. */
    initGit?: boolean;
    /** Strip conversation history from the unpack. Default: true. */
    excludeMessages?: boolean;
    /** Allow writing into a non-empty target directory. Default: false. */
    overwrite?: boolean;
  };
}

export interface AfImportJobResult {
  success: boolean;
  unpackedTo: string;
  fileCount: number;
  warnings: string[];
  agentMetadata: {
    name: string;
    model: string | null;
    toolCount: number;
    blockCount: number;
  };
}
