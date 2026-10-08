/**
 * UI-side exports for the agent-file adapter.
 *
 * Stdout parsing is identical to opencode-local — execution is the same
 * process under the hood — so we re-export those functions directly.
 */
export { parseOpenCodeStdoutLine as parseStdoutLine } from "@doerai/adapter-opencode-local/ui";

export type { AgentFileAdapterConfig } from "../shared/types.js";

/**
 * Build the adapter config object from form values collected during hire.
 * Called by the UI adapter's buildAdapterConfig.
 */
export function buildAgentFileConfig(
  values: Record<string, unknown>,
): Record<string, unknown> {
  return {
    afPath: typeof values.afPath === "string" ? values.afPath.trim() : "",
    model: typeof values.model === "string" ? values.model.trim() : "",
    heartbeatPrompt: typeof values.heartbeatPrompt === "string" ? values.heartbeatPrompt.trim() : "",
    dangerouslySkipPermissions: values.dangerouslySkipPermissions !== false,
    timeoutSec: typeof values.timeoutSec === "number" ? values.timeoutSec : undefined,
  };
}
