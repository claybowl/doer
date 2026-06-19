import { existsSync } from "node:fs";
import type { AdapterEnvironmentTestContext, AdapterEnvironmentTestResult, AdapterEnvironmentCheck } from "@doerai/adapter-utils";
import type { LettaCodeAdapterConfig } from "../shared/types.js";
import { resolveProvider } from "./execute.js";

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
    const c = config as { memoryDir?: string; provider?: string; apiKey?: string; model?: string; baseUrl?: string };

    if (!c.memoryDir) {
      checks.push({
        code: "memory_dir_unset",
        level: "info",
        message: "No explicit memoryDir — will use the attached memory binding (LETTA_MEMFS_DIR) at run time",
        hint: "Set adapterConfig.memoryDir to override, or attach a memory binding under the Memory tab.",
      });
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

    const env = ((ctx.config as Record<string, unknown>).env ?? {}) as Record<string, string>;
    const resolved = resolveProvider(c, env);
    if (resolved.envKey === null) {
      // Local Ollama — no key required.
      checks.push({ code: "api_key_ok", level: "info", message: `${resolved.label} — no API key required` });
    } else if (!resolved.apiKey) {
      checks.push({
        code: "api_key_missing",
        level: "error",
        message: `No API key for ${resolved.label}`,
        detail: `Set ${resolved.envKey} in your environment or adapterConfig.apiKey`,
      });
    } else {
      checks.push({ code: "api_key_ok", level: "info", message: `API key found (${resolved.label})` });
    }
    checks.push({ code: "base_url", level: "info", message: `Endpoint: ${resolved.baseUrl}` });

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
