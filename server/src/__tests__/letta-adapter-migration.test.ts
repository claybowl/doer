import { describe, expect, it } from "vitest";
import {
  findServerAdapter,
  getAdapterCreationRecommendation,
  listCreatableServerAdapters,
} from "../adapters/registry.js";

describe("legacy Letta adapter compatibility", () => {
  it("keeps legacy runtimes resolvable while making Letta CLI creatable", () => {
    for (const type of ["letta_cloud", "letta_af_opencode"]) {
      expect(findServerAdapter(type)?.type).toBe(type);
      expect(getAdapterCreationRecommendation(type)).toBe("letta_code");
    }
    const creatable = listCreatableServerAdapters().map((adapter) => adapter.type);
    expect(creatable).toContain("letta_code");
    expect(creatable).not.toContain("letta_cloud");
    expect(creatable).toContain("letta_cli");
    expect(creatable).not.toContain("letta_af_opencode");
  });
});
