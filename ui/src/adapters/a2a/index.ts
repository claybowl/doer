import type { UIAdapterModule, CreateConfigValues } from "../types";
import { parseA2aStdoutLine, buildA2aAdapterConfig } from "@doerai/adapter-a2a/ui";
import { A2aConfigFields } from "./config-fields";

export const a2aUIAdapter: UIAdapterModule = {
  type: "a2a",
  label: "A2A Remote Agent",
  parseStdoutLine: parseA2aStdoutLine,
  ConfigFields: A2aConfigFields as UIAdapterModule["ConfigFields"],
  buildAdapterConfig: (values: CreateConfigValues) =>
    buildA2aAdapterConfig(values as unknown as Record<string, unknown>) as unknown as Record<string, unknown>,
};
