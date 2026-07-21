import type { UIAdapterModule, CreateConfigValues } from "../types";
import { parseLettaCodeStdoutLine } from "@doerai/adapter-letta-code/ui";
import { LettaCodeConfigFields } from "./config-fields";

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === "string" && Boolean(entry.trim()));
  if (typeof value === "string") return value.split(/[\n,]/).map((entry) => entry.trim()).filter(Boolean);
  return [];
}

/** Build the canonical Agent SDK configuration. Model selection never changes tool permissions. */
export function buildLettaCodeConfig(values: CreateConfigValues): Record<string, unknown> {
  const v = values as unknown as Record<string, unknown>;
  const backend = v.backend === "cloud_attached" ? "cloud_attached" : "local";
  const dreamingTrigger = typeof v.dreamingTrigger === "string" ? v.dreamingTrigger : "";
  const dreamingStepCount = Number(v.dreamingStepCount);
  return {
    backend,
    ...((v.lettaAgentId as string)?.trim() ? { lettaAgentId: (v.lettaAgentId as string).trim() } : {}),
    ...((v.model as string)?.trim() ? { model: (v.model as string).trim() } : {}),
    ...((v.reasoningEffort as string)?.trim() ? { reasoningEffort: v.reasoningEffort } : {}),
    permissionMode: (v.permissionMode as string) || "standard",
    allowedTools: stringList(v.allowedTools),
    disallowedTools: stringList(v.disallowedTools),
    skillSources: stringList(v.skillSources).length > 0
      ? stringList(v.skillSources)
      : ["bundled", "global", "agent", "project"],
    modsEnabled: v.modsEnabled !== false,
    ...(typeof v.systemInfoReminder === "boolean" ? { systemInfoReminder: v.systemInfoReminder } : {}),
    ...(dreamingTrigger ? {
      dreaming: {
        trigger: dreamingTrigger,
        ...((v.dreamingBehavior as string)?.trim() ? { behavior: v.dreamingBehavior } : {}),
        ...(Number.isFinite(dreamingStepCount) && dreamingStepCount > 0 ? { stepCount: dreamingStepCount } : {}),
      },
    } : {}),
    ...(backend === "cloud_attached" && (v.apiKey as string)?.trim() ? { apiKey: (v.apiKey as string).trim() } : {}),
    ...(backend === "cloud_attached" && (v.apiBaseUrl as string)?.trim() ? { apiBaseUrl: (v.apiBaseUrl as string).trim() } : {}),
  };
}

export const lettaCodeUIAdapter: UIAdapterModule = {
  type: "letta_code",
  label: "Letta Code",
  // letta_code emits the same JSON-line stdout format as letta_cloud.
  parseStdoutLine: parseLettaCodeStdoutLine,
  ConfigFields: LettaCodeConfigFields as UIAdapterModule["ConfigFields"],
  buildAdapterConfig: buildLettaCodeConfig,
};
