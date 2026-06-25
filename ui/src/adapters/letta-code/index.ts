import type { UIAdapterModule, CreateConfigValues } from "../types";
import { parseLettaCodeStdoutLine } from "@doerai/adapter-letta-code/ui";
import { LettaCodeConfigFields } from "./config-fields";

/**
 * Build adapterConfig from create-mode form values. The form is mode-aware:
 * only the fields relevant to the selected mode are persisted so the
 * discriminated union on the server stays clean.
 */
function buildLettaCodeConfig(values: CreateConfigValues): Record<string, unknown> {
  const v = values as unknown as Record<string, unknown>;
  const mode = (v.mode as string) === "online" ? "online" : "offline";

  if (mode === "online") {
    return {
      mode: "online",
      agentId: (v.agentId as string) ?? "",
      apiKey: (v.apiKey as string) ?? "",
      baseUrl: (v.baseUrl as string) || undefined,
    };
  }

  return {
    mode: "offline",
    memoryDir: (v.memoryDir as string) || undefined,
    provider: (v.provider as string) || "anthropic",
    model: (v.model as string) || undefined,
    apiKey: (v.apiKey as string) || undefined,
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
