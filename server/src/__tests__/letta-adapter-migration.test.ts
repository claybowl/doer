import { describe, expect, it } from "vitest";
import {
  CREATABLE_AGENT_ADAPTER_TYPES,
  LEGACY_AGENT_ADAPTER_TYPES,
} from "@doerai/shared";
import {
  findServerAdapter,
  getAdapterCreationRecommendation,
  listCreatableServerAdapters,
} from "../adapters/registry.js";

describe("legacy Letta adapter compatibility", () => {
  it("keeps legacy runtimes resolvable while steering them toward letta_code", () => {
    // Existing agents must keep running against their current runtime.
    for (const type of LEGACY_AGENT_ADAPTER_TYPES) {
      expect(findServerAdapter(type)?.type).toBe(type);
      expect(getAdapterCreationRecommendation(type)).toBe("letta_code");
    }
  });

  it("treats agent_file as first-class rather than a migration target", () => {
    // agent_file used to be listed here. It was un-deprecated; a .af bundle is a
    // supported way to run an agent, not something to migrate away from.
    expect(getAdapterCreationRecommendation("agent_file")).toBeNull();
    const creatable = listCreatableServerAdapters().map((a) => a.type);
    expect(creatable).toContain("agent_file");
  });

  it("matches the shared creatable list exactly", () => {
    const creatable = listCreatableServerAdapters().map((a) => a.type).sort();
    expect(creatable).toEqual([...CREATABLE_AGENT_ADAPTER_TYPES].sort());
  });

  it("does not offer deprecated or internal adapters for creation", () => {
    const creatable = listCreatableServerAdapters().map((a) => a.type);
    expect(creatable).toContain("letta_code");
    for (const type of LEGACY_AGENT_ADAPTER_TYPES) {
      expect(creatable).not.toContain(type);
    }
    // Internal implementation adapters and openclaw_gateway stay unavailable.
    expect(creatable).not.toContain("process");
    expect(creatable).not.toContain("http");
    expect(creatable).not.toContain("openclaw_gateway");
  });
});