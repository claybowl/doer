import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NavLink, useParams, useSearchParams } from "@/lib/router";
import { projectsApi } from "@/api/projects";
import { goalsApi } from "@/api/goals";
import { agentsApi } from "@/api/agents";
import { issuesApi } from "@/api/issues";
import { useCompany } from "@/context/CompanyContext";
import { queryKeys } from "@/lib/queryKeys";
import type { Agent, Goal, Issue, Project } from "@doerai/shared";
import { PROJECT_STATUSES, type ProjectStatus } from "@doerai/shared";
import {
  Avatar,
  Drawer,
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
   FernwehProjects — Wave-A parity port of Projects + ProjectDetail.
   Grouped list by status; drawer shows linked goals + lead agent +
   issue count + workspaces.
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

// Order matters — groups render in this order
const GROUP_ORDER: ProjectStatus[] = ["in_progress", "planned", "backlog", "completed", "cancelled"];

function ProjectStatusChip({ status }: { status: ProjectStatus }) {
  const color = PROJECT_STATUS_COLOR[status];
  return (
    <span className="fw-chip" style={{ color, display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: color, display: "inline-block" }} />
      {PROJECT_STATUS_LABEL[status]}
    </span>
  );
}

// ---------- list row ----------

function ProjectRow({
  project,
  lead,
  goalTitles,
  issueCount,
  active,
  onSelect,
}: {
  project: Project;
  lead: Agent | null;
  goalTitles: string[];
  issueCount: number;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className="fw-card"
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto auto auto",
        gap: 12,
        alignItems: "center",
        padding: "12px 14px",
        textAlign: "left",
        cursor: "pointer",
        border: `1px solid ${active ? "var(--accent)" : "var(--line)"}`,
        background: active
          ? "color-mix(in oklab, var(--accent) 8%, var(--bg-raised))"
          : "var(--bg-raised)",
        width: "100%",
        transition: "all .12s var(--fw-ease)",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: project.color ?? "var(--bg-sunken)",
          border: "1px solid var(--line)",
          color: project.color ? "#fff" : "var(--ink-faint)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontSize: 12,
          fontWeight: 600,
          fontFamily: "var(--fw-font-mono)",
        }}
      >
        {project.name.slice(0, 1).toUpperCase()}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {project.name}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--ink-faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          <Icon d={I.issues} size={10} />
          <span>{issueCount} issue{issueCount === 1 ? "" : "s"}</span>
          {goalTitles.length > 0 ? (
            <>
              <span>·</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {goalTitles.length === 1 ? goalTitles[0] : `${goalTitles.length} goals`}
              </span>
            </>
          ) : null}
        </div>
      </div>
      {lead ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Avatar name={lead.name} size={20} />
          <span style={{ fontSize: 11, color: "var(--ink-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 100 }}>
            {lead.name}
          </span>
        </div>
      ) : (
        <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>No lead</span>
      )}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, fontSize: 11, color: "var(--ink-faint)" }}>
        <span className="fw-uc">Target</span>
        <span className="fw-mono" style={{ color: "var(--ink-dim)" }}>
          {project.targetDate ?? "—"}
        </span>
      </div>
      <ProjectStatusChip status={project.status} />
    </button>
  );
}

// ---------- detail drawer ----------

