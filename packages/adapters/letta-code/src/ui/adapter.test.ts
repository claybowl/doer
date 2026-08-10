import { describe, expect, it } from "vitest";
import { parseLettaCodeStdoutLine } from "./adapter.js";

const TS = "2026-08-10T00:00:00.000Z";

function usageLine(extra: Record<string, unknown>): string {
  return JSON.stringify({
    type: "usage_statistics",
    inputTokens: 10000,
    outputTokens: 5000,
    cachedTokens: 4000,
    ...extra,
  });
}

describe("parseLettaCodeStdoutLine usage_statistics cost", () => {
  it("estimates cost from the rate card for a known model and marks it as an estimate", () => {
    const [entry] = parseLettaCodeStdoutLine(usageLine({ model: "moonshotai/kimi-k2-5" }), TS);

    expect(entry).toMatchObject({
      kind: "result",
      subtype: "usage",
      inputTokens: 10000,
      outputTokens: 5000,
      cachedTokens: 4000,
      costEstimated: true,
      isError: false,
    });
    if (entry.kind !== "result") throw new Error("expected result entry");
    // (6000 * $0.60 + 4000 * $0.15 + 5000 * $2.50) / 1M = $0.0167
    expect(entry.costUsd).toBeCloseTo(0.0167, 6);
    expect(entry.text).toBe("15000 tokens (~$0.0167 est)");
  });

  it("keeps zero cost and no estimate for a model unknown to the rate card", () => {
    const [entry] = parseLettaCodeStdoutLine(usageLine({ model: "acme/mystery-9000" }), TS);

    if (entry.kind !== "result") throw new Error("expected result entry");
    expect(entry.costUsd).toBe(0);
    expect(entry.costEstimated).toBe(false);
    expect(entry.text).toBe("15000 tokens");
  });

  it("keeps legacy behavior when the line carries no model at all", () => {
    const [entry] = parseLettaCodeStdoutLine(
      JSON.stringify({ type: "usage_statistics", inputTokens: 3, outputTokens: 2 }),
      TS,
    );

    if (entry.kind !== "result") throw new Error("expected result entry");
    expect(entry.costUsd).toBe(0);
    expect(entry.costEstimated).toBe(false);
    expect(entry.text).toBe("5 tokens");
  });

  it("prefers a provider-reported cost over the estimate", () => {
    const [entry] = parseLettaCodeStdoutLine(
      usageLine({ model: "moonshotai/kimi-k2-5", costUsd: 0.42 }),
      TS,
    );

    if (entry.kind !== "result") throw new Error("expected result entry");
    expect(entry.costUsd).toBe(0.42);
    expect(entry.costEstimated).toBe(false);
    expect(entry.text).toBe("15000 tokens");
  });
});
