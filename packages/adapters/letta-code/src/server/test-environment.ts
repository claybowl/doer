import { existsSync } from "node:fs";
import type { AdapterEnvironmentTestContext, AdapterEnvironmentTestResult, AdapterEnvironmentCheck } from "@doerai/adapter-utils";
import type { LettaCodeAdapterConfig } from "../shared/types.js";

export async function testEnvironment(
  ctx: AdapterEnvironmentTestContext,
): Promise<AdapterEnvironmentTestResult> {
  const config = ctx.config as unknown as LettaCodeAdapterConfig;
  const mode = (config as unknown as Record<string, unknown>).mode ?? "offline";
  const checks: AdapterEnvironmentCheck[] = [];

  if (mode === "online") {
    // ── Online mode checks ────────────────────────────────────────────────
    const c = config as { agentId?: string; apiKey?: string; baseUrl?: string };

    if (!c.agentId) {
      checks.push({ code: "agent_id_missing", level: "error", message: "agentId is required for online mode" });
    } else {
      checks.push({ code: "agent_id_ok", level: "info", message: `agentId: ${c.agentId}` });
    }

    if (!c.apiKey) {
      checks.push({
        code: "api_key_missing",
        level: "error",
        message: "apiKey is required for online mode",
        hint: "Use your Letta membership key from app.letta.com",
      });
    } else {
      checks.push({ code: "api_key_ok", level: "info", message: "Letta API key present" });
    }

    const base = c.baseUrl?.trim() || "https://api.letta.com";
    checks.push({ code: "base_url", level: "info", message: `Letta server: ${base}` });

  } else {
    // ── Offline mode checks ───────────────────────────────────────────────
    const c = config as { memoryDir?: string; provider?: string; apiKey?: string; model?: string };

    if (!c.memoryDir) {
      checks.push({ code: "memory_dir_missing", level: "error", message: "memoryDir is required for offline mode" });
    } else if (!existsSync(c.memoryDir)) {
      checks.push({
        code: "memory_dir_not_found",
        level: "warn",
        message: `memoryDir does not exist yet: ${c.memoryDir}`,
        hint: "Directory will be created on first run.",
      });
    } else {
      checks.push({ code: "memory_dir_ok", level: "info", message: `memoryDir: ${c.memoryDir}` });
    }

    const provider = c.provider ?? "anthropic";
    const envKey = provider === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY";
    if (!c.apiKey && !process.env[envKey]) {
      checks.push({
        code: "api_key_missing",
        level: "error",
        message: `No API key for provider "${provider}"`,
        detail: `Set ${envKey} in your environment or adapterConfig.apiKey`,
      });
    } else {
      checks.push({ code: "api_key_ok", level: "info", message: `API key found (${provider})` });
    }

    if (!c.model) {
      checks.push({ code: "model_default", level: "info", message: 'No model set — defaulting to "claude-sonnet-4-6"' });
    }
  }

  const status: AdapterEnvironmentTestResult["status"] = checks.some((c) => c.level === "error")
    ? "fail"
    : checks.some((c) => c.level === "warn")
      ? "warn"
      : "pass";

  return { adapterType: "letta_code", status, checks, testedAt: new Date().toISOString() };
}
