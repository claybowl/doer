import { describe, expect, it, vi } from "vitest";
import { createLocalAgentFromSnapshot } from "./migration.js";

describe("createLocalAgentFromSnapshot", () => {
  it("imports Cloud memory into instance-scoped local storage", async () => {
    const createAgent = vi.fn(async () => "agent-local-new");
    const id = await createLocalAgentFromSnapshot({
      name: "Alice",
      model: "openai-codex/gpt-5",
      systemPrompt: "Be useful.",
      blocks: [{ label: "persona", value: "I remember.", readOnly: true }],
    }, {
      memoryDir: "/doer/memory/alice",
      stateDir: "/doer/state/alice",
      permissionMode: "unrestricted",
    }, () => ({ createAgent }));

    expect(id).toBe("agent-local-new");
    expect(createAgent).toHaveBeenCalledWith(expect.objectContaining({
      model: "openai-codex/gpt-5",
      permissionMode: "unrestricted",
      memory: [{ label: "persona", value: "I remember.", read_only: true }],
      env: {
        MEMORY_DIR: "/doer/memory/alice",
        LETTA_MEMORY_DIR: "/doer/memory/alice",
        LETTA_MEMORY_DIR_EXPLICIT: "1",
        LETTA_LOCAL_BACKEND_DIR: "/doer/state/alice/letta-local-backend",
      },
    }));
  });
});
