/**
 * Workspace Member Management API (DON-387)
 *
 * Endpoints:
 *   GET    /api/workspaces/:wsId/members              — list members with roles
 *   POST   /api/workspaces/:wsId/members              — add member (invite + assign role)
 *   PATCH  /api/workspaces/:wsId/members/:userId       — change member role
 *   DELETE /api/workspaces/:wsId/members/:userId       — remove member
 *   POST   /api/workspaces/:wsId/transfer-ownership    — transfer workspace ownership
 */

import { Router } from "express";
import { z } from "zod";
import type { Db } from "@doerai/db";
import {
  WORKSPACE_ROLES,
  ROLE_RANK,
  ROLE_LABELS,
  type WorkspaceRole,
} from "@doerai/shared";
import { validate } from "../middleware/validate.js";
import { accessService, logActivity } from "../services/index.js";
import { assertBoard, assertCompanyAccess, getActorInfo } from "./authz.js";
import { forbidden, notFound, badRequest, unauthorized } from "../errors.js";
import type { Request, RequestHandler } from "express";

// ─── Validation Schemas ──────────────────────────────────────

const addMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(WORKSPACE_ROLES as unknown as [string, ...string[]]).default("member"),
});

const changeRoleSchema = z.object({
  role: z.enum(WORKSPACE_ROLES as unknown as [string, ...string[]]),
});

const transferOwnershipSchema = z.object({
  newOwnerUserId: z.string().min(1),
});

// ─── Helpers ────────────────────────────────────────────────

function isValidRole(role: string): role is WorkspaceRole {
  return (WORKSPACE_ROLES as readonly string[]).includes(role);
}

