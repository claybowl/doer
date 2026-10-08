import { describe, expect, it } from "vitest";
import {
  findServerAdapter,
  getAdapterCreationRecommendation,
  listCreatableServerAdapters,
} from "../adapters/registry.js";

describe("legacy Letta adapter compatibility", () => {
  it("keeps legacy runtimes resolvable while making Letta CLI creatable", () => {
    for (const type of ["letta_cloud", "agent_file"]) {
      expect(findServerAdapter(type)?.type).toBe(type);
      expect(getAdapterCreationRecommendation(type)).toBe("letta_code");
    }
    const creatable = listCreatableServerAdapters().map((adapter) => adapter.type);
    expect(creatable).toContain("letta_code");
    expect(creatable).not.toContain("letta_cloud");
    expect(creatable).toContain("letta_cli");
    expect(creatable).not.toContain("agent_file");
  });
});
