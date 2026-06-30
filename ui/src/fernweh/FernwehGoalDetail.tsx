import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NavLink, useNavigate, useParams } from "@/lib/router";
import { useCompany } from "@/context/CompanyContext";
import { goalsApi } from "@/api/goals";
import { agentsApi } from "@/api/agents";
import { projectsApi } from "@/api/projects";
import { issuesApi } from "@/api/issues";
import { queryKeys } from "@/lib/queryKeys";
import type { Goal } from "@doerai/shared";
import { GOAL_LEVELS, GOAL_STATUSES } from "@doerai/shared";
import type { GoalLevel, GoalStatus } from "@doerai/shared";
import {
  Avatar,
  EmptyState,
  ErrorState,
  Icon,
  I,
  LoadingState,
  StatusChip,
  formatRelative,
} from "./utils";

/* ============================================================
   FernwehGoalDetail — detail view for a single goal.
   Route: /:companyPrefix/goals/:goalId
============================================================ */

function Section({
  label,
  children,
  right,
}: {
  label: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
          {label}
        </span>
        {right}
      </div>
      {children}
    </div>
  );
}

const LEVEL_COLOR: Record<GoalLevel, string> = {
  company: "var(--accent)",
  team: "var(--pulse)",
  agent: "var(--ink-dim)",
  task: "var(--ink-faint)",
};

const STATUS_COLOR: Record<GoalStatus, string> = {
  planned: "var(--ink-dim)",
  active: "var(--pulse)",
  achieved: "var(--accent)",
  cancelled: "var(--ink-faint)",
};

