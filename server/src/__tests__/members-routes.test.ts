/**
 * Integration tests for Workspace Member Management API (DON-387)
 *
 * Tests:
 * - Role permission matrix correctness
 * - Member CRUD endpoints
 * - Role change validation (hierarchy enforcement)
 * - Ownership transfer
 * - Self-protection (can't remove/change self)
 * - Last owner protection
 * - Viewer/member/admin/owner permission boundaries
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  ROLE_PERMISSIONS,
  getPermissionsForRole,
  roleHasPermission,
  getAssignableRoles,
  WORKSPACE_ROLES,
  ROLE_RANK,
  type WorkspaceRole,
} from "@doerai/shared";

// ─── Permission Matrix Tests ────────────────────────────────

describe("Workspace Role Permission Matrix", () => {
  describe("Owner permissions", () => {
    const ownerPerms = ROLE_PERMISSIONS.owner;

    it("has all permission keys", () => {
      // Owner should have every permission
      expect(ownerPerms.length).toBeGreaterThan(30);
    });

    it("can delete workspace", () => {
      expect(roleHasPermission("owner", "workspace:delete")).toBe(true);
    });

    it("can transfer ownership", () => {
      expect(roleHasPermission("owner", "workspace:transfer_ownership")).toBe(true);
    });

    it("can manage billing", () => {
      expect(roleHasPermission("owner", "billing:manage")).toBe(true);
    });

    it("can create agents", () => {
      expect(roleHasPermission("owner", "agents:create")).toBe(true);
    });

    it("can delete agents", () => {
      expect(roleHasPermission("owner", "agents:delete")).toBe(true);
    });

    it("can invite users", () => {
      expect(roleHasPermission("owner", "users:invite")).toBe(true);
    });

    it("can remove users", () => {
      expect(roleHasPermission("owner", "users:remove")).toBe(true);
    });
  });

  describe("Admin permissions", () => {
    const adminPerms = ROLE_PERMISSIONS.admin;

    it("can create agents", () => {
      expect(roleHasPermission("admin", "agents:create")).toBe(true);
    });

    it("can delete agents", () => {
      expect(roleHasPermission("admin", "agents:delete")).toBe(true);
    });

    it("can create projects", () => {
      expect(roleHasPermission("admin", "projects:create")).toBe(true);
    });

    it("can invite users", () => {
      expect(roleHasPermission("admin", "users:invite")).toBe(true);
    });

    it("can remove users", () => {
      expect(roleHasPermission("admin", "users:remove")).toBe(true);
    });

    it("cannot delete workspace", () => {
      expect(roleHasPermission("admin", "workspace:delete")).toBe(false);
    });

    it("cannot transfer ownership", () => {
      expect(roleHasPermission("admin", "workspace:transfer_ownership")).toBe(false);
    });

    it("cannot manage billing", () => {
      expect(roleHasPermission("admin", "billing:manage")).toBe(false);
    });
  });

  describe("Member permissions", () => {
    it("can create agents", () => {
      expect(roleHasPermission("member", "agents:create")).toBe(true);
    });

    it("can update agents", () => {
      expect(roleHasPermission("member", "agents:update")).toBe(true);
    });

    it("cannot delete agents", () => {
      expect(roleHasPermission("member", "agents:delete")).toBe(false);
    });

    it("can create tasks", () => {
      expect(roleHasPermission("member", "tasks:create")).toBe(true);
    });

    it("can comment on tasks", () => {
      expect(roleHasPermission("member", "tasks:comment")).toBe(true);
    });

    it("cannot invite users", () => {
      expect(roleHasPermission("member", "users:invite")).toBe(false);
    });

    it("cannot remove users", () => {
      expect(roleHasPermission("member", "users:remove")).toBe(false);
    });

    it("cannot delete workspace", () => {
      expect(roleHasPermission("member", "workspace:delete")).toBe(false);
    });

    it("cannot manage billing", () => {
      expect(roleHasPermission("member", "billing:manage")).toBe(false);
    });

    it("can view members", () => {
      expect(roleHasPermission("member", "workspace:view_members")).toBe(true);
    });
  });

  describe("Viewer permissions", () => {
    it("can view agents", () => {
      expect(roleHasPermission("viewer", "agents:view")).toBe(true);
    });

    it("can view projects", () => {
      expect(roleHasPermission("viewer", "projects:view")).toBe(true);
    });

    it("cannot create agents", () => {
      expect(roleHasPermission("viewer", "agents:create")).toBe(false);
    });

    it("cannot create tasks", () => {
      expect(roleHasPermission("viewer", "tasks:create")).toBe(false);
    });

    it("cannot update tasks", () => {
      expect(roleHasPermission("viewer", "tasks:update")).toBe(false);
    });

    it("cannot delete tasks", () => {
      expect(roleHasPermission("viewer", "tasks:delete")).toBe(false);
    });

    it("cannot comment on tasks", () => {
      expect(roleHasPermission("viewer", "tasks:comment")).toBe(false);
    });

    it("cannot invite users", () => {
      expect(roleHasPermission("viewer", "users:invite")).toBe(false);
    });
  });
});

// ─── Role Hierarchy Tests ────────────────────────────────────

describe("Role Hierarchy", () => {
  it("ranks owner > admin > member > viewer", () => {
    expect(ROLE_RANK.owner).toBe(4);
    expect(ROLE_RANK.admin).toBe(3);
    expect(ROLE_RANK.member).toBe(2);
    expect(ROLE_RANK.viewer).toBe(1);
    expect(ROLE_RANK.owner).toBeGreaterThan(ROLE_RANK.admin);
    expect(ROLE_RANK.admin).toBeGreaterThan(ROLE_RANK.member);
    expect(ROLE_RANK.member).toBeGreaterThan(ROLE_RANK.viewer);
  });

  it("all four workspace roles exist", () => {
    expect(WORKSPACE_ROLES).toEqual(["owner", "admin", "member", "viewer"]);
  });
});

// ─── Assignable Roles Tests ──────────────────────────────────

describe("Assignable Roles", () => {
  it("owner can assign admin, member, viewer", () => {
    expect(getAssignableRoles("owner").sort()).toEqual(["admin", "member", "viewer"]);
  });

  it("admin can assign member, viewer", () => {
    expect(getAssignableRoles("admin").sort()).toEqual(["member", "viewer"]);
  });

  it("member cannot assign roles", () => {
    expect(getAssignableRoles("member")).toEqual([]);
  });

  it("viewer cannot assign roles", () => {
    expect(getAssignableRoles("viewer")).toEqual([]);
  });
});

// ─── getPermissionsForRole Tests ─────────────────────────────

describe("getPermissionsForRole", () => {
  it("returns non-empty array for owner", () => {
    expect(getPermissionsForRole("owner").length).toBeGreaterThan(0);
  });

  it("returns non-empty array for admin", () => {
    expect(getPermissionsForRole("admin").length).toBeGreaterThan(0);
  });

  it("returns non-empty array for member", () => {
    expect(getPermissionsForRole("member").length).toBeGreaterThan(0);
  });

  it("returns non-empty array for viewer", () => {
    expect(getPermissionsForRole("viewer").length).toBeGreaterThan(0);
  });

  it("owner has strictly more permissions than admin", () => {
    expect(getPermissionsForRole("owner").length).toBeGreaterThan(
      getPermissionsForRole("admin").length,
    );
  });

  it("admin has strictly more permissions than member", () => {
    expect(getPermissionsForRole("admin").length).toBeGreaterThan(
      getPermissionsForRole("member").length,
    );
  });

  it("member has strictly more permissions than viewer", () => {
    expect(getPermissionsForRole("member").length).toBeGreaterThan(
      getPermissionsForRole("viewer").length,
    );
  });
});

// ─── Role Templates Tests ───────────────────────────────────

describe("Workspace Role Templates", () => {
  it("includes workspace hierarchy roles", async () => {
    const { ROLE_TEMPLATES, getRoleTemplate } = await import("@doerai/shared");
    const workspaceRoleNames = ["owner", "admin", "member", "viewer"];
    for (const name of workspaceRoleNames) {
      const template = getRoleTemplate(name);
      expect(template, `Role template "${name}" should exist`).not.toBeNull();
      expect(template!.permissions.length).toBeGreaterThan(0);
    }
  });

  it("owner template has more permissions than admin template", async () => {
    const { getRoleTemplate } = await import("@doerai/shared");
    const owner = getRoleTemplate("owner")!;
    const admin = getRoleTemplate("admin")!;
    expect(owner.permissions.length).toBeGreaterThan(admin.permissions.length);
  });
});

// ─── Member Route Integration Tests ─────────────────────────
// These test the route handlers with mocked services

import express from "express";
import request from "supertest";

// Mock access service
const mockAccess = {
  getMemberRole: vi.fn(),
  changeMemberRole: vi.fn(),
  removeMember: vi.fn(),
  transferOwnership: vi.fn(),
  getOwnerCount: vi.fn(),
  listMembersWithRoles: vi.fn(),
  getMembership: vi.fn(),
  ensureMembership: vi.fn(),
  setPrincipalGrants: vi.fn(),
  canUser: vi.fn(),
};

vi.mock("../services/access.js", () => ({
  accessService: () => mockAccess,
}));

vi.mock("../services/index.js", () => ({
  accessService: () => mockAccess,
  logActivity: vi.fn().mockResolvedValue(undefined),
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
  getActorInfo: (req: any) => ({
    actorType: "user",
    actorId: req.actor?.userId ?? "board",
    agentId: null,
    runId: null,
  }),
}));

const { memberRoutes } = await import("../routes/members.js");

function createTestApp(actor: any) {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.actor = actor;
    next();
  });
  app.use(memberRoutes({} as any));
  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(err.status || 500).json({ error: err.message });
  });
  return app;
}

const OWNER = {
  type: "board" as const,
  userId: "owner-1",
  companyIds: ["ws-1"],
  isInstanceAdmin: false,
  source: "session" as const,
};

const ADMIN = {
  type: "board" as const,
  userId: "admin-1",
  companyIds: ["ws-1"],
  isInstanceAdmin: false,
  source: "session" as const,
};

const MEMBER = {
  type: "board" as const,
  userId: "member-1",
  companyIds: ["ws-1"],
  isInstanceAdmin: false,
  source: "session" as const,
};

const VIEWER = {
  type: "board" as const,
  userId: "viewer-1",
  companyIds: ["ws-1"],
  isInstanceAdmin: false,
  source: "session" as const,
};

describe("Member Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /workspaces/:wsId/members", () => {
    it("returns member list for board users", async () => {
      mockAccess.canUser.mockResolvedValue(true);
      mockAccess.listMembersWithRoles.mockResolvedValue([
        {
          id: "m1",
          companyId: "ws-1",
          principalType: "user",
          principalId: "user-1",
          status: "active",
          role: "owner",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const app = createTestApp(OWNER);
      const res = await request(app).get("/workspaces/ws-1/members");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].userId).toBe("user-1");
      expect(res.body[0].role).toBe("owner");
    });
  });

  describe("POST /workspaces/:wsId/members", () => {
    it("allows admin to add a member", async () => {
      mockAccess.getMemberRole.mockResolvedValue("admin");
      mockAccess.getMembership.mockResolvedValue(null);
      mockAccess.ensureMembership.mockResolvedValue({
        id: "m2",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockAccess.setPrincipalGrants.mockResolvedValue(undefined);

      const app = createTestApp(ADMIN);
      const res = await request(app)
        .post("/workspaces/ws-1/members")
        .send({ userId: "new-user", role: "member" });

      expect(res.status).toBe(201);
      expect(res.body.userId).toBe("new-user");
      expect(res.body.role).toBe("member");
    });

    it("rejects viewer from adding members", async () => {
      mockAccess.getMemberRole.mockResolvedValue("viewer");

      const app = createTestApp(VIEWER);
      const res = await request(app)
        .post("/workspaces/ws-1/members")
        .send({ userId: "new-user", role: "member" });

      expect(res.status).toBe(403);
    });

    it("rejects adding existing member", async () => {
      mockAccess.getMemberRole.mockResolvedValue("admin");
      mockAccess.getMembership.mockResolvedValue({
        id: "m1",
        status: "active",
        principalId: "existing-user",
      });

      const app = createTestApp(ADMIN);
      const res = await request(app)
        .post("/workspaces/ws-1/members")
        .send({ userId: "existing-user", role: "member" });

      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /workspaces/:wsId/members/:userId", () => {
    it("allows owner to change member role", async () => {
      mockAccess.getMemberRole.mockResolvedValue("owner");
      mockAccess.getMembership.mockResolvedValue({
        id: "m1",
        status: "active",
        membershipRole: "member",
        principalId: "member-1",
      });
      mockAccess.changeMemberRole.mockResolvedValue({
        id: "m1",
        status: "active",
        updatedAt: new Date(),
      });

      const app = createTestApp(OWNER);
      const res = await request(app)
        .patch("/workspaces/ws-1/members/member-1")
        .send({ role: "admin" });

      expect(res.status).toBe(200);
      expect(res.body.role).toBe("admin");
    });

    it("prevents admin from promoting to admin", async () => {
      mockAccess.getMemberRole.mockResolvedValue("admin");
      mockAccess.getMembership.mockResolvedValue({
        id: "m1",
        status: "active",
        membershipRole: "member",
        principalId: "member-1",
      });

      const app = createTestApp(ADMIN);
      const res = await request(app)
        .patch("/workspaces/ws-1/members/member-1")
        .send({ role: "admin" });

      expect(res.status).toBe(403);
    });

    it("prevents changing own role", async () => {
      mockAccess.getMemberRole.mockResolvedValue("admin");
      mockAccess.getMembership.mockResolvedValue({
        id: "m1",
        status: "active",
        membershipRole: "admin",
        principalId: "admin-1",
      });

      const app = createTestApp(ADMIN);
      const res = await request(app)
        .patch("/workspaces/ws-1/members/admin-1")
        .send({ role: "member" });

      expect(res.status).toBe(400);
    });

    it("prevents using PATCH to set owner role", async () => {
      mockAccess.getMemberRole.mockResolvedValue("owner");
      mockAccess.getMembership.mockResolvedValue({
        id: "m1",
        status: "active",
        membershipRole: "admin",
        principalId: "admin-1",
      });

      const app = createTestApp(OWNER);
      const res = await request(app)
        .patch("/workspaces/ws-1/members/admin-1")
        .send({ role: "owner" });

      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /workspaces/:wsId/members/:userId", () => {
    it("allows admin to remove a member", async () => {
      mockAccess.getMemberRole.mockResolvedValue("admin");
      mockAccess.getMembership.mockResolvedValue({
        id: "m1",
        status: "active",
        membershipRole: "member",
        principalId: "member-1",
      });
      mockAccess.removeMember.mockResolvedValue({
        id: "m1",
        status: "removed",
      });

      const app = createTestApp(ADMIN);
      const res = await request(app).delete("/workspaces/ws-1/members/member-1");

      expect(res.status).toBe(204);
    });

    it("prevents removing self", async () => {
      mockAccess.getMemberRole.mockResolvedValue("admin");
      mockAccess.getMembership.mockResolvedValue({
        id: "m1",
        status: "active",
        membershipRole: "admin",
        principalId: "admin-1",
      });

      const app = createTestApp(ADMIN);
      const res = await request(app).delete("/workspaces/ws-1/members/admin-1");

      expect(res.status).toBe(400);
    });

    it("prevents admin from removing another admin", async () => {
      mockAccess.getMemberRole.mockResolvedValue("admin");
      mockAccess.getMembership.mockResolvedValue({
        id: "m1",
        status: "active",
        membershipRole: "admin",
        principalId: "admin-2",
      });

      const app = createTestApp(ADMIN);
      const res = await request(app).delete("/workspaces/ws-1/members/admin-2");

      expect(res.status).toBe(403);
    });

    it("prevents removing last owner", async () => {
      mockAccess.getMemberRole.mockResolvedValue("owner");
      mockAccess.getMembership.mockResolvedValue({
        id: "m1",
        status: "active",
        membershipRole: "owner",
        principalId: "owner-2",
      });
      mockAccess.getOwnerCount.mockResolvedValue(1);

      const app = createTestApp(OWNER);
      const res = await request(app).delete("/workspaces/ws-1/members/owner-2");

      expect(res.status).toBe(400);
    });
  });

  describe("POST /workspaces/:wsId/transfer-ownership", () => {
    it("allows owner to transfer ownership", async () => {
      mockAccess.getMemberRole.mockResolvedValue("owner");
      mockAccess.getMembership.mockResolvedValue({
        id: "m1",
        status: "active",
        membershipRole: "admin",
        principalId: "admin-1",
      });
      mockAccess.transferOwnership.mockResolvedValue({
        oldOwner: { id: "m0", status: "active" },
        newOwner: { id: "m1", status: "active" },
      });

      const app = createTestApp(OWNER);
      const res = await request(app)
        .post("/workspaces/ws-1/transfer-ownership")
        .send({ newOwnerUserId: "admin-1" });

      expect(res.status).toBe(200);
      expect(res.body.newOwner.role).toBe("owner");
      expect(res.body.previousOwner.role).toBe("admin");
    });

    it("prevents admin from transferring ownership", async () => {
      mockAccess.getMemberRole.mockResolvedValue("admin");

      const app = createTestApp(ADMIN);
      const res = await request(app)
        .post("/workspaces/ws-1/transfer-ownership")
        .send({ newOwnerUserId: "member-1" });

      expect(res.status).toBe(403);
    });

    it("prevents transferring to self", async () => {
      mockAccess.getMemberRole.mockResolvedValue("owner");

      const app = createTestApp(OWNER);
      const res = await request(app)
        .post("/workspaces/ws-1/transfer-ownership")
        .send({ newOwnerUserId: "owner-1" });

      expect(res.status).toBe(400);
    });

    it("prevents transferring to non-member", async () => {
      mockAccess.getMemberRole.mockResolvedValue("owner");
      mockAccess.getMembership.mockResolvedValue(null);

      const app = createTestApp(OWNER);
      const res = await request(app)
        .post("/workspaces/ws-1/transfer-ownership")
        .send({ newOwnerUserId: "non-member" });

      expect(res.status).toBe(404);
    });
  });
});
