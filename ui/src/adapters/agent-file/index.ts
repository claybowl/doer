import type { UIAdapterModule } from "../types";
import { parseStdoutLine, buildAgentFileConfig } from "@doerai/adapter-agent-file/ui";
import { AgentFileConfigFields } from "./config-fields";

export const agentFileUIAdapter: UIAdapterModule = {
  type: "agent_file",
  label: "Letta .af (local via OpenCode)",
  parseStdoutLine,
  ConfigFields: AgentFileConfigFields,
  buildAdapterConfig: buildAgentFileConfig as unknown as UIAdapterModule["buildAdapterConfig"],
};
