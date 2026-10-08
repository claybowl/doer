import type { ServerAdapterModule } from "./types.js";
import { getAdapterSessionManagement } from "@doerai/adapter-utils";
import {
  execute as claudeExecute,
  listClaudeSkills,
  syncClaudeSkills,
  testEnvironment as claudeTestEnvironment,
  sessionCodec as claudeSessionCodec,
  getQuotaWindows as claudeGetQuotaWindows,
} from "@doerai/adapter-claude-local/server";
import { agentConfigurationDoc as claudeAgentConfigurationDoc, models as claudeModels, memfsCapability as claudeMemfsCapability } from "@doerai/adapter-claude-local";
import {
  execute as codexExecute,
  listCodexSkills,
  syncCodexSkills,
  testEnvironment as codexTestEnvironment,
  sessionCodec as codexSessionCodec,
  getQuotaWindows as codexGetQuotaWindows,
} from "@doerai/adapter-codex-local/server";
import { agentConfigurationDoc as codexAgentConfigurationDoc, models as codexModels, memfsCapability as codexMemfsCapability } from "@doerai/adapter-codex-local";
import {
  execute as cursorExecute,
  listCursorSkills,
  syncCursorSkills,
  testEnvironment as cursorTestEnvironment,
  sessionCodec as cursorSessionCodec,
} from "@doerai/adapter-cursor-local/server";
import { agentConfigurationDoc as cursorAgentConfigurationDoc, models as cursorModels, memfsCapability as cursorMemfsCapability } from "@doerai/adapter-cursor-local";
import {
  execute as geminiExecute,
  listGeminiSkills,
  syncGeminiSkills,
  testEnvironment as geminiTestEnvironment,
  sessionCodec as geminiSessionCodec,
} from "@doerai/adapter-gemini-local/server";
import { agentConfigurationDoc as geminiAgentConfigurationDoc, models as geminiModels, memfsCapability as geminiMemfsCapability } from "@doerai/adapter-gemini-local";
import {
  execute as openCodeExecute,
  listOpenCodeSkills,
  syncOpenCodeSkills,
  testEnvironment as openCodeTestEnvironment,
  sessionCodec as openCodeSessionCodec,
  listOpenCodeModels,
} from "@doerai/adapter-opencode-local/server";
import {
  agentConfigurationDoc as openCodeAgentConfigurationDoc,
  memfsCapability as openCodeMemfsCapability,
} from "@doerai/adapter-opencode-local";
import {
  execute as openclawGatewayExecute,
  testEnvironment as openclawGatewayTestEnvironment,
} from "@doerai/adapter-openclaw-gateway/server";
import {
  agentConfigurationDoc as openclawGatewayAgentConfigurationDoc,
  models as openclawGatewayModels,
  memfsCapability as openclawGatewayMemfsCapability,
} from "@doerai/adapter-openclaw-gateway";
import { listCodexModels } from "./codex-models.js";
import { listCursorModels } from "./cursor-models.js";
import {
  execute as piExecute,
  listPiSkills,
  syncPiSkills,
  testEnvironment as piTestEnvironment,
  sessionCodec as piSessionCodec,
  listPiModels,
} from "@doerai/adapter-pi-local/server";
import {
  agentConfigurationDoc as piAgentConfigurationDoc,
  memfsCapability as piMemfsCapability,
} from "@doerai/adapter-pi-local";
import {
  execute as hermesExecute,
  testEnvironment as hermesTestEnvironment,
  sessionCodec as hermesSessionCodec,
} from "hermes-paperclip-adapter/server";
import {
  agentConfigurationDoc as hermesAgentConfigurationDoc,
  models as hermesModels,
} from "hermes-paperclip-adapter";
import {
  execute as lettaExecute,
  testEnvironment as lettaTestEnvironment,
  onHireApproved as lettaOnHireApproved,
  listLettaSkills,
  syncLettaSkills,
} from "@doerai/adapter-letta-cloud/server";
import {
  agentConfigurationDoc as lettaAgentConfigurationDoc,
  models as lettaModels,
  memfsCapability as lettaMemfsCapability,
} from "@doerai/adapter-letta-cloud";
import {
  execute as lettaAfExecute,
  testEnvironment as lettaAfTestEnvironment,
  onHireApproved as lettaAfOnHireApproved,
} from "@doerai/adapter-agent-file/server";
import {
  agentConfigurationDoc as lettaAfAgentConfigurationDoc,
  models as lettaAfModels,
} from "@doerai/adapter-agent-file";
import {
  execute as lettaCodeExecute,
  testEnvironment as lettaCodeTestEnvironment,
} from "@doerai/adapter-letta-code/server";
import {
  agentConfigurationDoc as lettaCodeAgentConfigurationDoc,
  models as lettaCodeModels,
  memfsCapability as lettaCodeMemfsCapability,
} from "@doerai/adapter-letta-code";
import {
  execute as lettaCliExecute,
  testEnvironment as lettaCliTestEnvironment,
  listLettaCliSkills,
  syncLettaCliSkills,
} from "@doerai/adapter-letta-cli/server";
import {
  agentConfigurationDoc as lettaCliAgentConfigurationDoc,
  models as lettaCliModels,
  memfsCapability as lettaCliMemfsCapability,
} from "@doerai/adapter-letta-cli";
import { processAdapter } from "./process/index.js";
import { httpAdapter } from "./http/index.js";
import {
  execute as a2aExecute,
  testEnvironment as a2aTestEnvironment,
} from "@doerai/adapter-a2a/server";
import {
  agentConfigurationDoc as a2aAgentConfigurationDoc,
  memfsCapability as a2aMemfsCapability,
} from "@doerai/adapter-a2a";

