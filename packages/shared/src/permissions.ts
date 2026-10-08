/**
 * Workspace Role Permission Matrix
 *
 * Maps each workspace role (owner/admin/member/viewer) to its set of
 * permission keys. Used by the access service to bulk-assign permissions
 * when a member's role changes.
 */

import type { PermissionKey, WorkspaceRole } from "./constants.js";
import { PERMISSION_KEYS } from "./constants.js";

// Full permission set — owner has everything
const ALL_PERMISSIONS: readonly PermissionKey[] = PERMISSION_KEYS;

// Admin: everything except workspace:delete, workspace:transfer_ownership, billing:manage
const ADMIN_PERMISSIONS: readonly PermissionKey[] = PERMISSION_KEYS.filter(
  (k) =>
    k !== "workspace:delete" &&
    k !== "workspace:transfer_ownership" &&
    k !== "billing:manage",
);

// Member: CRUD own agents, view all, manage own tasks, comment, view members
const MEMBER_PERMISSIONS: readonly PermissionKey[] = [
  "agents:create",
  "agents:update",
  "agents:view",
  "tasks:create",
  "tasks:update",
  "tasks:delete",
  "tasks:comment",
  "tasks:assign",
  "projects:view",
  "deliverables:create",
  "deliverables:update",
  "goals:create",
  "goals:update",
  "routines:create",
  "routines:update",
  "secrets:create",
  "workspace:view_members",
];

// Viewer: read-only
const VIEWER_PERMISSIONS: readonly PermissionKey[] = [
  "agents:view",
  "projects:view",
  "workspace:view_members",
];

export const ROLE_PERMISSIONS: Record<WorkspaceRole, readonly PermissionKey[]> = {
  owner: ALL_PERMISSIONS,
  admin: ADMIN_PERMISSIONS,
  member: MEMBER_PERMISSIONS,
  viewer: VIEWER_PERMISSIONS,
};

/**
 * Get the permission keys for a given role.
 */
export function getPermissionsForRole(role: WorkspaceRole): readonly PermissionKey[] {
  return ROLE_PERMISSIONS[role];
}

/**
 * Check if a role has a specific permission.
 */
export function roleHasPermission(role: WorkspaceRole, permission: PermissionKey): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/**
 * Check if role A can manage role B (i.e., A has >= rank than B).
 */
export function canManageRole(managerRole: WorkspaceRole, targetRole: WorkspaceRole): boolean {
  // Cannot manage someone of equal or higher rank (except owner manages everyone)
  if (managerRole === "owner") return true;
  // Import ROLE_RANK
  const { ROLE_RANK } = require("./constants.js");
  return ROLE_RANK[managerRole] > ROLE_RANK[targetRole];
}

/**
 * Get the list of roles that a given role can assign to others.
 * Owner can assign any role. Admin can assign member/viewer. Member/Viewer cannot assign.
 */
export function getAssignableRoles(role: WorkspaceRole): WorkspaceRole[] {
  switch (role) {
    case "owner":
      return ["admin", "member", "viewer"];
    case "admin":
      return ["member", "viewer"];
    default:
      return [];
  }
}
