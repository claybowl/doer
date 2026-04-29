import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NavLink, useParams, useSearchParams } from "@/lib/router";
import { goalsApi } from "@/api/goals";
import { projectsApi } from "@/api/projects";
import { useCompany } from "@/context/CompanyContext";
import { queryKeys } from "@/lib/queryKeys";
import type { Goal, Project } from "@doerai/shared";
import { GOAL_LEVELS, GOAL_STATUSES, type GoalLevel, type GoalStatus } from "@doerai/shared";
import { Icon, I, Drawer, EmptyState, LoadingState, ErrorState, formatRelative } from "./utils";

/* ============================================================
   FernwehGoals — Wave-A parity port of ui/src/pages/Goals.tsx
   + GoalDetail.tsx, collapsed into a single screen with a side
   drawer for detail. Goal-ancestry is a core Paperclip invariant
   so we surface parent/child tree + linked projects inline.
============================================================ */

// ---------- constants ----------

const LEVEL_LABEL: Record<GoalLevel, string> = {
  company: "Company",
  team: "Team",
  agent: "Agent",
  task: "Task",
};

const LEVEL_ICON: Record<GoalLevel, string> = {
  company: I.bolt,
  team: I.org,
  agent: I.agents,
  task: I.check,
};

const STATUS_COLOR: Record<GoalStatus, string> = {
  planned: "var(--ink-dim)",
  active: "var(--pulse)",
  achieved: "var(--accent)",
  cancelled: "var(--ink-faint)",
};

// ---------- helpers ----------

function goalChildren(all: Goal[], parentId: string | null): Goal[] {
  return all.filter((g) => g.parentId === parentId);
}

function projectsLinkedToGoal(projects: Project[], goalId: string): Project[] {
  return projects.filter((p) => {
    if (p.goalIds && p.goalIds.includes(goalId)) return true;
    if (p.goals && p.goals.some((ref) => ref.id === goalId)) return true;
    return p.goalId === goalId;
  });
}

function projectHref(prefix: string, project: Project): string {
  // Classic has a utils.projectUrl builder; safe default for Fernweh v1.
  return `/${prefix}/projects/${project.id}`;
}

// ---------- chip components ----------

function LevelChip({ level }: { level: GoalLevel }) {
  return (
    <span className="fw-chip" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <Icon d={LEVEL_ICON[level]} size={10} />
      <span style={{ textTransform: "capitalize" }}>{LEVEL_LABEL[level]}</span>
    </span>
  );
}

function GoalStatusChip({ status }: { status: GoalStatus }) {
  return (
    <span
      className="fw-chip"
      style={{
        color: STATUS_COLOR[status] ?? "var(--ink-dim)",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: STATUS_COLOR[status] ?? "var(--ink-dim)",
          display: "inline-block",
        }}
      />
      <span style={{ textTransform: "capitalize" }}>{status}</span>
    </span>
  );
}

// ---------- tree row (recursive) ----------

