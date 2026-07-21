import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { conflict, unprocessable } from "../errors.js";
import { errorHandler } from "../middleware/index.js";
import { providerConnectionRoutes } from "../routes/provider-connections.js";

const mockService = vi.hoisted(() => ({
  list: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  discoverModels: vi.fn(),
  discoverAgents: vi.fn(),
  test: vi.fn(),
}));
const mockLogActivity = vi.hoisted(() => vi.fn());

vi.mock("../services/index.js", () => ({
  providerConnectionService: () => mockService,
  logActivity: mockLogActivity,
}));

function createApp(actor: Record<string, unknown> = {
  type: "board",
  userId: "board-1",
  source: "local_implicit",
}) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).actor = actor;
    next();
  });
  app.use("/api", providerConnectionRoutes({} as any));
  app.use(errorHandler);
  return app;
}

const connection = {
  id: "11111111-1111-4111-8111-111111111111",
  companyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  name: "Personal Letta",
  providerType: "letta",
  authMode: "api_key",
  secretId: "22222222-2222-4222-8222-222222222222",
  lettaBaseUrl: "https://api.letta.com",
  providerBaseUrl: null,
  isDefault: true,
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("provider connection routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockService.list.mockResolvedValue([connection]);
    mockService.getById.mockResolvedValue(connection);
    mockService.create.mockResolvedValue(connection);
    mockService.update.mockResolvedValue(connection);
    mockService.remove.mockResolvedValue(connection);
    mockService.discoverModels.mockResolvedValue([
      { id: "ollama/qwen3", label: "Qwen 3", provider: "ollama" },
    ]);
    mockService.discoverAgents.mockResolvedValue([
      { id: "agent-1", name: "DonDog", model: "ollama/qwen3" },
    ]);
    mockService.test.mockResolvedValue({ ok: true, message: "Connection succeeded" });
  });

  it("lists only the requested company's connections", async () => {
    const res = await request(createApp()).get(
      `/api/companies/${connection.companyId}/provider-connections`,
    );

    expect(res.status).toBe(200);
    expect(mockService.list).toHaveBeenCalledWith(connection.companyId);
    expect(res.body).toHaveLength(1);
  });

  it("returns 422 when the selected secret belongs to another company", async () => {
    mockService.create.mockRejectedValue(
      unprocessable("Secret must belong to same company"),
    );

    const res = await request(createApp())
      .post(`/api/companies/${connection.companyId}/provider-connections`)
      .send({
        name: "Personal Letta",
        providerType: "letta",
        authMode: "api_key",
        secretId: connection.secretId,
      });

    expect(res.status, JSON.stringify(res.body)).toBe(422);
    expect(res.body.error).toBe("Secret must belong to same company");
  });

  it("returns referencing agents when deletion is guarded", async () => {
    mockService.remove.mockRejectedValue(
      conflict("Provider connection is in use", {
        agentIds: ["agent-1"],
        agents: [{ id: "agent-1", name: "DonDog" }],
      }),
    );

    const res = await request(createApp()).delete(
      `/api/provider-connections/${connection.id}`,
    );

    expect(res.status).toBe(409);
    expect(res.body.details.agentIds).toEqual(["agent-1"]);
    expect(mockLogActivity).not.toHaveBeenCalled();
  });

  it("rejects agent callers", async () => {
    const res = await request(
      createApp({ type: "agent", agentId: "agent-1", companyId: connection.companyId }),
    ).get(`/api/companies/${connection.companyId}/provider-connections`);

    expect(res.status).toBe(403);
  });

  it("passes refresh through for live model discovery", async () => {
    const res = await request(createApp()).get(
      `/api/provider-connections/${connection.id}/models?refresh=true`,
    );

    expect(res.status).toBe(200);
    expect(mockService.discoverModels).toHaveBeenCalledWith(connection.id, true);
    expect(res.body[0].id).toBe("ollama/qwen3");
  });

  it("discovers known Letta agents and tests the connection", async () => {
    const app = createApp();
    const agentsRes = await request(app).get(
      `/api/provider-connections/${connection.id}/letta-agents`,
    );
    const testRes = await request(app).post(
      `/api/provider-connections/${connection.id}/test`,
    );

    expect(agentsRes.status).toBe(200);
    expect(agentsRes.body[0].id).toBe("agent-1");
    expect(testRes.body).toEqual({ ok: true, message: "Connection succeeded" });
  });
});
