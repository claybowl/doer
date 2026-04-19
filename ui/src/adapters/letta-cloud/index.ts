import type { UIAdapterModule } from "../types";
import { buildLettaCloudConfig, parseLettaCloudStdoutLine } from "@doerai/adapter-letta-cloud/ui";
import { LettaCloudConfigFields } from "./config-fields";

export const lettaCloudUIAdapter: UIAdapterModule = {
  type: "letta_cloud",
  label: "Letta Cloud",
  parseStdoutLine: parseLettaCloudStdoutLine,
  ConfigFields: LettaCloudConfigFields as UIAdapterModule["ConfigFields"],
  // Cast required: buildLettaCloudConfig takes LettaCreateConfigValues (its own typed form
  // values) rather than the generic CreateConfigValues. The runtime form values always
  // include the letta-specific fields; the cast makes the adapter registration compile.
  buildAdapterConfig: buildLettaCloudConfig as unknown as UIAdapterModule["buildAdapterConfig"],
};
