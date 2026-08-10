import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { issueRoutes } from "../routes/issues.js";
import { errorHandler } from "../middleware/index.js";

const ISSUE_ID = "11111111-1111-4111-8111-111111111111";
const AGENT_ID = "22222222-2222-4222-8222-222222222222";

const mockIssueService = vi.hoisted(() => ({
  getById: vi.fn(),
  update: vi.fn(),
  addComment: vi.fn(),
  findMentionedAgents: vi.fn(),
}));

const mockDeliverableService = vi.hoisted(() => ({
  list: vi.fn(),
}));

const mockAccessService = vi.hoisted(() => ({
  canUser: vi.fn(),
  hasPermission: vi.fn(),
}));

const mockHeartbeatService = vi.hoisted(() => ({
  wakeup: vi.fn(async () => undefined),
  reportRunActivity: vi.fn(async () => undefined),
}));

const mockAgentService = vi.hoisted(() => ({
  getById: vi.fn(),
}));

const mockLogActivity = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock("../services/index.js", () => ({
  accessService: () => mockAccessService,
  agentService: () => mockAgentService,
  deliverableService: () => mockDeliverableService,
  documentService: () => ({}),
  executionWorkspaceService: () => ({}),
  goalService: () => ({}),
  heartbeatService: () => mockHeartbeatService,
  issueApprovalService: () => ({}),
  issueService: () => mockIssueService,
  logActivity: mockLogActivity,
  projectService: () => ({}),
  routineService: () => ({
    syncRunStatusForIssue: vi.fn(async () => undefined),
  }),
  workProductService: () => ({}),
}));

const boardActor = {
  type: "board",
  userId: "local-board",
  companyIds: ["company-1"],
  source: "local_implicit",
  isInstanceAdmin: false,
};

const agentActor = {
  type: "agent",
  agentId: AGENT_ID,
  companyId: "company-1",
  source: "agent_key",
};

function createApp(actor: Record<string, unknown>) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).actor = actor;
    next();
  });
  app.use("/api", issueRoutes({} as any, {} as any));
  app.use(errorHandler);
  return app;
}

function makeIssue() {
  return {
    id: ISSUE_ID,
    companyId: "company-1",
    status: "todo",
    assigneeAgentId: AGENT_ID,
    assigneeUserId: null,
    createdByUserId: null,
    identifier: "DON-1",
    title: "Close me",
  };
}

describe("issue deliverable close gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIssueService.getById.mockResolvedValue(makeIssue());
    mockIssueService.update.mockImplementation(async (_id: string, patch: Record<string, unknown>) => ({
      ...makeIssue(),
      ...patch,
    }));
    mockIssueService.addComment.mockResolvedValue({
      id: "comment-1",
      issueId: ISSUE_ID,
      companyId: "company-1",
      body: "**Deliverable exemption:** reason",
      createdAt: new Date(),
      updatedAt: new Date(),
      authorAgentId: AGENT_ID,
      authorUserId: null,
    });
    mockIssueService.findMentionedAgents.mockResolvedValue([]);
  });

  it("allows an agent to close when a deliverable is registered", async () => {
    mockDeliverableService.list.mockResolvedValue([{ id: "deliverable-1" }]);

    const res = await request(createApp(agentActor))
      .patch(`/api/issues/${ISSUE_ID}`)
      .send({ status: "done" });

    expect(res.status).toBe(200);
    expect(mockDeliverableService.list).toHaveBeenCalledWith("company-1", {
      issueId: ISSUE_ID,
      limit: 1,
    });
    expect(mockIssueService.update).toHaveBeenCalledWith(ISSUE_ID, { status: "done" });
  });

  it("rejects an agent close with no deliverable and no exemption", async () => {
    mockDeliverableService.list.mockResolvedValue([]);

    const res = await request(createApp(agentActor))
      .patch(`/api/issues/${ISSUE_ID}`)
      .send({ status: "done" });

    expect(res.status).toBe(422);
    expect(res.body.error).toContain("no deliverable registered");
    expect(res.body.error).toContain(`/api/companies/company-1/deliverables`);
    expect(res.body.error).toContain("deliverableExemption");
    expect(mockIssueService.update).not.toHaveBeenCalled();
  });

  it("allows an agent close with an explicit exemption reason and records it", async () => {
    mockDeliverableService.list.mockResolvedValue([]);

    const res = await request(createApp(agentActor))
      .patch(`/api/issues/${ISSUE_ID}`)
      .send({ status: "done", deliverableExemption: "Research-only task, no artifact produced" });

    expect(res.status).toBe(200);
    expect(mockIssueService.update).toHaveBeenCalledWith(ISSUE_ID, { status: "done" });
    expect(mockIssueService.addComment).toHaveBeenCalledWith(
      ISSUE_ID,
      "**Deliverable exemption:** Research-only task, no artifact produced",
      expect.objectContaining({ agentId: AGENT_ID }),
    );
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: "issue.deliverable_exemption",
        entityType: "issue",
        entityId: ISSUE_ID,
        details: expect.objectContaining({
          reason: "Research-only task, no artifact produced",
        }),
      }),
    );
  });

  it("allows a board actor to close without a deliverable or exemption", async () => {
    const res = await request(createApp(boardActor))
      .patch(`/api/issues/${ISSUE_ID}`)
      .send({ status: "done" });

    expect(res.status).toBe(200);
    expect(mockDeliverableService.list).not.toHaveBeenCalled();
    expect(mockIssueService.update).toHaveBeenCalledWith(ISSUE_ID, { status: "done" });
  });
});
