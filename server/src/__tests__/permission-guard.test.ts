/**
 * Integration tests for RBAC permission guard middleware.
 *
 * Tests role boundary conditions:
 * - Viewer cannot create agents
 * - Member without permission cannot invite users
 * - Instance admin bypasses all checks
 * - Local implicit bypasses all checks
 * - Agent actors are checked via hasPermission
 * - Unauthenticated requests are rejected
 * - AND/OR permission logic works correctly
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import express from "express";
import {
  ROLE_TEMPLATES,
  applyRoleTemplate,
  mergeRoles,
  isValidRole,
  listRoleTemplates,
  getRoleTemplate,
} from "@doerai/shared";
import request from "supertest";

// Mock the accessService factory
const mockAccess = {
  canUser: vi.fn(),
  hasPermission: vi.fn(),
};

vi.mock("../services/access.js", () => ({
  accessService: () => mockAccess,
}));

vi.mock("../routes/authz.js", () => ({
  assertBoard: (req: any) => {
    if (!req.actor || req.actor.type !== "board") {
      const err = new Error("Board access required");
      (err as any).status = 403;
      throw err;
    }
  },
  assertCompanyAccess: vi.fn(),
}));

// Import after mocks are set up
const { requirePermission, requireBoard, requireInstanceAdmin, requireAllPermissions, requireAnyPermission } =
  await import("../middleware/permission-guard.js");

// ─── Test helpers ───────────────────────────────────────────

function createApp(
  middleware: express.RequestHandler,
  actorSetup: (req: express.Request) => void,
  route = "/test/:companyId/resource",
) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    actorSetup(req);
    next();
  });
  // Mount middleware on the route so req.params is populated
  app.post(route, middleware, (_req, res) => {
    res.status(200).json({ ok: true });
  });
  // Error handler
  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(err.status || 500).json({ error: err.message });
  });
  return app;
}

const BOARD_USER = {
  type: "board" as const,
  userId: "user-1",
  companyIds: ["company-1"],
  isInstanceAdmin: false,
  source: "session" as const,
};

const INSTANCE_ADMIN = {
  type: "board" as const,
  userId: "admin-1",
  companyIds: ["company-1"],
  isInstanceAdmin: true,
  source: "session" as const,
};

const LOCAL_IMPLICIT = {
  type: "board" as const,
  userId: "local-board",
  isInstanceAdmin: true,
  source: "local_implicit" as const,
};

const AGENT_ACTOR = {
  type: "agent" as const,
  agentId: "agent-1",
  companyId: "company-1",
  source: "agent_key" as const,
};

const UNAUTHENTICATED = {
  type: "none" as const,
  source: "none" as const,
};

// ─── requirePermission tests ───────────────────────────────

describe("requirePermission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows board user with the required permission", async () => {
    mockAccess.canUser.mockResolvedValue(true);
    const app = createApp(
      requirePermission({} as any, "agents:create"),
      (req) => { req.actor = { ...BOARD_USER }; },
    );

    const res = await request(app).post("/test/company-1/resource").send({});

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(mockAccess.canUser).toHaveBeenCalledWith("company-1", "user-1", "agents:create");
  });

  it("blocks board user without the required permission (403)", async () => {
    mockAccess.canUser.mockResolvedValue(false);
    const app = createApp(
      requirePermission({} as any, "agents:create"),
      (req) => { req.actor = { ...BOARD_USER }; },
    );

    const res = await request(app).post("/test/company-1/resource").send({});

    expect(res.status).toBe(403);
    expect(res.body.error).toContain("agents:create");
  });

  it("allows instance admin to bypass permission checks", async () => {
    const app = createApp(
      requirePermission({} as any, "agents:create"),
      (req) => { req.actor = { ...INSTANCE_ADMIN }; },
    );

    const res = await request(app).post("/test/company-1/resource").send({});

    expect(res.status).toBe(200);
    expect(mockAccess.canUser).not.toHaveBeenCalled();
  });

  it("allows local_implicit to bypass permission checks", async () => {
    const app = createApp(
      requirePermission({} as any, "agents:create"),
      (req) => { req.actor = { ...LOCAL_IMPLICIT }; },
    );

    const res = await request(app).post("/test/company-1/resource").send({});

    expect(res.status).toBe(200);
    expect(mockAccess.canUser).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated requests (401)", async () => {
    const app = createApp(
      requirePermission({} as any, "agents:create"),
      (req) => { req.actor = { ...UNAUTHENTICATED }; },
    );

    const res = await request(app).post("/test/company-1/resource").send({});

    expect(res.status).toBe(401);
  });

  it("checks agent permissions via hasPermission when allowAgentSelf is true", async () => {
    mockAccess.hasPermission.mockResolvedValue(true);
    const app = createApp(
      requirePermission({} as any, "tasks:assign", { allowAgentSelf: true }),
      (req) => { req.actor = { ...AGENT_ACTOR }; },
    );

    const res = await request(app).post("/test/company-1/resource").send({});

    expect(res.status).toBe(200);
    expect(mockAccess.hasPermission).toHaveBeenCalledWith(
      "company-1", "agent", "agent-1", "tasks:assign",
    );
  });

  it("blocks agent without permission (403)", async () => {
    mockAccess.hasPermission.mockResolvedValue(false);
    const app = createApp(
      requirePermission({} as any, "tasks:assign", { allowAgentSelf: true }),
      (req) => { req.actor = { ...AGENT_ACTOR }; },
    );

    const res = await request(app).post("/test/company-1/resource").send({});

    expect(res.status).toBe(403);
    expect(res.body.error).toContain("tasks:assign");
  });

  it("blocks agent from accessing another company's resources", async () => {
    const app = createApp(
      requirePermission({} as any, "agents:create"),
      (req) => { req.actor = { ...AGENT_ACTOR }; },
    );

    const res = await request(app).post("/test/company-OTHER/resource").send({});

    expect(res.status).toBe(403);
    expect(res.body.error).toContain("another company");
  });

  it("extracts companyId from request body when not in params", async () => {
    mockAccess.canUser.mockResolvedValue(true);
    const app = createApp(
      requirePermission({} as any, "agents:create"),
      (req) => { req.actor = { ...BOARD_USER, companyId: "company-from-body" }; },
      "/test/resource",
    );

    const res = await request(app).post("/test/resource").send({ companyId: "company-from-body" });

    expect(res.status).toBe(200);
    expect(mockAccess.canUser).toHaveBeenCalledWith("company-from-body", "user-1", "agents:create");
  });

  it("returns 403 when companyId cannot be determined", async () => {
    const app = createApp(
      requirePermission({} as any, "agents:create"),
      (req) => { req.actor = { ...BOARD_USER }; },
      "/test/resource",
    );

    const res = await request(app).post("/test/resource").send({});

    expect(res.status).toBe(403);
    expect(res.body.error).toContain("Cannot determine company");
  });

  // ─── Role boundary scenarios ─────────────────────────────

  it("Viewer role: cannot create agents (no agents:create permission)", async () => {
    mockAccess.canUser.mockResolvedValue(false);
    const app = createApp(
      requirePermission({} as any, "agents:create"),
      (req) => { req.actor = { ...BOARD_USER, userId: "viewer-user" }; },
    );

    const res = await request(app).post("/test/company-1/resource").send({});
    expect(res.status).toBe(403);
  });

  it("Engineer role: can create agents (has agents:create)", async () => {
    mockAccess.canUser.mockResolvedValue(true);
    const app = createApp(
      requirePermission({} as any, "agents:create"),
      (req) => { req.actor = { ...BOARD_USER, userId: "engineer-user" }; },
    );

    const res = await request(app).post("/test/company-1/resource").send({});
    expect(res.status).toBe(200);
  });

  it("Engineer role: cannot manage permissions (no users:manage_permissions)", async () => {
    mockAccess.canUser.mockResolvedValue(false);
    const app = createApp(
      requirePermission({} as any, "users:manage_permissions"),
      (req) => { req.actor = { ...BOARD_USER, userId: "engineer-user" }; },
    );

    const res = await request(app).post("/test/company-1/resource").send({});
    expect(res.status).toBe(403);
  });

  it("PM role: can assign tasks but cannot create agents", async () => {
    // tasks:assign → true
    mockAccess.canUser.mockResolvedValue(true);
    const appAssign = createApp(
      requirePermission({} as any, "tasks:assign"),
      (req) => { req.actor = { ...BOARD_USER, userId: "pm-user" }; },
    );
    const resAssign = await request(appAssign).post("/test/company-1/resource").send({});
    expect(resAssign.status).toBe(200);

    // agents:create → false
    mockAccess.canUser.mockResolvedValue(false);
    const appCreate = createApp(
      requirePermission({} as any, "agents:create"),
      (req) => { req.actor = { ...BOARD_USER, userId: "pm-user" }; },
    );
    const resCreate = await request(appCreate).post("/test/company-1/resource").send({});
    expect(resCreate.status).toBe(403);
  });

  it("CEO role: can approve joins (has joins:approve)", async () => {
    mockAccess.canUser.mockResolvedValue(true);
    const app = createApp(
      requirePermission({} as any, "joins:approve"),
      (req) => { req.actor = { ...BOARD_USER, userId: "ceo-user" }; },
    );
    const res = await request(app).post("/test/company-1/resource").send({});
    expect(res.status).toBe(200);
  });

  it("General member: cannot approve joins (no joins:approve)", async () => {
    mockAccess.canUser.mockResolvedValue(false);
    const app = createApp(
      requirePermission({} as any, "joins:approve"),
      (req) => { req.actor = { ...BOARD_USER, userId: "general-user" }; },
    );
    const res = await request(app).post("/test/company-1/resource").send({});
    expect(res.status).toBe(403);
  });
});

// ─── requireBoard tests ────────────────────────────────────

describe("requireBoard", () => {
  it("allows board users", async () => {
    const app = createApp(
      requireBoard({} as any),
      (req) => { req.actor = { ...BOARD_USER }; },
    );
    const res = await request(app).post("/test/company-1/resource").send({});
    expect(res.status).toBe(200);
  });

  it("rejects agent actors (403)", async () => {
    const app = createApp(
      requireBoard({} as any),
      (req) => { req.actor = { ...AGENT_ACTOR }; },
    );
    const res = await request(app).post("/test/company-1/resource").send({});
    expect(res.status).toBe(403);
    expect(res.body.error).toContain("Board access required");
  });

  it("rejects unauthenticated (403)", async () => {
    const app = createApp(
      requireBoard({} as any),
      (req) => { req.actor = { ...UNAUTHENTICATED }; },
    );
    const res = await request(app).post("/test/company-1/resource").send({});
    expect(res.status).toBe(403);
  });
});

// ─── requireInstanceAdmin tests ────────────────────────────

describe("requireInstanceAdmin", () => {
  it("allows instance admins", async () => {
    const app = createApp(
      requireInstanceAdmin({} as any),
      (req) => { req.actor = { ...INSTANCE_ADMIN }; },
    );
    const res = await request(app).post("/test/company-1/resource").send({});
    expect(res.status).toBe(200);
  });

  it("allows local_implicit", async () => {
    const app = createApp(
      requireInstanceAdmin({} as any),
      (req) => { req.actor = { ...LOCAL_IMPLICIT }; },
    );
    const res = await request(app).post("/test/company-1/resource").send({});
    expect(res.status).toBe(200);
  });

  it("rejects non-admin board users (403)", async () => {
    const app = createApp(
      requireInstanceAdmin({} as any),
      (req) => { req.actor = { ...BOARD_USER, isInstanceAdmin: false }; },
    );
    const res = await request(app).post("/test/company-1/resource").send({});
    expect(res.status).toBe(403);
    expect(res.body.error).toContain("Instance admin");
  });

  it("rejects agent actors (403)", async () => {
    const app = createApp(
      requireInstanceAdmin({} as any),
      (req) => { req.actor = { ...AGENT_ACTOR }; },
    );
    const res = await request(app).post("/test/company-1/resource").send({});
    expect(res.status).toBe(403);
  });
});

// ─── requireAllPermissions tests (AND logic) ──────────────

describe("requireAllPermissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows when user has ALL required permissions", async () => {
    mockAccess.canUser.mockResolvedValue(true);
    const app = createApp(
      requireAllPermissions({} as any, ["agents:create", "tasks:assign"]),
      (req) => { req.actor = { ...BOARD_USER }; },
    );
    const res = await request(app).post("/test/company-1/resource").send({});
    expect(res.status).toBe(200);
    expect(mockAccess.canUser).toHaveBeenCalledTimes(2);
  });

  it("blocks when user is missing one of the required permissions", async () => {
    mockAccess.canUser
      .mockResolvedValueOnce(true)   // agents:create → pass
      .mockResolvedValueOnce(false); // tasks:assign → fail
    const app = createApp(
      requireAllPermissions({} as any, ["agents:create", "tasks:assign"]),
      (req) => { req.actor = { ...BOARD_USER }; },
    );
    const res = await request(app).post("/test/company-1/resource").send({});
    expect(res.status).toBe(403);
    expect(res.body.error).toContain("tasks:assign");
  });

  it("instance admin bypasses all checks", async () => {
    const app = createApp(
      requireAllPermissions({} as any, ["agents:create", "tasks:assign", "users:invite"]),
      (req) => { req.actor = { ...INSTANCE_ADMIN }; },
    );
    const res = await request(app).post("/test/company-1/resource").send({});
    expect(res.status).toBe(200);
    expect(mockAccess.canUser).not.toHaveBeenCalled();
  });
});

// ─── requireAnyPermission tests (OR logic) ─────────────────

describe("requireAnyPermission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows when user has ANY one of the required permissions", async () => {
    mockAccess.canUser
      .mockResolvedValueOnce(false) // agents:create → fail
      .mockResolvedValueOnce(true);  // tasks:assign → pass
    const app = createApp(
      requireAnyPermission({} as any, ["agents:create", "tasks:assign"]),
      (req) => { req.actor = { ...BOARD_USER }; },
    );
    const res = await request(app).post("/test/company-1/resource").send({});
    expect(res.status).toBe(200);
  });

  it("blocks when user has NONE of the required permissions", async () => {
    mockAccess.canUser.mockResolvedValue(false);
    const app = createApp(
      requireAnyPermission({} as any, ["agents:create", "tasks:assign"]),
      (req) => { req.actor = { ...BOARD_USER }; },
    );
    const res = await request(app).post("/test/company-1/resource").send({});
    expect(res.status).toBe(403);
    expect(res.body.error).toContain("agents:create");
    expect(res.body.error).toContain("tasks:assign");
  });

  it("instance admin bypasses all checks", async () => {
    const app = createApp(
      requireAnyPermission({} as any, ["agents:create", "tasks:assign"]),
      (req) => { req.actor = { ...INSTANCE_ADMIN }; },
    );
    const res = await request(app).post("/test/company-1/resource").send({});
    expect(res.status).toBe(200);
    expect(mockAccess.canUser).not.toHaveBeenCalled();
  });
});

// ─── Role template unit tests ──────────────────────────────

describe("role templates", () => {

  it("CEO template has all 6 permissions", () => {
    const grants = applyRoleTemplate("ceo");
    expect(grants).toHaveLength(6);
    expect(grants.map((g) => g.permissionKey)).toContain("agents:create");
    expect(grants.map((g) => g.permissionKey)).toContain("users:invite");
    expect(grants.map((g) => g.permissionKey)).toContain("users:manage_permissions");
    expect(grants.map((g) => g.permissionKey)).toContain("tasks:assign");
    expect(grants.map((g) => g.permissionKey)).toContain("tasks:assign_scope");
    expect(grants.map((g) => g.permissionKey)).toContain("joins:approve");
  });

  it("Viewer template has view-only permissions", () => {
    const grants = applyRoleTemplate("viewer");
    expect(grants.length).toBeGreaterThan(0);
    expect(grants.map((g) => g.permissionKey)).toContain("agents:view");
    expect(grants.map((g) => g.permissionKey)).toContain("projects:view");
    expect(grants.map((g) => g.permissionKey)).toContain("workspace:view_members");
  });

  it("Engineer template has agents:create and tasks:assign only", () => {
    const grants = applyRoleTemplate("engineer");
    expect(grants).toHaveLength(2);
    expect(grants.map((g) => g.permissionKey)).toEqual(
      expect.arrayContaining(["agents:create", "tasks:assign"]),
    );
  });

  it("PM template has tasks:assign and tasks:assign_scope but NOT agents:create", () => {
    const grants = applyRoleTemplate("project_manager");
    const keys = grants.map((g) => g.permissionKey);
    expect(keys).toContain("tasks:assign");
    expect(keys).toContain("tasks:assign_scope");
    expect(keys).not.toContain("agents:create");
  });

  it("mergeRoles combines permissions from multiple roles without duplicates", () => {
    const grants = mergeRoles("researcher", "project_manager");
    const keys = grants.map((g) => g.permissionKey);
    expect(keys).toContain("agents:create");
    expect(keys).toContain("tasks:assign");
    expect(keys).toContain("tasks:assign_scope");
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("isValidRole returns true for known roles", () => {
    expect(isValidRole("ceo")).toBe(true);
    expect(isValidRole("viewer")).toBe(true);
    expect(isValidRole("agent_default")).toBe(true);
  });

  it("isValidRole returns false for unknown roles", () => {
    expect(isValidRole("superadmin")).toBe(false);
    expect(isValidRole("")).toBe(false);
  });

  it("listRoleTemplates returns all 13 templates (10 original + 3 workspace hierarchy)", () => {
    const templates = listRoleTemplates();
    expect(templates).toHaveLength(13);
    expect(templates.map((t) => t.name)).toContain("ceo");
    expect(templates.map((t) => t.name)).toContain("cto");
    expect(templates.map((t) => t.name)).toContain("engineer");
    expect(templates.map((t) => t.name)).toContain("viewer");
    // Workspace hierarchy roles
    expect(templates.map((t) => t.name)).toContain("owner");
    expect(templates.map((t) => t.name)).toContain("admin");
    expect(templates.map((t) => t.name)).toContain("member");
  });

  it("getRoleTemplate returns template by name", () => {
    const template = getRoleTemplate("cto");
    expect(template).not.toBeNull();
    expect(template?.label).toBe("CTO");
    expect(template?.permissions).toContain("agents:create");
  });

  it("getRoleTemplate returns null for unknown role", () => {
    expect(getRoleTemplate("unknown")).toBeNull();
  });

  it("applyRoleTemplate throws for unknown role", () => {
    expect(() => applyRoleTemplate("unknown" as any)).toThrow("Unknown role template");
  });

  it("all grants have null scope by default", () => {
    const grants = applyRoleTemplate("devops");
    expect(grants.every((g) => g.scope === null)).toBe(true);
  });
});
