import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NavLink, useParams } from "@/lib/router";
import type { Approval, ApprovalStatus, ApprovalType, Agent } from "@doerai/shared";
import { approvalsApi } from "@/api/approvals";
import { agentsApi } from "@/api/agents";
import { useCompany } from "@/context/CompanyContext";
import { queryKeys } from "@/lib/queryKeys";
import { Icon, I, Avatar, formatRelative, formatCents } from "./utils";

// ---------- helpers ----------

export const TYPE_ICON: Record<ApprovalType | "_default", string> = {
  hire_agent: I.user_plus,
  approve_ceo_strategy: I.brain,
  budget_override_required: I.dollar,
  _default: I.shield,
};

export const TYPE_LABEL: Record<ApprovalType, string> = {
  hire_agent: "Hire Agent",
  approve_ceo_strategy: "CEO Strategy",
  budget_override_required: "Budget Override",
};

export const STATUS_COLOR: Record<ApprovalStatus, string> = {
  pending: "var(--warn)",
  revision_requested: "var(--warn)",
  approved: "var(--pulse)",
  rejected: "var(--danger)",
  cancelled: "var(--ink-faint)",
};

type StatusGroup = "pending" | "approved" | "rejected" | "all";

function inGroup(status: ApprovalStatus, group: StatusGroup): boolean {
  if (group === "all") return true;
  if (group === "pending") return status === "pending" || status === "revision_requested";
  if (group === "approved") return status === "approved";
  if (group === "rejected") return status === "rejected" || status === "cancelled";
  return false;
}

export function approvalLabel(type: ApprovalType, payload: Record<string, unknown> | null | undefined): string {
  const base = TYPE_LABEL[type] ?? type;
  const name = payload?.name;
  if (type === "hire_agent" && typeof name === "string" && name.trim()) {
    return `${base}: ${name}`;
  }
  const title = payload?.title;
  if (type === "approve_ceo_strategy" && typeof title === "string" && title.trim()) {
    return `${base}: ${title}`;
  }
  const scope = payload?.scopeName ?? payload?.scopeType;
  if (type === "budget_override_required" && typeof scope === "string" && scope.trim()) {
    return `${base}: ${scope}`;
  }
  return base;
}

function StatusChip({ status }: { status: ApprovalStatus }) {
  const color = STATUS_COLOR[status] ?? "var(--ink-faint)";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "2px 8px",
        borderRadius: 999,
        background: "var(--bg-raised)",
        border: `1px solid var(--line)`,
        fontSize: 11,
        color: "var(--ink-dim)",
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: color,
          animation: status === "pending" || status === "revision_requested"
            ? "fw-pulse 1.6s var(--fw-ease) infinite"
            : undefined,
        }}
      />
      {status.replace(/_/g, " ")}
    </span>
  );
}

function PayloadSummary({ approval }: { approval: Approval }) {
  const p = approval.payload ?? {};
  if (approval.type === "hire_agent") {
    const role = typeof p.role === "string" ? p.role : null;
    const title = typeof p.title === "string" ? p.title : null;
    const adapter = typeof p.adapterType === "string" ? p.adapterType : null;
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 12, color: "var(--ink-dim)" }}>
        {title && <span>{title}</span>}
        {role && <span style={{ color: "var(--ink-faint)" }}>· {role}</span>}
        {adapter && (
          <span className="fw-mono" style={{ color: "var(--ink-faint)", fontSize: 11 }}>
            {adapter}
          </span>
        )}
      </div>
    );
  }
  if (approval.type === "approve_ceo_strategy") {
    const plan =
      (typeof p.plan === "string" && p.plan) ||
      (typeof p.description === "string" && p.description) ||
      (typeof p.strategy === "string" && p.strategy) ||
      (typeof p.text === "string" && p.text) ||
      null;
    if (!plan) return null;
    return (
      <div
        style={{
          fontSize: 12,
          color: "var(--ink-dim)",
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}
      >
        {plan}
      </div>
    );
  }
  if (approval.type === "budget_override_required") {
    const budget = typeof p.budgetAmount === "number" ? p.budgetAmount : null;
    const observed = typeof p.observedAmount === "number" ? p.observedAmount : null;
    const window = typeof p.windowKind === "string" ? p.windowKind : null;
    const metric = typeof p.metric === "string" ? p.metric : null;
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 12, color: "var(--ink-dim)" }}>
        {metric && <span>{metric}</span>}
        {window && <span style={{ color: "var(--ink-faint)" }}>· {window}</span>}
        {budget !== null && observed !== null && (
          <span className="fw-mono" style={{ fontSize: 11 }}>
            <span style={{ color: "var(--danger)" }}>{formatCents(observed)}</span>
            <span style={{ color: "var(--ink-faint)" }}> / {formatCents(budget)}</span>
          </span>
        )}
      </div>
    );
  }
  return null;
}