function GoalNode({
  goal,
  all,
  depth,
  selectedId,
  onSelect,
}: {
  goal: Goal;
  all: Goal[];
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const children = React.useMemo(() => goalChildren(all, goal.id), [all, goal.id]);
  const active = goal.id === selectedId;

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <button
        onClick={() => onSelect(goal.id)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          paddingLeft: 12 + depth * 20,
          borderRadius: 8,
          border: `1px solid ${active ? "var(--accent)" : "transparent"}`,
          background: active
            ? "color-mix(in oklab, var(--accent) 8%, var(--bg-raised))"
            : "transparent",
          color: active ? "var(--ink)" : "var(--ink)",
          fontSize: 13,
          cursor: "pointer",
          textAlign: "left",
          width: "100%",
          transition: "all .12s var(--fw-ease)",
        }}
      >
        <Icon
          d={LEVEL_ICON[goal.level]}
          size={13}
          style={{ color: active ? "var(--accent)" : "var(--ink-faint)" }}
        />
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {goal.title || "Untitled goal"}
        </span>
        <GoalStatusChip status={goal.status} />
        {children.length > 0 ? (
          <span className="fw-uc" style={{ color: "var(--ink-faint)", fontSize: 10 }}>
            {children.length} sub
          </span>
        ) : null}
      </button>
      {children.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", borderLeft: "1px dashed var(--line-soft)", marginLeft: 22 + depth * 20 }}>
          {children.map((c) => (
            <GoalNode
              key={c.id}
              goal={c}
              all={all}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ---------- detail drawer ----------

function GoalDetailDrawer({
  goalId,
  allGoals,
  allProjects,
  prefix,
  onClose,
  onSelectGoal,
}: {
  goalId: string | null;
  allGoals: Goal[];
  allProjects: Project[];
  prefix: string;
  onClose: () => void;
  onSelectGoal: (id: string) => void;
}) {
  const qc = useQueryClient();

  const detailQuery = useQuery({
    queryKey: goalId ? queryKeys.goals.detail(goalId) : ["goals", "detail", "none"],
    queryFn: () => goalsApi.get(goalId!),
    enabled: !!goalId,
    // Prime cache from list if we already have it.
    initialData: () => allGoals.find((g) => g.id === goalId),
  });

  const goal = detailQuery.data ?? null;

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => goalsApi.update(goalId!, data),
    onSuccess: (updated) => {
      if (!goalId) return;
      qc.setQueryData(queryKeys.goals.detail(goalId), updated);
      if (updated?.companyId) {
        qc.invalidateQueries({ queryKey: queryKeys.goals.list(updated.companyId) });
      }
    },
  });

  // ---- local edit state (lazy; mirror goal on open) ----
  const [titleDraft, setTitleDraft] = React.useState("");
  const [descDraft, setDescDraft] = React.useState("");
  const [dirty, setDirty] = React.useState<{ title: boolean; desc: boolean }>({
    title: false,
    desc: false,
  });

  React.useEffect(() => {
    if (goal) {
      setTitleDraft(goal.title);
      setDescDraft(goal.description ?? "");
      setDirty({ title: false, desc: false });
    }
  }, [goal?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!goalId) return null;

  const children = goal ? goalChildren(allGoals, goal.id) : [];
  const parent = goal?.parentId ? allGoals.find((g) => g.id === goal.parentId) ?? null : null;
  const linkedProjects = goal ? projectsLinkedToGoal(allProjects, goal.id) : [];

  return (
    <Drawer
      open={!!goalId}
      onClose={onClose}
      eyebrow={goal ? LEVEL_LABEL[goal.level] : "Goal"}
      title={
        goal ? (
          <input
            value={titleDraft}
            onChange={(e) => {
              setTitleDraft(e.target.value);
              setDirty((d) => ({ ...d, title: true }));
            }}
            onBlur={() => {
              if (dirty.title && titleDraft.trim() && titleDraft !== goal.title) {
                updateMutation.mutate({ title: titleDraft.trim() });
                setDirty((d) => ({ ...d, title: false }));
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
      width={520}
    >
      {detailQuery.isLoading && !goal ? <LoadingState label="Loading goal…" /> : null}
      {detailQuery.error && !goal ? <ErrorState error={detailQuery.error} /> : null}

      {goal ? (
        <>
          {/* Open full page */}
          <NavLink
            to={`/${prefix}/goals/${goal.id}`}
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

          {/* Status + Level row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <LevelChip level={goal.level} />
            <select
              value={goal.status}
              onChange={(e) => updateMutation.mutate({ status: e.target.value })}
              style={{
                padding: "4px 8px",
                borderRadius: 6,
                border: "1px solid var(--line)",
                background: "var(--bg-raised)",
                color: STATUS_COLOR[goal.status] ?? "var(--ink)",
                fontSize: 12,
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {GOAL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={goal.level}
              onChange={(e) => updateMutation.mutate({ level: e.target.value })}
              style={{
                padding: "4px 8px",
                borderRadius: 6,
                border: "1px solid var(--line)",
                background: "var(--bg-raised)",
                color: "var(--ink-dim)",
                fontSize: 12,
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {GOAL_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>
              Updated {formatRelative(goal.updatedAt)}
            </span>
          </div>

          {/* Parent breadcrumb */}
          {parent ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 10px",
                borderRadius: 6,
                background: "var(--bg-sunken)",
                fontSize: 12,
                color: "var(--ink-dim)",
              }}
            >
              <Icon d={I.arrow} size={11} style={{ transform: "rotate(180deg)" }} />
              <span className="fw-uc">Parent</span>
              <button
                onClick={() => onSelectGoal(parent.id)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--accent)",
                  cursor: "pointer",
                  fontSize: 12,
                  padding: 0,
                }}
              >
                {parent.title || "Untitled"}
              </button>
            </div>
          ) : null}

          {/* Description */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
              Description
            </span>
            <textarea
              value={descDraft}
              placeholder="Add a description…"
              onChange={(e) => {
                setDescDraft(e.target.value);
                setDirty((d) => ({ ...d, desc: true }));
              }}
              onBlur={() => {
                if (dirty.desc && descDraft !== (goal.description ?? "")) {
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

          {/* Sub-goals */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
                Sub-goals · {children.length}
              </span>
            </div>
            {children.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>No sub-goals yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {children.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => onSelectGoal(child.id)}
                    className="fw-card"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 10px",
                      cursor: "pointer",
                      textAlign: "left",
                      border: "1px solid var(--line)",
                      background: "var(--bg-raised)",
                    }}
                  >
                    <Icon d={LEVEL_ICON[child.level]} size={12} style={{ color: "var(--ink-faint)" }} />
                    <span style={{ fontSize: 12.5, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {child.title || "Untitled"}
                    </span>
                    <GoalStatusChip status={child.status} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Linked projects */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
              Linked projects · {linkedProjects.length}
            </span>
            {linkedProjects.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>No projects link to this goal.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {linkedProjects.map((project) => (
                  <NavLink
                    key={project.id}
                    to={projectHref(prefix, project)}
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
                    <Icon d={I.issues} size={12} style={{ color: "var(--ink-faint)" }} />
                    <span style={{ fontSize: 12.5, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {project.name}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--ink-faint)", textTransform: "capitalize" }}>
                      {project.status}
                    </span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>

          {/* Metadata */}
          <div
            style={{
              marginTop: 8,
              paddingTop: 12,
              borderTop: "1px solid var(--line-soft)",
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              fontSize: 11,
              color: "var(--ink-faint)",
            }}
          >
            <span>Created {formatRelative(goal.createdAt)}</span>
            <span>·</span>
            <span className="fw-mono">{goal.id.slice(0, 8)}</span>
          </div>
        </>
      ) : null}
    </Drawer>
  );
}

// ---------- main ----------

type LevelFilter = GoalLevel | "all";

const LEVEL_FILTERS: LevelFilter[] = ["all", ...GOAL_LEVELS];

export function FernwehGoals() {
  const { companyPrefix } = useParams<{ companyPrefix: string }>();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id;
  const prefix = companyPrefix ?? selectedCompany?.issuePrefix ?? "";

  // Deep-linkable drawer via ?goal=:id (matches FernwehWork's ?issue pattern)
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("goal");

  const [levelFilter, setLevelFilter] = React.useState<LevelFilter>("all");
  const [showCreate, setShowCreate] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState("");

  const setSelected = React.useCallback(
    (id: string | null) => {
      const next = new URLSearchParams(searchParams);
      if (id) next.set("goal", id);
      else next.delete("goal");
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const qc = useQueryClient();

  const createMutation = useMutation({
    mutationFn: () =>
      goalsApi.create(companyId!, { title: newTitle.trim(), level: "company" as GoalLevel, status: "planned" as GoalStatus }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.goals.list(companyId!) });
      setShowCreate(false);
      setNewTitle("");
    },
  });

  const goalsQuery = useQuery({
    queryKey: queryKeys.goals.list(companyId!),
    queryFn: () => goalsApi.list(companyId!),
    enabled: !!companyId,
    refetchInterval: 30_000,
  });

  const projectsQuery = useQuery({
    queryKey: queryKeys.projects.list(companyId!),
    queryFn: () => projectsApi.list(companyId!),
    enabled: !!companyId,
  });

  const allGoals = goalsQuery.data ?? [];
  const allProjects = projectsQuery.data ?? [];

  const roots = React.useMemo(() => {
    const all = allGoals;
    if (levelFilter === "all") {
      return goalChildren(all, null);
    }
    // Filtered: show only goals at that level (flat, since filtering hides tree)
    return all.filter((g) => g.level === levelFilter);
  }, [allGoals, levelFilter]);

  const countsByLevel: Record<LevelFilter, number> = React.useMemo(() => {
    const counts: Record<string, number> = { all: allGoals.length };
    for (const l of GOAL_LEVELS) counts[l] = 0;
    for (const g of allGoals) counts[g.level] = (counts[g.level] ?? 0) + 1;
    return counts as Record<LevelFilter, number>;
  }, [allGoals]);

  if (!companyId) {
    return (
      <div style={{ padding: 24, color: "var(--ink-dim)" }}>
        Select a company to view goals.
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "32px 36px 60px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
        maxWidth: 1200,
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
            Goals · {allGoals.length} total
          </span>
          <h1 className="fw-display" style={{ fontSize: 24, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>
            Objectives & ancestry
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <NavLink
            to={`/${prefix}/goals`}
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
            Open classic goals
          </NavLink>
          <button
            onClick={() => setShowCreate((v) => !v)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid var(--accent)",
              background: "var(--accent)",
              color: "var(--bg)",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <Icon d={I.plus} size={11} />
            New Goal
          </button>
        </div>
      </header>

      {/* Level filter pills */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>Level</span>
        {LEVEL_FILTERS.map((level) => {
          const active = levelFilter === level;
          const icon = level === "all" ? I.stack : LEVEL_ICON[level as GoalLevel];
          const label = level === "all" ? "All" : LEVEL_LABEL[level as GoalLevel];
          return (
            <button
              key={level}
              onClick={() => setLevelFilter(level)}
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
              <span>{label}</span>
              <span
                style={{
                  padding: "0 5px",
                  borderRadius: 4,
                  background: active ? "var(--accent)" : "var(--bg-sunken)",
                  color: active ? "var(--bg)" : "var(--ink-faint)",
                  fontSize: 10,
                  fontWeight: 500,
                }}
              >
                {countsByLevel[level] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* Inline create form */}
      {showCreate ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (newTitle.trim() && !createMutation.isPending) createMutation.mutate();
          }}
          style={{ display: "flex", alignItems: "center", gap: 8 }}
        >
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Goal title…"
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid var(--line)",
              background: "var(--bg-raised)",
              color: "var(--ink)",
              fontSize: 13,
              fontFamily: "inherit",
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={!newTitle.trim() || createMutation.isPending}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid var(--accent)",
              background: "var(--accent)",
              color: "var(--bg)",
              fontSize: 12,
              fontWeight: 500,
              cursor: !newTitle.trim() || createMutation.isPending ? "not-allowed" : "pointer",
              opacity: !newTitle.trim() || createMutation.isPending ? 0.5 : 1,
            }}
          >
            {createMutation.isPending ? "Creating…" : "Create"}
          </button>
          <button
            type="button"
            onClick={() => { setShowCreate(false); setNewTitle(""); }}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid var(--line)",
              background: "transparent",
              color: "var(--ink-dim)",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          {createMutation.error ? (
            <span style={{ fontSize: 12, color: "var(--danger)" }}>
              {createMutation.error instanceof Error ? createMutation.error.message : "Failed to create goal"}
            </span>
          ) : null}
        </form>
      ) : null}

      {/* Tree / List */}
      <div className="fw-card" style={{ padding: 8, minHeight: 120 }}>
        {goalsQuery.isLoading ? (
          <LoadingState label="Loading goals…" />
        ) : goalsQuery.error ? (
          <ErrorState error={goalsQuery.error} />
        ) : roots.length === 0 ? (
          <EmptyState
            icon={I.bolt}
            title={levelFilter === "all" ? "No goals yet" : `No goals at level "${LEVEL_LABEL[levelFilter as GoalLevel]}"`}
            subtitle="Goals create ancestry for projects and issues. Create your first goal above."
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {roots.map((g) => (
              <GoalNode
                key={g.id}
                goal={g}
                all={allGoals}
                depth={0}
                selectedId={selectedId}
                onSelect={(id) => setSelected(id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer style={{ paddingTop: 8, borderTop: "1px solid var(--line-soft)", display: "flex", alignItems: "center", gap: 8, color: "var(--ink-faint)", fontSize: 11 }}>
        <Icon d={I.bolt} size={11} />
        <span>Click a goal to open its detail drawer · URL updates for deep links · edits save on blur.</span>
      </footer>

      {/* Detail drawer */}
      <GoalDetailDrawer
        goalId={selectedId}
        allGoals={allGoals}
        allProjects={allProjects}
        prefix={prefix}
        onClose={() => setSelected(null)}
        onSelectGoal={(id) => setSelected(id)}
      />
    </div>
  );
}