const claudeLocalAdapter: ServerAdapterModule = {
  type: "claude_local",
  execute: claudeExecute,
  testEnvironment: claudeTestEnvironment,
  listSkills: listClaudeSkills,
  syncSkills: syncClaudeSkills,
  sessionCodec: claudeSessionCodec,
  sessionManagement: getAdapterSessionManagement("claude_local") ?? undefined,
  models: claudeModels,
  supportsLocalAgentJwt: true,
  agentConfigurationDoc: claudeAgentConfigurationDoc,
  getQuotaWindows: claudeGetQuotaWindows,
  memfsCapability: claudeMemfsCapability,
};

const codexLocalAdapter: ServerAdapterModule = {
  type: "codex_local",
  execute: codexExecute,
  testEnvironment: codexTestEnvironment,
  listSkills: listCodexSkills,
  syncSkills: syncCodexSkills,
  sessionCodec: codexSessionCodec,
  sessionManagement: getAdapterSessionManagement("codex_local") ?? undefined,
  models: codexModels,
  listModels: listCodexModels,
  supportsLocalAgentJwt: true,
  agentConfigurationDoc: codexAgentConfigurationDoc,
  getQuotaWindows: codexGetQuotaWindows,
  memfsCapability: codexMemfsCapability,
};

const cursorLocalAdapter: ServerAdapterModule = {
  type: "cursor",
  execute: cursorExecute,
  testEnvironment: cursorTestEnvironment,
  listSkills: listCursorSkills,
  syncSkills: syncCursorSkills,
  sessionCodec: cursorSessionCodec,
  sessionManagement: getAdapterSessionManagement("cursor") ?? undefined,
  models: cursorModels,
  listModels: listCursorModels,
  supportsLocalAgentJwt: true,
  agentConfigurationDoc: cursorAgentConfigurationDoc,
  memfsCapability: cursorMemfsCapability,
};

const geminiLocalAdapter: ServerAdapterModule = {
  type: "gemini_local",
  execute: geminiExecute,
  testEnvironment: geminiTestEnvironment,
  listSkills: listGeminiSkills,
  syncSkills: syncGeminiSkills,
  sessionCodec: geminiSessionCodec,
  sessionManagement: getAdapterSessionManagement("gemini_local") ?? undefined,
  models: geminiModels,
  supportsLocalAgentJwt: true,
  agentConfigurationDoc: geminiAgentConfigurationDoc,
  memfsCapability: geminiMemfsCapability,
};

const openclawGatewayAdapter: ServerAdapterModule = {
  type: "openclaw_gateway",
  execute: openclawGatewayExecute,
  testEnvironment: openclawGatewayTestEnvironment,
  models: openclawGatewayModels,
  supportsLocalAgentJwt: false,
  agentConfigurationDoc: openclawGatewayAgentConfigurationDoc,
  memfsCapability: openclawGatewayMemfsCapability,
};

const openCodeLocalAdapter: ServerAdapterModule = {
  type: "opencode_local",
  execute: openCodeExecute,
  testEnvironment: openCodeTestEnvironment,
  listSkills: listOpenCodeSkills,
  syncSkills: syncOpenCodeSkills,
  sessionCodec: openCodeSessionCodec,
  sessionManagement: getAdapterSessionManagement("opencode_local") ?? undefined,
  models: [],
  listModels: listOpenCodeModels,
  supportsLocalAgentJwt: true,
  agentConfigurationDoc: openCodeAgentConfigurationDoc,
  memfsCapability: openCodeMemfsCapability,
};