// ---------- Card ----------

function ApprovalRow({
  approval,
  requesterAgent,
  onOpen,
  onApprove,
  onReject,
  pending,
}: {
  approval: Approval;
  requesterAgent: Agent | null;
  onOpen: () => void;
  onApprove: () => void;
  onReject: () => void;
  pending: boolean;
}) {
  const iconPath = TYPE_ICON[approval.type] ?? TYPE_ICON._default;
  const label = approvalLabel(approval.type, approval.payload);
  const actionable =
    approval.type !== "budget_override_required" &&
    (approval.status === "pending" || approval.status === "revision_requested");

  return (
    <div
      onClick={onOpen}
      className="fw-card"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        padding: "14px 16px",
        cursor: "pointer",
        transition: "border-color .12s var(--fw-ease), background .12s var(--fw-ease)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: "var(--bg-raised)",
            border: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--ink-dim)",
            flex: "0 0 auto",
          }}
        >
          <Icon d={iconPath} size={15} />
        </div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 500, fontSize: 13 }}>{label}</span>
            <StatusChip status={approval.status} />
          </div>
          <PayloadSummary approval={approval} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flex: "0 0 auto" }}>
          <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>
            {formatRelative(approval.createdAt)}
          </span>
          {requesterAgent && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Avatar name={requesterAgent.name} size={18} />
              <span style={{ fontSize: 11, color: "var(--ink-dim)" }}>{requesterAgent.name}</span>
            </div>
          )}
        </div>
      </div>

      {approval.decisionNote && (
        <div
          style={{
            fontSize: 11,
            color: "var(--ink-faint)",
            fontStyle: "italic",
            borderTop: "1px solid var(--line)",
            paddingTop: 8,
          }}
        >
          Note: {approval.decisionNote}
        </div>
      )}

      {actionable && (
        <div
          style={{ display: "flex", gap: 8, borderTop: "1px solid var(--line)", paddingTop: 10 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            disabled={pending}
            onClick={onApprove}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: "1px solid var(--pulse)",
              background: "var(--pulse)",
              color: "var(--bg)",
              fontSize: 12,
              fontWeight: 500,
              cursor: pending ? "wait" : "pointer",
              opacity: pending ? 0.6 : 1,
              transition: "opacity .12s var(--fw-ease)",
            }}
          >
            Approve
          </button>
          <button
            disabled={pending}
            onClick={onReject}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: "1px solid var(--danger)",
              background: "transparent",
              color: "var(--danger)",
              fontSize: 12,
              fontWeight: 500,
              cursor: pending ? "wait" : "pointer",
              opacity: pending ? 0.6 : 1,
            }}
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- Drawer ----------

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>{label}</span>
      <div style={{ fontSize: 13, color: "var(--ink)" }}>{children}</div>
    </div>
  );
}

