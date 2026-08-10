import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NavLink, useParams } from "@/lib/router";
import { issuesApi } from "@/api/issues";
import { agentsApi } from "@/api/agents";
import { goalsApi } from "@/api/goals";
import { projectsApi } from "@/api/projects";
import { activityApi } from "@/api/activity";
import { useCompany } from "@/context/CompanyContext";
import { queryKeys } from "@/lib/queryKeys";
import type {
  ActivityEvent,
  Agent,
  Issue,
  IssueComment,
  Project,
} from "@doerai/shared";
import { ISSUE_STATUSES, ISSUE_PRIORITIES } from "@doerai/shared";
import {
  Avatar,
  ErrorState,
  Icon,
  I,
  LoadingState,
  StatusChip,
  formatRelative,
} from "./utils";
import { IssueFilesSection } from "./IssueFilesSection";

/* ============================================================
   FernwehIssueDetail — dedicated detail page for a single issue.
   Route: /:companyPrefix/fernweh/work/:issueId
   Parity: read + converse + status/priority/assignee edits.
   Deep flows (attachments, documents, work-products, plugin
   slots, exec-workspace settings) link out to classic.
============================================================ */

function priorityColor(priority: string): string {
  if (priority === "critical") return "var(--danger)";
  if (priority === "high") return "var(--warn)";
  if (priority === "medium") return "var(--accent)";
  return "var(--ink-faint)";
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

function CommentComposer({
  onSubmit,
  pending,
}: {
  onSubmit: (body: string, reopen: boolean, interrupt: boolean) => void;
  pending: boolean;
}) {
  const [body, setBody] = React.useState("");
  const [reopen, setReopen] = React.useState(false);
  const [interrupt, setInterrupt] = React.useState(false);
  const canSubmit = body.trim().length > 0 && !pending;

  const send = () => {
    if (!canSubmit) return;
    onSubmit(body.trim(), reopen, interrupt);
    setBody("");
    setReopen(false);
    setInterrupt(false);
  };

  return (
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
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Leave a comment… (⌘↵ to send)"
        rows={3}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canSubmit) {
            e.preventDefault();
            send();
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
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            color: "var(--ink-dim)",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={reopen}
            onChange={(e) => setReopen(e.target.checked)}
            style={{ accentColor: "var(--accent)" }}
          />
          Reopen if done
        </label>
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            color: "var(--ink-dim)",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={interrupt}
            onChange={(e) => setInterrupt(e.target.checked)}
            style={{ accentColor: "var(--accent)" }}
          />
          Interrupt run
        </label>
        <button
          onClick={send}
          disabled={!canSubmit}
          style={{
            marginLeft: "auto",
            padding: "5px 12px",
            borderRadius: 6,
            border: "1px solid var(--accent)",
            background: canSubmit ? "var(--accent)" : "var(--bg-sunken)",
            color: canSubmit ? "var(--bg)" : "var(--ink-faint)",
            fontSize: 12,
            fontWeight: 500,
            cursor: canSubmit ? "pointer" : "not-allowed",
          }}
        >
          {pending ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}

function CommentsThread({
  comments,
  agentsById,
  loading,
}: {
  comments: IssueComment[];
  agentsById: Map<string, Agent>;
  loading: boolean;
}) {
  if (loading && comments.length === 0) {
    return (
      <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>Loading comments…</span>
    );
  }
  if (comments.length === 0) {
    return (
      <span style={{ fontSize: 12, color: "var(--ink-faint)", fontStyle: "italic" }}>
        No comments yet.
      </span>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {comments.map((c) => {
        const author = c.authorAgentId ? agentsById.get(c.authorAgentId) ?? null : null;
        const displayName = author?.name ?? (c.authorUserId ? "User" : "System");
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
                <span style={{ fontSize: 12, fontWeight: 500 }}>{displayName}</span>
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

export function FernwehIssueDetail() {
  const { companyPrefix, issueId } = useParams<{
    companyPrefix: string;
    issueId: string;
  }>();
  const { selectedCompany } = useCompany();
  const qc = useQueryClient();

  const companyId = selectedCompany?.id;
  const prefix = companyPrefix ?? selectedCompany?.issuePrefix ?? "";

  const issueQuery = useQuery<Issue>({
    queryKey: queryKeys.issues.detail(issueId!),
    queryFn: () => issuesApi.get(issueId!) as Promise<Issue>,
    enabled: !!issueId,
    refetchInterval: 15_000,
  });

  const commentsQuery = useQuery<IssueComment[]>({
    queryKey: queryKeys.issues.comments(issueId ?? "none"),
    queryFn: () => issuesApi.listComments(issueId!),
    enabled: !!issueId,
    refetchInterval: 10_000,
  });

  const activityQuery = useQuery<ActivityEvent[]>({
    queryKey: queryKeys.issues.activity(issueId ?? "none"),
    queryFn: () =>
      activityApi.list(companyId!, { entityType: "issue", entityId: issueId }),
    enabled: !!(companyId && issueId),
  });

  const agentsQuery = useQuery<Agent[]>({
    queryKey: companyId ? queryKeys.agents.list(companyId) : ["agents", "none"],
    queryFn: () => agentsApi.list(companyId!),
    enabled: !!companyId,
  });

  const projectsQuery = useQuery<Project[]>({
    queryKey: companyId ? queryKeys.projects.list(companyId) : ["projects", "none"],
    queryFn: () => projectsApi.list(companyId!),
    enabled: !!companyId,
  });

  const goalsQuery = useQuery({
    queryKey: companyId ? queryKeys.goals.list(companyId) : ["goals", "none"],
    queryFn: () => goalsApi.list(companyId!),
    enabled: !!companyId,
  });

  const agentsById = React.useMemo(() => {
    const m = new Map<string, Agent>();
    (agentsQuery.data ?? []).forEach((a) => m.set(a.id, a));
    return m;
  }, [agentsQuery.data]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Issue>) =>
      issuesApi.update(issueId!, data as Record<string, unknown>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.issues.detail(issueId!) });
      if (companyId)
        qc.invalidateQueries({ queryKey: queryKeys.issues.list(companyId) });
    },
  });

  const commentMutation = useMutation({
    mutationFn: (vars: { body: string; reopen: boolean; interrupt: boolean }) =>
      issuesApi.addComment(issueId!, vars.body, vars.reopen, vars.interrupt),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.issues.comments(issueId!) });
      qc.invalidateQueries({ queryKey: queryKeys.issues.detail(issueId!) });
      qc.invalidateQueries({ queryKey: queryKeys.issues.activity(issueId!) });
    },
  });

  const issue = issueQuery.data ?? null;
  const comments = commentsQuery.data ?? [];
  const activity = activityQuery.data ?? [];
  const projects = projectsQuery.data ?? [];

  // ---- inline edit state ----
  const [titleDraft, setTitleDraft] = React.useState("");
  const [titleDirty, setTitleDirty] = React.useState(false);
  const [descDraft, setDescDraft] = React.useState("");
  const [descDirty, setDescDirty] = React.useState(false);
  const [editingDesc, setEditingDesc] = React.useState(false);

  React.useEffect(() => {
    if (issue) {
      setTitleDraft(issue.title);
      setTitleDirty(false);
      setDescDraft(issue.description ?? "");
      setDescDirty(false);
    }
  }, [issue?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (issueQuery.isLoading && !issue) {
    return <LoadingState label="Loading issue…" />;
  }
  if (issueQuery.error && !issue) {
    return (
      <div style={{ padding: 32 }}>
        <ErrorState error={issueQuery.error} hint={`Issue id: ${issueId ?? "—"}`} />
      </div>
    );
  }
  if (!issue) return null;

  const assignee = issue.assigneeAgentId ? agentsById.get(issue.assigneeAgentId) ?? null : null;
  const project = issue.projectId
    ? projects.find((p) => p.id === issue.projectId) ?? null
    : null;

  return (
    <div
      style={{
        padding: "32px 36px 60px",
        display: "flex",
        flexDirection: "column",
        gap: 24,
        maxWidth: 1100,
        margin: "0 auto",
      }}
    >
      {/* Back link */}
      <div>
        <NavLink
          to={`/${prefix}/fernweh/work`}
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
          <span>All work</span>
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span
            className="fw-mono"
            style={{ fontSize: 12, color: "var(--ink-faint)" }}
          >
            {issue.identifier ?? issue.id.slice(0, 6)}
          </span>
          <StatusChip status={issue.status.replace(/_/g, " ")} />
          <span
            className="fw-chip"
            style={{
              color: priorityColor(issue.priority),
              borderColor: priorityColor(issue.priority),
              textTransform: "capitalize",
            }}
          >
            {issue.priority}
          </span>
          {project ? (
            <NavLink
              to={`/${prefix}/fernweh/projects`}
              className="fw-chip"
              style={{ color: "var(--ink-dim)", textDecoration: "none" }}
            >
              {project.name}
            </NavLink>
          ) : null}
          {issue.labels?.map((label) => (
            <span
              key={label.id}
              className="fw-chip"
              style={{
                color: label.color,
                borderColor: label.color,
              }}
            >
              {label.name}
            </span>
          ))}
        </div>

        <input
          value={titleDraft}
          onChange={(e) => {
            setTitleDraft(e.target.value);
            setTitleDirty(true);
          }}
          onBlur={() => {
            if (titleDirty && titleDraft.trim() && titleDraft !== issue.title) {
              updateMutation.mutate({ title: titleDraft.trim() });
              setTitleDirty(false);
            }
          }}
          style={{
            background: "transparent",
            border: "none",
            outline: "none",
            fontSize: 22,
            fontWeight: 600,
            color: "var(--ink)",
            fontFamily: "var(--font-display-active)",
            width: "100%",
          }}
        />

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
          <span>Created {formatRelative(issue.createdAt)}</span>
          <span>·</span>
          <span>Updated {formatRelative(issue.updatedAt)}</span>
          {issue.startedAt ? (
            <>
              <span>·</span>
              <span>Started {formatRelative(issue.startedAt)}</span>
            </>
          ) : null}
          {issue.completedAt ? (
            <>
              <span>·</span>
              <span>Completed {formatRelative(issue.completedAt)}</span>
            </>
          ) : null}
        </div>
      </header>

      {/* Description */}
      <Section
        title="Description"
        right={
          editingDesc ? (
            <div style={{ display: "flex", gap: 6 }}>
              <button
                onClick={() => {
                  setDescDraft(issue.description ?? "");
                  setDescDirty(false);
                  setEditingDesc(false);
                }}
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: "1px solid var(--line)",
                  background: "transparent",
                  color: "var(--ink-dim)",
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (descDirty && descDraft !== (issue.description ?? "")) {
                    updateMutation.mutate({ description: descDraft });
                  }
                  setDescDirty(false);
                  setEditingDesc(false);
                }}
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: "1px solid var(--accent)",
                  background: "var(--accent)",
                  color: "var(--bg)",
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Save
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingDesc(true)}
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                border: "1px solid var(--line)",
                background: "transparent",
                color: "var(--ink-dim)",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              Edit
            </button>
          )
        }
      >
        <div className="fw-card" style={{ padding: 16 }}>
          {editingDesc ? (
            <textarea
              value={descDraft}
              onChange={(e) => {
                setDescDraft(e.target.value);
                setDescDirty(true);
              }}
              rows={8}
              style={{
                width: "100%",
                background: "var(--bg-raised)",
                border: "1px solid var(--line)",
                borderRadius: 6,
                padding: 10,
                color: "var(--ink)",
                fontSize: 13,
                lineHeight: 1.55,
                resize: "vertical",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
          ) : issue.description ? (
            <p
              style={{
                margin: 0,
                fontSize: 13,
                lineHeight: 1.6,
                color: "var(--ink-dim)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {issue.description}
            </p>
          ) : (
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "var(--ink-faint)",
                fontStyle: "italic",
              }}
            >
              No description.
            </p>
          )}
        </div>
      </Section>

      {/* Properties grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Section title="Properties">
          <div
            className="fw-card"
            style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}
          >
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
                Status
              </span>
              <select
                value={issue.status}
                onChange={(e) => updateMutation.mutate({ status: e.target.value as Issue["status"] })}
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid var(--line)",
                  background: "var(--bg-raised)",
                  color: "var(--ink)",
                  fontSize: 13,
                  textTransform: "capitalize",
                }}
              >
                {ISSUE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
                Priority
              </span>
              <select
                value={issue.priority}
                onChange={(e) => updateMutation.mutate({ priority: e.target.value as Issue["priority"] })}
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid var(--line)",
                  background: "var(--bg-raised)",
                  color: "var(--ink)",
                  fontSize: 13,
                  textTransform: "capitalize",
                }}
              >
                {ISSUE_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
                Assignee
              </span>
              <select
                value={issue.assigneeAgentId ?? ""}
                onChange={(e) =>
                  updateMutation.mutate({
                    assigneeAgentId: e.target.value === "" ? null : e.target.value,
                  })
                }
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid var(--line)",
                  background: "var(--bg-raised)",
                  color: "var(--ink)",
                  fontSize: 13,
                }}
              >
                <option value="">Unassigned</option>
                {(agentsQuery.data ?? []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                    {a.title ? ` — ${a.title}` : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </Section>

        <Section title="Context">
          <div
            className="fw-card"
            style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}
          >
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
                Project
              </span>
              <select
                value={issue.projectId ?? ""}
                onChange={(e) =>
                  updateMutation.mutate({
                    projectId: e.target.value === "" ? null : e.target.value,
                  } as Partial<Issue>)
                }
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid var(--line)",
                  background: "var(--bg-raised)",
                  color: "var(--ink)",
                  fontSize: 13,
                }}
              >
                <option value="">No project</option>
                {(projectsQuery.data ?? []).filter((p) => !p.archivedAt).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
                Goal
              </span>
              <select
                value={issue.goalId ?? ""}
                onChange={(e) =>
                  updateMutation.mutate({
                    goalId: e.target.value === "" ? null : e.target.value,
                  } as Partial<Issue>)
                }
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid var(--line)",
                  background: "var(--bg-raised)",
                  color: "var(--ink)",
                  fontSize: 13,
                }}
              >
                <option value="">No goal</option>
                {(goalsQuery.data ?? []).map((g) => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
              </select>
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
                Currently assigned
              </span>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  color: "var(--ink-dim)",
                }}
              >
                {assignee ? (
                  <>
                    <Avatar name={assignee.name} size={20} />
                    <NavLink
                      to={`/${prefix}/fernweh/agents/${assignee.id}`}
                      style={{ color: "var(--ink)", textDecoration: "none" }}
                    >
                      {assignee.name}
                    </NavLink>
                  </>
                ) : (
                  <span style={{ color: "var(--ink-faint)" }}>Unassigned</span>
                )}
              </div>
            </div>
            <NavLink
              to={`/${prefix}/issues/${issue.id}`}
              style={{
                marginTop: 4,
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: "var(--bg-raised)",
                color: "var(--ink-dim)",
                fontSize: 12,
                textAlign: "center",
                textDecoration: "none",
              }}
            >
              Edit attachments / documents / workspace in classic →
            </NavLink>
          </div>
        </Section>
      </div>

      {/* Comments */}
      <Section
        title="Conversation"
        hint={`${comments.length}`}
      >
        <CommentComposer
          pending={commentMutation.isPending}
          onSubmit={(body, reopen, interrupt) =>
            commentMutation.mutate({ body, reopen, interrupt })
          }
        />
        <CommentsThread
          comments={comments}
          agentsById={agentsById}
          loading={commentsQuery.isLoading}
        />
      </Section>

      {/* Activity log */}
      <Section title="Activity" hint={`${activity.length}`}>
        {activityQuery.isLoading && activity.length === 0 ? (
          <LoadingState label="Loading activity…" />
        ) : activity.length === 0 ? (
          <div
            className="fw-card"
            style={{ padding: 20, color: "var(--ink-faint)", fontSize: 12 }}
          >
            No activity yet.
          </div>
        ) : (
          <div className="fw-card" style={{ padding: 0, overflow: "hidden" }}>
            {activity.slice(0, 20).map((event, idx) => {
              const last = idx >= Math.min(20, activity.length) - 1;
              const actor =
                event.actorType === "agent"
                  ? agentsById.get(event.actorId)?.name ?? "Agent"
                  : event.actorType === "user"
                    ? "User"
                    : "System";
              return (
                <div
                  key={event.id}
                  style={{
                    padding: "10px 14px",
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto",
                    gap: 12,
                    alignItems: "center",
                    borderBottom: last ? "none" : "1px solid var(--line-soft)",
                    fontSize: 12,
                  }}
                >
                  <span
                    className="fw-mono"
                    style={{ fontSize: 10, color: "var(--ink-faint)" }}
                  >
                    {event.action}
                  </span>
                  <span style={{ color: "var(--ink-dim)" }}>{actor}</span>
                  <span
                    className="fw-mono"
                    style={{ fontSize: 11, color: "var(--ink-faint)" }}
                  >
                    {formatRelative(event.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Files captured against this issue — explorer with inline preview */}
      {companyId ? (
        <IssueFilesSection
          companyId={companyId}
          prefix={prefix}
          issueId={issue.id}
        />
      ) : null}

      {/* Footer */}
      <footer
        style={{
          paddingTop: 12,
          borderTop: "1px solid var(--line-soft)",
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          fontSize: 11,
          color: "var(--ink-faint)",
        }}
      >
        <span className="fw-mono">{issue.id.slice(0, 8)}</span>
        {issue.parentId ? (
          <>
            <span>·</span>
            <span>Parent {issue.parentId.slice(0, 8)}</span>
          </>
        ) : null}
        {issue.requestDepth > 0 ? (
          <>
            <span>·</span>
            <span>Depth {issue.requestDepth}</span>
          </>
        ) : null}
      </footer>
    </div>
  );
}
