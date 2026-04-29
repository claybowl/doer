import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NavLink, useParams } from "@/lib/router";
import { projectsApi } from "@/api/projects";
import { issuesApi } from "@/api/issues";
import { agentsApi } from "@/api/agents";
import { goalsApi } from "@/api/goals";
import { useCompany } from "@/context/CompanyContext";
import { queryKeys } from "@/lib/queryKeys";
import { PROJECT_STATUSES, type ProjectStatus } from "@doerai/shared";
import type { Agent, Goal, Issue, Project } from "@doerai/shared";
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
import { OutputsSection } from "./OutputsSection";

/* ============================================================
   FernwehProjectDetail — full page view for a single project.
   Route: /:companyPrefix/projects/:projectId
============================================================ */

const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  backlog: "Backlog",
  planned: "Planned",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const PROJECT_STATUS_COLOR: Record<ProjectStatus, string> = {
  backlog: "var(--ink-faint)",
  planned: "var(--ink-dim)",
  in_progress: "var(--pulse)",
  completed: "var(--accent)",
  cancelled: "var(--ink-faint)",
};

function ProjectStatusChip({ status }: { status: ProjectStatus }) {
  const color = PROJECT_STATUS_COLOR[status];
  return (
    <span
      className="fw-chip"
      style={{ color, display: "inline-flex", alignItems: "center", gap: 6 }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: color,
          display: "inline-block",
          animation: status === "in_progress" ? "fw-pulse 1.4s ease-in-out infinite" : undefined,
        }}
      />
      {PROJECT_STATUS_LABEL[status]}
    </span>
  );
}

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