function requireMinRole(
  db: Db,
  minRole: WorkspaceRole,
): RequestHandler {
  const access = accessService(db);
  return async (req, _res, next) => {
    try {
      if (req.actor.type === "none") throw unauthorized();
      // local_implicit and instance admins bypass
      if (req.actor.type === "board" && (req.actor.source === "local_implicit" || req.actor.isInstanceAdmin)) {
        next();
        return;
      }

      const wsId = req.params.wsId as string;
      if (!wsId) throw badRequest("Workspace ID required");

      assertCompanyAccess(req, wsId);

      if (req.actor.type === "agent") {
        throw forbidden("Agents cannot manage workspace members");
      }

      assertBoard(req);
      const userRole = await access.getMemberRole(wsId, req.actor.userId ?? "");
      if (!userRole) throw forbidden("You are not a member of this workspace");

      if (ROLE_RANK[userRole] < ROLE_RANK[minRole]) {
        throw forbidden(`This action requires ${ROLE_LABELS[minRole]} role or higher`);
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

// ─── Routes ──────────────────────────────────────────────────

export function memberRoutes(db: Db) {
  const router = Router();
  const access = accessService(db);

  // GET /api/workspaces/:wsId/members — list members with roles
  router.get("/workspaces/:wsId/members", async (req, res) => {
    const wsId = req.params.wsId as string;
    assertCompanyAccess(req, wsId);

    // Check if user has permission to view members
    if (req.actor.type === "board" && req.actor.source !== "local_implicit" && !req.actor.isInstanceAdmin) {
      const canView = await access.canUser(wsId, req.actor.userId, "workspace:view_members" as any);
      if (!canView) {
        // If they're a member, they can view the member list
        const role = await access.getMemberRole(wsId, req.actor.userId ?? "");
        if (!role) throw forbidden("You are not a member of this workspace");
      }
    }

    const members = await access.listMembersWithRoles(wsId);
    res.json(
      members.map((m) => ({
        id: m.id,
        userId: m.principalId,
        role: m.role ?? "member",
        status: m.status,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      })),
    );
  });

  // POST /api/workspaces/:wsId/members — add member with role
  router.post(
    "/workspaces/:wsId/members",
    validate(addMemberSchema),
    requireMinRole(db, "admin"),
    async (req, res) => {
      const wsId = req.params.wsId as string;
      const { userId, role } = req.body as z.infer<typeof addMemberSchema>;

      if (!isValidRole(role)) {
        throw badRequest(`Invalid role: ${role}`);
      }

      // Check if user is already a member
      const existing = await access.getMembership(wsId, "user", userId);
      if (existing && existing.status === "active") {
        throw badRequest("User is already a member of this workspace");
      }

      // Create or reactivate membership with the specified role
      const membership = await access.ensureMembership(
        wsId,
        "user",
        userId,
        role,
        "active",
      );

      // Sync permission grants to match the role
      const { getPermissionsForRole } = await import("@doerai/shared");
      const permissions = getPermissionsForRole(role);
      const grants = permissions.map((key) => ({ permissionKey: key, scope: null }));
      await access.setPrincipalGrants(wsId, "user", userId, grants, req.actor.userId ?? null);

      const actor = getActorInfo(req);
      await logActivity(db, {
        companyId: wsId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        action: "member.added",
        entityType: "company_membership",
        entityId: membership.id,
        details: { userId, role },
      });

      res.status(201).json({
        id: membership.id,
        userId,
        role,
        status: membership.status,
        createdAt: membership.createdAt,
        updatedAt: membership.updatedAt,
      });
    },
  );

  // PATCH /api/workspaces/:wsId/members/:userId — change member role
  router.patch(
    "/workspaces/:wsId/members/:userId",
    validate(changeRoleSchema),
    requireMinRole(db, "admin"),
    async (req, res) => {
      const wsId = req.params.wsId as string;
      const targetUserId = req.params.userId as string;
      const { role: newRole } = req.body as z.infer<typeof changeRoleSchema>;

      if (!isValidRole(newRole)) {
        throw badRequest(`Invalid role: ${newRole}`);
      }

      // Check target membership exists
      const membership = await access.getMembership(wsId, "user", targetUserId);
      if (!membership || membership.status !== "active") {
        throw notFound("Member not found in this workspace");
      }

      // Prevent changing own role (to avoid locking yourself out)
      if (targetUserId === req.actor.userId) {
        throw badRequest("You cannot change your own role. Ask another admin or owner.");
      }

      // Only owners can assign admin role or transfer ownership
      const actorRole = await access.getMemberRole(wsId, req.actor.userId ?? "");
      if (newRole === "owner") {
        throw badRequest("Use the transfer-ownership endpoint to change ownership");
      }

      if (newRole === "admin" && actorRole !== "owner") {
        throw forbidden("Only owners can promote members to admin");
      }

      // Admins can only manage members/viewers, not other admins
      const currentRole = (membership.membershipRole as WorkspaceRole) ?? "member";
      if (currentRole === "admin" || currentRole === "owner") {
        if (actorRole !== "owner") {
          throw forbidden("Only owners can modify admin or owner roles");
        }
      }

      // Change the role
      const updated = await access.changeMemberRole(
        wsId,
        targetUserId,
        newRole,
        req.actor.userId ?? null,
      );

      if (!updated) {
        throw notFound("Failed to update member role");
      }

      const actor = getActorInfo(req);
      await logActivity(db, {
        companyId: wsId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        action: "member.role_changed",
        entityType: "company_membership",
        entityId: membership.id,
        details: {
          userId: targetUserId,
          oldRole: currentRole,
          newRole,
        },
      });

      res.json({
        id: updated.id,
        userId: targetUserId,
        role: newRole,
        status: updated.status,
        updatedAt: updated.updatedAt,
      });
    },
  );

  // DELETE /api/workspaces/:wsId/members/:userId — remove member
  router.delete(
    "/workspaces/:wsId/members/:userId",
    requireMinRole(db, "admin"),
    async (req, res) => {
      const wsId = req.params.wsId as string;
      const targetUserId = req.params.userId as string;

      // Prevent removing self
      if (targetUserId === req.actor.userId) {
        throw badRequest("You cannot remove yourself. Transfer ownership or ask another admin to remove you.");
      }

      // Check target membership exists
      const membership = await access.getMembership(wsId, "user", targetUserId);
      if (!membership || membership.status !== "active") {
        throw notFound("Member not found in this workspace");
      }

      // Only owners can remove admins
      const targetRole = (membership.membershipRole as WorkspaceRole) ?? "member";
      const actorRole = await access.getMemberRole(wsId, req.actor.userId ?? "");
      if ((targetRole === "admin" || targetRole === "owner") && actorRole !== "owner") {
        throw forbidden("Only owners can remove admins or owners");
      }

      // Cannot remove the last owner
      if (targetRole === "owner") {
        const ownerCount = await access.getOwnerCount(wsId);
        if (ownerCount <= 1) {
          throw badRequest("Cannot remove the last owner. Transfer ownership first.");
        }
      }

      const removed = await access.removeMember(wsId, targetUserId);
      if (!removed) {
        throw notFound("Failed to remove member");
      }

      const actor = getActorInfo(req);
      await logActivity(db, {
        companyId: wsId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        action: "member.removed",
        entityType: "company_membership",
        entityId: membership.id,
        details: { userId: targetUserId, previousRole: targetRole },
      });

      res.status(204).end();
    },
  );

  // POST /api/workspaces/:wsId/transfer-ownership — transfer workspace ownership
  router.post(
    "/workspaces/:wsId/transfer-ownership",
    validate(transferOwnershipSchema),
    requireMinRole(db, "owner"),
    async (req, res) => {
      const wsId = req.params.wsId as string;
      const { newOwnerUserId } = req.body as z.infer<typeof transferOwnershipSchema>;

      // Prevent transferring to self
      if (newOwnerUserId === req.actor.userId) {
        throw badRequest("You are already the owner");
      }

      // Check target is a member
      const membership = await access.getMembership(wsId, "user", newOwnerUserId);
      if (!membership || membership.status !== "active") {
        throw notFound("Target user is not a member of this workspace");
      }

      // Perform the transfer
      const result = await access.transferOwnership(
        wsId,
        req.actor.userId ?? "",
        newOwnerUserId,
      );

      if (!result.newOwner) {
        throw notFound("Failed to transfer ownership");
      }

      const actor = getActorInfo(req);
      await logActivity(db, {
        companyId: wsId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        action: "workspace.ownership_transferred",
        entityType: "company",
        entityId: wsId,
        details: {
          previousOwnerUserId: req.actor.userId,
          newOwnerUserId,
        },
      });

      res.json({
        previousOwner: {
          userId: req.actor.userId,
          role: "admin",
        },
        newOwner: {
          userId: newOwnerUserId,
          role: "owner",
        },
      });
    },
  );

  return router;
}
