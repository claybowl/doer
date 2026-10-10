import type { UIAdapterModule, TranscriptEntry } from "../types";
import {
  buildAgentFileConfig,
  parseStdoutLineForHarness,
  parseOpenCodeStdoutLine,
} from "@doerai/adapter-agent-file/ui";
import { AgentFileConfigFields } from "./config-fields";

/**
 * The Agent File format is harness-agnostic, but the CLI that executes a turn
 * emits its own event format. Resolve the parser from the agent's configured
 * `harness` so a Pi-backed agent's live transcript is not parsed as OpenCode's.
 *
 * Falls back to OpenCode when no context is available (older call paths) and for
 * agents created before `harness` existed.
 */
function parseStdoutLine(
  line: string,
  ts: string,
  context?: { adapterConfig?: Record<string, unknown> | null },
): TranscriptEntry[] {
  const harness = context?.adapterConfig?.harness;
  if (typeof harness === "string" && harness !== "opencode") {
    return parseStdoutLineForHarness(harness)(line, ts);
  }
  return parseOpenCodeStdoutLine(line, ts);
}

export const agentFileUIAdapter: UIAdapterModule = {
  type: "agent_file",
  label: "Agent File (.af)",
  // Server-side parsing is harness-correct already: execute() delegates to the
  // chosen harness, which parses its own stdout. This only affects live UI
  // transcript rendering.
  parseStdoutLine,
  ConfigFields: AgentFileConfigFields,
  buildAdapterConfig: buildAgentFileConfig as unknown as UIAdapterModule["buildAdapterConfig"],
};