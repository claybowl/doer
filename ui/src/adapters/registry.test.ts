import { describe, expect, it } from "vitest";
import { findUIAdapter, listCreatableUIAdapters } from "./registry";

describe("Letta UI adapter compatibility", () => {
  it("retains legacy parsers while keeping Agent File and Letta CLI creatable", () => {
    expect(findUIAdapter("letta_cloud")?.type).toBe("letta_cloud");
    expect(findUIAdapter("letta_cli")?.type).toBe("letta_cli");
    expect(findUIAdapter("agent_file")?.type).toBe("agent_file");
    const creatable = listCreatableUIAdapters().map((adapter) => adapter.type);
    expect(creatable).toContain("letta_code");
    expect(creatable).not.toContain("letta_cloud");
    expect(creatable).toContain("letta_cli");
    // agent_file is first-class, not a migration target.
    expect(creatable).toContain("agent_file");
  });
});
