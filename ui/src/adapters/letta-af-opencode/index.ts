import type { UIAdapterModule } from "../types";
import { parseStdoutLine, buildLettaAfConfig } from "@doerai/adapter-letta-af-opencode/ui";
import { LettaAfOpenCodeConfigFields } from "./config-fields";

export const lettaAfOpenCodeUIAdapter: UIAdapterModule = {
  type: "letta_af_opencode",
  label: "Letta .af (local via OpenCode)",
  parseStdoutLine,
  ConfigFields: LettaAfOpenCodeConfigFields,
  buildAdapterConfig: buildLettaAfConfig as unknown as UIAdapterModule["buildAdapterConfig"],
};
