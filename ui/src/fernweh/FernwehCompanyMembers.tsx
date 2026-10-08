import * as React from "react";
import { useNavigate } from "@/lib/router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "@/context/CompanyContext";
import { useToast } from "@/context/ToastContext";
import { authApi } from "@/api/auth";
import { accessApi } from "@/api/access";
import type {
  CompanyMember,
  PermissionKey,
  PermissionGrant,
} from "@/api/access";
import { queryKeys } from "@/lib/queryKeys";
import { Icon, I, ErrorState, LoadingState, Badge, Button } from "./utils";

/* ============================================================
   FernwehCompanyMembers — RBAC member management.

   Route: /:companyPrefix/company/members

   Features:
   - Member list with role badges and permission grants
   - Inline role change (Admin/Member/Viewer) via permission grants
   - Remove member with confirmation
   - Permission-denied state for lower-role users
   - Mobile-responsive design
============================================================ */

// ── Constants ────────────────────────────────────────────────

const ALL_PERMISSIONS: PermissionKey[] = [
  "agents:create",
  "users:invite",
  "users:manage_permissions",
  "tasks:assign",
  "tasks:assign_scope",
  "joins:approve",
];

const PERMISSION_LABELS: Record<PermissionKey, string> = {
  "agents:create": "Create Agents",
  "users:invite": "Invite Users",
  "users:manage_permissions": "Manage Permissions",
  "tasks:assign": "Assign Tasks",
  "tasks:assign_scope": "Assign Task Scope",
  "joins:approve": "Approve Joins",
};

// Role presets: which permissions each role gets
const ROLE_PRESETS: Record<string, PermissionKey[]> = {
  admin: ALL_PERMISSIONS,
  member: ["agents:create", "tasks:assign"],
  viewer: [],
};

const ROLE_ORDER = ["admin", "member", "viewer"] as const;

// ── Shared styles ─────────────────────────────────────────────

const CARD_STYLE: React.CSSProperties = {
  background: "var(--bg-raised)",
  border: "1px solid var(--line)",
  borderRadius: 12,
  padding: "20px 24px",
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--ink-faint)",
  marginBottom: 5,
};

const SELECT_STYLE: React.CSSProperties = {
  width: "100%",
  background: "var(--bg-sunken)",
  border: "1px solid var(--line)",
  borderRadius: 8,
  padding: "7px 12px",
  fontSize: 13,
  color: "var(--ink)",
  boxSizing: "border-box",
  outline: "none",
  cursor: "pointer",
  appearance: "none",
  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 10px center",
  paddingRight: 30,
};

// ── Helper: derive role from grants ───────────────────────────

function deriveRoleFromGrants(grants: PermissionGrant[]): string {
  if (!grants || grants.length === 0) return "viewer";
  const keys = new Set(grants.map((g) => g.permissionKey));
  // Admin = all 6 permissions
  if (ALL_PERMISSIONS.every((p) => keys.has(p))) return "admin";
  // Member = at least agents:create or tasks:assign
  if (keys.has("agents:create") || keys.has("tasks:assign")) return "member";
  return "viewer";
}

function roleBadgeTone(role: string): "accent" | "pulse" | "neutral" {
  switch (role) {
    case "admin":
      return "accent";
    case "member":
      return "pulse";
    default:
      return "neutral";
  }
}

// ── Main component ───────────────────────────────────────────

