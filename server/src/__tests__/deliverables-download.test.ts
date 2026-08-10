import express from "express";
import request from "supertest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockDeliverableService = vi.hoisted(() => ({
  getById: vi.fn(),
}));

vi.mock("../services/index.js", () => ({
  deliverableService: () => mockDeliverableService,
  logActivity: vi.fn(async () => undefined),
}));

const COMPANY_ID = "27b25893-0000-4000-8000-000000000001";
const FILE_BODY = "<h1>hello</h1>";

async function createApp() {
  const { deliverableRoutes } = await import("../routes/deliverables.js");
  const { errorHandler } = await import("../middleware/index.js");
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).actor = { type: "board", source: "local_implicit" };
    next();
  });
  app.use("/api", deliverableRoutes({} as any, {} as any));
  app.use(errorHandler);
  return app;
}

describe("deliverable download route", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "deliverable-download-"));
    const filePath = path.join(tmpDir, "report.html");
    await fs.writeFile(filePath, FILE_BODY);
    mockDeliverableService.getById.mockResolvedValue({
      id: "d-1",
      companyId: COMPANY_ID,
      kind: "html",
      filename: "report.html",
      contentType: "text/html; charset=utf-8",
      sizeBytes: Buffer.byteLength(FILE_BODY),
      storagePath: filePath,
      deletedAt: null,
    });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  it("defaults to attachment disposition", async () => {
    const app = await createApp();
    const res = await request(app).get("/api/deliverables/d-1/download");
    expect(res.status).toBe(200);
    expect(res.headers["content-disposition"]).toBe('attachment; filename="report.html"');
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.text).toBe(FILE_BODY);
  }, 20_000);

  it("serves inline disposition when ?inline=true so previews can render", async () => {
    const app = await createApp();
    const res = await request(app).get("/api/deliverables/d-1/download?inline=true");
    expect(res.status).toBe(200);
    expect(res.headers["content-disposition"]).toBe('inline; filename="report.html"');
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.text).toBe(FILE_BODY);
  }, 20_000);

  it("404s for missing deliverables", async () => {
    mockDeliverableService.getById.mockResolvedValue(null);
    const app = await createApp();
    const res = await request(app).get("/api/deliverables/nope/download");
    expect(res.status).toBe(404);
  }, 20_000);
});
