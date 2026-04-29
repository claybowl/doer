import fs from "node:fs/promises";
import type {
  AdapterEnvironmentTestContext,
  AdapterEnvironmentTestResult,
} from "@doerai/adapter-utils";
import type { LettaAfAdapterConfig } from "../shared/types.js";
import { validateAfPath } from "./af-import.js";

export async function testEnvironment(
  ctx: AdapterEnvironmentTestContext,
): Promise<AdapterEnvironmentTestResult> {
  const config = ctx.config as unknown as LettaAfAdapterConfig;
  const testedAt = new Date().toISOString();
  const adapterType = "letta_af_opencode";

  // ── Check 1: afPath ─────────────────────────────────────────────────────
  const afError = await validateAfPath(config.afPath ?? "");
  if (afError) {
    return {
      adapterType,
      status: "fail",
      testedAt,
      checks: [
        {
          code: "invalid_af_path",
          level: "error",
          message: afError,
          hint: "Set afPath to the absolute path of your .af file (from letta export or Letta Cloud).",
        },
      ],
    };
  }

  // ── Check 2: model ───────────────────────────────────────────────────────
  const checks: AdapterEnvironmentTestResult["checks"] = [];
  if (!config.model?.trim()) {
    checks.push({
      code: "missing_model",
      level: "warn",
      message: "No model set — will use the model from the .af file",
      hint: "Set model to an OpenCode model id, e.g. anthropic/claude-sonnet-4-5",
    });
  }

  // ── Check 3: memoryDir extracted ─────────────────────────────────────────
  if (!config.memoryDir) {
    checks.push({
      code: "not_extracted",
      level: "warn",
      message: "Memory not extracted yet — re-hire this agent to trigger extraction",
      hint: "If you just updated afPath, delete and re-hire the agent to re-unpack.",
    });
  } else {
    try {
      const entries = await fs.readdir(config.memoryDir);
      const txtFiles = entries.filter((e) => e.endsWith(".txt"));
      const hasAgentsMd = entries.includes("AGENTS.md");
      checks.push({
        code: "memory_extracted",
        level: "info",
        message: `Memory extracted — ${txtFiles.length} block(s) at ${config.memoryDir}`,
        detail: [
          hasAgentsMd ? "AGENTS.md ✓" : "AGENTS.md missing (re-hire to regenerate)",
          ...txtFiles.map((f) => f),
        ].join(" · "),
      });
    } catch {
      checks.push({
        code: "memory_dir_missing",
        level: "error",
        message: `memoryDir set but not found on disk: ${config.memoryDir}`,
        hint: "Re-hire the agent to re-extract from the .af file.",
      });
    }
  }

  // ── Check 4: opencode available ──────────────────────────────────────────
  try {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execFileAsync = promisify(execFile);
    await execFileAsync("opencode", ["--version"]);
    checks.push({
      code: "opencode_available",
      level: "info",
      message: "opencode CLI is available",
    });
  } catch {
    checks.push({
      code: "opencode_missing",
      level: "error",
      message: "opencode CLI not found",
      hint: "Install OpenCode: https://opencode.ai/docs",
    });
  }

  const hasError = checks.some((c) => c.level === "error");
  return {
    adapterType,
    status: hasError ? "fail" : "pass",
    testedAt,
    checks,
  };
}