export function FernwehProjectDetail() {
  const { companyPrefix, projectId } = useParams<{
    companyPrefix: string;
    projectId: string;
  }>();
  const { selectedCompany } = useCompany();
  const qc = useQueryClient();

  const companyId = selectedCompany?.id ?? "";

  // ── queries ──────────────────────────────────────────────────
  const projectQuery = useQuery<Project>({
    queryKey: queryKeys.projects.detail(projectId!),
    queryFn: () => projectsApi.get(projectId!, companyId),
    enabled: !!projectId && !!companyId,
  });

  const issuesQuery = useQuery<Issue[]>({
    queryKey: queryKeys.issues.list(companyId),
    queryFn: () => issuesApi.list(companyId),
    enabled: !!companyId,
  });

  const agentsQuery = useQuery<Agent[]>({
    queryKey: queryKeys.agents.list(companyId),
    queryFn: () => agentsApi.list(companyId),
    enabled: !!companyId,
  });

  const goalsQuery = useQuery<Goal[]>({
    queryKey: queryKeys.goals.list(companyId),
    queryFn: () => goalsApi.list(companyId),
    enabled: !!companyId,
  });

  // ── mutation ──────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      projectsApi.update(projectId!, data, companyId),
    onSuccess: (updated) => {
      if (!projectId) return;
      qc.setQueryData(queryKeys.projects.detail(projectId), updated);
      if (updated?.companyId) {
        qc.invalidateQueries({ queryKey: queryKeys.projects.list(updated.companyId) });
      }
    },
  });

  // ── local edit state ──────────────────────────────────────────
  const [nameDraft, setNameDraft] = React.useState("");
  const [descDraft, setDescDraft] = React.useState("");
  const [nameDirty, setNameDirty] = React.useState(false);
  const [descDirty, setDescDirty] = React.useState(false);

  const project = projectQuery.data ?? null;
  const allIssues = issuesQuery.data ?? [];
  const allAgents = agentsQuery.data ?? [];
  const allGoals = goalsQuery.data ?? [];

  React.useEffect(() => {
    if (project) {
      setNameDraft(project.name);
      setDescDraft(project.description ?? "");
      setNameDirty(false);
      setDescDirty(false);
    }
  }, [project?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!projectId) return null;

  // ── derived data ──────────────────────────────────────────────
  const issuesForProject = allIssues.filter((i) => i.projectId === projectId);
  const lead = project?.leadAgentId
    ? (allAgents.find((a) => a.id === project.leadAgentId) ?? null)
    : null;
  const goalsForProject = project
    ? allGoals.filter(
        (g) => project.goalIds.includes(g.id) || g.id === project.goalId,
      )
    : [];

  // ── loading/error states ──────────────────────────────────────
  if (projectQuery.isLoading && !project) {
    return <LoadingState label="Loading project…" />;
  }
  if (projectQuery.error && !project) {
    return <ErrorState error={projectQuery.error} />;
  }
  if (!project) {
    return <EmptyState title="Project not found" />;
  }

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
      {/* ── back link ── */}
      <NavLink
        to={`/${companyPrefix}/projects`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          color: "var(--ink-faint)",
          textDecoration: "none",
          width: "fit-content",
        }}
      >
        ←
        Projects
      </NavLink>

      {/* ── header card ── */}
      <div
        className="fw-card"
        style={{
          padding: "20px 22px",
          border: "1px solid var(--line)",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {/* eyebrow */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* color swatch */}
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: project.color ?? "var(--bg-sunken)",
              border: "1px solid var(--line)",
              color: project.color ? "#fff" : "var(--ink-faint)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "var(--fw-font-mono)",
            }}
          >
            {project.name.slice(0, 1).toUpperCase()}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
            <span className="fw-uc" style={{ color: "var(--ink-faint)", fontSize: 10 }}>
              {project.urlKey ?? "Project"}
            </span>
            <input
              value={nameDraft}
              onChange={(e) => {
                setNameDraft(e.target.value);
                setNameDirty(true);
              }}
              onBlur={() => {
                if (nameDirty && nameDraft.trim() && nameDraft !== project.name) {
                  updateMutation.mutate({ name: nameDraft.trim() });
                  setNameDirty(false);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.currentTarget.blur();
                }
              }}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: 22,
                fontWeight: 700,
                color: "var(--ink)",
                fontFamily: "var(--font-display-active)",
                lineHeight: 1.2,
              }}
            />
          </div>
          <ProjectStatusChip status={project.status} />
        </div>

        {/* meta row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            paddingTop: 4,
            borderTop: "1px solid var(--line-soft)",
          }}
        >
          <select
            value={project.status}
            onChange={(e) => updateMutation.mutate({ status: e.target.value })}
            style={{
              padding: "4px 8px",
              borderRadius: 6,
              border: "1px solid var(--line)",
              background: "var(--bg-raised)",
              color: PROJECT_STATUS_COLOR[project.status],
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PROJECT_STATUS_LABEL[s]}
              </option>
            ))}
          </select>

          {project.targetDate ? (
            <span className="fw-chip" style={{ fontSize: 11, color: "var(--ink-dim)" }}>
              Target {project.targetDate}
            </span>
          ) : null}

          {project.archivedAt ? (
            <span className="fw-chip" style={{ fontSize: 11, color: "var(--warn)" }}>
              Archived {formatRelative(project.archivedAt)}
            </span>
          ) : null}

          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>
            Updated {formatRelative(project.updatedAt)}
          </span>
          <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>
            Created {formatRelative(project.createdAt)}
          </span>
        </div>
      </div>

      {/* ── description ── */}
      <Section label="Description">
        <textarea
          value={descDraft}
          placeholder="Add a description…"
          onChange={(e) => {
            setDescDraft(e.target.value);
            setDescDirty(true);
          }}
          onBlur={() => {
            if (descDirty && descDraft !== (project.description ?? "")) {
              updateMutation.mutate({ description: descDraft.trim() || null });
              setDescDirty(false);
            }
          }}
          style={{
            width: "100%",
            minHeight: 90,
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid var(--line)",
            background: "var(--bg-raised)",
            color: "var(--ink)",
            fontSize: 13,
            lineHeight: 1.6,
            fontFamily: "inherit",
            resize: "vertical",
            boxSizing: "border-box",
          }}
        />
      </Section>

      {/* ── lead agent ── */}
      <Section label="Lead Agent">
        {lead ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 14px",
              borderRadius: 10,
              background: "var(--bg-raised)",
              border: "1px solid var(--line)",
            }}
          >
            <Avatar name={lead.name} size={30} />
            <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{lead.name}</span>
              <span style={{ fontSize: 11, color: "var(--ink-faint)", textTransform: "capitalize" }}>
                {lead.role}
              </span>
            </div>
            <NavLink
              to={`/${companyPrefix}/agents/${lead.id}`}
              style={{
                fontSize: 11,
                color: "var(--accent)",
                textDecoration: "none",
                border: "1px solid var(--line)",
                borderRadius: 6,
                padding: "4px 10px",
                background: "var(--bg-raised)",
              }}
            >
              Open ↗
            </NavLink>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>No lead agent assigned.</div>
        )}
      </Section>

      {/* ── linked goals ── */}
      <Section
        label={`Goals · ${goalsForProject.length}`}
        right={
          <NavLink
            to={`/${companyPrefix}/goals`}
            style={{ fontSize: 11, color: "var(--accent)", textDecoration: "none" }}
          >
            All goals
          </NavLink>
        }
      >
        {goalsForProject.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>No linked goals.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {goalsForProject.map((g) => (
              <NavLink
                key={g.id}
                to={`/${companyPrefix}/goals?goal=${g.id}`}
                className="fw-card"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  textDecoration: "none",
                  color: "var(--ink)",
                  border: "1px solid var(--line)",
                  background: "var(--bg-raised)",
                  borderRadius: 8,
                }}
              >
                <Icon d={I.heart} size={12} style={{ color: "var(--ink-faint)" }} />
                <span
                  style={{
                    fontSize: 13,
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {g.title || "Untitled"}
                </span>
                <span
                  style={{
                    fontSize: 10.5,
                    color: "var(--ink-faint)",
                    textTransform: "capitalize",
                  }}
                >
                  {g.level}
                </span>
              </NavLink>
            ))}
          </div>
        )}
      </Section>

      {/* ── issues ── */}
      <Section
        label={`Issues · ${issuesForProject.length}`}
        right={
          <NavLink
            to={`/${companyPrefix}/work`}
            style={{ fontSize: 11, color: "var(--accent)", textDecoration: "none" }}
          >
            Work board
          </NavLink>
        }
      >
        {issuesForProject.length === 0 ? (
          <EmptyState title="No issues in this project yet." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {issuesForProject.map((issue) => (
              <NavLink
                key={issue.id}
                to={`/${companyPrefix}/work/${issue.id}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto auto",
                  gap: 10,
                  alignItems: "center",
                  padding: "9px 12px",
                  borderRadius: 8,
                  background: "var(--bg-raised)",
                  border: "1px solid var(--line)",
                  fontSize: 12,
                  textDecoration: "none",
                  color: "var(--ink)",
                  transition: "background .1s var(--fw-ease)",
                }}
              >
                <span className="fw-mono" style={{ color: "var(--ink-faint)", fontSize: 11 }}>
                  {issue.identifier ?? issue.id.slice(0, 6)}
                </span>
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: 12.5,
                  }}
                >
                  {issue.title ?? "Untitled"}
                </span>
                {issue.assigneeAgentId ? (
                  <Avatar
                    name={
                      allAgents.find((a) => a.id === issue.assigneeAgentId)?.name ?? "?"
                    }
                    size={18}
                  />
                ) : (
                  <span />
                )}
                <StatusChip status={issue.status ?? "idle"} />
              </NavLink>
            ))}
          </div>
        )}
      </Section>

      {/* ── workspaces ── */}
      {project.workspaces && project.workspaces.length > 0 ? (
        <Section label={`Workspaces · ${project.workspaces.length}`}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {project.workspaces.map((w) => (
              <div
                key={w.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto auto",
                  gap: 10,
                  alignItems: "center",
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "var(--bg-raised)",
                  border: "1px solid var(--line)",
                }}
              >
                <Icon d={I.stack} size={12} style={{ color: "var(--ink-faint)" }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                  <span
                    className="fw-mono"
                    style={{
                      fontSize: 12,
                      color: "var(--ink)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {w.name}
                  </span>
                  {w.cwd ? (
                    <span
                      style={{
                        fontSize: 10.5,
                        color: "var(--ink-faint)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontFamily: "var(--fw-font-mono)",
                      }}
                    >
                      {w.cwd}
                    </span>
                  ) : null}
                </div>
                <span
                  className="fw-uc"
                  style={{ fontSize: 9, color: "var(--ink-faint)" }}
                >
                  {w.sourceType.replace(/_/g, " ")}
                </span>
                {w.isPrimary ? (
                  <span
                    className="fw-chip"
                    style={{ fontSize: 9, color: "var(--accent)" }}
                  >
                    Primary
                  </span>
                ) : (
                  <span />
                )}
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {/* ── outputs ── */}
      <OutputsSection
        companyId={companyId}
        prefix={companyPrefix!}
        filter={{ projectId: project.id }}
        title="Outputs"
        hint="files produced for this project"
      />

      {/* ── footer ── */}
      <div
        style={{
          paddingTop: 14,
          borderTop: "1px solid var(--line-soft)",
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          fontSize: 11,
          color: "var(--ink-faint)",
        }}
      >
        <span className="fw-mono">{project.id}</span>
        <span>·</span>
        <span>Created {formatRelative(project.createdAt)}</span>
        <span style={{ flex: 1 }} />
        <a
          href={`/${companyPrefix}/projects/${project.urlKey ?? project.id}`}
          style={{ fontSize: 11, color: "var(--ink-faint)", textDecoration: "none" }}
          title="Open in classic UI"
        >
          Classic view ↗
        </a>
      </div>
    </div>
  );
}
