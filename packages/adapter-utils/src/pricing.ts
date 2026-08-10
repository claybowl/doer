/**
 * Model price rate card for cost estimation.
 *
 * Some providers (e.g. Letta) do not report per-run cost, so adapters estimate
 * USD from token counts using this table. Values are public list prices in USD
 * per 1M tokens and are only as current as the last edit — treat results as
 * estimates, never as invoices.
 *
 * Override or extend at runtime with DOER_MODEL_PRICE_OVERRIDES, a JSON object
 * mapping model ids to per-million prices:
 *   DOER_MODEL_PRICE_OVERRIDES='{"moonshotai/kimi-k2-6":{"input":0.6,"output":2.5,"cached":0.15}}'
 */

export interface ModelPrice {
  /** USD per 1M input tokens. */
  input: number;
  /** USD per 1M output tokens. */
  output: number;
  /** USD per 1M cached input tokens (falls back to `input` rate when absent). */
  cached?: number;
}

export const MODEL_PRICES: Record<string, ModelPrice> = {
  // Moonshot Kimi (Letta fleet default per repo AGENTS.md)
  "moonshotai/kimi-k2-6": { input: 0.6, output: 2.5, cached: 0.15 },
  "moonshotai/kimi-k2-5": { input: 0.6, output: 2.5, cached: 0.15 },
  "kimi-k2": { input: 0.6, output: 2.5, cached: 0.15 },
  // Anthropic
  "anthropic/claude-opus-4": { input: 15, output: 75, cached: 1.5 },
  "anthropic/claude-sonnet-4": { input: 3, output: 15, cached: 0.3 },
  "anthropic/claude-haiku-4": { input: 1, output: 5, cached: 0.1 },
  "claude-opus-4": { input: 15, output: 75, cached: 1.5 },
  "claude-sonnet-4": { input: 3, output: 15, cached: 0.3 },
  "claude-haiku-4": { input: 1, output: 5, cached: 0.1 },
  // OpenAI
  "openai/gpt-5-mini": { input: 0.25, output: 2, cached: 0.025 },
  "openai/gpt-5": { input: 1.25, output: 10, cached: 0.125 },
  "gpt-5-mini": { input: 0.25, output: 2, cached: 0.025 },
  "gpt-5": { input: 1.25, output: 10, cached: 0.125 },
  // Google
  "google/gemini-2.5-flash": { input: 0.3, output: 2.5 },
  "google/gemini-2.5-pro": { input: 1.25, output: 10 },
  "gemini-2.5-flash": { input: 0.3, output: 2.5 },
  "gemini-2.5-pro": { input: 1.25, output: 10 },
};

function normalizeModelId(model: string): string {
  return model.trim().toLowerCase();
}

function readOverrides(env: NodeJS.ProcessEnv): Record<string, ModelPrice> {
  const raw = env.DOER_MODEL_PRICE_OVERRIDES;
  if (!raw || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, ModelPrice>;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    const out: Record<string, ModelPrice> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (
        value &&
        typeof value === "object" &&
        typeof value.input === "number" &&
        typeof value.output === "number"
      ) {
        out[normalizeModelId(key)] = value;
      }
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Resolve the price for a model id. Exact match first, then longest-prefix
 * match so dated variants ("claude-sonnet-4-5-20250929") hit their family
 * entry. Returns null when the model is unknown — callers should treat that
 * as "cannot estimate", not "free".
 */
export function resolveModelPrice(
  model: string | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): ModelPrice | null {
  if (!model) return null;
  const id = normalizeModelId(model);
  const table: Record<string, ModelPrice> = { ...MODEL_PRICES, ...readOverrides(env) };
  if (table[id]) return table[id];
  let best: ModelPrice | null = null;
  let bestLen = 0;
  for (const [key, price] of Object.entries(table)) {
    if (id.startsWith(key) && key.length > bestLen) {
      best = price;
      bestLen = key.length;
    }
  }
  return best;
}

export interface TokenUsageForEstimate {
  inputTokens: number;
  outputTokens: number;
  /** Cached input tokens, treated as a subset of `inputTokens`. */
  cachedTokens?: number;
}

/**
 * Estimate USD cost for one run. Cached tokens are billed at the cached rate,
 * the remaining input at the input rate. Returns null when the model has no
 * known price.
 */
export function estimateCostUsd(
  model: string | null | undefined,
  usage: TokenUsageForEstimate,
  env: NodeJS.ProcessEnv = process.env,
): number | null {
  const price = resolveModelPrice(model, env);
  if (!price) return null;
  const input = Math.max(0, usage.inputTokens);
  const output = Math.max(0, usage.outputTokens);
  const cached = Math.min(Math.max(0, usage.cachedTokens ?? 0), input);
  const cachedRate = price.cached ?? price.input;
  const usd =
    ((input - cached) * price.input + cached * cachedRate + output * price.output) / 1_000_000;
  return usd;
}