export function FernwehCompanyMembers() {
  const { selectedCompany, selectedCompanyId } = useCompany();
  const { pushToast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Get current user session to check if they're the owner
  const sessionQuery = useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: () => authApi.getSession(),
  });

  const membersQuery = useQuery({
    queryKey: queryKeys.access.members(selectedCompanyId ?? ""),
    queryFn: () => accessApi.listMembers(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    retry: (failureCount, error: unknown) => {
      // Don't retry on 403 — permission denied
      if (error instanceof Error && "status" in error && (error as { status: number }).status === 403) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Track which member is being edited
  const [editingMemberId, setEditingMemberId] = React.useState<string | null>(null);
  const [editingRole, setEditingRole] = React.useState<string>("viewer");
  const [removingMember, setRemovingMember] = React.useState<CompanyMember | null>(null);

  // Mutation: update member permissions
  const updateMutation = useMutation({
    mutationFn: ({ memberId, grants }: { memberId: string; grants: Array<{ permissionKey: PermissionKey; scope?: Record<string, unknown> | null }> }) =>
      accessApi.updateMemberPermissions(selectedCompanyId!, memberId, { grants }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.access.members(selectedCompanyId!) });
      pushToast({ title: "Permissions updated", body: "Member role has been updated.", tone: "success" });
      setEditingMemberId(null);
    },
    onError: (err: Error) => {
      pushToast({
        title: "Update failed",
        body: err.message || "Could not update member permissions.",
        tone: "error",
      });
    },
  });

  // Check if current user can manage (owner or has users:manage_permissions)
  const currentUserId = sessionQuery.data?.user?.id;
  const isOwner = membersQuery.data?.some(
    (m) => m.principalType === "user" && m.principalId === currentUserId && m.membershipRole === "owner"
  );

  const canManage = isOwner || membersQuery.data?.some(
    (m) => m.principalType === "user" && m.principalId === currentUserId && m.membershipRole === "admin"
  );

  // ── Permission denied state ──────────────────────────────────

  if (membersQuery.error && (membersQuery.error as { status?: number }).status === 403) {
    return (
      <div style={{ padding: "28px 32px", maxWidth: 760 }}>
        <div style={{ ...CARD_STYLE, alignItems: "center", textAlign: "center", gap: 12 }}>
          <Icon d={I.lock} size={32} />
          <h2 className="fw-display" style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
            Permission Required
          </h2>
          <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: 0, lineHeight: 1.5 }}>
            You need the <strong>Manage Permissions</strong> right to view and manage company members.
            Ask a company owner or admin to grant you access.
          </p>
          <Button variant="secondary" size="md" onClick={() => navigate(-1)} icon={I.arrow}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  if (!selectedCompanyId) {
    return (
      <div style={{ padding: "28px 32px", maxWidth: 760 }}>
        <p style={{ fontSize: 13, color: "var(--ink-dim)" }}>
          Select a company first to manage its members.
        </p>
      </div>
    );
  }

  if (membersQuery.isLoading) {
    return (
      <div style={{ padding: "28px 32px", maxWidth: 920 }}>
        <LoadingState label="Loading members…" />
      </div>
    );
  }

  if (membersQuery.error) {
    return (
      <div style={{ padding: "28px 32px", maxWidth: 760 }}>
        <ErrorState
          error={membersQuery.error}
          hint="Could not load company members from the Doer API."
        />
      </div>
    );
  }

  const members = membersQuery.data ?? [];

  // ── Handlers ────────────────────────────────────────────────

  function handleStartEdit(member: CompanyMember) {
    setEditingMemberId(member.id);
    setEditingRole(deriveRoleFromGrants((member as unknown as { grants?: PermissionGrant[] }).grants ?? []));
  }

  function handleSaveRole(memberId: string) {
    const grants = ROLE_PRESETS[editingRole] ?? [];
    updateMutation.mutate({
      memberId,
      grants: grants.map((k) => ({ permissionKey: k })),
    });
  }

  function handleCancelEdit() {
    setEditingMemberId(null);
    setEditingRole("viewer");
  }

  // Note: "Remove" in this context means revoking all permissions (setting to viewer)
  // since the backend doesn't have a DELETE endpoint for members yet.
  // We use the PATCH endpoint to set grants to empty.
  function handleConfirmRemove(member: CompanyMember) {
    updateMutation.mutate(
      { memberId: member.id, grants: [] },
      {
        onSuccess: () => {
          setRemovingMember(null);
        },
      }
    );
  }

  // ── Render ───────────────────────────────────────────────────

  return (
    <div style={{ padding: "28px 32px", maxWidth: 920, display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => navigate(`/${selectedCompany?.issuePrefix ?? ""}/company/settings`)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--ink-faint)",
              fontSize: 13,
              padding: 0,
            }}
          >
            ← Settings
          </button>
        </div>
        <h1 className="fw-display" style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>
          Members
        </h1>
        <p style={{ fontSize: 13, color: "var(--ink-faint)", margin: 0 }}>
          Manage roles and permissions for{" "}
          <strong style={{ color: "var(--ink)" }}>{selectedCompany?.name ?? "this company"}</strong>.
          Owners and admins can change roles. Viewers have read-only access.
        </p>
      </div>

      {/* Members list */}
      <div style={CARD_STYLE}>
        {/* Table header — desktop only */}
        <div
          className="fw-mono"
          style={{
            display: "none",
            gridTemplateColumns: "2fr 1fr 2fr auto",
            gap: 16,
            fontSize: 11,
            color: "var(--ink-faint)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            paddingBottom: 8,
            borderBottom: "1px solid var(--line)",
            "@media (min-width: 640px)": {
              display: "grid",
            },
          } as React.CSSProperties}
        >
          <span>Member</span>
          <span>Role</span>
          <span>Permissions</span>
          <span></span>
        </div>

        {/* Member rows */}
        {members.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0", color: "var(--ink-faint)", fontSize: 13 }}>
            No members found. Members appear here when they join or are invited to this company.
          </div>
        ) : (
          members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              currentUserId={currentUserId ?? null}
              canManage={!!canManage}
              isEditing={editingMemberId === member.id}
              editingRole={editingRole}
              onEdit={() => handleStartEdit(member)}
              onSave={() => handleSaveRole(member.id)}
              onCancel={handleCancelEdit}
              onRoleChange={setEditingRole}
              onRemove={() => setRemovingMember(member)}
              saving={updateMutation.isPending}
            />
          ))
        )}
      </div>

      {/* Permission reference */}
      <div style={CARD_STYLE}>
        <h3 className="fw-display" style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>
          Permission Reference
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ALL_PERMISSIONS.map((perm) => (
            <div
              key={perm}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 12,
              }}
            >
              <Badge tone="neutral" size="sm" style={{ fontFamily: "var(--fw-font-mono)" }}>
                {perm}
              </Badge>
              <span style={{ color: "var(--ink-dim)" }}>{PERMISSION_LABELS[perm]}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: "var(--ink-dim)" }}>
          <div><Badge tone="accent" size="sm">Admin</Badge> — All permissions</div>
          <div><Badge tone="pulse" size="sm">Member</Badge> — Create agents, assign tasks</div>
          <div><Badge tone="neutral" size="sm">Viewer</Badge> — Read-only, no permissions</div>
        </div>
      </div>

      {/* Remove confirmation modal */}
      {removingMember && (
        <ConfirmModal
          member={removingMember}
          onConfirm={() => handleConfirmRemove(removingMember)}
          onCancel={() => setRemovingMember(null)}
          saving={updateMutation.isPending}
        />
      )}
    </div>
  );
}

