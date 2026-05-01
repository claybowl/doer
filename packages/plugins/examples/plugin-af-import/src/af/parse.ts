import type {
  AfFile,
  AfMemoryBlock,
  AfOrgBundle,
  AfBundledAgent,
  AfBundledBlock,
  AfBundledTool,
  AfTool,
} from "./types.js";

/**
 * Result of parsing a .af file.
 *
 * `warnings` are non-fatal observations the caller may want to surface
 * to the user (multi-agent bundles, unresolvable id refs, dropped
 * sections we don't yet handle, etc.). Fatal problems throw.
 */
export interface ParsedAf {
  af: AfFile;
  /** Which on-disk shape we detected. */
  shape: "single" | "org-bundle";
  warnings: string[];
}

/**
 * Parse + validate a .af file. Detects whether the input is a single-
 * agent file (older Letta export) or an org bundle (current Letta
 * export) and normalizes both into the unified `AfFile` shape that
 * `unpack.ts` consumes.
 *
 * Pure function — no I/O, no side effects.
 */
export function parseAfFile(content: string): ParsedAf {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    throw new Error(
      `Could not parse .af content as JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(".af content is not a JSON object");
  }

  const obj = parsed as Record<string, unknown>;

  // ── Shape detection ──────────────────────────────────────────────
  // Org-bundle: top-level `agents` is an array.
  // Single: top-level `agent` is an object.
  if (Array.isArray(obj.agents)) {
    return parseOrgBundle(obj as unknown as AfOrgBundle);
  }
  if (obj.agent && typeof obj.agent === "object" && !Array.isArray(obj.agent)) {
    return parseSingle(obj);
  }
  throw new Error(
    ".af content shape not recognized — expected either an `agents` array (org bundle) or an `agent` object (single)",
  );
}

// ── Single-agent shape (older Letta exports) ────────────────────────

function parseSingle(obj: Record<string, unknown>): ParsedAf {
  const agent = obj.agent as Record<string, unknown>;
  if (typeof agent.name !== "string" || agent.name.trim().length === 0) {
    throw new Error(".af agent is missing required 'name' field");
  }
  if (typeof agent.system !== "string") {
    throw new Error(".af agent is missing required 'system' field");
  }
  const blocks = obj.memory_blocks;
  if (!Array.isArray(blocks)) {
    throw new Error(".af is missing required 'memory_blocks' array");
  }
  return {
    af: obj as AfFile,
    shape: "single",
    warnings: [],
  };
}

// ── Org-bundle shape (current Letta exports) ─────────────────────────

function parseOrgBundle(bundle: AfOrgBundle): ParsedAf {
  const warnings: string[] = [];

  if (!Array.isArray(bundle.agents) || bundle.agents.length === 0) {
    throw new Error(".af org-bundle has no `agents` array entries");
  }
  if (bundle.agents.length > 1) {
    warnings.push(
      `org-bundle contains ${bundle.agents.length} agents; importing only agents[0] (${describeAgent(bundle.agents[0])}). Other agents are dropped.`,
    );
  }

  const agent = bundle.agents[0];
  if (typeof agent.name !== "string" || agent.name.trim().length === 0) {
    throw new Error("org-bundle agents[0] is missing required 'name' field");
  }
  if (typeof agent.system !== "string") {
    throw new Error("org-bundle agents[0] is missing required 'system' field");
  }

  // Resolve top-level blocks[] by id, in the order agents[0].block_ids declares.
  const memory_blocks = resolveMemoryBlocks(agent, bundle, warnings);

  // Same pattern for tools.
  const tools = resolveTools(agent, bundle, warnings);

  // Note any dropped sections so the user knows we didn't lose data silently.
  for (const key of ["groups", "files", "sources", "mcp_servers", "skills"] as const) {
    const v = bundle[key];
    if (Array.isArray(v) && v.length > 0) {
      warnings.push(
        `Dropped ${v.length} ${key} entries — not yet supported by .af-import. Original .af preserved at the source if you need them later.`,
      );
    }
  }

  // Letta's current export buries model/embedding inside *_config objects.
  // Fall back through plausible locations so the unpacked agent.json is useful.
  const model =
    agent.model ??
    agent.llm_config?.handle ??
    agent.llm_config?.model ??
    undefined;
  const embedding =
    agent.embedding ??
    agent.embedding_config?.handle ??
    agent.embedding_config?.embedding_model ??
    undefined;

  const af: AfFile = {
    agent: {
      name: agent.name,
      system: agent.system,
      model,
      embedding,
      agent_type: agent.agent_type,
      description: agent.description,
      tags: agent.tags,
      metadata: agent.metadata,
    },
    memory_blocks,
    tools,
  };
  return { af, shape: "org-bundle", warnings };
}

function resolveMemoryBlocks(
  agent: AfBundledAgent,
  bundle: AfOrgBundle,
  warnings: string[],
): AfMemoryBlock[] {
  const byId = new Map<string, AfBundledBlock>();
  for (const b of bundle.blocks ?? []) {
    if (b && typeof b === "object" && typeof b.id === "string") {
      byId.set(b.id, b);
    }
  }

  // Path 1 (preferred): agent.block_ids → top-level blocks[].
  const blockIds = agent.block_ids ?? [];
  if (blockIds.length > 0) {
    const out: AfMemoryBlock[] = [];
    const unresolved: string[] = [];
    for (const id of blockIds) {
      const b = byId.get(id);
      if (b && typeof b.label === "string") {
        out.push({
          label: b.label,
          value: typeof b.value === "string" ? b.value : "",
          read_only: b.read_only,
          limit: b.limit,
          description: b.description,
        });
      } else {
        unresolved.push(id);
      }
    }
    if (unresolved.length > 0) {
      warnings.push(
        `Could not resolve ${unresolved.length} block_id(s) against top-level blocks[] (e.g. ${unresolved.slice(0, 3).join(", ")}).`,
      );
    }
    if (out.length > 0) return out;
  }

  // Path 2 (fallback): inline agent.memory_blocks.
  if (Array.isArray(agent.memory_blocks) && agent.memory_blocks.length > 0) {
    return agent.memory_blocks
      .filter((b): b is AfMemoryBlock => Boolean(b && typeof b.label === "string"))
      .map((b) => ({
        label: b.label,
        value: typeof b.value === "string" ? b.value : "",
        read_only: b.read_only,
        limit: b.limit,
        description: b.description,
      }));
  }

  warnings.push("Agent has no resolvable memory blocks — output will have an empty .letta/memory/ directory.");
  return [];
}

function resolveTools(
  agent: AfBundledAgent,
  bundle: AfOrgBundle,
  warnings: string[],
): AfTool[] {
  const byId = new Map<string, AfBundledTool>();
  for (const t of bundle.tools ?? []) {
    if (t && typeof t === "object" && typeof t.id === "string") {
      byId.set(t.id, t);
    }
  }

  // Path 1 (preferred): agent.tool_ids → top-level tools[].
  const toolIds = agent.tool_ids ?? [];
  if (toolIds.length > 0) {
    const out: AfTool[] = [];
    const unresolved: string[] = [];
    for (const id of toolIds) {
      const t = byId.get(id);
      if (t && typeof t.name === "string") {
        out.push({
          name: t.name,
          source_code: typeof t.source_code === "string" ? t.source_code : "",
          source_type: t.source_type,
          description: t.description,
          args_json_schema: t.args_json_schema,
          tags: t.tags,
          return_char_limit: t.return_char_limit,
        });
      } else {
        unresolved.push(id);
      }
    }
    if (unresolved.length > 0) {
      warnings.push(
        `Could not resolve ${unresolved.length} tool_id(s) against top-level tools[] (e.g. ${unresolved.slice(0, 3).join(", ")}).`,
      );
    }
    return out;
  }

  // Path 2 (fallback): inline agent.tools.
  if (Array.isArray(agent.tools) && agent.tools.length > 0) {
    return agent.tools
      .filter((t): t is AfTool => Boolean(t && typeof t.name === "string"))
      .map((t) => ({
        name: t.name,
        source_code: typeof t.source_code === "string" ? t.source_code : "",
        source_type: t.source_type,
        description: t.description,
        args_json_schema: t.args_json_schema,
        tags: t.tags,
        return_char_limit: t.return_char_limit,
      }));
  }

  return [];
}

function describeAgent(a: AfBundledAgent | undefined): string {
  if (!a) return "(unknown)";
  return typeof a.name === "string" ? a.name : "(unnamed)";
}
