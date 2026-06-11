/**
 * Letta .af file importer.
 *
 * A Letta .af (Agent File) is a ZIP archive containing `agent_state.json`.
 * This module:
 *   1. Unpacks the archive to a temp dir using the system `unzip` command
 *   2. Parses `agent_state.json` — handles both old (dict-style) and new (blocks array) memory schemas
 *   3. Writes each memory block as `<label>.txt` to the caller-specified destination directory
 *   4. Writes an AGENTS.md containing the system prompt and a memory map
 *
 * Falls back to treating the .af as a plain JSON file if unzip fails,
 * since older Letta versions exported JSON directly.
 */

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { AfAgentSnapshot, AfMemoryBlock } from "../shared/types.js";

const execFileAsync = promisify(execFile);

// ── JSON parsing helpers ──────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Extract memory blocks from the agent_state JSON.
 * Handles three historical Letta memory schemas:
 *   A. memory.memory = { label: { value, limit, description } }  (0.3-era)
 *   B. memory.blocks = [ { label, value, limit, description } ]  (0.6+ era)
 *   C. blocks = [ { label, value, ... } ]  (root-level, some exports)
 */
function extractBlocks(state: Record<string, unknown>): AfMemoryBlock[] {
  // Schema B / C: flat blocks array
  const rootBlocks = state.blocks ?? state.memory_blocks;
  if (Array.isArray(rootBlocks)) {
    return rootBlocks.flatMap((b) => {
      if (!isRecord(b) || typeof b.label !== "string") return [];
      return [{ label: b.label, value: String(b.value ?? ""), description: b.description as string | undefined, limit: b.limit as number | undefined }];
    });
  }

  const memory = state.memory;
  if (!isRecord(memory)) return [];

  // Schema B: memory.blocks array
  if (Array.isArray(memory.blocks)) {
    return memory.blocks.flatMap((b) => {
      if (!isRecord(b) || typeof b.label !== "string") return [];
      return [{ label: b.label, value: String(b.value ?? ""), description: b.description as string | undefined, limit: b.limit as number | undefined }];
    });
  }

  // Schema A: memory.memory is a dict keyed by label
  const inner = memory.memory;
  if (isRecord(inner)) {
    return Object.entries(inner).flatMap(([label, block]) => {
      if (!isRecord(block)) return [];
      return [{ label, value: String(block.value ?? ""), description: block.description as string | undefined, limit: block.limit as number | undefined }];
    });
  }

  return [];
}

/** Parse model handle from llm_config */
function extractModel(state: Record<string, unknown>): string {
  const llmConfig = state.llm_config;
  if (isRecord(llmConfig)) {
    const model = llmConfig.model;
    const provider = llmConfig.model_endpoint_type ?? llmConfig.provider;
    if (typeof model === "string" && model.trim()) {
      if (typeof provider === "string" && provider.trim() && !model.includes("/")) {
        return `${provider}/${model}`.trim();
      }
      return model.trim();
    }
  }
  return "unknown";
}

function parseAgentState(raw: string): AfAgentSnapshot {
  let state: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw);
    state = isRecord(parsed) ? parsed : {};
  } catch {
    throw new Error("agent_state.json is not valid JSON");
  }

  // Schema D (new multi-entity export): root = { agents: [...], blocks: [...] }
  // with agents[N].block_ids referencing root-level blocks. Use the first
  // agent's fields and resolve its blocks from the root pool (falling back to
  // all root blocks when ids aren't matchable).
  if (Array.isArray(state.agents) && state.agents.length > 0 && isRecord(state.agents[0])) {
    const first = state.agents[0] as Record<string, unknown>;
    const rootBlocks = Array.isArray(state.blocks) ? state.blocks : [];
    const blockIds = new Set(
      Array.isArray(first.block_ids)
        ? (first.block_ids as unknown[]).filter((v): v is string => typeof v === "string")
        : [],
    );
    const resolved = rootBlocks.filter(
      (b) => isRecord(b) && (blockIds.size === 0 || blockIds.has(String(b.id ?? ""))),
    );
    state = {
      ...first,
      blocks: resolved.length > 0 ? resolved : rootBlocks,
    };
  }

  const name = typeof state.name === "string" ? state.name : "imported-agent";
  const agentType = typeof state.agent_type === "string" ? state.agent_type : "unknown";
  const system = typeof state.system === "string" ? state.system : undefined;
  const tags = Array.isArray(state.tags)
    ? (state.tags as unknown[]).filter((t): t is string => typeof t === "string")
    : [];
  const model = extractModel(state);
  const blocks = extractBlocks(state);

  return { name, model, agentType, system, tags, blocks };
}

// ── ZIP extraction ────────────────────────────────────────────────────────────

async function extractZip(afPath: string, tmpDir: string): Promise<void> {
  // unzip is available on macOS and most Linux distributions.
  await execFileAsync("unzip", ["-o", afPath, "-d", tmpDir]);
}

