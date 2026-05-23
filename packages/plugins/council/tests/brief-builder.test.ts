import { describe, it, expect } from "vitest";
import { buildBrief } from "../src/brief-builder.js";
import type { CouncilSessionContext, CouncilConfig, CouncilAgendaConfig } from "@doerai/shared";
import type { Agent } from "@doerai/plugin-sdk";

const mockAgent = {
  id: "agent-1",
  name: "Chef",
  role: "executor",
} as unknown as Agent;

const mockContext: CouncilSessionContext = {
  companyId: "co-1",
  sessionTypeId: "full_council",
  activeGoals: [{ id: "g-1", title: "Ship v1", level: "company" }],
  openIssueCount: 12,
  recentActivity: ["Issue closed: Fix login bug"],
  budgetRemaining: 25.50,
  agenda: ["What is blocking progress on active goals?"],
  customContext: {},
};

const mockAgenda: CouncilAgendaConfig = {
  prompts: ["What is blocking progress?"],
  perAgent: { "agent-1": "Focus on backend blockers." },
  outputConstraints: { minIssues: 2, maxIssues: 5 },
};

const mockConfig = {
  agenda: mockAgenda,
} as unknown as CouncilConfig;

describe("buildBrief", () => {
  it("includes session context in brief", () => {
    const brief = buildBrief(mockContext, mockAgent, mockConfig, "member");
    expect(brief).toContain("Ship v1");
    expect(brief).toContain("12");
    expect(brief).toContain("25.50");
  });

  it("includes perAgent directive", () => {
    const brief = buildBrief(mockContext, mockAgent, mockConfig, "member");
    expect(brief).toContain("Focus on backend blockers.");
  });

  it("includes agenda prompts", () => {
    const brief = buildBrief(mockContext, mockAgent, mockConfig, "member");
    expect(brief).toContain("What is blocking progress?");
  });

  it("includes output format instruction", () => {
    const brief = buildBrief(mockContext, mockAgent, mockConfig, "member");
    expect(brief).toContain("```json");
    expect(brief).toContain("title");
  });

  it("uses orchestrator role label when role is orchestrator", () => {
    const brief = buildBrief(mockContext, mockAgent, mockConfig, "orchestrator");
    expect(brief.toLowerCase()).toContain("orchestrator");
  });
});
