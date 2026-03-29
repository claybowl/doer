import type { UIAdapterModule } from "../types";
import { buildLettaCloudConfig, parseLettaCloudStdoutLine } from "@paperclipai/adapter-letta-cloud/ui";
import { LettaCloudConfigFields } from "./config-fields";

export const lettaCloudUIAdapter: UIAdapterModule = {
  type: "letta_cloud",
  label: "Letta Cloud",
  parseStdoutLine: parseLettaCloudStdoutLine,
  ConfigFields: LettaCloudConfigFields as UIAdapterModule["ConfigFields"],
  buildAdapterConfig: buildLettaCloudConfig,
};
