/**
 * letta-af-opencode adapter — execute
 *
 * Delegates to opencode-local's execute function after enriching the config:
 *   1. Sets instructionsFilePath → <memoryDir>/AGENTS.md (agent identity + memory map)
 *   2. Sets LETTA_MEMFS_DIR env var → memoryDir (memfs service picks this up)
 *   3. Injects memory block inventory into the bootstrap prompt so the agent
 *      knows its blocks are mounted at .memory/<label>.txt in the working dir
 *
 * Everything else (session resume, skill injection, timeout, permissions,
 * stdout parsing) is inherited from opencode-local with zero duplication.
 */

import path from "node:path";
import type { AdapterExecutionContext, AdapterExecutionResult } from "@doerai/adapter-utils";
import { execute as openCodeExecute } from "@doerai/adapter-opencode-local/server";
import { readMemoryBlocks } from "./af-import.js";
import type { LettaAfAdapterConfig } from "../shared/types.js";

/**
 * Build a memory-map note to inject into the agent's bootstrap prompt.
 * Tells the agent which block files exist and where they're mounted.
 */
async function buildMemoryBootstrap(config: LettaAfAdapterConfig): Promise<string> {
  const { memoryDir, memoryBlockLabels } = config;
  if (!memoryDir) return "";

  // Prefer live file scan over stored labels (catches manual edits)
  let labels: string[];
  try {
    const liveBlocks = await readMemoryBlocks(memoryDir);
    labels = liveBlocks.length > 0
      ? liveBlocks.map((b) => b.label)
      : (memoryBlockLabels ?? []);
  } catch {
    labels = memoryBlockLabels ?? [];
  }

  if (labels.length === 0) return "";

  const mountedAt = ".memory"; // symlinked by fs-mount strategy
  const lines = labels.map((label) => `- \`${mountedAt}/${label}.txt\`  → ${label}`);

  return [
    "[Doer memory blocks]",
    `Your persistent memory is mounted at \`${mountedAt}/\` in your working directory.`,
    "",
    ...lines,
    "",
    "Read these at the start of each session. Update them by writing new content directly to the file when you learn something worth remembering.",
    `Full memory directory: ${memoryDir}`,
  ].join("\n");
}

export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const config = ctx.config as unknown as LettaAfAdapterConfig;

  const memoryBootstrap = await buildMemoryBootstrap(config);

  // Build the opencode-compatible config overlay.
  // We spread ctx.config so all base opencode fields (timeoutSec, graceSec,
  // extraArgs, env, etc.) pass through unchanged; only af-specific fields
  // are translated or added.
  const opencodeConfig: Record<string, unknown> = {
    ...ctx.config,
    // Point opencode at AGENTS.md for agent identity + memory map
    instructionsFilePath: config.memoryDir
      ? path.join(config.memoryDir, "AGENTS.md")
      : undefined,
    // Inject memory bootstrap into the bootstrap prompt (shown on first wake)
    bootstrapPromptTemplate: memoryBootstrap,
    // Heartbeat prompt template — falls back to generic if not set
    promptTemplate: config.heartbeatPrompt?.trim() ||
      "You are agent {{agent.id}} ({{agent.name}}). Continue your Doer work.",
    // Keep model from config (may have been overridden post-hire)
    model: config.model ?? "",
    dangerouslySkipPermissions: config.dangerouslySkipPermissions !== false,
    timeoutSec: config.timeoutSec,
    graceSec: config.graceSec,
    extraArgs: config.extraArgs,
    // Merge env: LETTA_MEMFS_DIR tells the memfs service where blocks live
    env: {
      ...(typeof ctx.config.env === "object" && ctx.config.env !== null
        ? (ctx.config.env as Record<string, string>)
        : {}),
      ...(config.memoryDir ? { LETTA_MEMFS_DIR: config.memoryDir } : {}),
    },
  };

  const modifiedCtx: AdapterExecutionContext = {
    ...ctx,
    config: opencodeConfig,
  };

  return openCodeExecute(modifiedCtx);
}
