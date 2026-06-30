import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { AdapterEnvironmentTestContext, AdapterEnvironmentTestResult, AdapterEnvironmentCheck } from "@doerai/adapter-utils";
import type { LettaCliAdapterConfig } from "../shared/types.js";
import { ensureCommandResolvable } from "@doerai/adapter-utils/server-utils";

const execFileAsync = promisify(execFile);

// Known install locations for the npm @letta-ai/letta-code package binary.
const KNOWN_LETTA_CODE_PATHS = ["/opt/homebrew/bin/letta", "/usr/local/bin/letta"];

async function isLettaCodeBinary(cmd: string): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync(cmd, ["--version"], { timeout: 5000 });
    return stdout.toLowerCase().includes("letta code");
  } catch {
    return false;
  }
}

export async function testEnvironment(
  ctx: AdapterEnvironmentTestContext,
): Promise<AdapterEnvironmentTestResult> {
  const config = ctx.config as unknown as LettaCliAdapterConfig;
  const checks: AdapterEnvironmentCheck[] = [];

  let command = config.command?.trim() || "letta";
  try {
    await ensureCommandResolvable(command, process.cwd(), process.env as Record<string, string>);
    // Verify the resolved binary is actually letta-code, not the Python Letta CLI.
    // On systems where ~/.local/bin/letta (Python) shadows /opt/homebrew/bin/letta (npm),
    // the wrong binary would be found and all CLI flags would fail.
    const isCorrect = await isLettaCodeBinary(command);
    if (!isCorrect) {
      // Try known install paths before giving up
      let fallback: string | null = null;
      for (const p of KNOWN_LETTA_CODE_PATHS) {
        if (await isLettaCodeBinary(p)) { fallback = p; break; }
      }
      if (fallback) {
        command = fallback;
        checks.push({
          code: "binary_shadowed",
          level: "warn",
          message: `'letta' in PATH is the Python Letta CLI — using ${fallback} instead`,
          hint: `Set command: "${fallback}" in adapter config to silence this warning`,
        });
        checks.push({ code: "binary_ok", level: "info", message: `Binary found: ${command}` });
      } else {
        checks.push({
          code: "binary_wrong",
          level: "error",
          message: `'${command}' is not the letta-code CLI (got Python Letta or missing)`,
          hint: "Install via: npm install -g @letta-ai/letta-code  (binary named 'letta')",
        });
      }
    } else {
      checks.push({ code: "binary_ok", level: "info", message: `Binary found: ${command}` });
    }
  } catch {
    checks.push({
      code: "binary_missing",
      level: "error",
      message: `Cannot resolve binary: ${command}`,
      hint: "Install via: npm install -g @letta-ai/letta-code  (binary is named 'letta')",
    });
  }

  if (!config.agentId) {
    checks.push({ code: "agent_id_missing", level: "error", message: "agentId is required" });
  } else {
    checks.push({ code: "agent_id_ok", level: "info", message: `agentId: ${config.agentId}` });
  }

  if (!config.apiKey) {
    checks.push({
      code: "api_key_missing",
      level: "error",
      message: "apiKey is required",
      hint: "Set your Letta API key from app.letta.com",
    });
  } else {
    checks.push({ code: "api_key_ok", level: "info", message: "Letta API key present" });
  }

  const baseUrl = config.baseUrl?.trim() || "https://api.letta.com";
  const backend = config.backend || "api";
  checks.push({ code: "target", level: "info", message: `${baseUrl} (backend=${backend})` });

  const status: AdapterEnvironmentTestResult["status"] = checks.some((c) => c.level === "error")
    ? "fail"
    : checks.some((c) => c.level === "warn")
      ? "warn"
      : "pass";

  return { adapterType: "letta_cli", status, checks, testedAt: new Date().toISOString() };
}