function ProjectDetailDrawer({
  projectId,
  prefix,
  companyId,
  allGoals,
  allAgents,
  allIssues,
  onClose,
}: {
  projectId: string | null;
  prefix: string;
  companyId: string;
  allGoals: Goal[];
  allAgents: Agent[];
  allIssues: Issue[];
  onClose: () => void;
}) {
  const qc = useQueryClient();

  const detailQuery = useQuery<Project>({
    queryKey: projectId ? queryKeys.projects.detail(projectId) : ["projects", "detail", "none"],
    queryFn: () => projectsApi.get(projectId!, companyId),
    enabled: !!projectId,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => projectsApi.update(projectId!, data, companyId),
    onSuccess: (updated) => {
      if (!projectId) return;
      qc.setQueryData(queryKeys.projects.detail(projectId), updated);
      if (updated?.companyId) {
        qc.invalidateQueries({ queryKey: queryKeys.projects.list(updated.companyId) });
      }
    },
  });

  // ---- local edit state ----
  const [nameDraft, setNameDraft] = React.useState("");
  const [descDraft, setDescDraft] = React.useState("");
  const [dirty, setDirty] = React.useState<{ name: boolean; desc: boolean }>({ name: false, desc: false });

  const project = detailQuery.data ?? null;

  React.useEffect(() => {
    if (project) {
      setNameDraft(project.name);
      setDescDraft(project.description ?? "");
      setDirty({ name: false, desc: false });
    }
  }, [project?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!projectId) return null;

  const goalsForProject = project
    ? allGoals.filter((g) => project.goalIds.includes(g.id) || g.id === project.goalId)
    : [];
  const lead = project?.leadAgentId ? allAgents.find((a) => a.id === project.leadAgentId) ?? null : null;
  const issuesForProject = project ? allIssues.filter((i) => i.projectId === project.id) : [];

  return (
    <Drawer
      open={!!projectId}
      onClose={onClose}
      eyebrow={project ? `Project · ${project.urlKey ?? ""}` : "Project"}
      title={
        project ? (
          <input
            value={nameDraft}
            onChange={(e) => {
              setNameDraft(e.target.value);
              setDirty((d) => ({ ...d, name: true }));
            }}
            onBlur={() => {
              if (dirty.name && nameDraft.trim() && nameDraft !== project.name) {
                updateMutation.mutate({ name: nameDraft.trim() });
                setDirty((d) => ({ ...d, name: false }));
              }
            }}
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 18,
              fontWeight: 600,
              color: "var(--ink)",
              fontFamily: "var(--font-display-active)",
            }}
          />
        ) : (
          "Loading…"
        )
      }
      width={560}
    >
      {detailQuery.isLoading && !project ? <LoadingState label="Loading project…" /> : null}
      {detailQuery.error && !project ? <ErrorState error={detailQuery.error} /> : null}

      {project ? (
        <>
          {/* Open full page link */}
          <NavLink
            to={`/${prefix}/fernweh/projects/${project.id}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              alignSelf: "flex-end",
              fontSize: 11,
              color: "var(--ink-dim)",
              textDecoration: "none",
              border: "1px solid var(--line)",
              borderRadius: 6,
              padding: "4px 10px",
              background: "var(--bg-raised)",
            }}
          >
            Open ↗
          </NavLink>

          {/* Status + Target */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
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
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>
              Updated {formatRelative(project.updatedAt)}
            </span>
          </div>

          {/* Description */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>Description</span>
            <textarea
              value={descDraft}
              placeholder="Add a description…"
              onChange={(e) => {
                setDescDraft(e.target.value);
                setDirty((d) => ({ ...d, desc: true }));
              }}
              onBlur={() => {
                if (dirty.desc && descDraft !== (project.description ?? "")) {
                  updateMutation.mutate({ description: descDraft.trim() || null });
                  setDirty((d) => ({ ...d, desc: false }));
                }
              }}
              style={{
                width: "100%",
                minHeight: 80,
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: "var(--bg-raised)",
                color: "var(--ink)",
                fontSize: 13,
                lineHeight: 1.5,
                fontFamily: "inherit",
                resize: "vertical",
              }}
            />
          </div>

          {/* Lead agent */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>Lead</span>
            {lead ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "var(--bg-sunken)",
                }}
              >
                <Avatar name={lead.name} size={26} />
                <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13 }}>{lead.name}</span>
                  <span style={{ fontSize: 11, color: "var(--ink-faint)", textTransform: "capitalize" }}>
                    {lead.role}
                  </span>
                </div>
                <NavLink
                  to={`/${prefix}/fernweh/agents`}
                  style={{ fontSize: 11, color: "var(--accent)", textDecoration: "none" }}
                >
                  Open
                </NavLink>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>No lead assigned.</div>
            )}
          </div>

          {/* Linked goals */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
              Goals · {goalsForProject.length}
            </span>
            {goalsForProject.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>No linked goals.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {goalsForProject.map((g) => (
                  <NavLink
                    key={g.id}
                    to={`/${prefix}/fernweh/goals?goal=${g.id}`}
                    className="fw-card"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 10px",
                      textDecoration: "none",
                      color: "var(--ink)",
                      border: "1px solid var(--line)",
                      background: "var(--bg-raised)",
                    }}
                  >
                    <Icon d={I.heart} size={12} style={{ color: "var(--ink-faint)" }} />
                    <span style={{ fontSize: 12.5, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {g.title || "Untitled"}
                    </span>
                    <span style={{ fontSize: 10.5, color: "var(--ink-faint)", textTransform: "capitalize" }}>
                      {g.level}
                    </span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>

          {/* Issues */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
                Issues · {issuesForProject.length}
              </span>
              <NavLink
                to={`/${prefix}/fernweh/work`}
                style={{ fontSize: 11, color: "var(--accent)", textDecoration: "none" }}
              >
                Open board
              </NavLink>
            </div>
            {issuesForProject.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>No issues in this project.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {issuesForProject.slice(0, 8).map((issue) => (
                  <NavLink
                    key={issue.id}
                    to={`/${prefix}/fernweh/work?issue=${issue.id}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr auto",
                      gap: 10,
                      alignItems: "center",
                      padding: "6px 10px",
                      borderRadius: 6,
                      background: "var(--bg-sunken)",
                      fontSize: 11.5,
                      textDecoration: "none",
                      color: "var(--ink)",
                    }}
                  >
                    <span className="fw-mono" style={{ color: "var(--ink-faint)" }}>
                      {issue.identifier ?? issue.id.slice(0, 6)}
                    </span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {issue.title ?? "Untitled"}
                    </span>
                    <StatusChip status={issue.status ?? "idle"} />
                  </NavLink>
                ))}
                {issuesForProject.length > 8 ? (
                  <span style={{ fontSize: 10, color: "var(--ink-faint)", paddingLeft: 10 }}>
                    + {issuesForProject.length - 8} more
                  </span>
                ) : null}
              </div>
            )}
          </div>

          {/* Workspaces */}
          {project.workspaces && project.workspaces.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
                Workspaces · {project.workspaces.length}
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {project.workspaces.map((w) => (
                  <div
                    key={w.id}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 6,
                      background: "var(--bg-sunken)",
                      fontSize: 11.5,
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <Icon d={I.stack} size={10} style={{ color: "var(--ink-faint)" }} />
                    <span className="fw-mono" style={{ color: "var(--ink-dim)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {w.name}
                    </span>
                    <span className="fw-uc" style={{ fontSize: 9, color: "var(--ink-faint)" }}>
                      {w.isPrimary ? "primary" : w.sourceType}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Outputs linked to this project */}
          <OutputsSection
            companyId={companyId}
            prefix={prefix}
            filter={{ projectId: project.id }}
            title="Outputs"
            hint="files produced for this project"
            limit={5}
            flush
          />

          {/* Metadata */}
          <div
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
            <span>Created {formatRelative(project.createdAt)}</span>
            <span>·</span>
            <span className="fw-mono">{project.id.slice(0, 8)}</span>
            {project.archivedAt ? (
              <>
                <span>·</span>
                <span style={{ color: "var(--warn)" }}>Archived {formatRelative(project.archivedAt)}</span>
              </>
            ) : null}
          </div>
        </>
      ) : null}
    </Drawer>
  );
}

// ---------- main ----------

export function FernwehProjects() {
  const { companyPrefix } = useParams<{ companyPrefix: string }>();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id;
  const prefix = companyPrefix ?? selectedCompany?.issuePrefix ?? "";

  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("project");

  const setSelected = React.useCallback(
    (id: string | null) => {
      const next = new URLSearchParams(searchParams);
      if (id) next.set("project", id);
      else next.delete("project");
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const projectsQuery = useQuery({
    queryKey: queryKeys.projects.list(companyId!),
    queryFn: () => projectsApi.list(companyId!),
    enabled: !!companyId,
    refetchInterval: 30_000,
  });

  const goalsQuery = useQuery({
    queryKey: queryKeys.goals.list(companyId!),
    queryFn: () => goalsApi.list(companyId!),
    enabled: !!companyId,
  });

  const agentsQuery = useQuery({
    queryKey: queryKeys.agents.list(companyId!),
    queryFn: () => agentsApi.list(companyId!),
    enabled: !!companyId,
  });

  const issuesQuery = useQuery({
    queryKey: ["issues", "list", companyId ?? "none"],
    queryFn: () => issuesApi.list(companyId!),
    enabled: !!companyId,
  });

  const projects = projectsQuery.data ?? [];
  const goals = goalsQuery.data ?? [];
  const agents = agentsQuery.data ?? [];
  const issues = issuesQuery.data ?? [];

  const issuesByProject = React.useMemo(() => {
    const m = new Map<string, Issue[]>();
    for (const i of issues) {
      if (!i.projectId) continue;
      const arr = m.get(i.projectId) ?? [];
      arr.push(i);
      m.set(i.projectId, arr);
    }
    return m;
  }, [issues]);

  const grouped = React.useMemo(() => {
    const g: Record<ProjectStatus, Project[]> = {
      backlog: [],
      planned: [],
      in_progress: [],
      completed: [],
      cancelled: [],
    };
    for (const p of projects) {
      (g[p.status] ?? g.backlog).push(p);
    }
    return g;
  }, [projects]);

  if (!companyId) {
    return (
      <div style={{ padding: 24, color: "var(--ink-dim)" }}>
        Select a company to view projects.
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "32px 36px 60px",
        display: "flex",
        flexDirection: "column",
        gap: 24,
        maxWidth: 1200,
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
            Projects · {projects.length} total
          </span>
          <h1 className="fw-display" style={{ fontSize: 24, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>
            Active initiatives
          </h1>
        </div>
        <NavLink
          to={`/${prefix}/projects`}
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
          Open classic projects
        </NavLink>
      </header>

      {/* Groups */}
      {projectsQuery.isLoading ? (
        <LoadingState label="Loading projects…" />
      ) : projectsQuery.error ? (
        <ErrorState error={projectsQuery.error} />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={I.issues}
          title="No projects yet"
          subtitle="Projects are how work gets organized around goals. Create one in classic Projects for now."
        />
      ) : (
        GROUP_ORDER.map((status) => {
          const items = grouped[status];
          if (items.length === 0) return null;
          return (
            <section key={status} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <header style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <h2
                  className="fw-display"
                  style={{ fontSize: 15, fontWeight: 600, margin: 0, color: "var(--ink)" }}
                >
                  {PROJECT_STATUS_LABEL[status]}
                </h2>
                <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
                  {items.length}
                </span>
              </header>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {items.map((p) => {
                  const lead = p.leadAgentId ? agents.find((a) => a.id === p.leadAgentId) ?? null : null;
                  const linkedGoals = goals
                    .filter((g) => p.goalIds.includes(g.id) || g.id === p.goalId)
                    .map((g) => g.title || "Untitled");
                  const issueCount = issuesByProject.get(p.id)?.length ?? 0;
                  return (
                    <ProjectRow
                      key={p.id}
                      project={p}
                      lead={lead}
                      goalTitles={linkedGoals}
                      issueCount={issueCount}
                      active={selectedId === p.id}
                      onSelect={() => setSelected(p.id)}
                    />
                  );
                })}
              </div>
            </section>
          );
        })
      )}

      <footer
        style={{
          paddingTop: 8,
          borderTop: "1px solid var(--line-soft)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "var(--ink-faint)",
          fontSize: 11,
        }}
      >
        <Icon d={I.issues} size={11} />
        <span>Grouped by status · click any project to open its drawer · ?project=:id deep-links.</span>
      </footer>

      <ProjectDetailDrawer
        projectId={selectedId}
        prefix={prefix}
        companyId={companyId}
        allGoals={goals}
        allAgents={agents}
        allIssues={issues}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
