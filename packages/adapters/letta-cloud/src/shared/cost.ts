import { estimateCostUsd } from "@doerai/adapter-utils";

export interface RunCostInput {
  /** Configured model handle for the run (e.g. "moonshotai/kimi-k2-5"). */
  model: string | null | undefined;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cachedTokens?: number;
  };
  /** Cost reported by the provider, when it reports one at all. */
  providerCostUsd?: number | null;
}

export interface RunCost {
  costUsd: number;
  /** True when `costUsd` came from the rate card, not the provider. */
  costEstimated: boolean;
}

/**
 * Decide the cost for a Letta run. Letta does not report per-run cost, so we
 * estimate from token counts via the shared rate card. Rules:
 *
 * - A provider-reported cost always wins and is never flagged as estimated.
 * - Otherwise estimate from the run's configured model.
 * - Unknown model → null (caller keeps old behavior: no cost, never fabricate).
 */
export function computeRunCost(input: RunCostInput): RunCost | null {
  if (
    typeof input.providerCostUsd === "number" &&
    Number.isFinite(input.providerCostUsd)
  ) {
    return { costUsd: input.providerCostUsd, costEstimated: false };
  }
  const estimated = estimateCostUsd(input.model, input.usage);
  if (estimated == null) return null;
  return { costUsd: estimated, costEstimated: true };
}
