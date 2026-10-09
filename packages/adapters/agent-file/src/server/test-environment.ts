import fs from "node:fs/promises";
import type {
  AdapterEnvironmentTestContext,
  AdapterEnvironmentTestResult,
} from "@doerai/adapter-utils";
import type { AgentFileAdapterConfig, AgentFileHarness } from "../shared/types.js";
import { resolveHarness } from "../shared/types.js";
import { validateAfPath } from "./af-import.js";

export async function testEnvironment(
  ctx: AdapterEnvironmentTestContext,
): Promise<AdapterEnvironmentTestResult> {
  const config = ctx.config as unknown as AgentFileAdapterConfig;
  const testedAt = new Date().toISOString();
  const adapterType = "agent_file";

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

  // ── Check 4: the configured harness CLI is available ─────────────────────
  const harness = resolveHarness(config.harness);
  const HARNESS_CLI: Record<AgentFileHarness, { bin: string; hint: string }> = {
    opencode: { bin: "opencode", hint: "Install OpenCode: https://opencode.ai/docs" },
    pi: { bin: "pi", hint: "Install Pi, then ensure `pi` is on PATH." },
    claude: { bin: "claude", hint: "Install Claude Code: https://docs.anthropic.com/en/docs/claude-code" },
    codex: { bin: "codex", hint: "Install Codex CLI: https://developers.openai.com/codex/cli" },
  };
  const harnessCli = HARNESS_CLI[harness];
  try {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execFileAsync = promisify(execFile);
    await execFileAsync(harnessCli.bin, ["--version"]);
    checks.push({
      code: `${harness}_available`,
      level: "info",
      message: `${harness} CLI is available`,
    });
  } catch {
    checks.push({
      code: `${harness}_missing`,
      level: "error",
      message: `${harness} CLI not found`,
      hint: harnessCli.hint,
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