const piLocalAdapter: ServerAdapterModule = {
  type: "pi_local",
  execute: piExecute,
  testEnvironment: piTestEnvironment,
  listSkills: listPiSkills,
  syncSkills: syncPiSkills,
  sessionCodec: piSessionCodec,
  sessionManagement: getAdapterSessionManagement("pi_local") ?? undefined,
  models: [],
  listModels: listPiModels,
  supportsLocalAgentJwt: true,
  agentConfigurationDoc: piAgentConfigurationDoc,
  memfsCapability: piMemfsCapability,
};

const hermesLocalAdapter: ServerAdapterModule = {
  type: "hermes_local",
  execute: hermesExecute,
  testEnvironment: hermesTestEnvironment,
  sessionCodec: hermesSessionCodec,
  models: hermesModels,
  supportsLocalAgentJwt: true,
  agentConfigurationDoc: hermesAgentConfigurationDoc,
};

const lettaCloudAdapter: ServerAdapterModule = {
  type: "letta_cloud",
  execute: lettaExecute,
  testEnvironment: lettaTestEnvironment,
  onHireApproved: lettaOnHireApproved,
  listSkills: listLettaSkills,
  syncSkills: syncLettaSkills,
  models: lettaModels,
  supportsLocalAgentJwt: true,
  agentConfigurationDoc: lettaAgentConfigurationDoc,
  memfsCapability: lettaMemfsCapability,
};

const lettaAfOpenCodeAdapter: ServerAdapterModule = {
  type: "agent_file",
  execute: lettaAfExecute,
  testEnvironment: lettaAfTestEnvironment,
  onHireApproved: lettaAfOnHireApproved,
  models: lettaAfModels,
  supportsLocalAgentJwt: true,
  agentConfigurationDoc: lettaAfAgentConfigurationDoc,
};

const lettaCodeAdapter: ServerAdapterModule = {
  type: "letta_code",
  execute: lettaCodeExecute,
  testEnvironment: lettaCodeTestEnvironment,
  models: [...lettaCodeModels],
  supportsLocalAgentJwt: true,
  agentConfigurationDoc: lettaCodeAgentConfigurationDoc,
  memfsCapability: lettaCodeMemfsCapability,
};

const lettaCliAdapter: ServerAdapterModule = {
  type: "letta_cli",
  execute: lettaCliExecute,
  testEnvironment: lettaCliTestEnvironment,
  listSkills: listLettaCliSkills,
  syncSkills: syncLettaCliSkills,
  models: [...lettaCliModels],
  supportsLocalAgentJwt: true,
  agentConfigurationDoc: lettaCliAgentConfigurationDoc,
  memfsCapability: lettaCliMemfsCapability,
};

const a2aAdapter: ServerAdapterModule = {
  type: "a2a",
  execute: a2aExecute,
  testEnvironment: a2aTestEnvironment,
  models: [],
  supportsLocalAgentJwt: false,
  agentConfigurationDoc: a2aAgentConfigurationDoc,
  memfsCapability: a2aMemfsCapability,
};

const adaptersByType = new Map<string, ServerAdapterModule>(
  [
    claudeLocalAdapter,
    codexLocalAdapter,
    openCodeLocalAdapter,
    piLocalAdapter,
    cursorLocalAdapter,
    geminiLocalAdapter,
    openclawGatewayAdapter,
    hermesLocalAdapter,
    lettaCloudAdapter,
    lettaAfOpenCodeAdapter,
    lettaCodeAdapter,
    lettaCliAdapter,
    a2aAdapter,
    processAdapter,
    httpAdapter,
  ].map((a) => [a.type, a]),
);

/** Retained for stored-agent execution only. New Letta agents use letta_code. */
export const LEGACY_LETTA_ADAPTER_TYPES = new Set([
  "letta_cloud",
  "agent_file",
]);

export function getAdapterCreationRecommendation(type: string): string | null {
  return LEGACY_LETTA_ADAPTER_TYPES.has(type) ? "letta_code" : null;
}

export function getServerAdapter(type: string): ServerAdapterModule {
  const adapter = adaptersByType.get(type);
  if (!adapter) {
    // Fall back to process adapter for unknown types
    return processAdapter;
  }
  return adapter;
}

export async function listAdapterModels(type: string): Promise<{ id: string; label: string }[]> {
  const adapter = adaptersByType.get(type);
  if (!adapter) return [];
  if (adapter.listModels) {
    const discovered = await adapter.listModels();
    if (discovered.length > 0) return discovered;
  }
  return adapter.models ?? [];
}

export function listServerAdapters(): ServerAdapterModule[] {
  return Array.from(adaptersByType.values());
}

export function listCreatableServerAdapters(): ServerAdapterModule[] {
  return listServerAdapters().filter((adapter) => !LEGACY_LETTA_ADAPTER_TYPES.has(adapter.type));
}

export function findServerAdapter(type: string): ServerAdapterModule | null {
  return adaptersByType.get(type) ?? null;
}
