import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { NavLink, useParams } from "@/lib/router";
import type {
  Approval,
  ApprovalType,
  Agent,
  HeartbeatRun,
  Issue,
  JoinRequest,
} from "@doerai/shared";
import { approvalsApi } from "@/api/approvals";
import { accessApi } from "@/api/access";
import { agentsApi } from "@/api/agents";
import { dashboardApi } from "@/api/dashboard";
import { heartbeatsApi } from "@/api/heartbeats";
import { issuesApi } from "@/api/issues";
import { ApiError } from "@/api/client";
import { useCompany } from "@/context/CompanyContext";
import { queryKeys } from "@/lib/queryKeys";
import {
  ACTIONABLE_APPROVAL_STATUSES,
  getApprovalsForTab,
  getInboxWorkItems,
  getLatestFailedRunsByAgent,
  getRecentTouchedIssues,
  getUnreadTouchedIssues,
  loadLastInboxTab,
  saveLastInboxTab,
  type InboxApprovalFilter,
  type InboxTab,
  type InboxWorkItem,
} from "@/lib/inbox";
import { useDismissedInboxItems } from "@/hooks/useInboxBadge";
import { Avatar, Icon, I, formatRelative, StatusChip, PriorityChip } from "./utils";

/* ============================================================
   FernwehInbox — Wave-A parity port of ui/src/pages/Inbox.tsx.
   Read-centric. Row clicks deep-link to Work/Approvals/Access
   for mutation surfaces. Dismiss is local (localStorage).
============================================================ */

// Matches classic Inbox scope: exclude cancelled, include 'done' so just-closed items stay visible briefly
const INBOX_ISSUE_STATUSES =
  "backlog,todo,in_progress,in_review,blocked,done";

// ---------- approval rendering helpers (mirror FernwehApprovals) ----------

const APPROVAL_TYPE_ICON: Record<ApprovalType | "_default", string> = {
  hire_agent: I.user_plus,
  approve_ceo_strategy: I.brain,
  budget_override_required: I.dollar,
  _default: I.shield,
};

const APPROVAL_TYPE_LABEL: Record<ApprovalType, string> = {
  hire_agent: "Hire Agent",
  approve_ceo_strategy: "CEO Strategy",
  budget_override_required: "Budget Override",
};