// ── Member row ───────────────────────────────────────────────

interface MemberRowProps {
  member: CompanyMember;
  currentUserId: string | null;
  canManage: boolean;
  isEditing: boolean;
  editingRole: string;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onRoleChange: (role: string) => void;
  onRemove: () => void;
  saving: boolean;
}

function MemberRow({
  member,
  currentUserId,
  canManage,
  isEditing,
  editingRole,
  onEdit,
  onSave,
  onCancel,
  onRoleChange,
  onRemove,
  saving,
}: MemberRowProps) {
  const isCurrentUser = member.principalType === "user" && member.principalId === currentUserId;
  const isOwner = member.membershipRole === "owner";
  const derivedRole = deriveRoleFromGrants(
    (member as unknown as { grants?: PermissionGrant[] }).grants ?? []
  );
  const displayRole = isOwner ? "owner" : derivedRole;
  const canEditThisMember = canManage && !isOwner;

  // Get grants for display
  const grants = (member as unknown as { grants?: PermissionGrant[] }).grants ?? [];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: "14px 0",
        borderBottom: "1px solid var(--line)",
        "@media (min-width: 640px)": {
          display: "grid",
          gridTemplateColumns: "2fr 1fr 2fr auto",
          alignItems: "center",
          gap: 16,
          padding: "14px 0",
        },
      } as React.CSSProperties}
    >
      {/* Member identity */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: "var(--bg-sunken)",
            border: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            fontWeight: 600,
            color: "var(--ink-dim)",
            flexShrink: 0,
          }}
        >
          {member.principalType === "agent" ? "🤖" : member.principalId.slice(0, 2).toUpperCase()}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {member.principalType === "agent" ? `Agent ${member.principalId.slice(0, 8)}` : `User ${member.principalId.slice(0, 8)}`}
            {isCurrentUser && (
              <span style={{ marginLeft: 6, fontSize: 11, color: "var(--ink-faint)" }}>(you)</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-faint)", display: "flex", gap: 6, alignItems: "center" }}>
            <span className="fw-mono">{member.principalType}</span>
            <span>·</span>
            <span>{member.status}</span>
          </div>
        </div>
      </div>

      {/* Role */}
      <div style={{ display: "flex", alignItems: "center" }}>
        {isEditing ? (
          <select
            value={editingRole}
            onChange={(e) => onRoleChange(e.target.value)}
            style={SELECT_STYLE}
          >
            {ROLE_ORDER.map((r) => (
              <option key={r} value={r}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </option>
            ))}
          </select>
        ) : (
          <Badge tone={roleBadgeTone(displayRole)} size="sm" uppercase>
            {displayRole}
          </Badge>
        )}
      </div>

      {/* Permissions */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {isOwner ? (
          <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>All permissions (owner)</span>
        ) : grants.length === 0 ? (
          <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>No permissions</span>
        ) : (
          grants.slice(0, 3).map((g) => (
            <Badge key={g.permissionKey} tone="neutral" size="sm" style={{ fontFamily: "var(--fw-font-mono)", fontSize: 10 }}>
              {g.permissionKey}
            </Badge>
          ))
        )}
        {grants.length > 3 && (
          <span style={{ fontSize: 11, color: "var(--ink-faint)", alignSelf: "center" }}>
            +{grants.length - 3} more
          </span>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {isEditing ? (
          <>
            <Button
              variant="primary"
              size="sm"
              onClick={onSave}
              disabled={saving}
              icon={saving ? undefined : I.check}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
          </>
        ) : canEditThisMember ? (
          <>
            <Button variant="ghost" size="sm" onClick={onEdit} icon={I.pencil}>
              Edit
            </Button>
            {!isCurrentUser && (
              <Button variant="danger-ghost" size="sm" onClick={onRemove} icon={I.trash}>
                Remove
              </Button>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

// ── Confirm modal ─────────────────────────────────────────────

function ConfirmModal({
  member,
  onConfirm,
  onCancel,
  saving,
}: {
  member: CompanyMember;
  onConfirm: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={onCancel}
    >
      <div
        className="fw-card"
        style={{ width: 440, padding: 28, display: "flex", flexDirection: "column", gap: 16 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <strong style={{ color: "var(--ink)", fontSize: 15 }}>Remove member</strong>
        </div>
        <p style={{ color: "var(--ink-dim)", fontSize: 13, margin: 0, lineHeight: 1.5 }}>
          This will revoke all permissions from{" "}
          <strong style={{ color: "var(--ink)" }}>
            {member.principalType === "agent" ? "this agent" : "this user"}
          </strong>
          . They will lose access to manage agents, invite users, and assign tasks.
          The membership record will remain but with no permissions.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button variant="secondary" size="md" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button variant="danger" size="md" onClick={onConfirm} disabled={saving}>
            {saving ? "Removing…" : "Remove permissions"}
          </Button>
        </div>
      </div>
    </div>
  );
}
