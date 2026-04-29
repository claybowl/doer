import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NavLink, useParams } from "@/lib/router";
import { approvalsApi } from "@/api/approvals";
import { agentsApi } from "@/api/agents";
import { useCompany } from "@/context/CompanyContext";
import { queryKeys } from "@/lib/queryKeys";
import type { Agent, Approval, ApprovalComment, Issue } from "@doerai/shared";
import {
  Avatar,
  ErrorState,
  Icon,
  I,
  LoadingState,
  formatRelative,
} from "./utils";
import {
  STATUS_COLOR,
  TYPE_ICON,
  TYPE_LABEL,
  approvalLabel,
} from "./FernwehApprovals";

/* ============================================================
   FernwehApprovalDetail — dedicated detail page for a single
   approval. Route: /:companyPrefix/fernweh/approvals/:approvalId
   Parity: review payload, approve / reject / request revision /
   resubmit, comment thread, linked issues. Budget-override
   approvals defer to /costs as in classic.
============================================================ */

function StatusChip({ status }: { status: Approval["status"] }) {
  const color = STATUS_COLOR[status] ?? "var(--ink-faint)";
  const pulsing = status === "pending" || status === "revision_requested";
  return (
    <span
      className="fw-chip"
      style={{
        color: "var(--ink-dim)",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: color,
          animation: pulsing ? "fw-pulse 1.6s var(--fw-ease) infinite" : "none",
        }}
      />
      <span style={{ textTransform: "capitalize" }}>
        {status.replace(/_/g, " ")}
      </span>
    </span>
  );
}

function Section({
  title,
  hint,
  right,
  children,
}: {
  title: string;
  hint?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <header
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <h2 className="fw-display" style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>
            {title}
          </h2>
          {hint ? (
            <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
              {hint}
            </span>
          ) : null}
        </div>
        {right}
      </header>
      {children}
    </section>
  );
}

