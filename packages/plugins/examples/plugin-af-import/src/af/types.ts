/**
 * TypeScript shape of the Letta .af agent file format.
 *
 * Verified against an exported Drafter .af on 2026-04-26 — fields
 * marked `optional` were absent in that sample but documented as
 * possible by Letta's spec. Validate against a real export before
 * trusting these in production code.
 *
 * Letta's .af spec is versioned implicitly by their export tooling
 * — there's no `version` field at the top level. We assume any field
 * we don't recognize is fine to pass through verbatim.
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
