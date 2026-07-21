import { describe, expect, it } from "vitest";
import { extractLettaAgentId } from "../services/memfs/memfs-service.js";

describe("MemFS unified Letta configuration", () => {
  it("recognizes the canonical lettaAgentId field", () => {
    expect(extractLettaAgentId({
      adapterType: "letta_code",
      adapterConfig: { backend: "local", lettaAgentId: "agent-local-canonical" },
    } as never)).toBe("agent-local-canonical");
  });
});
