/**
 * Role Templates for Doer RBAC
 *
 * Predefined permission sets for each standard role in a Doer company.
 * Includes both workspace hierarchy roles (owner/admin/member/viewer)
 * and functional roles (ceo/cto/engineer/etc.).
 *
 * Usage:
 *   import { applyRoleTemplate, mergeRoles } from "@doerai/shared";
 *
 *   const grants = applyRoleTemplate("admin");
 *   await access.setPrincipalGrants(companyId, "user", userId, grants, adminId);
 */

import type { PermissionKey } from "./constants.js";
import { ROLE_PERMISSIONS, getPermissionsForRole } from "./permissions.js";
import type { WorkspaceRole } from "./constants.js";

// ─── Types ──────────────────────────────────────────────────

export interface RoleTemplate {
  name: string;
  label: string;
  description: string;
  permissions: PermissionKey[];
}

export interface PermissionGrantInput {
  permissionKey: PermissionKey;
  scope: Record<string, unknown> | null;
}

// ─── Workspace Hierarchy Roles ──────────────────────────────
// These map to the RBAC roles defined in DON-387.

const workspaceRoleTemplates: RoleTemplate[] = [
  {
    name: "owner",
    label: "Owner",
    description: "Full access including billing, workspace deletion, and ownership transfer",
    permissions: [...getPermissionsForRole("owner")],
  },
  {
    name: "admin",
    label: "Admin",
    description: "Manage agents, projects, tasks, and members. Cannot delete workspace, transfer ownership, or manage billing.",
    permissions: [...getPermissionsForRole("admin")],
  },
  {
    name: "member",
    label: "Member",
    description: "Create and manage own agents, tasks, and deliverables. View all resources.",
    permissions: [...getPermissionsForRole("member")],
  },
  {
    name: "viewer",
    label: "Viewer",
    description: "Read-only access to all resources. Cannot create, update, or delete anything.",
    permissions: [...getPermissionsForRole("viewer")],
  },
];

// ─── Functional Role Templates ──────────────────────────────
// These are legacy/functional roles for specific job functions.

const functionalRoleTemplates: RoleTemplate[] = [
  {
    name: "ceo",
    label: "CEO",
    description: "Full access to all company operations including user management and permissions",
    permissions: [
      "agents:create",
      "users:invite",
      "users:manage_permissions",
      "tasks:assign",
      "tasks:assign_scope",
      "joins:approve",
    ],
  },
  {
    name: "cto",
    label: "CTO",
    description: "Technical leadership: create agents, assign tasks, approve joins, manage deliverables",
    permissions: [
      "agents:create",
      "tasks:assign",
      "tasks:assign_scope",
      "joins:approve",
    ],
  },
  {
    name: "project_manager",
    label: "Project Manager",
    description: "Manage task assignments and scopes without creating agents or managing users",
    permissions: [
      "tasks:assign",
      "tasks:assign_scope",
    ],
  },
  {
    name: "engineer",
    label: "Engineer",
    description: "Create agents and accept task assignments",
    permissions: [
      "agents:create",
      "tasks:assign",
    ],
  },
  {
    name: "researcher",
    label: "Researcher",
    description: "Create agents for research tasks; cannot manage other users' assignments",
    permissions: [
      "agents:create",
    ],
  },
  {
    name: "general",
    label: "General Member",
    description: "Basic company membership with no special permissions",
    permissions: [],
  },
  {
    name: "qa",
    label: "QA Engineer",
    description: "Create agents and assign tasks for testing workflows",
    permissions: [
      "agents:create",
      "tasks:assign",
    ],
  },
  {
    name: "devops",
    label: "DevOps Engineer",
    description: "Create agents, manage task assignments and scopes for infrastructure operations",
    permissions: [
      "agents:create",
      "tasks:assign",
      "tasks:assign_scope",
    ],
  },
  {
    name: "agent_default",
    label: "Agent Default",
    description: "Default permission set for agent principals (no board-level permissions)",
    permissions: [],
  },
];

export const ROLE_TEMPLATES: RoleTemplate[] = [
  ...workspaceRoleTemplates,
  ...functionalRoleTemplates,
];

// ─── Helpers ────────────────────────────────────────────────

const templateMap = new Map(ROLE_TEMPLATES.map((t) => [t.name, t]));

export function getRoleTemplate(name: string): RoleTemplate | null {
  return templateMap.get(name) ?? null;
}

export function listRoleTemplates(): RoleTemplate[] {
  return [...ROLE_TEMPLATES];
}

export function isValidRole(name: string): boolean {
  return templateMap.has(name);
}

export function applyRoleTemplate(name: string): PermissionGrantInput[] {
  const template = getRoleTemplate(name);
  if (!template) {
    throw new Error(`Unknown role template: ${name}`);
  }
  return template.permissions.map((key) => ({
    permissionKey: key,
    scope: null,
  }));
}

export function mergeRoles(...names: string[]): PermissionGrantInput[] {
  const seen = new Set<PermissionKey>();
  const grants: PermissionGrantInput[] = [];
  for (const name of names) {
    const template = getRoleTemplate(name);
    if (!template) {
      throw new Error(`Unknown role template: ${name}`);
    }
    for (const key of template.permissions) {
      if (!seen.has(key)) {
        seen.add(key);
        grants.push({ permissionKey: key, scope: null });
      }
    }
  }
  return grants;
}
