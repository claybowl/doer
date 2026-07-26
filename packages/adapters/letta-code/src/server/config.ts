import path from "node:path";
import type {
  LettaCodeBackend,
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

  return {
    backend,
    harnessBackend: backend === "cloud_attached" ? "api" : "local",
    lettaAgentId: configuredAgentId,
    sourceCloudAgentId: stringValue(raw.sourceCloudAgentId),
    apiKey: stringValue(raw.apiKey),
    apiBaseUrl: apiBaseUrl.replace(/\/+$/, ""),
    cwd: stringValue(raw.cwd),
    model: stringValue(raw.model),
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
