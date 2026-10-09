import type { UIAdapterModule } from "../types";
import { parseStdoutLine, buildAgentFileConfig } from "@doerai/adapter-agent-file/ui";
import { AgentFileConfigFields } from "./config-fields";

export const agentFileUIAdapter: UIAdapterModule = {
  type: "agent_file",
  label: "Agent File (.af)",
  // Harness-specific parsing happens server-side: execute() delegates to the
  // chosen harness, which parses its own stdout. This UI parser only renders the
  // live transcript, and the UIAdapterModule contract is (line, ts) with no
  // adapterConfig, so it stays on opencode's format for now.
  parseStdoutLine,
  ConfigFields: AgentFileConfigFields,
  buildAdapterConfig: buildAgentFileConfig as unknown as UIAdapterModule["buildAdapterConfig"],
};
