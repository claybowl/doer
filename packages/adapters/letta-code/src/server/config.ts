import path from "node:path";
import type {
  LettaCodeBackend,
  LettaCodeLlmProvider,
  LettaCodePermissionMode,
  LettaCodeReasoningEffort,
  LettaCodeSessionParams,
  LettaCodeSkillSource,
  ResolvedLettaCodeConfig,
} from "../shared/types.js";

const PERMISSION_MODES = new Set<LettaCodePermissionMode>(["standard", "acceptEdits", "unrestricted"]);
const REASONING_EFFORTS = new Set<LettaCodeReasoningEffort>(["none", "minimal", "low", "medium", "high", "xhigh"]);
const SKILL_SOURCES = new Set<LettaCodeSkillSource>(["bundled", "global", "agent", "project"]);
const DEFAULT_SKILL_SOURCES: LettaCodeSkillSource[] = ["bundled", "global", "agent", "project"];
const DREAM_TRIGGERS = new Set(["off", "step-count", "compaction-event"]);
const DREAM_BEHAVIORS = new Set(["reminder", "auto-launch"]);

const LLM_PROVIDERS: Set<LettaCodeLlmProvider> = new Set([
  "anthropic", "openai", "groq", "nvidia", "opencode_zen", "ollama", "ollama_cloud",
]);

/**
 * Preset base URLs and env var names for OpenAI-compatible LLM providers.
 * Used to inject adapterConfig.apiKey into the correct per-provider env var
 * so the Letta local runtime can authenticate with the LLM API.
 */
export const LLM_PROVIDER_PRESETS: Record<Exclude<LettaCodeLlmProvider, "anthropic">, {
  baseUrl: string;
  envKey: string;
}> = {
  openai:       { baseUrl: "https://api.openai.com/v1",       envKey: "OPENAI_API_KEY" },
  groq:         { baseUrl: "https://api.groq.com/openai/v1",  envKey: "GROQ_API_KEY" },
  nvidia:       { baseUrl: "https://integrate.api.nvidia.com/v1", envKey: "NVIDIA_API_KEY" },
  opencode_zen: { baseUrl: "https://api.opencode.dev/v1",     envKey: "OPENCODE_ZEN_API_KEY" },
  ollama:       { baseUrl: "http://localhost:11434/v1",       envKey: "OLLAMA_API_KEY" },
  ollama_cloud: { baseUrl: "https://api.olama.cloud/v1",      envKey: "OLLAMA_CLOUD_API_KEY" },
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const normalized = stringValue(entry);
    return normalized ? [normalized] : [];
  });
}

function skillSources(value: unknown): LettaCodeSkillSource[] {
  if (!Array.isArray(value)) return [...DEFAULT_SKILL_SOURCES];
  return stringList(value).filter((entry): entry is LettaCodeSkillSource => SKILL_SOURCES.has(entry as LettaCodeSkillSource));
}

function dreaming(value: unknown): ResolvedLettaCodeConfig["dreaming"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const trigger = stringValue(raw.trigger);
  const behavior = stringValue(raw.behavior);
  const stepCount = typeof raw.stepCount === "number" && Number.isFinite(raw.stepCount) && raw.stepCount > 0
    ? Math.floor(raw.stepCount)
    : undefined;
  const result = {
    ...(DREAM_TRIGGERS.has(trigger) ? { trigger: trigger as "off" | "step-count" | "compaction-event" } : {}),
    ...(DREAM_BEHAVIORS.has(behavior) ? { behavior: behavior as "reminder" | "auto-launch" } : {}),
    ...(stepCount === undefined ? {} : { stepCount }),
  };
  return Object.keys(result).length > 0 ? result : undefined;
}

export function resolveLettaCodeConfig(value: unknown): ResolvedLettaCodeConfig {
  const raw = record(value);
  const legacyOnline = raw.mode === "online";
  const configuredAgentId = stringValue(raw.lettaAgentId) || stringValue(raw.agentId);
  const inferredCloudAttached = configuredAgentId.startsWith("agent-")
    && !configuredAgentId.startsWith("agent-local-");
  const backend: LettaCodeBackend = raw.backend === "cloud_attached" || legacyOnline || inferredCloudAttached
    ? "cloud_attached"
    : "local";
  const permissionCandidate = stringValue(raw.permissionMode) as LettaCodePermissionMode;
  const reasoningCandidate = stringValue(raw.reasoningEffort) as LettaCodeReasoningEffort;
  const apiBaseUrl = stringValue(raw.apiBaseUrl) || stringValue(raw.baseUrl) || "https://api.letta.com";

  // ── LLM provider resolution for local backend ──────────────────────────────
  // Legacy offline config stores `provider`, `apiKey` (per-provider), and
  // `baseUrl` (per-provider override). We carry these forward so
  // sessionEnvironment() can map apiKey → GROQ_API_KEY / OPENAI_API_KEY / …
  // for the Letta local runtime (which reads provider-specific env vars).
  const providerRaw = stringValue(raw.provider) as LettaCodeLlmProvider;
  const llmProvider: LettaCodeLlmProvider | null = LLM_PROVIDERS.has(providerRaw) ? providerRaw : null;
  const llmApiKey = stringValue(raw.apiKey);
  const llmBaseUrlRaw = stringValue(raw.baseUrl);
  const llmBaseUrl = llmProvider && llmProvider !== "anthropic" && llmBaseUrlRaw
    ? llmBaseUrlRaw
    : (llmProvider && llmProvider !== "anthropic" && LLM_PROVIDER_PRESETS[llmProvider]
        ? LLM_PROVIDER_PRESETS[llmProvider].baseUrl
        : "");

  return {
    backend,
    harnessBackend: backend === "cloud_attached" ? "api" : "local",
    lettaAgentId: configuredAgentId,
    sourceCloudAgentId: stringValue(raw.sourceCloudAgentId),
    apiKey: stringValue(raw.apiKey),
    apiBaseUrl: apiBaseUrl.replace(/\/+$/, ""),
    cwd: stringValue(raw.cwd),
    model: stringValue(raw.model),
    llmProvider,
    llmApiKey,
    llmBaseUrl: llmBaseUrl.replace(/\/+$/, ""),
    reasoningEffort: REASONING_EFFORTS.has(reasoningCandidate) ? reasoningCandidate : undefined,
    permissionMode: PERMISSION_MODES.has(permissionCandidate) ? permissionCandidate : "standard",
    allowedTools: stringList(raw.allowedTools),
    disallowedTools: stringList(raw.disallowedTools),
    skillSources: skillSources(raw.skillSources),
    systemInfoReminder: typeof raw.systemInfoReminder === "boolean" ? raw.systemInfoReminder : undefined,
    modsEnabled: raw.modsEnabled !== false,
    dreaming: dreaming(raw.dreaming),
    heartbeatPrompt: stringValue(raw.heartbeatPrompt) || "Hello",
  };
}

export function resolveLettaCodeSession(
  value: unknown,
  cwd: string,
  backend: LettaCodeBackend,
): LettaCodeSessionParams | null {
  const raw = record(value);
  const conversationId = stringValue(raw.conversationId);
  const lettaAgentId = stringValue(raw.lettaAgentId);
  const storedCwd = stringValue(raw.cwd);
  if (!conversationId || !lettaAgentId || raw.backend !== backend) return null;
  if (storedCwd && path.resolve(storedCwd) !== path.resolve(cwd)) return null;
  return {
    conversationId,
    lettaAgentId,
    cwd: path.resolve(cwd),
    backend,
  };
}
