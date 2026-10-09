/**
 * agent-file adapter — execute
 *
 * The .af format is harness-agnostic. Unpacking to memfs, writing AGENTS.md,
 * and building the memory bootstrap are identical regardless of which local CLI
 * runs the turn. This adapter prepares that shared overlay and then delegates to
 * the harness named by `config.harness`:
 *
 *   1. Sets instructionsFilePath → <memoryDir>/AGENTS.md (agent identity + memory map)
 *   2. Sets LETTA_MEMFS_DIR env var → memoryDir (memfs service picks this up)
 *   3. Injects memory block inventory into the bootstrap prompt so the agent
 *      knows its blocks are mounted at .memory/<label>.txt in the working dir
 *
 * Session resume, skill injection, timeout handling, and stdout parsing are
 * inherited from the chosen harness with zero duplication.
 */

import path from "node:path";
import type { AdapterExecutionContext, AdapterExecutionResult } from "@doerai/adapter-utils";
import { readMemoryBlocks } from "./af-import.js";
import {
  HARNESS_SUPPORTS_SKIP_PERMISSIONS,
  resolveHarness,
  type AgentFileAdapterConfig,
  type AgentFileHarness,
} from "../shared/types.js";

type HarnessExecute = (ctx: AdapterExecutionContext) => Promise<AdapterExecutionResult>;

/**
 * Resolve a harness's execute function.
 *
 * Imported lazily so an agent only pays for the CLI backend it actually uses —
 * and so a missing optional harness cannot break the whole adapter module at
 * import time.
 */
async function loadHarnessExecute(harness: AgentFileHarness): Promise<HarnessExecute> {
  switch (harness) {
    case "opencode": {
      const mod = await import("@doerai/adapter-opencode-local/server");
      return mod.execute;
    }
    case "pi": {
      const mod = await import("@doerai/adapter-pi-local/server");
      return mod.execute;
    }
    case "claude": {
      const mod = await import("@doerai/adapter-claude-local/server");
      return mod.execute;
    }
    case "codex": {
      const mod = await import("@doerai/adapter-codex-local/server");
      return mod.execute;
    }
  }
}

/**
 * Build a memory-map note to inject into the agent's bootstrap prompt.
 * Tells the agent which block files exist and where they're mounted.
 */
async function buildMemoryBootstrap(config: AgentFileAdapterConfig): Promise<string> {
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
  const config = ctx.config as unknown as AgentFileAdapterConfig;
  const harness = resolveHarness(config.harness);

  const memoryBootstrap = await buildMemoryBootstrap(config);

  // Build the harness-compatible config overlay.
  // We spread ctx.config so base fields (timeoutSec, graceSec, extraArgs, env,
  // etc.) pass through unchanged; only af-specific fields are translated or added.
  const overlay: Record<string, unknown> = {
    ...ctx.config,
    // Point the harness at AGENTS.md for agent identity + memory map
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
    timeoutSec: config.timeoutSec,
    graceSec: config.graceSec,
    extraArgs: config.extraArgs,
    // Non-opencode harnesses resolve AGENTS.md and memory mounts from cwd
    ...(config.cwd ? { cwd: config.cwd } : {}),
    // Merge env: LETTA_MEMFS_DIR tells the memfs service where blocks live
    env: {
      ...(typeof ctx.config.env === "object" && ctx.config.env !== null
        ? (ctx.config.env as Record<string, string>)
        : {}),
      ...(config.memoryDir ? { LETTA_MEMFS_DIR: config.memoryDir } : {}),
    },
  };

  // Only opencode and claude accept this key; sending it to pi/codex is
  // dead config they ignore, and would misreport the effective permission mode.
  if (HARNESS_SUPPORTS_SKIP_PERMISSIONS.has(harness)) {
    overlay.dangerouslySkipPermissions = config.dangerouslySkipPermissions !== false;
  } else {
    delete overlay.dangerouslySkipPermissions;
  }

  const modifiedCtx: AdapterExecutionContext = {
    ...ctx,
    config: overlay,
  };

  const harnessExecute = await loadHarnessExecute(harness);
  return harnessExecute(modifiedCtx);
}
