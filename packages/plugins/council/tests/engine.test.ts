import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CouncilConfig, CouncilSession } from "@doerai/shared";

// Mock the engine's dependencies
vi.mock("../src/session-types/full-council.js", () => ({
  fullCouncilHandler: {
    buildContext: vi.fn(async () => ({
      companyId: "co-1",
      sessionTypeId: "full_council",
      activeGoals: [],
      openIssueCount: 0,
      recentActivity: [],
      budgetRemaining: 100,
      agenda: ["What needs doing?"],
      customContext: {},
    })),
    buildBrief: vi.fn(() => "Council brief here"),
    invoke: vi.fn(async () => [
      {
        agentId: "ag-1",
        agentName: "Chef",
        role: "member",
        content: "My address\n```json\n[{\"title\":\"Fix login\"}]\n```",
        issueProposals: [{ title: "Fix login" }],
        timestamp: new Date().toISOString(),
        status: "completed",
      },
    ]),
    resolve: vi.fn(async () => ({
      summary: "Council decision",
      reasoning: "Based on member input",
      issueProposals: [{ title: "Fix login", priority: "high" }],
      orchestratorAgentId: "ag-2",
      timestamp: new Date().toISOString(),
    })),
    apply: vi.fn(async () => [{ id: "issue-1", title: "Fix login" }]),
  },
}));

describe("runSession", () => {
  it("runs a full session from pending to completed and creates issues", async () => {
    const { runSession } = await import("../src/engine.js");

    const sessions = new Map<string, CouncilSession>();

    const mockStore = {
      getSession: vi.fn(async (id: string) => sessions.get(id) ?? null),
      updateSession: vi.fn(async (id: string, _: string, patch: Partial<CouncilSession>) => {
        const existing = sessions.get(id)!;
        const updated = { ...existing, ...patch };
        sessions.set(id, updated);
        return updated;
      }),
      appendTranscriptEntry: vi.fn(),
      getOrDefaultConfig: vi.fn(async (): Promise<CouncilConfig> => ({
        companyId: "co-1",
        enabledSessionTypes: ["full_council"],
        defaultSessionTypeId: "full_council",
        invocationMode: "parallel",
        resolutionMode: "orchestrator",
        agenda: {
          prompts: ["What needs doing?"],
          perAgent: {},
          outputConstraints: { minIssues: 1, maxIssues: 5 },
        },
        participants: {
          full_council: [
            { agentId: "ag-1", role: "member" },
            { agentId: "ag-2", role: "orchestrator" },
          ],
        },
      })),
    };

    const initialSession: CouncilSession = {
      id: "session-1",
      companyId: "co-1",
      sessionTypeId: "full_council",
      status: "pending",
      invocationMode: "parallel",
      resolutionMode: "orchestrator",
      context: {},
      transcript: [],
      decision: null,
      issuesCreated: [],
      triggeredBy: "manual",
      startedAt: null,
      completedAt: null,
      createdAt: new Date().toISOString(),
    };
    sessions.set("session-1", initialSession);

    const mockCtx = {
      agents: {
        get: vi.fn(async (id: string) => ({
          id,
          name: id === "ag-1" ? "Chef" : "DonDog",
          role: "executor",
          status: "active",
        })),
        list: vi.fn(async () => []),
      },
      activity: {
        log: vi.fn(async () => undefined),
      },
      streams: {
        open: vi.fn(),
        emit: vi.fn(),
        close: vi.fn(),
      },
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
      },
    };

    await runSession("session-1", "co-1", mockStore as never, mockCtx as never);

    // Session should be completed
    const finalSession = sessions.get("session-1")!;
    expect(finalSession.status).toBe("completed");
    expect(finalSession.issuesCreated).toContain("issue-1");
    expect(mockCtx.activity.log).toHaveBeenCalled();
  });
});