function CommentsThread({
  comments,
  agentsById,
}: {
  comments: ApprovalComment[];
  agentsById: Map<string, Agent>;
}) {
  if (comments.length === 0) {
    return (
      <span
        style={{ fontSize: 12, color: "var(--ink-faint)", fontStyle: "italic" }}
      >
        No comments yet.
      </span>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {comments.map((c) => {
        const author = c.authorAgentId
          ? agentsById.get(c.authorAgentId) ?? null
          : null;
        const displayName = author?.name ?? (c.authorUserId ? "User" : "Board");
        return (
          <div
            key={c.id}
            style={{
              display: "flex",
              gap: 10,
              padding: 10,
              borderRadius: 8,
              background: "var(--bg-raised)",
              border: "1px solid var(--line-soft)",
            }}
          >
            <Avatar name={displayName} size={24} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 8,
                  marginBottom: 4,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 500 }}>
                  {displayName}
                </span>
                <span style={{ fontSize: 10, color: "var(--ink-faint)" }}>
                  {formatRelative(c.createdAt)}
                </span>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 12.5,
                  lineHeight: 1.55,
                  color: "var(--ink-dim)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {c.body}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function FernwehApprovalDetail() {
  const { companyPrefix, approvalId } = useParams<{
    companyPrefix: string;
    approvalId: string;
  }>();
  const { selectedCompany } = useCompany();
  const qc = useQueryClient();

  const companyId = selectedCompany?.id;
  const prefix = companyPrefix ?? selectedCompany?.issuePrefix ?? "";

  const approvalQuery = useQuery<Approval>({
    queryKey: queryKeys.approvals.detail(approvalId!),
    queryFn: () => approvalsApi.get(approvalId!),
    enabled: !!approvalId,
    refetchInterval: 15_000,
  });

  const commentsQuery = useQuery<ApprovalComment[]>({
    queryKey: queryKeys.approvals.comments(approvalId ?? "none"),
    queryFn: () => approvalsApi.listComments(approvalId!),
    enabled: !!approvalId,
    refetchInterval: 10_000,
  });

  const issuesQuery = useQuery<Issue[]>({
    queryKey: queryKeys.approvals.issues(approvalId ?? "none"),
    queryFn: () => approvalsApi.listIssues(approvalId!),
    enabled: !!approvalId,
  });

  const agentsQuery = useQuery<Agent[]>({
    queryKey: companyId ? queryKeys.agents.list(companyId) : ["agents", "none"],
    queryFn: () => agentsApi.list(companyId!),
    enabled: !!companyId,
  });

  const agentsById = React.useMemo(() => {
    const m = new Map<string, Agent>();
    (agentsQuery.data ?? []).forEach((a) => m.set(a.id, a));
    return m;
  }, [agentsQuery.data]);

  const refresh = () => {
    if (!approvalId) return;
    qc.invalidateQueries({ queryKey: queryKeys.approvals.detail(approvalId) });
    qc.invalidateQueries({ queryKey: queryKeys.approvals.comments(approvalId) });
    qc.invalidateQueries({ queryKey: queryKeys.approvals.issues(approvalId) });
    if (companyId)
      qc.invalidateQueries({ queryKey: queryKeys.approvals.list(companyId) });
  };

  const [note, setNote] = React.useState("");
  const [actionError, setActionError] = React.useState<string | null>(null);

  const approveMutation = useMutation({
    mutationFn: () => approvalsApi.approve(approvalId!, note.trim() || undefined),
    onSuccess: () => {
      setActionError(null);
      setNote("");
      refresh();
    },
    onError: (err) =>
      setActionError(err instanceof Error ? err.message : "Approve failed"),
  });

  const rejectMutation = useMutation({
    mutationFn: () => approvalsApi.reject(approvalId!, note.trim() || undefined),
    onSuccess: () => {
      setActionError(null);
      setNote("");
      refresh();
    },
    onError: (err) =>
      setActionError(err instanceof Error ? err.message : "Reject failed"),
  });

  const revisionMutation = useMutation({
    mutationFn: () =>
      approvalsApi.requestRevision(approvalId!, note.trim() || undefined),
    onSuccess: () => {
      setActionError(null);
      setNote("");
      refresh();
    },
    onError: (err) =>
      setActionError(
        err instanceof Error ? err.message : "Revision request failed",
      ),
  });

  const resubmitMutation = useMutation({
    mutationFn: () => approvalsApi.resubmit(approvalId!),
    onSuccess: () => {
      setActionError(null);
      refresh();
    },
    onError: (err) =>
      setActionError(err instanceof Error ? err.message : "Resubmit failed"),
  });

  const [commentBody, setCommentBody] = React.useState("");
  const commentMutation = useMutation({
    mutationFn: () => approvalsApi.addComment(approvalId!, commentBody.trim()),
    onSuccess: () => {
      setCommentBody("");
      qc.invalidateQueries({
        queryKey: queryKeys.approvals.comments(approvalId!),
      });
    },
  });

  const approval = approvalQuery.data ?? null;
  const comments = commentsQuery.data ?? [];
  const linkedIssues = issuesQuery.data ?? [];

  if (approvalQuery.isLoading && !approval) {
    return <LoadingState label="Loading approval…" />;
  }
  if (approvalQuery.error && !approval) {
    return (
      <div style={{ padding: 32 }}>
        <ErrorState
          error={approvalQuery.error}
          hint={`Approval id: ${approvalId ?? "—"}`}
        />
      </div>
    );
  }
  if (!approval) return null;

  const payload = approval.payload as Record<string, unknown>;
  const linkedAgentId =
    typeof payload.agentId === "string" ? payload.agentId : null;
  const isActionable =
    approval.status === "pending" || approval.status === "revision_requested";
  const isBudget = approval.type === "budget_override_required";
  const iconPath = TYPE_ICON[approval.type] ?? TYPE_ICON._default;
  const label = approvalLabel(approval.type, payload);

  return (
    <div
      style={{
        padding: "32px 36px 60px",
        display: "flex",
        flexDirection: "column",
        gap: 24,
        maxWidth: 920,
        margin: "0 auto",
      }}
    >
      {/* Back link */}
      <div>
        <NavLink
          to={`/${prefix}/fernweh/approvals`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: "var(--ink-faint)",
            textDecoration: "none",
          }}
        >
          <Icon d={I.arrow} size={11} style={{ transform: "rotate(180deg)" }} />
          <span>All approvals</span>
        </NavLink>
      </div>

      {/* Header */}
      <header
        className="fw-card"
        style={{
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "var(--bg-raised)",
              border: "1px solid var(--line)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--ink-dim)",
            }}
          >
            <Icon d={iconPath} size={16} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              className="fw-display"
              style={{
                fontSize: 20,
                fontWeight: 600,
                margin: 0,
                color: "var(--ink)",
              }}
            >
              {label}
            </h1>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 6,
                flexWrap: "wrap",
              }}
            >
              <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
                {TYPE_LABEL[approval.type] ?? approval.type}
              </span>
              <StatusChip status={approval.status} />
              <span className="fw-mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                {approval.id.slice(0, 8)}
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 11,
            color: "var(--ink-faint)",
            flexWrap: "wrap",
          }}
        >
          <span>Requested {formatRelative(approval.createdAt)}</span>
          {approval.requestedByAgentId ? (
            <>
              <span>·</span>
              <span>
                by{" "}
                {agentsById.get(approval.requestedByAgentId)?.name ??
                  approval.requestedByAgentId.slice(0, 8)}
              </span>
            </>
          ) : approval.requestedByUserId ? (
            <>
              <span>·</span>
              <span>by user</span>
            </>
          ) : null}
          {approval.decidedAt ? (
            <>
              <span>·</span>
              <span>Decided {formatRelative(approval.decidedAt)}</span>
            </>
          ) : null}
        </div>
      </header>

      {/* Payload */}
      <Section title="Request" hint={approval.type}>
        <div className="fw-card" style={{ padding: 16 }}>
          <pre
            style={{
              margin: 0,
              fontSize: 12,
              lineHeight: 1.55,
              color: "var(--ink-dim)",
              fontFamily: "var(--fw-font-mono)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              maxHeight: 360,
              overflow: "auto",
            }}
          >
            {JSON.stringify(payload, null, 2)}
          </pre>
        </div>
      </Section>

      {/* Linked issues */}
      {linkedIssues.length > 0 ? (
        <Section title="Linked issues" hint={`${linkedIssues.length}`}>
          <div className="fw-card" style={{ padding: 0, overflow: "hidden" }}>
            {linkedIssues.map((issue, idx) => (
              <NavLink
                key={issue.id}
                to={`/${prefix}/fernweh/work/${issue.id}`}
                style={{
                  padding: "10px 14px",
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  gap: 12,
                  alignItems: "center",
                  borderBottom:
                    idx < linkedIssues.length - 1
                      ? "1px solid var(--line-soft)"
                      : "none",
                  fontSize: 12.5,
                  textDecoration: "none",
                  color: "var(--ink)",
                }}
              >
                <span
                  className="fw-mono"
                  style={{ fontSize: 11, color: "var(--ink-faint)" }}
                >
                  {issue.identifier ?? issue.id.slice(0, 6)}
                </span>
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {issue.title ?? "Untitled"}
                </span>
                <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                  {formatRelative(issue.updatedAt)}
                </span>
              </NavLink>
            ))}
          </div>
          <p
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              marginTop: 4,
            }}
          >
            Linked issues remain open until the requesting agent follows up and
            closes them.
          </p>
        </Section>
      ) : null}

      {/* Decision panel */}
      <Section
        title="Decision"
        right={
          approval.decisionNote ? (
            <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>
              note recorded
            </span>
          ) : null
        }
      >
        <div
          className="fw-card"
          style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}
        >
          {isBudget && approval.status === "pending" ? (
            <p style={{ margin: 0, fontSize: 13, color: "var(--ink-dim)" }}>
              Resolve this budget stop from the budget controls on{" "}
              <NavLink
                to={`/${prefix}/fernweh/costs`}
                style={{ color: "var(--accent)" }}
              >
                Costs
              </NavLink>
              .
            </p>
          ) : null}

          {approval.decisionNote ? (
            <p
              style={{
                margin: 0,
                padding: 10,
                borderRadius: 6,
                background: "var(--bg-raised)",
                border: "1px solid var(--line-soft)",
                fontSize: 12.5,
                color: "var(--ink-dim)",
                whiteSpace: "pre-wrap",
              }}
            >
              {approval.decisionNote}
            </p>
          ) : null}

          {isActionable && !isBudget ? (
            <>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note for the record…"
                rows={3}
                style={{
                  border: "1px solid var(--line)",
                  outline: "none",
                  background: "var(--bg-raised)",
                  color: "var(--ink)",
                  fontSize: 13,
                  lineHeight: 1.5,
                  padding: 10,
                  borderRadius: 6,
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <button
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 8,
                    border: "1px solid var(--accent)",
                    background: "var(--accent)",
                    color: "var(--bg)",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Approve
                </button>
                <button
                  onClick={() => rejectMutation.mutate()}
                  disabled={rejectMutation.isPending}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 8,
                    border: "1px solid var(--danger)",
                    background: "transparent",
                    color: "var(--danger)",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Reject
                </button>
                {approval.status === "pending" ? (
                  <button
                    onClick={() => revisionMutation.mutate()}
                    disabled={revisionMutation.isPending}
                    style={{
                      padding: "7px 14px",
                      borderRadius: 8,
                      border: "1px solid var(--line)",
                      background: "var(--bg-raised)",
                      color: "var(--ink-dim)",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Request revision
                  </button>
                ) : null}
                {approval.status === "revision_requested" ? (
                  <button
                    onClick={() => resubmitMutation.mutate()}
                    disabled={resubmitMutation.isPending}
                    style={{
                      padding: "7px 14px",
                      borderRadius: 8,
                      border: "1px solid var(--line)",
                      background: "var(--bg-raised)",
                      color: "var(--ink-dim)",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Mark resubmitted
                  </button>
                ) : null}
              </div>
            </>
          ) : null}

          {actionError ? (
            <p
              style={{
                margin: 0,
                fontSize: 12,
                color: "var(--danger)",
              }}
            >
              {actionError}
            </p>
          ) : null}

          {linkedAgentId ? (
            <NavLink
              to={`/${prefix}/fernweh/agents/${linkedAgentId}`}
              style={{
                fontSize: 11,
                color: "var(--ink-faint)",
                textDecoration: "none",
              }}
            >
              View linked agent →
            </NavLink>
          ) : null}

          <NavLink
            to={`/${prefix}/approvals/${approval.id}`}
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              textDecoration: "none",
            }}
          >
            Open in classic →
          </NavLink>
        </div>
      </Section>

      {/* Comments */}
      <Section title="Comments" hint={`${comments.length}`}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: 10,
            border: "1px solid var(--line)",
            borderRadius: 8,
            background: "var(--bg-raised)",
          }}
        >
          <textarea
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            placeholder="Add a comment… (⌘↵ to send)"
            rows={2}
            onKeyDown={(e) => {
              if (
                (e.metaKey || e.ctrlKey) &&
                e.key === "Enter" &&
                commentBody.trim()
              ) {
                e.preventDefault();
                commentMutation.mutate();
              }
            }}
            style={{
              border: "none",
              outline: "none",
              background: "transparent",
              color: "var(--ink)",
              fontSize: 13,
              lineHeight: 1.5,
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />
          <button
            onClick={() => commentMutation.mutate()}
            disabled={!commentBody.trim() || commentMutation.isPending}
            style={{
              alignSelf: "flex-end",
              padding: "5px 12px",
              borderRadius: 6,
              border: "1px solid var(--accent)",
              background: commentBody.trim()
                ? "var(--accent)"
                : "var(--bg-sunken)",
              color: commentBody.trim() ? "var(--bg)" : "var(--ink-faint)",
              fontSize: 12,
              fontWeight: 500,
              cursor: commentBody.trim() ? "pointer" : "not-allowed",
            }}
          >
            {commentMutation.isPending ? "Posting…" : "Post"}
          </button>
        </div>
        <CommentsThread comments={comments} agentsById={agentsById} />
      </Section>
    </div>
  );
}
