import { existsSync } from "node:fs";
import type {
  AdapterEnvironmentCheck,
  AdapterEnvironmentTestContext,
  AdapterEnvironmentTestResult,
} from "@doerai/adapter-utils";
import { resolveLettaCodeConfig } from "./config.js";
import {
  discoverLettaCliVersion,
  readLettaModDiagnostics,
  type LettaModInventory,
} from "./letta-cli.js";

export interface LettaCodeEnvironmentDependencies {
  discoverCliVersion(): Promise<string | null>;
  readModDiagnostics(): Promise<LettaModInventory | null>;
}

const DEFAULT_DEPENDENCIES: LettaCodeEnvironmentDependencies = {
  discoverCliVersion: discoverLettaCliVersion,
  readModDiagnostics: readLettaModDiagnostics,
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function testEnvironment(
  ctx: AdapterEnvironmentTestContext,
  dependencies: LettaCodeEnvironmentDependencies = DEFAULT_DEPENDENCIES,
): Promise<AdapterEnvironmentTestResult> {
  const config = resolveLettaCodeConfig(ctx.config);
  const raw = record(ctx.config);
  const env = record(raw.env);
  const checks: AdapterEnvironmentCheck[] = [{
    code: "agent_sdk_ready",
    level: "info",
    message: "Letta Agent SDK is installed",
  }];
  const cliVersion = await dependencies.discoverCliVersion();
  if (cliVersion) {
    checks.push({ code: "letta_cli_ready", level: "info", message: `Letta CLI ${cliVersion}` });
  } else {
    checks.push({
      code: "letta_cli_missing",
      level: "warn",
      message: "The Letta CLI executable was not found",
      hint: "Install Letta Code, then run `letta /connect` to configure models and authentication.",
    });
  }

  if (config.modsEnabled) {
    const inventory = await dependencies.readModDiagnostics();
    const loaded = inventory?.mods.filter((mod) => mod.status === "loaded") ?? [];
    const failed = inventory?.mods.filter((mod) => mod.status === "failed") ?? [];
    if (failed.length > 0) {
      checks.push({
        code: "mods_failed",
        level: "warn",
        message: `${failed.length} Letta Code mod${failed.length === 1 ? "" : "s"} failed to load`,
        detail: failed.map((mod) => `${mod.name}: ${mod.error ?? "unknown error"}`).join("; "),
        hint: "Inspect ~/.letta/mods/diagnostics/latest.json and fix or disable the failing mod.",
      });
    } else if (inventory) {
      checks.push({ code: "mods_loaded", level: "info", message: `${loaded.length} Letta Code mod${loaded.length === 1 ? "" : "s"} loaded` });
    } else {
      checks.push({ code: "mods_no_diagnostics", level: "info", message: "No Letta mod diagnostics have been written yet" });
    }
  }

  if (config.backend === "cloud_attached") {
    if (!config.lettaAgentId) {
      checks.push({
        code: "agent_id_missing",
        level: "error",
        message: "A Letta agent ID is required for cloud-attached compatibility",
      });
    } else {
      checks.push({ code: "agent_id_ok", level: "info", message: `Cloud agent: ${config.lettaAgentId}` });
    }
    if (config.apiKey || stringValue(env.LETTA_API_KEY)) {
      checks.push({ code: "cloud_auth_key", level: "info", message: "Letta Cloud API key is available" });
    } else {
      checks.push({
        code: "cloud_auth_cli",
        level: "warn",
        message: "No explicit Cloud API key; the Letta CLI login will be used",
        hint: "Run `letta /connect` on the Doer machine if Cloud authentication is not configured.",
      });
    }
  } else if (config.lettaAgentId) {
    checks.push({ code: "local_agent_ok", level: "info", message: `Canonical local agent: ${config.lettaAgentId}` });
  } else {
    checks.push({
      code: "local_agent_create",
      level: "info",
      message: "A canonical local Letta agent will be created on first run",
    });
  }

  const memoryDir = stringValue(raw.memoryDir)
    || stringValue(env.LETTA_MEMFS_DIR)
    || stringValue(env.DOER_AGENT_MEMORY_DIR);
  if (!memoryDir) {
    checks.push({
      code: "memory_dir_unset",
      level: "error",
      message: "No Doer-owned memory directory is configured",
      hint: "Attach an fs-mount memory binding or configure DOER_AGENT_MEMORY_DIR.",
    });
  } else if (!existsSync(memoryDir)) {
    checks.push({
      code: "memory_dir_not_found",
      level: "warn",
      message: `Memory directory does not exist yet: ${memoryDir}`,
      hint: "Doer may create the bound directory before the first run.",
    });
  } else {
    checks.push({ code: "memory_dir_ok", level: "info", message: `Doer MemFS: ${memoryDir}` });
  }

  checks.push({
    code: "permissions",
    level: "info",
    message: `Local tool permissions: ${config.permissionMode}`,
    detail: "The selected model provider does not alter shell or filesystem permissions.",
  });
  checks.push({
    code: "model",
    level: "info",
    message: config.model ? `Model: ${config.model}` : "Model: current Letta agent default",
  });
  if (!config.modsEnabled) checks.push({ code: "mods_disabled", level: "info", message: "Letta Code mods are disabled for this agent" });

  const status: AdapterEnvironmentTestResult["status"] = checks.some((check) => check.level === "error")
    ? "fail"
    : checks.some((check) => check.level === "warn")
      ? "warn"
      : "pass";
  return { adapterType: "letta_code", status, checks, testedAt: new Date().toISOString() };
}
