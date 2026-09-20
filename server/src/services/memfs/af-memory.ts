import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Canonical (Letta-native) memory projection for `.af` agent files.
 *
 * Letta Code's MemFS expects markdown blocks laid out under the agent's own
 * memory root, one file per block:
 *
 *     <memoryDir>/system/persona.md
 *     ---
 *     description: What this block contains
 *     ---
 *     <block content>
 *
 * The runtime's pre-commit hook enforces the shape:
 *   - every `.md` needs YAML frontmatter
 *   - `description` is required and must be non-empty
 *   - unknown frontmatter keys are rejected
 *   - `read_only` is protected — only the server/user may set it
 *
 * The af-opencode unpacker used for the legacy adapter instead flattens labels
 * (`system/persona` → `system__persona.txt`) and emits `label`/`read_only`/
 * `limit` frontmatter, which MemFS cannot read. This module writes the
 * canonical shape so `letta_code` agents can actually load the personas a team
 * import seeds.
 */

export interface AfMemoryBlock {
  label: string;
  value: string;
  description?: string | null;
}

export interface AfSnapshot {
  name: string;
  system: string;
  model?: string;
  blocks: AfMemoryBlock[];
}

/**
 * Parse an `.af` file into the pieces the importer needs, without writing the
 * flattened af-opencode layout to disk. Supports both the current org-bundle
 * shape (`agents: [...]`) and the older single-agent shape (`agent: {...}`).
 */
export async function parseAfSnapshot(afPath: string): Promise<AfSnapshot> {
  const raw = await readFile(afPath, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `.af file is not valid JSON (${afPath}): ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`.af file is not a JSON object: ${afPath}`);
  }
  const root = parsed as Record<string, unknown>;

  const agent = Array.isArray(root.agents)
    ? (root.agents[0] as Record<string, unknown> | undefined)
    : (root.agent as Record<string, unknown> | undefined);
  if (!agent || typeof agent.name !== "string" || !agent.name.trim()) {
    throw new Error(`.af file has no readable agent entry: ${afPath}`);
  }

  // Top-level blocks resolved through agents[0].block_ids, falling back to
  // inline memory_blocks (mirrors the .af-import parser's precedence).
  const byId = new Map<string, Record<string, unknown>>();
  if (Array.isArray(root.blocks)) {
    for (const block of root.blocks as Array<Record<string, unknown>>) {
      if (block && typeof block.id === "string") byId.set(block.id, block);
    }
  }
  const blockIds = Array.isArray(agent.block_ids) ? (agent.block_ids as string[]) : [];
  const inline = Array.isArray(agent.memory_blocks)
    ? (agent.memory_blocks as Array<Record<string, unknown>>)
    : [];
  const sources =
    blockIds.length > 0
      ? blockIds
          .map((id) => byId.get(id))
          .filter((b): b is Record<string, unknown> => Boolean(b))
      : inline;

  const blocks: AfMemoryBlock[] = [];
  for (const block of sources) {
    if (!block || typeof block.label !== "string" || !block.label.trim()) continue;
    blocks.push({
      label: block.label,
      value: typeof block.value === "string" ? block.value : "",
      description: typeof block.description === "string" ? block.description : null,
    });
  }

  const llm = agent.llm_config as Record<string, unknown> | undefined;
  const model =
    (typeof agent.model === "string" && agent.model) ||
    (llm && typeof llm.handle === "string" ? llm.handle : undefined) ||
    (llm && typeof llm.model === "string" ? llm.model : undefined);

  return {
    name: agent.name,
    system: typeof agent.system === "string" ? agent.system : "",
    model: model || undefined,
    blocks,
  };
}

/**
 * Map a block label to its relative markdown path. Labels carry real directory
 * structure (`system/persona` → `system/persona.md`), unlike the flattened
 * `system__persona.txt` used by the legacy adapter. Path segments are
 * sanitized to keep writes inside the memory root.
 */
export function canonicalBlockPath(label: string): string | null {
  const segments = label
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) =>
      segment
        .replace(/[^A-Za-z0-9._-]+/g, "-")
        .replace(/^[.-]+/, "")
        .replace(/[.-]+$/, ""),
    )
    .filter((segment) => segment && segment !== "." && segment !== "..");
  if (segments.length === 0) return null;
  return `${segments.join("/")}.md`;
}

/** Render a block as canonical MemFS markdown: `description`-only frontmatter. */
export function renderCanonicalBlock(
  label: string,
  value: string,
  description?: string | null,
): string {
  const desc =
    (description ?? "").replace(/[\r\n]+/g, " ").trim() || `Memory block: ${label}`;
  const body = value.replace(/\r\n/g, "\n").replace(/\s+$/, "");
  return `---\ndescription: ${JSON.stringify(desc)}\n---\n\n${body}\n`;
}

/** Write every block into the canonical MemFS layout under `memoryDir`. */
export async function writeCanonicalMemory(
  memoryDir: string,
  blocks: AfMemoryBlock[],
): Promise<void> {
  for (const block of blocks) {
    const relative = canonicalBlockPath(block.label);
    if (!relative) continue;
    const filePath = path.join(memoryDir, ...relative.split("/"));
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(
      filePath,
      renderCanonicalBlock(block.label, block.value, block.description),
      "utf8",
    );
  }
}
