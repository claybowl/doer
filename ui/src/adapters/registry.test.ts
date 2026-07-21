import { describe, expect, it } from "vitest";
import { findUIAdapter, listCreatableUIAdapters } from "./registry";

describe("Letta UI adapter compatibility", () => {
  it("retains legacy parsers while hiding legacy adapters from creation", () => {
    expect(findUIAdapter("letta_cloud")?.type).toBe("letta_cloud");
    expect(findUIAdapter("letta_cli")?.type).toBe("letta_cli");
    expect(findUIAdapter("letta_af_opencode")?.type).toBe("letta_af_opencode");
    const creatable = listCreatableUIAdapters().map((adapter) => adapter.type);
    expect(creatable).toContain("letta_code");
    expect(creatable).not.toContain("letta_cloud");
    expect(creatable).not.toContain("letta_cli");
    expect(creatable).not.toContain("letta_af_opencode");
  });
});