function ApprovalDrawer({
  approval,
  requesterAgent,
  prefix,
  onClose,
  onApprove,
  onReject,
  onRequestRevision,
  pending,
  error,
}: {
  approval: Approval;
  requesterAgent: Agent | null;
  prefix: string;
  onClose: () => void;
  onApprove: (note: string) => void;
  onReject: (note: string) => void;
  onRequestRevision: (note: string) => void;
  pending: boolean;
  error: string | null;
}) {
  const [note, setNote] = React.useState("");

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const actionable =
    approval.type !== "budget_override_required" &&
    (approval.status === "pending" || approval.status === "revision_requested");
  const iconPath = TYPE_ICON[approval.type] ?? TYPE_ICON._default;
  const label = approvalLabel(approval.type, approval.payload);
  const classicLink = `/${prefix}/approvals/${approval.id}`;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.32)",
          backdropFilter: "blur(4px)",
          zIndex: 40,
          animation: "fw-fade-in .15s var(--fw-ease)",
        }}
      />
      <aside
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(560px, 92vw)",
          background: "var(--bg)",
          borderLeft: "1px solid var(--line)",
          display: "flex",
          flexDirection: "column",
          zIndex: 41,
          animation: "fw-slide-in-right .22s var(--fw-ease)",
          overflow: "hidden",
        }}
      >
        {/* header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 7,
                background: "var(--bg-raised)",
                border: "1px solid var(--line)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--ink-dim)",
                flex: "0 0 auto",
              }}
            >
              <Icon d={iconPath} size={14} />
            </div>
            <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
              <span style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {label}
              </span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <StatusChip status={approval.status} />
                <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                  {formatRelative(approval.createdAt)}
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <NavLink
              to={`/${prefix}/fernweh/approvals/${approval.id}`}
              title="Open full view"
              style={{
                border: "1px solid var(--line)",
                background: "var(--bg-raised)",
                borderRadius: 6,
                padding: "4px 10px",
                color: "var(--ink-dim)",
                fontSize: 11,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Open ↗
            </NavLink>
            <button
              onClick={onClose}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: "1px solid var(--line)",
                background: "transparent",
                color: "var(--ink-dim)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              aria-label="Close"
            >
              <Icon d={I.x} size={12} />
            </button>
          </div>
        </div>

        {/* body */}
        <div style={{ flex: 1, overflow: "auto", padding: "18px", display: "flex", flexDirection: "column", gap: 18 }}>
          {/* meta */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
              padding: 14,
              borderRadius: 10,
              background: "var(--bg-sunken)",
              border: "1px solid var(--line)",
            }}
          >
            <Field label="Requested by">
              {requesterAgent ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Avatar name={requesterAgent.name} size={20} />
                  <span>{requesterAgent.name}</span>
                </div>
              ) : (
                <span style={{ color: "var(--ink-faint)" }}>—</span>
              )}
            </Field>
            <Field label="Type">
              <span className="fw-mono" style={{ fontSize: 11 }}>{approval.type}</span>
            </Field>
            <Field label="Created">
              {new Date(approval.createdAt).toLocaleString()}
            </Field>
            <Field label="Updated">
              {new Date(approval.updatedAt).toLocaleString()}
            </Field>
            {approval.decidedAt && (
              <Field label="Decided">
                {new Date(approval.decidedAt).toLocaleString()}
              </Field>
            )}
            <Field label="Approval ID">
              <span className="fw-mono" style={{ fontSize: 11, color: "var(--ink-dim)" }}>
                {approval.id.slice(0, 12)}
              </span>
            </Field>
          </div>

          {/* payload */}
          <div>
            <h3 className="fw-uc" style={{ color: "var(--ink-faint)", marginBottom: 8 }}>
              Payload
            </h3>
            <pre
              className="fw-mono"
              style={{
                fontSize: 11,
                padding: 12,
                borderRadius: 8,
                background: "var(--bg-sunken)",
                border: "1px solid var(--line)",
                color: "var(--ink-dim)",
                overflow: "auto",
                maxHeight: 280,
                margin: 0,
                whiteSpace: "pre-wrap",
              }}
            >
              {JSON.stringify(approval.payload ?? {}, null, 2)}
            </pre>
          </div>

          {approval.decisionNote && (
            <div>
              <h3 className="fw-uc" style={{ color: "var(--ink-faint)", marginBottom: 8 }}>
                Decision Note
              </h3>
              <div
                style={{
                  fontSize: 13,
                  fontStyle: "italic",
                  color: "var(--ink-dim)",
                  padding: 12,
                  borderRadius: 8,
                  background: "var(--bg-sunken)",
                  border: "1px solid var(--line)",
                }}
              >
                {approval.decisionNote}
              </div>
            </div>
          )}

          {actionable && (
            <div>
              <h3 className="fw-uc" style={{ color: "var(--ink-faint)", marginBottom: 8 }}>
                Decision
              </h3>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note for the record…"
                rows={3}
                style={{
                  width: "100%",
                  fontSize: 12,
                  padding: 10,
                  borderRadius: 8,
                  background: "var(--bg-sunken)",
                  border: "1px solid var(--line)",
                  color: "var(--ink)",
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
              {error && (
                <div style={{ marginTop: 8, fontSize: 12, color: "var(--danger)" }}>{error}</div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <button
                  disabled={pending}
                  onClick={() => onApprove(note)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "1px solid var(--pulse)",
                    background: "var(--pulse)",
                    color: "var(--bg)",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: pending ? "wait" : "pointer",
                    opacity: pending ? 0.6 : 1,
                  }}
                >
                  Approve
                </button>
                <button
                  disabled={pending}
                  onClick={() => onReject(note)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "1px solid var(--danger)",
                    background: "transparent",
                    color: "var(--danger)",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: pending ? "wait" : "pointer",
                    opacity: pending ? 0.6 : 1,
                  }}
                >
                  Reject
                </button>
                <button
                  disabled={pending}
                  onClick={() => onRequestRevision(note)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "1px solid var(--line)",
                    background: "transparent",
                    color: "var(--ink-dim)",
                    fontSize: 13,
                    cursor: pending ? "wait" : "pointer",
                    opacity: pending ? 0.6 : 1,
                  }}
                >
                  Request revision
                </button>
              </div>
            </div>
          )}
        </div>

        {/* footer */}
        <div
          style={{
            padding: "10px 18px",
            borderTop: "1px solid var(--line)",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <a
            href={classicLink}
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Open in classic UI
            <Icon d={I.arrow} size={10} />
          </a>
        </div>
      </aside>
    </>
  );
}

// ---------- Page ----------

export function FernwehApprovals() {
  const { companyPrefix } = useParams<{ companyPrefix: string }>();
  const { selectedCompany, selectedCompanyId, companies } = useCompany();
  const queryClient = useQueryClient();

  const [group, setGroup] = React.useState<StatusGroup>("pending");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  // hooks above the selectedCompany gate — all must run every render
  const approvalsQuery = useQuery({
    queryKey: queryKeys.approvals.list(selectedCompanyId ?? "__empty__"),
    queryFn: () => approvalsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: 10000,
  });

  const agentsQuery = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId ?? "__empty__"),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const agentById = React.useMemo(() => {
    const map = new Map<string, Agent>();
    for (const a of agentsQuery.data ?? []) map.set(a.id, a);
    return map;
  }, [agentsQuery.data]);

  const invalidate = React.useCallback(() => {
    if (!selectedCompanyId) return;
    queryClient.invalidateQueries({ queryKey: queryKeys.approvals.list(selectedCompanyId) });
  }, [queryClient, selectedCompanyId]);

  const approveMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      approvalsApi.approve(id, note?.trim() ? note.trim() : undefined),
    onSuccess: () => { setActionError(null); invalidate(); setSelectedId(null); },
    onError: (err) => setActionError(err instanceof Error ? err.message : "Failed to approve"),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      approvalsApi.reject(id, note?.trim() ? note.trim() : undefined),
    onSuccess: () => { setActionError(null); invalidate(); setSelectedId(null); },
    onError: (err) => setActionError(err instanceof Error ? err.message : "Failed to reject"),
  });

  const revisionMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      approvalsApi.requestRevision(id, note?.trim() ? note.trim() : undefined),
    onSuccess: () => { setActionError(null); invalidate(); setSelectedId(null); },
    onError: (err) => setActionError(err instanceof Error ? err.message : "Failed to request revision"),
  });

  const approvals = approvalsQuery.data ?? [];
  const counts = React.useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0, all: approvals.length };
    for (const a of approvals) {
      if (a.status === "pending" || a.status === "revision_requested") c.pending++;
      else if (a.status === "approved") c.approved++;
      else if (a.status === "rejected" || a.status === "cancelled") c.rejected++;
    }
    return c;
  }, [approvals]);

  const filtered = React.useMemo(
    () =>
      approvals
        .filter((a) => inGroup(a.status, group))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [approvals, group],
  );

  const selected = React.useMemo(
    () => (selectedId ? approvals.find((a) => a.id === selectedId) ?? null : null),
    [approvals, selectedId],
  );

  // Reset error when drawer closes/target changes
  React.useEffect(() => { setActionError(null); }, [selectedId]);

  // Early return comes AFTER all hooks
  if (!selectedCompany) {
    return (
      <div style={{ padding: 40, color: "var(--ink-faint)", fontSize: 13 }}>
        Pick a company to see its approval queue.
      </div>
    );
  }

  const prefix = companyPrefix ?? selectedCompany.issuePrefix ?? companies[0]?.issuePrefix ?? "";
  const pending =
    approveMutation.isPending || rejectMutation.isPending || revisionMutation.isPending;

  const groups: Array<{ id: StatusGroup; label: string; count: number }> = [
    { id: "pending", label: "Pending", count: counts.pending },
    { id: "approved", label: "Approved", count: counts.approved },
    { id: "rejected", label: "Rejected", count: counts.rejected },
    { id: "all", label: "All", count: counts.all },
  ];

  return (
    <div style={{ padding: "28px 36px", maxWidth: 1100, margin: "0 auto" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
        <h1 className="fw-display" style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.01em" }}>
          Approvals
        </h1>
        <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
          {counts.pending} awaiting you
        </span>
      </div>
      <p style={{ fontSize: 13, color: "var(--ink-dim)", marginBottom: 20 }}>
        Governance queue. Pending decisions gate agent work; resolving one unblocks whoever asked.
      </p>

      {/* filters */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {groups.map((g) => {
          const active = group === g.id;
          return (
            <button
              key={g.id}
              onClick={() => setGroup(g.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 12px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: active ? 500 : 400,
                border: `1px solid ${active ? "var(--accent)" : "var(--line)"}`,
                background: active ? "var(--bg-raised)" : "transparent",
                color: active ? "var(--ink)" : "var(--ink-dim)",
                cursor: "pointer",
                transition: "all .12s var(--fw-ease)",
              }}
            >
              <span>{g.label}</span>
              <span
                className="fw-mono"
                style={{
                  fontSize: 10,
                  padding: "1px 6px",
                  borderRadius: 999,
                  background: active ? "var(--accent)" : "var(--bg-sunken)",
                  color: active ? "var(--bg)" : "var(--ink-faint)",
                  border: active ? "1px solid var(--accent)" : "1px solid var(--line)",
                }}
              >
                {g.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* list */}
      {approvalsQuery.isLoading ? (
        <div style={{ padding: 32, textAlign: "center", color: "var(--ink-faint)", fontSize: 13 }}>
          Loading approvals…
        </div>
      ) : approvalsQuery.error ? (
        <div style={{ padding: 32, textAlign: "center", color: "var(--danger)", fontSize: 13 }}>
          {approvalsQuery.error instanceof Error
            ? approvalsQuery.error.message
            : "Failed to load approvals"}
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            padding: "40px 20px",
            textAlign: "center",
            border: "1px dashed var(--line)",
            borderRadius: 12,
            color: "var(--ink-faint)",
            fontSize: 13,
          }}
        >
          {counts.all === 0
            ? "No approvals yet. When an agent needs you, it will show up here."
            : group === "pending"
              ? "Queue clear. Nothing needs a decision right now."
              : `Nothing in the ${group} group.`}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((a) => (
            <ApprovalRow
              key={a.id}
              approval={a}
              requesterAgent={a.requestedByAgentId ? agentById.get(a.requestedByAgentId) ?? null : null}
              onOpen={() => setSelectedId(a.id)}
              onApprove={() => approveMutation.mutate({ id: a.id })}
              onReject={() => rejectMutation.mutate({ id: a.id })}
              pending={pending}
            />
          ))}
        </div>
      )}

      {selected && (
        <ApprovalDrawer
          approval={selected}
          requesterAgent={
            selected.requestedByAgentId ? agentById.get(selected.requestedByAgentId) ?? null : null
          }
          prefix={prefix}
          onClose={() => setSelectedId(null)}
          onApprove={(note) => approveMutation.mutate({ id: selected.id, note })}
          onReject={(note) => rejectMutation.mutate({ id: selected.id, note })}
          onRequestRevision={(note) => revisionMutation.mutate({ id: selected.id, note })}
          pending={pending}
          error={actionError}
        />
      )}
    </div>
  );
}
