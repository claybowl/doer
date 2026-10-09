/**
 * UI-side exports for the agent-file adapter.
 *
 * Stdout parsing is harness-specific — the agent's chosen CLI emits its own
 * event format. opencode is the default and is re-exported directly; the other
 * harnesses are resolved by `parseStdoutLineForHarness`.
 */
import { parseOpenCodeStdoutLine } from "@doerai/adapter-opencode-local/ui";
import { parsePiStdoutLine } from "@doerai/adapter-pi-local/ui";
import { parseClaudeStdoutLine } from "@doerai/adapter-claude-local/ui";
import { parseCodexStdoutLine } from "@doerai/adapter-codex-local/ui";
import { resolveHarness } from "../shared/types.js";

export { parseOpenCodeStdoutLine as parseStdoutLine } from "@doerai/adapter-opencode-local/ui";

export type {
  AgentFileAdapterConfig,
  AgentFileHarness,
} from "../shared/types.js";
export {
  AGENT_FILE_HARNESSES,
  AGENT_FILE_HARNESS_LABELS,
  resolveHarness,
} from "../shared/types.js";

/**
 * Pick the stdout parser matching the agent's configured harness.
 *
 * Parsers are statically imported so this lookup stays synchronous, which is
 * what Doer's adapter registry contract requires.
 */
export function parseStdoutLineForHarness(harness: string) {
  switch (resolveHarness(harness)) {
    case "pi":
      return parsePiStdoutLine;
    case "claude":
      return parseClaudeStdoutLine;
    case "codex":
      return parseCodexStdoutLine;
    case "opencode":
    default:
      return parseOpenCodeStdoutLine;
  }
}

/**
 * Build the adapter config object from form values collected during hire.
 * Called by the UI adapter's buildAdapterConfig.
 */
export function buildAgentFileConfig(
  values: Record<string, unknown>,
): Record<string, unknown> {
  return {
    afPath: typeof values.afPath === "string" ? values.afPath.trim() : "",
    harness: resolveHarness(values.harness),
    model: typeof values.model === "string" ? values.model.trim() : "",
    heartbeatPrompt: typeof values.heartbeatPrompt === "string" ? values.heartbeatPrompt.trim() : "",
    dangerouslySkipPermissions: values.dangerouslySkipPermissions !== false,
    timeoutSec: typeof values.timeoutSec === "number" ? values.timeoutSec : undefined,
  };
}