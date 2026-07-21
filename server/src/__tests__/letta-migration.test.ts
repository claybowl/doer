import { describe, expect, it } from "vitest";
import { buildLettaMigrationPreview } from "../routes/letta-migration.js";

describe("Letta migration preview", () => {
  it("describes a non-mutating Cloud-to-local clone", () => {
    expect(buildLettaMigrationPreview({
      id: "doer-cloud",
      name: "Alice",
      adapterType: "letta_code",
      adapterConfig: { backend: "cloud_attached", lettaAgentId: "agent-cloud" },
    })).toEqual(expect.objectContaining({
      sourceDoerAgentId: "doer-cloud",
      sourceLettaAgentId: "agent-cloud",
      sourceWillBeModified: false,
      targetAdapterType: "letta_code",
      targetBackend: "local",
      targetName: "Alice (Local)",
      targetWillReceiveNewDoerId: true,
      targetWillReceiveNewLettaId: true,
      memoryLocation: "Doer MemFS",
      toolsLocation: "Doer machine",
    }));
  });
});