async function readAgentStateFromDir(dir: string): Promise<string> {
  // Try canonical name first, then scan for any .json file
  const candidates = ["agent_state.json", "agent.json", "state.json"];
  for (const name of candidates) {
    try {
      return await fs.readFile(path.join(dir, name), "utf8");
    } catch {
      // not found, continue
    }
  }
  // Scan for any top-level JSON file
  const entries = await fs.readdir(dir);
  for (const entry of entries) {
    if (!entry.endsWith(".json")) continue;
    try {
      return await fs.readFile(path.join(dir, entry), "utf8");
    } catch {
      // skip
    }
  }
  throw new Error(`No agent state JSON found in .af archive (searched: ${candidates.join(", ")})`);
}

// ── AGENTS.md builder ────────────────────────────────────────────────────────

/**
 * Map a memory-block label to a safe flat filename. Labels may contain
 * slashes (e.g. "system/persona") — flatten to "system__persona.txt" so
 * writes never depend on (or escape into) subdirectories.
 */
export function blockFilename(label: string): string {
  const flat = label
    .replace(/\//g, "__")
    .replace(/[^\w.-]+/g, "_")
    .replace(/^\.+/, "_");
  return `${flat || "block"}.txt`;
}

function buildAgentsMd(snapshot: AfAgentSnapshot, memoryDir: string): string {
  const blockLines = snapshot.blocks.map(
    (b) => `- \`${blockFilename(b.label)}\` — ${b.description ?? b.label}`,
  );
  const blockSection =
    snapshot.blocks.length > 0
      ? `\n## Memory blocks\n\nYour persistent memory is stored as plain-text files in this directory:\n\n${blockLines.join("\n")}\n\nRead these files at the start of each session.\nUpdate them when you learn something new that should persist.\nWrite the new content directly to the file — no special syntax needed.\n`
      : "\n## Memory blocks\n\nNo memory blocks were found in the .af file.\n";

  const systemSection = snapshot.system
    ? `\n## Identity\n\n${snapshot.system.trim()}\n`
    : "";

  return [
    `# ${snapshot.name}`,
    ``,
    `> Imported from Letta .af — running locally via OpenCode.`,
    `> Memory directory: \`${memoryDir}\``,
    systemSection,
    blockSection,
  ].join("\n");
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface UnpackResult {
  snapshot: AfAgentSnapshot;
  memoryDir: string;
}

/**
 * Unpack a Letta .af file to `destDir`, writing:
 *   - `<label>.txt` for each memory block
 *   - `AGENTS.md` with identity + memory map
 *
 * Returns the parsed snapshot and the absolute `destDir` path.
 */
export async function unpackAgentFile(
  afPath: string,
  destDir: string,
): Promise<UnpackResult> {
  await fs.mkdir(destDir, { recursive: true });

  let rawState: string;

  // Attempt ZIP extraction first
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "doer-af-import-"));
  try {
    try {
      await extractZip(afPath, tmpDir);
      rawState = await readAgentStateFromDir(tmpDir);
    } catch {
      // Not a ZIP (or unzip unavailable) — try reading the file directly as JSON
      rawState = await fs.readFile(afPath, "utf8");
    }
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }

  const snapshot = parseAgentState(rawState);

  // Write one .txt file per memory block (labels flattened — may contain slashes)
  for (const block of snapshot.blocks) {
    await fs.writeFile(path.join(destDir, blockFilename(block.label)), block.value, "utf8");
  }

  // Write AGENTS.md
  const agentsMd = buildAgentsMd(snapshot, destDir);
  await fs.writeFile(path.join(destDir, "AGENTS.md"), agentsMd, "utf8");

  return { snapshot, memoryDir: destDir };
}

/**
 * Validate that a file exists and looks like a Letta .af archive.
 * Returns null on success, an error message string on failure.
 */
export async function validateAfPath(afPath: string): Promise<string | null> {
  if (!afPath || !afPath.trim()) {
    return "Agent file path is required";
  }
  try {
    const stat = await fs.stat(afPath);
    if (!stat.isFile()) return `Not a file: ${afPath}`;
  } catch {
    return `File not found: ${afPath}`;
  }

  const ext = path.extname(afPath).toLowerCase();
  if (ext && ext !== ".af" && ext !== ".json" && ext !== ".zip") {
    return `Unexpected file extension "${ext}" — expected .af`;
  }

  return null;
}

/**
 * Read memory block summaries from an existing memoryDir (no re-extraction).
 * Used by execute() to build the memory map prompt on each heartbeat.
 */
export async function readMemoryBlocks(memoryDir: string): Promise<AfMemoryBlock[]> {
  let entries: string[];
  try {
    entries = await fs.readdir(memoryDir);
  } catch {
    return [];
  }

  const blocks: AfMemoryBlock[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".txt") || entry === "AGENTS.md") continue;
    const label = entry.slice(0, -4);
    try {
      const value = await fs.readFile(path.join(memoryDir, entry), "utf8");
      blocks.push({ label, value });
    } catch {
      // skip unreadable files
    }
  }
  return blocks;
}
