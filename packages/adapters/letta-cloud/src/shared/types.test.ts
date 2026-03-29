import { describe, expect, it } from "vitest";
import type { LettaCloudAdapterConfig, LettaMemoryBlock, LettaTool } from "./types.js";

/**
 * Structural tests for shared types.
 * Validates that the type contracts are correctly shaped — compile-time checks
 * plus runtime shape assertions.
 */

describe("LettaCloudAdapterConfig", () => {
  it("accepts minimal required fields", () => {
    const config: LettaCloudAdapterConfig = {
      agentId: "agent-abc123",
      apiKey: "sk-let-xxx",
    };
    expect(config.agentId).toBe("agent-abc123");
    expect(config.apiKey).toBe("sk-let-xxx");
    expect(config.baseUrl).toBeUndefined();
  });

  it("accepts all optional fields", () => {
    const config: LettaCloudAdapterConfig = {
      agentId: "agent-abc123",
      apiKey: "sk-let-xxx",
      baseUrl: "https://api.letta.com",
      agentName: "DonDog",
      model: "anthropic/claude-sonnet-4-5",
      agentType: "memgpt_agent",
      systemPrompt: "You are DonDog.",
      tags: ["core", "orchestrator"],
      temperature: 0.7,
      maxTokens: 4096,
    };
    expect(config.tags).toEqual(["core", "orchestrator"]);
    expect(config.temperature).toBe(0.7);
  });
});

describe("LettaMemoryBlock", () => {
  it("has required fields", () => {
    const block: LettaMemoryBlock = {
      id: "block-abc",
      label: "human",
      value: "Clay is the CEO of Donjon.",
    };
    expect(block.label).toBe("human");
    expect(block.readOnly).toBeUndefined();
    expect(block.limit).toBeUndefined();
  });

  it("accepts full block shape", () => {
    const block: LettaMemoryBlock = {
      id: "block-abc",
      label: "persona",
      value: "I am DonDog.",
      description: "DonDog's identity",
      readOnly: false,
      limit: 100000,
    };
    expect(block.limit).toBe(100000);
    expect(block.readOnly).toBe(false);
  });
});

describe("LettaTool", () => {
  it("has required id and name", () => {
    const tool: LettaTool = {
      id: "tool-abc",
      name: "send_message",
    };
    expect(tool.id).toBe("tool-abc");
    expect(tool.name).toBe("send_message");
  });

  it("accepts optional fields", () => {
    const tool: LettaTool = {
      id: "tool-abc",
      name: "create_linear_task",
      description: "Creates a task in Linear",
      toolType: "custom",
      tags: ["linear", "tasks"],
      defaultRequiresApproval: false,
    };
    expect(tool.tags).toEqual(["linear", "tasks"]);
  });
});
