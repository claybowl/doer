import type { UIAdapterModule, CreateConfigValues } from "../types";
import { parseLettaCliStdoutLine } from "@doerai/adapter-letta-cli/ui";
import { LettaCliConfigFields } from "./config-fields";

function buildLettaCliConfig(values: CreateConfigValues): Record<string, unknown> {
  const v = values as unknown as Record<string, unknown>;
  return {
    agentId: (v.agentId as string) ?? "",
    apiKey: (v.apiKey as string) || undefined,
    baseUrl: (v.baseUrl as string) || undefined,
    backend: (v.backend as string) || "api",
    model: (v.model as string) || undefined,
    command: (v.command as string) || undefined,
  };
}

export const lettaCliUIAdapter: UIAdapterModule = {
  type: "letta_cli",
  label: "Letta CLI",
  parseStdoutLine: parseLettaCliStdoutLine,
  ConfigFields: LettaCliConfigFields as UIAdapterModule["ConfigFields"],
  buildAdapterConfig: buildLettaCliConfig,
};
