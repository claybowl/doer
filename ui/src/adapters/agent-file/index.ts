import type { UIAdapterModule } from "../types";
import { parseStdoutLine, buildLettaAfConfig } from "@doerai/adapter-agent-file/ui";
import { LettaAfOpenCodeConfigFields } from "./config-fields";

export const lettaAfOpenCodeUIAdapter: UIAdapterModule = {
  type: "agent_file",
  label: "Letta .af (local via OpenCode)",
  parseStdoutLine,
  ConfigFields: LettaAfOpenCodeConfigFields,
  buildAdapterConfig: buildLettaAfConfig as unknown as UIAdapterModule["buildAdapterConfig"],
};
