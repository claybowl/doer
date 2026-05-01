import type { AfFile, AfMemoryBlock, AfTool } from "./types.js";

/**
 * Result of building the LeCo file map.
 *
 * `files` is the path→content map the caller writes to disk.
 * `warnings` are non-fatal observations (skipped tools, slug
 * collisions, etc.) the caller may want to surface.
 */
export interface LecoFileMap {
  files: Map<string, string>;
  warnings: string[];
}

/**
 * Build the file map (path → content) for unpacking a .af to the
 * Letta-Code (LeCo) filesystem layout.
 *
 * Pure function — no disk I/O. Caller iterates the returned Map and
 * writes each entry. Keeping I/O at the caller makes this trivially
 * testable + lets us preview the unpack (UI: "this will write 12
 * files; here they are") before any disk write.
 *
 * LeCo layout:
 *   .letta/agent.json              — name, model, embedding, tags
 *   .letta/system.md               — system prompt
 *   .letta/memory/<sluggified>.md  — one file per memory block
 *   .letta/tools/<name>.py         — one file per custom tool with source_code
 *   .letta/archival/<NNNN>.json    — archival memory chunks (optional)
 *   README.md                      — auto-generated from agent metadata
 *   .gitignore                     — runtime/session artifacts
 *
 * Skipped: tools without `source_code` (Letta runtime / MCP tools that
 * don't have user-authored Python source). One warning per skip.
 */

export function buildLecoFileMap(
  af: AfFile,
  options: { excludeMessages?: boolean } = {},
): LecoFileMap {
  const files = new Map<string, string>();
  const warnings: string[] = [];
  const excludeMessages = options.excludeMessages ?? true;

  // ── .letta/agent.json — metadata only, system prompt lives in system.md
  files.set(
    ".letta/agent.json",
    JSON.stringify(
      {
        name: af.agent.name,
        model: af.agent.model ?? null,
        embedding: af.agent.embedding ?? null,
        agent_type: af.agent.agent_type ?? null,
        description: af.agent.description ?? null,
        tags: af.agent.tags ?? [],
        metadata: af.agent.metadata ?? {},
      },
      null,
      2,
    ) + "\n",
  );

  // ── .letta/system.md — the system prompt
  files.set(".letta/system.md", `${af.agent.system.trim()}\n`);

  // ── .letta/memory/<label>.md — one file per memory block (slug-collision-safe)
  const memorySlugs = new Map<string, number>();
  for (const block of af.memory_blocks) {
    const slug = uniqueSlug(sluggifyLabel(block.label), memorySlugs, warnings, block.label, "memory block");
    files.set(`.letta/memory/${slug}.md`, formatMemoryBlock(block));
  }

  // ── .letta/tools/<name>.py — one file per custom tool with source_code
  // Tools without source_code are Letta runtime / MCP tools — emit a warning per skip.
  for (const tool of af.tools ?? []) {
    if (!tool.source_code || tool.source_code.trim().length === 0) {
      warnings.push(
        `Skipped tool '${tool.name}' — no source_code available (likely a Letta runtime or MCP tool, not user-authored Python).`,
      );
      continue;
    }
    if (tool.source_type && tool.source_type !== "python") {
      warnings.push(
        `Skipped tool '${tool.name}' — unsupported source_type '${tool.source_type}'. Only 'python' is supported today.`,
      );
      continue;
    }
    files.set(`.letta/tools/${safeFilename(tool.name)}.py`, formatTool(tool));
  }

  // ── .letta/archival/<NNNN>.json — archival memory (Session 2 will chunk properly)
  if (af.archival_memory && af.archival_memory.length > 0) {
    files.set(
      ".letta/archival/0001.json",
      JSON.stringify(af.archival_memory, null, 2) + "\n",
    );
  }

  // ── messages — only if NOT excluded
  if (!excludeMessages && af.messages && af.messages.length > 0) {
    files.set(
      ".letta/conversation/0001.json",
      JSON.stringify(af.messages, null, 2) + "\n",
    );
  }

  // ── README.md — auto-generated overview
  files.set("README.md", buildReadme(af));

  // ── .gitignore — keep runtime crud out of git
  files.set(
    ".gitignore",
    [
      "# Doer / Letta runtime artifacts",
      ".letta/runtime/",
      ".letta/sessions/",
      "*.log",
      ".DS_Store",
      "",
    ].join("\n"),
  );

  return { files, warnings };
}

function uniqueSlug(
  base: string,
  used: Map<string, number>,
  warnings: string[],
  originalLabel: string,
  kind: string,
): string {
  const safeBase = base.length > 0 ? base : "unnamed";
  const count = used.get(safeBase) ?? 0;
  used.set(safeBase, count + 1);
  if (count === 0) return safeBase;
  const suffixed = `${safeBase}-${count}`;
  warnings.push(
    `Slug collision on ${kind} '${originalLabel}' — emitted as '${suffixed}.md' to avoid overwriting '${safeBase}.md'.`,
  );
  return suffixed;
}

function safeFilename(name: string): string {
  // Tool names are typically already filesystem-safe, but defensively strip
  // anything that could cause directory traversal or platform issues.
  return name.replace(/[^\w.-]+/g, "_").replace(/^[.-]+/, "_");
}

function sluggifyLabel(label: string): string {
  return label
    .replace(/[^\w/-]+/g, "_")
    .replace(/\//g, "__")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function formatMemoryBlock(block: AfMemoryBlock): string {
  const meta = [
    "---",
    `label: ${block.label}`,
    `read_only: ${block.read_only ?? false}`,
    block.limit !== undefined ? `limit: ${block.limit}` : null,
    block.description ? `description: ${JSON.stringify(block.description)}` : null,
    "---",
    "",
  ]
    .filter((line) => line !== null)
    .join("\n");
  return `${meta}${block.value.replace(/\r\n/g, "\n").replace(/\s+$/, "")}\n`;
}

function formatTool(tool: AfTool): string {
  const header = [
    "# Tool source — managed by .af-import. Edit at your own risk.",
    `# name: ${tool.name}`,
    tool.description ? `# description: ${tool.description.replace(/\n/g, " ")}` : null,
    tool.tags && tool.tags.length > 0 ? `# tags: ${tool.tags.join(", ")}` : null,
    "",
    "",
  ]
    .filter((line) => line !== null)
    .join("\n");
  return `${header}${tool.source_code.trimEnd()}\n`;
}

function buildReadme(af: AfFile): string {
  const blockLines = af.memory_blocks
    .map((b) => `- \`${b.label}\` ${b.read_only ? "(read-only)" : ""}`)
    .join("\n");
  const toolLines = (af.tools ?? [])
    .map((t) => `- \`${t.name}\``)
    .join("\n");
  return [
    `# ${af.agent.name}`,
    "",
    af.agent.description ?? "Imported via @doerai/plugin-af-import.",
    "",
    "## Layout",
    "",
    "```",
    ".letta/",
    "├── agent.json    # name, model, embedding, tags, metadata",
    "├── system.md     # system prompt",
    "├── memory/       # one .md per memory block",
    "└── tools/        # one .py per custom tool",
    "```",
    "",
    "## Memory blocks",
    "",
    blockLines || "_(none)_",
    "",
    "## Custom tools",
    "",
    toolLines || "_(none)_",
    "",
    "---",
    "",
    "_Generated by @doerai/plugin-af-import. Run `letta-code start .` to launch this agent (requires `npm install -g @letta-ai/letta-code`)._",
    "",
  ].join("\n");
}
