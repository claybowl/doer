import { describe, expect, it } from "vitest";
import { normalizeBilledCostCents } from "../services/heartbeat.ts";

describe("normalizeBilledCostCents", () => {
  it("zeroes provider-billed cost for subscription_included runs", () => {
    expect(normalizeBilledCostCents(1.23, "subscription_included")).toBe(0);
  });

  it("records rate-card estimates even for subscription_included runs", () => {
    expect(normalizeBilledCostCents(1.23, "subscription_included", true)).toBe(123);
  });

  it("prefers provider-reported cost when present (no estimate flag)", () => {
    expect(normalizeBilledCostCents(0.5, "metered_api")).toBe(50);
    expect(normalizeBilledCostCents(0.5, "metered_api", false)).toBe(50);
  });

  it("records estimated cost for metered billing types", () => {
    expect(normalizeBilledCostCents(0.0123, "unknown", true)).toBe(1);
  });

  it("returns 0 for missing or non-finite cost", () => {
    expect(normalizeBilledCostCents(null, "metered_api")).toBe(0);
    expect(normalizeBilledCostCents(undefined, "metered_api", true)).toBe(0);
    expect(normalizeBilledCostCents(Number.NaN, "metered_api", true)).toBe(0);
  });

  it("never returns a negative amount", () => {
    expect(normalizeBilledCostCents(-2, "metered_api", true)).toBe(0);
  });
});
