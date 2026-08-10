import { describe, expect, it } from "vitest";
import { computeRunCost } from "./cost.js";

/**
 * Structural tests for run-cost computation — no API calls.
 */

describe("computeRunCost", () => {
  it("estimates cost from the rate card for a known model", () => {
    const cost = computeRunCost({
      model: "moonshotai/kimi-k2-5",
      usage: { inputTokens: 1500, outputTokens: 300, cachedTokens: 100 },
    });
    expect(cost).not.toBeNull();
    // (1400 * 0.6 + 100 * 0.15 + 300 * 2.5) / 1e6 = 0.001605
    expect(cost!.costUsd).toBeCloseTo(0.001605, 9);
    expect(cost!.costEstimated).toBe(true);
  });

  it("returns null for an unknown model (never fabricate spend)", () => {
    const cost = computeRunCost({
      model: "somevendor/mystery-model-9000",
      usage: { inputTokens: 1500, outputTokens: 300 },
    });
    expect(cost).toBeNull();
  });

  it("returns null when model is missing", () => {
    const cost = computeRunCost({
      model: null,
      usage: { inputTokens: 1500, outputTokens: 300 },
    });
    expect(cost).toBeNull();
  });

  it("prefers a provider-reported cost and does not flag it as estimated", () => {
    const cost = computeRunCost({
      model: "moonshotai/kimi-k2-5",
      usage: { inputTokens: 1500, outputTokens: 300, cachedTokens: 100 },
      providerCostUsd: 0.0042,
    });
    expect(cost).toEqual({ costUsd: 0.0042, costEstimated: false });
  });

  it("provider cost wins even when the model is unknown", () => {
    const cost = computeRunCost({
      model: "somevendor/mystery-model-9000",
      usage: { inputTokens: 1500, outputTokens: 300 },
      providerCostUsd: 0.01,
    });
    expect(cost).toEqual({ costUsd: 0.01, costEstimated: false });
  });

  it("ignores non-finite provider cost and falls back to estimation", () => {
    const cost = computeRunCost({
      model: "moonshotai/kimi-k2-5",
      usage: { inputTokens: 1000, outputTokens: 0 },
      providerCostUsd: Number.NaN,
    });
    expect(cost).not.toBeNull();
    expect(cost!.costEstimated).toBe(true);
    expect(cost!.costUsd).toBeCloseTo(0.0006, 9);
  });
});
