import { describe, expect, it } from "vitest";
import { resolveOfflineToolPolicy } from "./execute.js";

describe("resolveOfflineToolPolicy", () => {
  it("makes Ollama Cloud agents tool-free by default", () => {
    expect(resolveOfflineToolPolicy({ provider: "ollama_cloud" })).toEqual({
      profile: "cloud_safe",
      allowedTools: [],
    });
  });

  it("does not allow a cloud agent to opt into privileged tools", () => {
    expect(() => resolveOfflineToolPolicy({ provider: "ollama_cloud", toolProfile: "privileged" })).toThrow(
      "Ollama Cloud agents cannot use the privileged tool profile",
    );
  });

  it("does not grant privileged tools to another remote provider by default or override", () => {
    expect(resolveOfflineToolPolicy({ provider: "groq" })).toEqual({
      profile: "cloud_safe",
      allowedTools: [],
    });
    expect(() => resolveOfflineToolPolicy({ provider: "groq", toolProfile: "privileged" })).toThrow(
      "Only local Ollama agents can use the privileged tool profile",
    );
  });

  it("keeps privileged tools as the default for explicitly local providers", () => {
    expect(resolveOfflineToolPolicy({ provider: "ollama" })).toEqual({
      profile: "privileged",
      allowedTools: ["bash", "read", "write", "edit", "grep", "doer_api"],
    });
  });

  it("does not send memory blocks to a cloud-safe agent unless explicitly allowlisted", async () => {
    const { selectMemoryBlocksForProfile } = await import("./execute.js");
    const blocks = [
      { label: "persona", content: "safe", filePath: "/tmp/persona.md" },
      { label: "credentials", content: "secret", filePath: "/tmp/credentials.md" },
    ];

    expect(selectMemoryBlocksForProfile(blocks, "cloud_safe")).toEqual([]);
    expect(selectMemoryBlocksForProfile(blocks, "cloud_safe", ["persona"])).toEqual([blocks[0]]);
    expect(selectMemoryBlocksForProfile(blocks, "privileged")).toEqual(blocks);
  });
});
