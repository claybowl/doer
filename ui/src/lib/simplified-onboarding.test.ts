import { describe, expect, it } from "vitest";
import {
  buildLocalLettaAgentPayload,
  buildOnboardingCompanyPayload,
  getOnboardingCompanyRoute,
  isValidOnboardingName,
} from "./simplified-onboarding";

describe("simplified onboarding", () => {
  it("builds a company payload from a non-empty name", () => {
    expect(buildOnboardingCompanyPayload("  Acme Labs  ")).toEqual({ name: "Acme Labs" });
  });

  it("builds a local Letta agent with Doer-managed memory defaults", () => {
    expect(buildLocalLettaAgentPayload("  Letta  ")).toEqual({
      name: "Letta",
      role: "general",
      adapterType: "letta_code",
      adapterConfig: {
        backend: "local",
        permissionMode: "standard",
        modsEnabled: true,
      },
    });
  });

  it("rejects blank names and routes to the company home", () => {
    expect(isValidOnboardingName("   ")).toBe(false);
    expect(isValidOnboardingName("Doer")).toBe(true);
    expect(getOnboardingCompanyRoute("DOER")).toBe("/DOER");
  });
});