export function FernwehGoalDetail() {
  const { companyPrefix, goalId } = useParams<{ companyPrefix: string; goalId: string }>();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id ?? "";
  const qc = useQueryClient();
  const navigate = useNavigate();

  // Local edit state
  const [editTitle, setEditTitle] = React.useState<string | null>(null);
  const [editDesc, setEditDesc] = React.useState<string | null>(null);

  // Queries
  const goalQuery = useQuery({
    queryKey: queryKeys.goals.detail(goalId!),
    queryFn: () => goalsApi.get(goalId!),
    enabled: !!goalId,
  });

  const allGoalsQuery = useQuery({
    queryKey: queryKeys.goals.list(companyId),
    queryFn: () => goalsApi.list(companyId),
    enabled: !!companyId,
  });

  const agentsQuery = useQuery({
    queryKey: queryKeys.agents.list(companyId),
    queryFn: () => agentsApi.list(companyId),
    enabled: !!companyId && !!goalQuery.data?.ownerAgentId,
  });

  const projectsQuery = useQuery({
    queryKey: queryKeys.projects.list(companyId),
    queryFn: () => projectsApi.list(companyId),
    enabled: !!companyId,
  });

  const issuesQuery = useQuery({
    queryKey: queryKeys.issues.list(companyId),
    queryFn: () => issuesApi.list(companyId),
    enabled: !!companyId,
  });

  // Mutations
  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => goalsApi.update(goalId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.goals.detail(goalId!) });
      qc.invalidateQueries({ queryKey: queryKeys.goals.list(companyId) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => goalsApi.remove(goalId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.goals.list(companyId) });
      navigate(`/${companyPrefix}/goals`);
    },
  });

  const linkProjectMutation = useMutation({
    mutationFn: (project: { id: string; goalIds: string[] }) =>
      projectsApi.update(project.id, { goalIds: [...project.goalIds, goalId!] }, companyId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.projects.list(companyId) }),
  });

  const unlinkProjectMutation = useMutation({
    mutationFn: (project: { id: string; goalIds: string[] }) =>
      projectsApi.update(project.id, { goalIds: project.goalIds.filter((id) => id !== goalId) }, companyId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.projects.list(companyId) }),
  });

  const [confirmDelete, setConfirmDelete] = React.useState(false);

  // Guards
  if (goalQuery.isLoading) return <LoadingState />;
  if (goalQuery.error) return <ErrorState error={goalQuery.error} />;
  const goal = goalQuery.data;
  if (!goal) return <EmptyState title="Goal not found." />;

  // Derived data
  const allGoals: Goal[] = allGoalsQuery.data ?? [];
  const parentGoal = goal.parentId ? allGoals.find((g) => g.id === goal.parentId) : null;
  const childGoals = allGoals.filter((g) => g.parentId === goal.id);
  const ownerAgent = goal.ownerAgentId
    ? (agentsQuery.data ?? []).find((a) => a.id === goal.ownerAgentId)
    : null;
  const linkedProjects = (projectsQuery.data ?? []).filter(
    (p) => p.goalIds.includes(goal.id) || p.goalId === goal.id,
  );
  const linkedProjectIds = new Set(linkedProjects.map((p) => p.id));
  const unlinkableProjects = (projectsQuery.data ?? []).filter((p) => !linkedProjectIds.has(p.id) && !p.archivedAt);
  const linkedIssues = (issuesQuery.data ?? []).filter((i) => i.goalId === goal.id);

  const titleValue = editTitle ?? goal.title;
  const descValue = editDesc ?? (goal.description ?? "");

  return (
    <div
      style={{
        maxWidth: 860,
        margin: "0 auto",
        padding: "28px 24px 80px",
        display: "flex",
        flexDirection: "column",
        gap: 28,
      }}
    >
      {/* Back link */}
      <div>
        <NavLink
          to={`/${companyPrefix}/goals`}
          style={{ color: "var(--ink-dim)", textDecoration: "none", fontSize: 14 }}
        >
          ← Goals
        </NavLink>
      </div>

      {/* Header card */}
      <div className="fw-card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Level badge */}
          <span
            className="fw-chip fw-uc"
            style={{
              background: LEVEL_COLOR[goal.level as GoalLevel] ?? "var(--ink-faint)",
              color: "var(--bg-raised)",
              fontSize: 11,
              padding: "2px 8px",
            }}
          >
            {goal.level}
          </span>
          {/* Status chip */}
          <StatusChip status={goal.status} />
        </div>
        {/* Inline-editable title */}
        <input
          value={titleValue}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={() => {
            if (editTitle !== null && editTitle !== goal.title) {
              updateMutation.mutate({ title: editTitle });
            }
            setEditTitle(null);
          }}
          style={{
            font: "inherit",
            fontSize: 22,
            fontWeight: 700,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--ink)",
            width: "100%",
            padding: 0,
          }}
        />
        <div style={{ color: "var(--ink-faint)", fontSize: 13 }}>
          Created {formatRelative(goal.createdAt)} · Updated {formatRelative(goal.updatedAt)}
        </div>
      </div>

      {/* Status */}
      <Section label="Status">
        <select
          value={goal.status}
          onChange={(e) => updateMutation.mutate({ status: e.target.value })}
          style={{
            background: "var(--bg-raised)",
            border: "1px solid var(--line-soft)",
            borderRadius: 6,
            color: STATUS_COLOR[goal.status as GoalStatus] ?? "var(--ink)",
            fontSize: 14,
            padding: "6px 10px",
            cursor: "pointer",
          }}
        >
          {GOAL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Section>

      {/* Description */}
      <Section label="Description">
        <textarea
          value={descValue}
          onChange={(e) => setEditDesc(e.target.value)}
          onBlur={() => {
            if (editDesc !== null && editDesc !== (goal.description ?? "")) {
              updateMutation.mutate({ description: editDesc });
            }
            setEditDesc(null);
          }}
          rows={4}
          placeholder="Add a description…"
          style={{
            background: "var(--bg-sunken)",
            border: "1px solid var(--line-soft)",
            borderRadius: 6,
            color: "var(--ink)",
            fontSize: 14,
            padding: "8px 10px",
            resize: "vertical",
            width: "100%",
            boxSizing: "border-box",
            fontFamily: "inherit",
          }}
        />
      </Section>

      {/* Owner Agent */}
      <Section label="Owner Agent">
        {ownerAgent ? (
          <div
            className="fw-card"
            style={{
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Avatar name={ownerAgent.name} size={32} />
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>
                  {ownerAgent.name}
                </span>
                <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>{ownerAgent.role}</span>
              </div>
            </div>
            <NavLink
              to={`/${companyPrefix}/agents/${ownerAgent.id}`}
              style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none" }}
            >
              Open ↗
            </NavLink>
          </div>
        ) : (
          <span style={{ color: "var(--ink-faint)", fontSize: 14 }}>No owner agent.</span>
        )}
      </Section>

      {/* Parent Goal */}
      <Section label="Parent Goal">
        {parentGoal ? (
          <NavLink
            to={`/${companyPrefix}/goals/${parentGoal.id}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "var(--ink)",
              textDecoration: "none",
              fontSize: 14,
            }}
          >
            <Icon d={I.arrow} size={14} style={{ color: "var(--ink-faint)" }} />
            <span>{parentGoal.title}</span>
            <span
              className="fw-chip fw-uc"
              style={{ fontSize: 11, color: "var(--ink-faint)" }}
            >
              {parentGoal.level}
            </span>
          </NavLink>
        ) : (
          <span style={{ color: "var(--ink-faint)", fontSize: 14 }}>No parent goal.</span>
        )}
      </Section>

      {/* Child Goals */}
      <Section label={`Child Goals (${childGoals.length})`}>
        {childGoals.length === 0 ? (
          <EmptyState title="No child goals." />
        ) : (
          <div
            className="fw-card"
            style={{ display: "flex", flexDirection: "column", gap: 0, overflow: "hidden" }}
          >
            {childGoals.map((child, idx) => (
              <NavLink
                key={child.id}
                to={`/${companyPrefix}/goals/${child.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderTop: idx === 0 ? "none" : "1px solid var(--line-soft)",
                  textDecoration: "none",
                  color: "var(--ink)",
                }}
              >
                <span style={{ fontSize: 14 }}>{child.title}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    className="fw-chip fw-uc"
                    style={{ fontSize: 11, color: "var(--ink-faint)" }}
                  >
                    {child.level}
                  </span>
                  <StatusChip status={child.status} />
                </div>
              </NavLink>
            ))}
          </div>
        )}
      </Section>

      {/* Projects */}
      <Section label={`Projects (${linkedProjects.length})`}>
        {unlinkableProjects.length > 0 && (
          <select
            value=""
            onChange={(e) => {
              const project = (projectsQuery.data ?? []).find((p) => p.id === e.target.value);
              if (project) linkProjectMutation.mutate({ id: project.id, goalIds: project.goalIds });
            }}
            style={{
              marginBottom: 8,
              padding: "6px 10px",
              borderRadius: 6,
              border: "1px solid var(--line)",
              background: "var(--bg-raised)",
              color: "var(--ink-dim)",
              fontSize: 13,
              width: "100%",
            }}
          >
            <option value="">+ Link a project…</option>
            {unlinkableProjects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
        {linkedProjects.length === 0 ? (
          <EmptyState title="No linked projects." />
        ) : (
          <div
            className="fw-card"
            style={{ display: "flex", flexDirection: "column", gap: 0, overflow: "hidden" }}
          >
            {linkedProjects.map((p, idx) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  borderTop: idx === 0 ? "none" : "1px solid var(--line-soft)",
                }}
              >
                <NavLink
                  to={`/${companyPrefix}/projects/${p.id}`}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    textDecoration: "none",
                    color: "var(--ink)",
                  }}
                >
                  <span style={{ fontSize: 14 }}>{p.name}</span>
                  <StatusChip status={p.status} />
                </NavLink>
                <button
                  onClick={() => unlinkProjectMutation.mutate({ id: p.id, goalIds: p.goalIds })}
                  title="Unlink project"
                  style={{
                    padding: "0 10px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--ink-faint)",
                    fontSize: 16,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Issues */}
      <Section label={`Issues (${linkedIssues.length})`}>
        {linkedIssues.length === 0 ? (
          <EmptyState title="No linked issues." />
        ) : (
          <div
            className="fw-card"
            style={{ display: "flex", flexDirection: "column", gap: 0, overflow: "hidden" }}
          >
            {linkedIssues.map((issue, idx) => (
              <NavLink
                key={issue.id}
                to={`/${companyPrefix}/work/${issue.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderTop: idx === 0 ? "none" : "1px solid var(--line-soft)",
                  textDecoration: "none",
                  color: "var(--ink)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {issue.identifier ? (
                    <span className="fw-mono" style={{ fontSize: 12, color: "var(--ink-faint)" }}>
                      {issue.identifier}
                    </span>
                  ) : null}
                  <span style={{ fontSize: 14 }}>{issue.title}</span>
                </div>
                <StatusChip status={issue.status} />
              </NavLink>
            ))}
          </div>
        )}
      </Section>

      {/* Footer */}
      <div
        style={{
          borderTop: "1px solid var(--line-soft)",
          paddingTop: 16,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span className="fw-mono" style={{ fontSize: 12, color: "var(--ink-faint)" }}>
          {goal.id}
        </span>
        <div style={{ flex: 1 }} />
        <NavLink
          to={`/${companyPrefix}/goals/${goalId}`}
          style={{ fontSize: 13, color: "var(--ink-dim)", textDecoration: "none" }}
        >
          Classic view ↗
        </NavLink>
        <button
          onClick={() => {
            if (confirmDelete) deleteMutation.mutate();
            else setConfirmDelete(true);
          }}
          onMouseLeave={() => setConfirmDelete(false)}
          disabled={deleteMutation.isPending}
          style={{
            fontSize: 12,
            color: confirmDelete ? "var(--bg)" : "var(--danger)",
            background: confirmDelete ? "var(--danger)" : "transparent",
            border: "1px solid var(--danger)",
            borderRadius: 6,
            padding: "5px 12px",
            cursor: deleteMutation.isPending ? "not-allowed" : "pointer",
            opacity: deleteMutation.isPending ? 0.5 : 1,
            transition: "all .15s var(--fw-ease)",
          }}
        >
          {deleteMutation.isPending ? "Deleting…" : confirmDelete ? "Confirm delete?" : "Delete goal"}
        </button>
      </div>
    </div>
  );
}
