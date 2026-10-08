/**
 * RBAC Permission Guard Middleware
 *
 * Reusable Express middleware factory for role-based access control.
 * Integrates with the existing actorMiddleware and accessService.
 *
 * Usage:
 *   import { requirePermission } from "../middleware/permission-guard.js";
 *
 *   router.post("/companies/:companyId/agents",
 *     requirePermission(db, "agents:create"),
 *     async (req, res) => { ... }
 *   );
 *
 * Bypass rules (matching existing assertCompanyAccess / assertInstanceAdmin patterns):
 *   - local_implicit source → full bypass
 *   - isInstanceAdmin → full bypass
 *   - Agent actors → checked via hasPermission with their companyId
 *   - Unauthenticated (type "none") → 401
 */

import type { Request, RequestHandler } from "express";
import type { Db } from "@doerai/db";
import type { PermissionKey } from "@doerai/shared";
import { accessService } from "../services/access.js";
import { assertBoard, assertCompanyAccess } from "../routes/authz.js";
import { forbidden, unauthorized } from "../errors.js";

// ─── Types ──────────────────────────────────────────────────

export interface PermissionGuardOptions {
  /**
   * Custom extractor for companyId. By default, checks req.params.companyId,
   * then req.body.companyId, then req.query.companyId.
   */
  companyIdExtractor?: (req: Request) => string | undefined;
  /**
   * If true, agent actors (type "agent") are allowed to pass if they have
   * the permission via hasPermission(). Default: false (agents must use
   * board-level guards separately).
   */
  allowAgentSelf?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────

function defaultCompanyIdExtractor(req: Request): string | undefined {
  const fromParams = req.params.companyId;
  const fromBody = (req.body as Record<string, unknown> | undefined)?.companyId;
  const fromQuery = req.query.companyId;
  return (
    (typeof fromParams === "string" ? fromParams : undefined) ??
    (typeof fromBody === "string" ? fromBody : undefined) ??
    (typeof fromQuery === "string" ? fromQuery : undefined)
  );
}

function shouldBypass(actor: Request["actor"]): boolean {
  if (actor.type !== "board") return false;
  return actor.source === "local_implicit" || actor.isInstanceAdmin === true;
}

// ─── Single Permission ─────────────────────────────────────

export function requirePermission(
  db: Db,
  key: PermissionKey,
  opts: PermissionGuardOptions = {},
): RequestHandler {
  const extractor = opts.companyIdExtractor ?? defaultCompanyIdExtractor;
  const access = accessService(db);

  return async (req, _res, next) => {
    try {
      // Unauthenticated
      if (req.actor.type === "none") {
        throw unauthorized();
      }

      // Bypass for local_implicit and instance admins
      if (shouldBypass(req.actor)) {
        next();
        return;
      }

      const companyId = extractor(req);
      if (!companyId) {
        throw forbidden("Cannot determine company context for permission check");
      }

      // Agent actors
      if (req.actor.type === "agent") {
        if (req.actor.companyId !== companyId) {
          throw forbidden("Agent key cannot access another company");
        }
        if (opts.allowAgentSelf) {
          const agentId = req.actor.agentId ?? "unknown-agent";
          const allowed = await access.hasPermission(
            companyId,
            "agent",
            agentId,
            key,
          );
          if (!allowed) {
            throw forbidden(`Permission denied: ${key}`);
          }
          next();
          return;
        }
        // Agents without allowAgentSelf fall through to board check (which will fail)
        throw forbidden(`Agent actors require allowAgentSelf for ${key}`);
      }

      // Board actors
      assertBoard(req);
      assertCompanyAccess(req, companyId);

      const allowed = await access.canUser(companyId, req.actor.userId, key);
      if (!allowed) {
        throw forbidden(`Permission denied: ${key}`);
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

// ─── All Permissions (AND logic) ────────────────────────────

export function requireAllPermissions(
  db: Db,
  keys: PermissionKey[],
  opts: PermissionGuardOptions = {},
): RequestHandler {
  const extractor = opts.companyIdExtractor ?? defaultCompanyIdExtractor;
  const access = accessService(db);

  return async (req, _res, next) => {
    try {
      if (req.actor.type === "none") {
        throw unauthorized();
      }

      if (shouldBypass(req.actor)) {
        next();
        return;
      }

      const companyId = extractor(req);
      if (!companyId) {
        throw forbidden("Cannot determine company context for permission check");
      }

      if (req.actor.type === "agent") {
        if (req.actor.companyId !== companyId) {
          throw forbidden("Agent key cannot access another company");
        }
        if (opts.allowAgentSelf) {
          const agentId = req.actor.agentId ?? "unknown-agent";
          for (const key of keys) {
            const allowed = await access.hasPermission(
              companyId,
              "agent",
              agentId,
              key,
            );
            if (!allowed) {
              throw forbidden(`Permission denied: ${key}`);
            }
          }
          next();
          return;
        }
        throw forbidden(`Agent actors require allowAgentSelf for ${keys.join(", ")}`);
      }

      assertBoard(req);
      assertCompanyAccess(req, companyId);

      for (const key of keys) {
        const allowed = await access.canUser(companyId, req.actor.userId, key);
        if (!allowed) {
          throw forbidden(`Permission denied: ${key}`);
        }
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

// ─── Any Permission (OR logic) ─────────────────────────────

export function requireAnyPermission(
  db: Db,
  keys: PermissionKey[],
  opts: PermissionGuardOptions = {},
): RequestHandler {
  const extractor = opts.companyIdExtractor ?? defaultCompanyIdExtractor;
  const access = accessService(db);

  return async (req, _res, next) => {
    try {
      if (req.actor.type === "none") {
        throw unauthorized();
      }

      if (shouldBypass(req.actor)) {
        next();
        return;
      }

      const companyId = extractor(req);
      if (!companyId) {
        throw forbidden("Cannot determine company context for permission check");
      }

      if (req.actor.type === "agent") {
        if (req.actor.companyId !== companyId) {
          throw forbidden("Agent key cannot access another company");
        }
        if (opts.allowAgentSelf) {
          const agentId = req.actor.agentId ?? "unknown-agent";
          let hasAny = false;
          for (const key of keys) {
            const allowed = await access.hasPermission(
              companyId,
              "agent",
              agentId,
              key,
            );
            if (allowed) {
              hasAny = true;
              break;
            }
          }
          if (!hasAny) {
            throw forbidden(`Requires any of: ${keys.join(", ")}`);
          }
          next();
          return;
        }
        throw forbidden(`Agent actors require allowAgentSelf for ${keys.join(", ")}`);
      }

      assertBoard(req);
      assertCompanyAccess(req, companyId);

      let hasAny = false;
      for (const key of keys) {
        const allowed = await access.canUser(companyId, req.actor.userId, key);
        if (allowed) {
          hasAny = true;
          break;
        }
      }
      if (!hasAny) {
        throw forbidden(`Requires any of: ${keys.join(", ")}`);
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

// ─── Board-Only Guard ───────────────────────────────────────

export function requireBoard(_db: Db): RequestHandler {
  return (req, _res, next) => {
    try {
      assertBoard(req);
      next();
    } catch (err) {
      next(err);
    }
  };
}

// ─── Instance Admin Guard ──────────────────────────────────

export function requireInstanceAdmin(_db: Db): RequestHandler {
  return (req, _res, next) => {
    try {
      assertBoard(req);
      if (req.actor.source === "local_implicit" || req.actor.isInstanceAdmin) {
        next();
        return;
      }
      throw forbidden("Instance admin access required");
    } catch (err) {
      next(err);
    }
  };
}

// ─── Role-Based Guard (DON-387) ──────────────────────────────
// Checks that the authenticated user has at least the specified
// workspace role (owner > admin > member > viewer).

import type { WorkspaceRole } from "@doerai/shared";
import { ROLE_RANK, ROLE_LABELS } from "@doerai/shared";
import { accessService } from "../services/access.js";

export function requireRole(
  db: Db,
  minRole: WorkspaceRole,
): RequestHandler {
  const access = accessService(db);
  return async (req, _res, next) => {
    try {
      // Unauthenticated
      if (req.actor.type === "none") {
        throw unauthorized();
      }

      // Bypass for local_implicit and instance admins
      if (req.actor.type === "board" && (req.actor.source === "local_implicit" || req.actor.isInstanceAdmin)) {
        next();
        return;
      }

      // Agents cannot have workspace roles
      if (req.actor.type === "agent") {
        throw forbidden("Agent actors do not have workspace roles");
      }

      // Board actors — check role
      assertBoard(req);

      const wsId = req.params.wsId ?? req.params.companyId;
      if (!wsId) {
        throw forbidden("Cannot determine workspace context for role check");
      }

      assertCompanyAccess(req, wsId);

      const userRole = await access.getMemberRole(wsId, req.actor.userId ?? "");
      if (!userRole) {
        throw forbidden("You are not a member of this workspace");
      }

      if (ROLE_RANK[userRole] < ROLE_RANK[minRole]) {
        throw forbidden(`This action requires ${ROLE_LABELS[minRole]} role or higher`);
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