function approvalLabel(
  type: ApprovalType,
  payload: Record<string, unknown> | null | undefined,
): string {
  const base = APPROVAL_TYPE_LABEL[type] ?? type;
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

// ---------- misc helpers ----------

function firstNonEmptyLine(value: string | null | undefined): string | null {
  if (!value) return null;
  const line = value.split("\n").map((c) => c.trim()).find(Boolean);
  return line ?? null;
}

function runFailureMessage(run: HeartbeatRun): string {
  return (
    firstNonEmptyLine(run.error) ??
    firstNonEmptyLine(run.stderrExcerpt) ??
    "Run exited with an error."
  );
}

function readIssueIdFromRun(run: HeartbeatRun): string | null {
  const ctx = run.contextSnapshot;
  if (!ctx) return null;
  const issueId = ctx["issueId"];
  if (typeof issueId === "string" && issueId.length > 0) return issueId;
  const taskId = ctx["taskId"];
  if (typeof taskId === "string" && taskId.length > 0) return taskId;
  return null;
}

// ---------- Chips / pills ----------

function PrimaryTab({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 14px",
        borderRadius: 10,
        border: `1px solid ${active ? "var(--accent)" : "var(--line)"}`,
        background: active ? "color-mix(in oklab, var(--accent) 14%, var(--bg-raised))" : "var(--bg-raised)",
        color: active ? "var(--accent)" : "var(--ink-dim)",
        fontSize: 13,
        fontWeight: active ? 500 : 400,
        cursor: "pointer",
        transition: "all .12s var(--fw-ease)",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span>{label}</span>
      {typeof count === "number" && count > 0 && (
        <span
          style={{
            padding: "1px 7px",
            borderRadius: 999,
            background: active ? "var(--accent)" : "var(--bg-sunken)",
            color: active ? "var(--bg)" : "var(--ink-faint)",
            fontSize: 11,
            fontWeight: 500,
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function CategoryPill({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px",
        borderRadius: 999,
        border: `1px solid ${active ? "var(--accent)" : "var(--line)"}`,
        background: active ? "color-mix(in oklab, var(--accent) 10%, transparent)" : "transparent",
        color: active ? "var(--accent)" : "var(--ink-dim)",
        fontSize: 11.5,
        cursor: "pointer",
        transition: "all .12s var(--fw-ease)",
      }}
    >
      <Icon d={icon} size={11} />
      {label}
    </button>
  );
}

// ---------- Row variants ----------

function RowShell({
  icon,
  iconBg,
  iconColor,
  children,
  onClick,
  onDismiss,
  hideDismiss,
  timestamp,
}: {
  icon: string;
  iconBg?: string;
  iconColor?: string;
  children: React.ReactNode;
  onClick?: () => void;
  onDismiss?: () => void;
  hideDismiss?: boolean;
  timestamp?: string | Date | null;
}) {
  return (
    <div
      onClick={onClick}
      className="fw-card"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "12px 14px",
        cursor: onClick ? "pointer" : "default",
        transition: "border-color .12s var(--fw-ease), background .12s var(--fw-ease)",
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: iconBg ?? "var(--bg-raised)",
          border: "1px solid var(--line)",
          color: iconColor ?? "var(--ink-dim)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon d={icon} size={14} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
        {timestamp && (
          <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>
            {formatRelative(timestamp)}
          </span>
        )}
        {!hideDismiss && onDismiss && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            title="Dismiss"
            style={{
              padding: "3px 5px",
              borderRadius: 6,
              border: "1px solid transparent",
              background: "transparent",
              color: "var(--ink-faint)",
              cursor: "pointer",
              transition: "all .12s var(--fw-ease)",
              display: "inline-flex",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--line)";
              e.currentTarget.style.color = "var(--ink-dim)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "transparent";
              e.currentTarget.style.color = "var(--ink-faint)";
            }}
          >
            <Icon d={I.x} size={11} />
          </button>
        )}
      </div>
    </div>
  );
}

function IssueInboxRow({
  issue,
  onOpen,
  onDismiss,
}: {
  issue: Issue;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  return (
    <RowShell
      icon={I.issues}
      onClick={onOpen}
      onDismiss={onDismiss}
      timestamp={issue.lastExternalCommentAt ?? issue.updatedAt}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span className="fw-mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>
          {issue.identifier ?? "issue"}
        </span>
        <StatusChip status={issue.status} />
        {issue.priority && <PriorityChip priority={issue.priority} />}
        {issue.isUnreadForMe && (
          <span
            style={{
              padding: "1px 7px",
              borderRadius: 999,
              background: "color-mix(in oklab, var(--accent) 18%, transparent)",
              color: "var(--accent)",
              fontSize: 10.5,
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: 0.3,
            }}
          >
            Unread
          </span>
        )}
      </div>
      <div
        style={{
          fontSize: 13,
          color: "var(--ink)",
          fontWeight: 500,
          marginTop: 4,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {issue.title || "(untitled issue)"}
      </div>
    </RowShell>
  );
}

function ApprovalInboxRow({
  approval,
  requesterAgent,
  onOpen,
  onDismiss,
}: {
  approval: Approval;
  requesterAgent: Agent | null;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  const iconPath = APPROVAL_TYPE_ICON[approval.type] ?? APPROVAL_TYPE_ICON._default;
  const label = approvalLabel(approval.type, approval.payload);
  const actionable = ACTIONABLE_APPROVAL_STATUSES.has(approval.status);
  return (
    <RowShell
      icon={iconPath}
      iconBg={actionable ? "color-mix(in oklab, var(--warn) 14%, var(--bg-raised))" : undefined}
      iconColor={actionable ? "var(--warn)" : undefined}
      onClick={onOpen}
      onDismiss={onDismiss}
      hideDismiss={actionable}
      timestamp={approval.createdAt}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{label}</span>
        <span
          style={{
            fontSize: 10.5,
            color: actionable ? "var(--warn)" : "var(--ink-faint)",
            textTransform: "uppercase",
            letterSpacing: 0.3,
          }}
        >
          {approval.status.replace(/_/g, " ")}
        </span>
      </div>
      {requesterAgent && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
          <Avatar name={requesterAgent.name} size={16} />
          <span style={{ fontSize: 11.5, color: "var(--ink-dim)" }}>{requesterAgent.name}</span>
        </div>
      )}
    </RowShell>
  );
}

function FailedRunInboxRow({
  run,
  agent,
  onOpen,
  onDismiss,
}: {
  run: HeartbeatRun;
  agent: Agent | null;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  return (
    <RowShell
      icon={I.x}
      iconBg="color-mix(in oklab, var(--danger) 14%, var(--bg-raised))"
      iconColor="var(--danger)"
      onClick={onOpen}
      onDismiss={onDismiss}
      timestamp={run.createdAt}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>
          {agent?.name ?? "Unknown agent"} run failed
        </span>
        <span
          style={{
            fontSize: 10.5,
            color: "var(--danger)",
            textTransform: "uppercase",
            letterSpacing: 0.3,
          }}
        >
          {run.status.replace(/_/g, " ")}
        </span>
      </div>
      <div
        style={{
          fontSize: 12,
          color: "var(--ink-dim)",
          marginTop: 4,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {runFailureMessage(run)}
      </div>
    </RowShell>
  );
}

function JoinRequestInboxRow({
  request,
  onOpen,
  onDismiss,
}: {
  request: JoinRequest;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  const name = request.agentName ?? request.requestEmailSnapshot ?? "New join request";
  const subtitle = request.adapterType ?? request.requestType;
  return (
    <RowShell
      icon={I.user_plus}
      iconBg="color-mix(in oklab, var(--accent) 14%, var(--bg-raised))"
      iconColor="var(--accent)"
      onClick={onOpen}
      onDismiss={onDismiss}
      timestamp={request.createdAt}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{name}</span>
        <span
          style={{
            fontSize: 10.5,
            color: "var(--accent)",
            textTransform: "uppercase",
            letterSpacing: 0.3,
          }}
        >
          Join request
        </span>
      </div>
      {subtitle && (
        <div className="fw-mono" style={{ fontSize: 11.5, color: "var(--ink-dim)", marginTop: 4 }}>
          {subtitle}
        </div>
      )}
    </RowShell>
  );
}

// ---------- Page ----------

type CategoryFilter =
  | "everything"
  | "issues"
  | "approvals"
  | "failed_runs"
  | "join_requests";

const CATEGORIES: Array<{ id: CategoryFilter; label: string; icon: string }> = [
  { id: "everything", label: "Everything", icon: I.stack },
  { id: "issues", label: "My issues", icon: I.issues },
  { id: "approvals", label: "Approvals", icon: I.shield },
  { id: "failed_runs", label: "Failed runs", icon: I.x },
  { id: "join_requests", label: "Join requests", icon: I.user_plus },
];

export function FernwehInbox() {
  const { companyPrefix } = useParams<{ companyPrefix: string }>();
  const prefix = companyPrefix ?? "";
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id;
  const { dismissed, dismiss } = useDismissedInboxItems();

  const [tab, setTab] = React.useState<InboxTab>(() => loadLastInboxTab());
  const [category, setCategory] = React.useState<CategoryFilter>("everything");
  const [approvalFilter, setApprovalFilter] = React.useState<InboxApprovalFilter>("actionable");

  React.useEffect(() => {
    saveLastInboxTab(tab);
  }, [tab]);

  // ---- queries ----

  const touchedQuery = useQuery({
    queryKey: queryKeys.issues.listTouchedByMe(companyId!),
    queryFn: () =>
      issuesApi.list(companyId!, {
        touchedByUserId: "me",
        status: INBOX_ISSUE_STATUSES,
      }),
    enabled: !!companyId,
    refetchInterval: 30_000,
  });

  const approvalsQuery = useQuery({
    queryKey: queryKeys.approvals.list(companyId!),
    queryFn: () => approvalsApi.list(companyId!),
    enabled: !!companyId,
    refetchInterval: 30_000,
  });

  const joinRequestsQuery = useQuery({
    queryKey: queryKeys.access.joinRequests(companyId!, "pending_approval"),
    queryFn: async () => {
      try {
        return await accessApi.listJoinRequests(companyId!, "pending_approval");
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          return [] as JoinRequest[];
        }
        throw err;
      }
    },
    enabled: !!companyId,
    retry: false,
  });

  const heartbeatsQuery = useQuery({
    queryKey: queryKeys.heartbeats(companyId!),
    queryFn: () => heartbeatsApi.list(companyId!),
    enabled: !!companyId,
    refetchInterval: 30_000,
  });

  const agentsQuery = useQuery({
    queryKey: queryKeys.agents.list(companyId!),
    queryFn: () => agentsApi.list(companyId!),
    enabled: !!companyId,
  });

  const dashboardQuery = useQuery({
    queryKey: queryKeys.dashboard(companyId!),
    queryFn: () => dashboardApi.summary(companyId!),
    enabled: !!companyId,
  });

  const touched: Issue[] = touchedQuery.data ?? [];
  const approvals: Approval[] = approvalsQuery.data ?? [];
  const joinRequests: JoinRequest[] = joinRequestsQuery.data ?? [];
  const heartbeats: HeartbeatRun[] = heartbeatsQuery.data ?? [];
  const agents: Agent[] = agentsQuery.data ?? [];
  const agentById = React.useMemo(() => {
    const m = new Map<string, Agent>();
    for (const a of agents) m.set(a.id, a);
    return m;
  }, [agents]);

  // ---- derive ----

  const recentIssues = React.useMemo(() => getRecentTouchedIssues(touched), [touched]);
  const unreadIssues = React.useMemo(() => getUnreadTouchedIssues(recentIssues), [recentIssues]);
  const failedRuns = React.useMemo(() => getLatestFailedRunsByAgent(heartbeats), [heartbeats]);

  const scopedApprovals = React.useMemo(
    () => getApprovalsForTab(approvals, tab, approvalFilter),
    [approvals, tab, approvalFilter],
  );

  const issuesForTab = tab === "unread" ? unreadIssues : recentIssues;

  const workItems: InboxWorkItem[] = React.useMemo(
    () =>
      getInboxWorkItems({
        issues: issuesForTab,
        approvals: scopedApprovals,
        failedRuns,
        joinRequests,
      }),
    [issuesForTab, scopedApprovals, failedRuns, joinRequests],
  );

  const filtered = React.useMemo(() => {
    return workItems.filter((item) => {
      // dismissed (local only) — always hide
      const id =
        item.kind === "issue"
          ? `issue:${item.issue.id}`
          : item.kind === "approval"
          ? `approval:${item.approval.id}`
          : item.kind === "failed_run"
          ? `failed_run:${item.run.id}`
          : `join_request:${item.joinRequest.id}`;
      if (dismissed.has(id)) return false;

      if (category === "everything") return true;
      if (category === "issues") return item.kind === "issue";
      if (category === "approvals") return item.kind === "approval";
      if (category === "failed_runs") return item.kind === "failed_run";
      if (category === "join_requests") return item.kind === "join_request";
      return true;
    });
  }, [workItems, dismissed, category]);

  // counts for primary tabs
  const tabCounts = React.useMemo(() => {
    const recentCount = recentIssues.length + approvals.length + failedRuns.length + joinRequests.length;
    const unreadCount =
      unreadIssues.length +
      approvals.filter((a) => ACTIONABLE_APPROVAL_STATUSES.has(a.status)).length +
      failedRuns.length +
      joinRequests.length;
    const allCount = recentIssues.length + approvals.length + failedRuns.length + joinRequests.length;
    return { recent: recentCount, unread: unreadCount, all: allCount };
  }, [recentIssues, unreadIssues, approvals, failedRuns, joinRequests]);

  const loading =
    touchedQuery.isLoading ||
    approvalsQuery.isLoading ||
    heartbeatsQuery.isLoading ||
    agentsQuery.isLoading ||
    dashboardQuery.isLoading;

  // ---- row-click targets ----

  function openIssue(issue: Issue) {
    // Work screen reads ?issue=:id to open its drawer
    window.location.href = `/${prefix}/work?issue=${issue.id}`;
  }
  function openApproval(_a: Approval) {
    window.location.href = `/${prefix}/approvals`;
  }
  function openFailedRun(run: HeartbeatRun) {
    const issueId = readIssueIdFromRun(run);
    if (issueId) {
      window.location.href = `/${prefix}/work?issue=${issueId}`;
    } else {
      window.location.href = `/${prefix}/activity`;
    }
  }
  function openJoinRequest(_r: JoinRequest) {
    // Classic handles join-request actions; send user there for now
    window.location.href = `/${prefix}/access`;
  }

  // ---- render ----

  if (!companyId) {
    return (
      <div style={{ padding: 24, color: "var(--ink-dim)" }}>
        Select a company to see its inbox.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, padding: "18px 22px", maxWidth: 1100 }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: "var(--ink)", margin: 0 }}>Inbox</h1>
          <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>
            What needs your eyes: issues you've touched, approvals, failed runs, join requests.
          </div>
        </div>
        <NavLink
          to={`/inbox`}
          style={{
            fontSize: 11,
            color: "var(--ink-faint)",
            textDecoration: "none",
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid var(--line)",
            background: "var(--bg-raised)",
          }}
        >
          Open classic inbox
        </NavLink>
      </div>

      {/* primary tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <PrimaryTab
          active={tab === "recent"}
          label="Recent"
          count={tabCounts.recent}
          onClick={() => setTab("recent")}
        />
        <PrimaryTab
          active={tab === "unread"}
          label="Unread"
          count={tabCounts.unread}
          onClick={() => setTab("unread")}
        />
        <PrimaryTab
          active={tab === "all"}
          label="All"
          count={tabCounts.all}
          onClick={() => setTab("all")}
        />
      </div>

      {/* category + approval sub-filter row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>Category</span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {CATEGORIES.map((c) => (
            <CategoryPill
              key={c.id}
              active={category === c.id}
              label={c.label}
              icon={c.icon}
              onClick={() => setCategory(c.id)}
            />
          ))}
        </div>
        {tab === "all" && (category === "everything" || category === "approvals") && (
          <>
            <span className="fw-uc" style={{ color: "var(--ink-faint)", marginLeft: 12 }}>
              Approval status
            </span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(["actionable", "resolved", "all"] as InboxApprovalFilter[]).map((f) => (
                <CategoryPill
                  key={f}
                  active={approvalFilter === f}
                  label={
                    f === "actionable"
                      ? "Needs action"
                      : f === "resolved"
                      ? "Resolved"
                      : "All"
                  }
                  icon={f === "actionable" ? I.bolt : f === "resolved" ? I.check : I.stack}
                  onClick={() => setApprovalFilter(f)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {loading && filtered.length === 0 && (
          <div
            style={{
              padding: "40px 16px",
              textAlign: "center",
              fontSize: 12,
              color: "var(--ink-faint)",
            }}
          >
            Loading inbox…
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div
            className="fw-card"
            style={{
              padding: "32px 16px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              gap: 6,
              alignItems: "center",
            }}
          >
            <Icon d={I.check} size={18} style={{ color: "var(--pulse)" }} />
            <div style={{ fontSize: 13, color: "var(--ink)", fontWeight: 500 }}>
              {tab === "unread"
                ? "All caught up — nothing unread."
                : category === "everything"
                ? "Inbox clear."
                : "Nothing to show for this filter."}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>
              Items land here as issues you've touched update or as approvals, failed runs, or join requests appear.
            </div>
          </div>
        )}
        {filtered.map((item) => {
          if (item.kind === "issue") {
            return (
              <IssueInboxRow
                key={`issue-${item.issue.id}`}
                issue={item.issue}
                onOpen={() => openIssue(item.issue)}
                onDismiss={() => dismiss(`issue:${item.issue.id}`)}
              />
            );
          }
          if (item.kind === "approval") {
            const requester = item.approval.requestedByAgentId
              ? agentById.get(item.approval.requestedByAgentId) ?? null
              : null;
            return (
              <ApprovalInboxRow
                key={`approval-${item.approval.id}`}
                approval={item.approval}
                requesterAgent={requester}
                onOpen={() => openApproval(item.approval)}
                onDismiss={() => dismiss(`approval:${item.approval.id}`)}
              />
            );
          }
          if (item.kind === "failed_run") {
            const agent = agentById.get(item.run.agentId) ?? null;
            return (
              <FailedRunInboxRow
                key={`run-${item.run.id}`}
                run={item.run}
                agent={agent}
                onOpen={() => openFailedRun(item.run)}
                onDismiss={() => dismiss(`failed_run:${item.run.id}`)}
              />
            );
          }
          return (
            <JoinRequestInboxRow
              key={`join-${item.joinRequest.id}`}
              request={item.joinRequest}
              onOpen={() => openJoinRequest(item.joinRequest)}
              onDismiss={() => dismiss(`join_request:${item.joinRequest.id}`)}
            />
          );
        })}
      </div>

      <div
        style={{
          fontSize: 11,
          color: "var(--ink-faint)",
          textAlign: "center",
          paddingTop: 8,
          borderTop: "1px solid var(--line)",
        }}
      >
        Polls every 30s · dismissals are local to this browser · approvals & join requests open in their dedicated screens.
      </div>
    </div>
  );
}
