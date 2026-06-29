import type { AdapterEnvironmentTestContext, AdapterEnvironmentTestResult, AdapterEnvironmentCheck } from "@doerai/adapter-utils";
import type { LettaCliAdapterConfig } from "../shared/types.js";
import { ensureCommandResolvable } from "@doerai/adapter-utils/server-utils";

export async function testEnvironment(
  ctx: AdapterEnvironmentTestContext,
): Promise<AdapterEnvironmentTestResult> {
  const config = ctx.config as unknown as LettaCliAdapterConfig;
  const checks: AdapterEnvironmentCheck[] = [];

  const command = config.command?.trim() || "letta-code";
  try {
    await ensureCommandResolvable(command, process.cwd(), process.env as Record<string, string>);
    checks.push({ code: "binary_ok", level: "info", message: `Binary found: ${command}` });
  } catch {
    checks.push({
      code: "binary_missing",
      level: "error",
      message: `Cannot resolve binary: ${command}`,
      hint: "Install via: npm install -g @letta-ai/letta-code",
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
