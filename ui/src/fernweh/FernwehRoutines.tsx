import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NavLink, useParams, useSearchParams } from "@/lib/router";
import { routinesApi } from "@/api/routines";
import { agentsApi } from "@/api/agents";
import { projectsApi } from "@/api/projects";
import { useCompany } from "@/context/CompanyContext";
import { queryKeys } from "@/lib/queryKeys";
import type {
  Agent,
  RoutineListItem,
  RoutineDetail as RoutineDetailType,
  RoutineRunSummary,
} from "@doerai/shared";
import { ROUTINE_STATUSES, type RoutineStatus } from "@doerai/shared";
import {
  Avatar,
  Drawer,
  EmptyState,
  ErrorState,
  Icon,
  I,
  LoadingState,
  formatRelative,
} from "./utils";

/* ============================================================
   FernwehRoutines — Wave-A parity port of Routines + RoutineDetail.
   List with schedule + last-run metadata; detail drawer shows
   triggers, recent runs, and a "Run Now" button. Deep trigger
   management (create/edit/rotate) stays in classic for v1.
============================================================ */

// ---------- chips ----------

const ROUTINE_STATUS_COLOR: Record<RoutineStatus | string, string> = {
  active: "var(--pulse)",
  paused: "var(--warn)",
  archived: "var(--ink-faint)",
};

function RoutineStatusChip({ status }: { status: string }) {
  const color = ROUTINE_STATUS_COLOR[status] ?? "var(--ink-dim)";
  return (
    <span className="fw-chip" style={{ color, display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: color,
          display: "inline-block",
        }}
      />
      <span style={{ textTransform: "capitalize" }}>{status}</span>
    </span>
  );
}

function TriggerKindChip({ kind, label, enabled }: { kind: string; label: string | null; enabled: boolean }) {
  return (
    <span
      className="fw-chip"
      style={{
        fontSize: 10.5,
        color: enabled ? "var(--ink)" : "var(--ink-faint)",
        opacity: enabled ? 1 : 0.7,
      }}
    >
      <span style={{ textTransform: "uppercase", fontWeight: 500, letterSpacing: 0.4 }}>{kind}</span>
      {label ? <span style={{ marginLeft: 6 }}>· {label}</span> : null}
      {!enabled ? <span style={{ marginLeft: 6, color: "var(--warn)" }}>disabled</span> : null}
    </span>
  );
}

function RunResultDot({ result }: { result: string | null }) {
  const ok = result === "success";
  const warn = result === "timed_out" || result === "coalesced";
  const err = result === "failed" || result === "error";
  const color = ok ? "var(--pulse)" : err ? "var(--danger)" : warn ? "var(--warn)" : "var(--ink-faint)";
  return (
    <span
      title={result ?? "never run"}
      style={{
        width: 8,
        height: 8,
        borderRadius: 999,
        background: color,
        display: "inline-block",
      }}
    />
  );
}

// ---------- list row ----------

function RoutineRow({
  routine,
  agent,
  active,
  onSelect,
}: {
  routine: RoutineListItem;
  agent: Agent | null;
  active: boolean;
  onSelect: () => void;
}) {
  const nextTrigger: Date | null = routine.triggers
    .map((t) => t.nextRunAt)
    .filter((v): v is Date => v != null)
    .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;

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
      <RunResultDot result={routine.lastRun?.status ?? null} />
      <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {routine.title || "Untitled routine"}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--ink-faint)" }}>
          {routine.triggers.length > 0 ? (
            <>
              <Icon d={I.clock} size={10} />
              <span>{routine.triggers.length} trigger{routine.triggers.length === 1 ? "" : "s"}</span>
            </>
          ) : (
            <span>No triggers</span>
          )}
          {agent ? (
            <>
              <span>·</span>
              <span>Assignee: {agent.name}</span>
            </>
          ) : null}
        </div>
      </div>
      <RoutineStatusChip status={routine.status} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, fontSize: 11, color: "var(--ink-faint)" }}>
        <span className="fw-uc">Next</span>
        <span className="fw-mono" style={{ color: "var(--ink-dim)" }}>
          {nextTrigger ? formatRelative(nextTrigger) : "—"}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, fontSize: 11, color: "var(--ink-faint)" }}>
        <span className="fw-uc">Last run</span>
        <span className="fw-mono" style={{ color: "var(--ink-dim)" }}>
          {routine.lastRun?.triggeredAt ? formatRelative(routine.lastRun.triggeredAt) : "—"}
        </span>
      </div>
    </button>
  );
}

// ---------- detail drawer ----------

function RoutineDetailDrawer({
  routineId,
  prefix,
  agentById,
  onClose,
}: {
  routineId: string | null;
  prefix: string;
  agentById: Map<string, Agent>;
  onClose: () => void;
}) {
  const qc = useQueryClient();

  const detailQuery = useQuery<RoutineDetailType>({
    queryKey: routineId ? queryKeys.routines.detail(routineId) : ["routines", "detail", "none"],
    queryFn: () => routinesApi.get(routineId!),
    enabled: !!routineId,
    refetchInterval: 15_000,
  });

  const runsQuery = useQuery<RoutineRunSummary[]>({
    queryKey: routineId ? queryKeys.routines.runs(routineId) : ["routines", "runs", "none"],
    queryFn: () => routinesApi.listRuns(routineId!, 20),
    enabled: !!routineId,
    refetchInterval: 15_000,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => routinesApi.update(routineId!, data),
    onSuccess: (updated) => {
      if (!routineId) return;
      qc.invalidateQueries({ queryKey: queryKeys.routines.detail(routineId) });
      if (updated?.companyId) {
        qc.invalidateQueries({ queryKey: queryKeys.routines.list(updated.companyId) });
      }
    },
  });

  const runNowMutation = useMutation({
    mutationFn: () => routinesApi.run(routineId!),
    onSuccess: () => {
      if (!routineId) return;
      qc.invalidateQueries({ queryKey: queryKeys.routines.runs(routineId) });
      qc.invalidateQueries({ queryKey: queryKeys.routines.detail(routineId) });
    },
  });

  if (!routineId) return null;

  const routine = detailQuery.data;
  const runs = runsQuery.data ?? [];
  const assignee = routine?.assigneeAgentId ? agentById.get(routine.assigneeAgentId) ?? null : null;

  return (
    <Drawer
      open={!!routineId}
      onClose={onClose}
      eyebrow={routine ? `Routine · ${routine.priority}` : "Routine"}
      title={routine?.title ?? "Loading…"}
      width={560}
      footer={
        routine ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <RoutineStatusChip status={routine.status} />
              <select
                value={routine.status}
                onChange={(e) => updateMutation.mutate({ status: e.target.value })}
                style={{
                  padding: "4px 8px",
                  borderRadius: 6,
                  border: "1px solid var(--line)",
                  background: "var(--bg-raised)",
                  color: "var(--ink-dim)",
                  fontSize: 11,
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {ROUTINE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => runNowMutation.mutate()}
              disabled={runNowMutation.isPending || routine.status !== "active"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 12px",
                borderRadius: 8,
                border: "1px solid var(--accent)",
                background: "var(--accent)",
                color: "var(--bg)",
                fontSize: 12,
                fontWeight: 500,
                cursor: runNowMutation.isPending ? "wait" : "pointer",
                opacity: routine.status === "active" ? 1 : 0.5,
              }}
            >
              <Icon d={I.bolt} size={11} />
              <span>{runNowMutation.isPending ? "Running…" : "Run now"}</span>
            </button>
          </div>
        ) : null
      }
    >
      {detailQuery.isLoading && !routine ? <LoadingState label="Loading routine…" /> : null}
      {detailQuery.error && !routine ? <ErrorState error={detailQuery.error} /> : null}

      {routine ? (
        <>
          {/* Open full page */}
          <NavLink
            to={`/${prefix}/routines/${routine.id}`}
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

          {/* Description */}
          {routine.description ? (
            <div style={{ fontSize: 13, color: "var(--ink-dim)", lineHeight: 1.5 }}>{routine.description}</div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--ink-faint)", fontStyle: "italic" }}>No description.</div>
          )}

          {/* Assignee */}
          {assignee ? (
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
              <Avatar name={assignee.name} size={26} />
              <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>Assignee</span>
                <span style={{ fontSize: 13 }}>{assignee.name}</span>
              </div>
              <NavLink
                to={`/${prefix}/agents`}
                style={{ fontSize: 11, color: "var(--accent)", textDecoration: "none" }}
              >
                Open agent
              </NavLink>
            </div>
          ) : null}

          {/* Triggers */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
              Triggers · {routine.triggers?.length ?? 0}
            </span>
            {(routine.triggers ?? []).length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>No triggers configured. Use classic to add one.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {(routine.triggers ?? []).map((t) => (
                  <div
                    key={t.id}
                    className="fw-card"
                    style={{
                      padding: "10px 12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      background: "var(--bg-raised)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <TriggerKindChip kind={t.kind} label={t.label} enabled={t.enabled} />
                      {t.cronExpression ? (
                        <span className="fw-mono" style={{ fontSize: 11, color: "var(--ink-dim)" }}>
                          {t.cronExpression} {t.timezone ? `(${t.timezone})` : ""}
                        </span>
                      ) : null}
                    </div>
                    <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--ink-faint)" }}>
                      {t.nextRunAt ? <span>Next {formatRelative(t.nextRunAt)}</span> : null}
                      {t.lastFiredAt ? <span>Last {formatRelative(t.lastFiredAt)}</span> : null}
                      {t.lastResult ? <span>· {t.lastResult}</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent runs */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
              Recent runs · {runs.length}
            </span>
            {runsQuery.isLoading && runs.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>Loading runs…</div>
            ) : runs.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>No runs yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {runs.map((run) => (
                  <div
                    key={run.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr auto auto",
                      gap: 10,
                      alignItems: "center",
                      padding: "6px 10px",
                      borderRadius: 6,
                      background: "var(--bg-sunken)",
                      fontSize: 11.5,
                    }}
                  >
                    <RunResultDot result={run.status} />
                    <span style={{ color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {run.source}
                      {run.trigger?.label ? ` · ${run.trigger.label}` : ""}
                    </span>
                    <span className="fw-mono" style={{ color: "var(--ink-dim)" }}>
                      {run.status}
                    </span>
                    <span className="fw-mono" style={{ color: "var(--ink-faint)" }}>
                      {formatRelative(run.triggeredAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

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
            <span>Created {formatRelative(routine.createdAt)}</span>
            <span>·</span>
            <span>Priority {routine.priority}</span>
            <span>·</span>
            <span className="fw-mono">{routine.id.slice(0, 8)}</span>
          </div>
        </>
      ) : null}
    </Drawer>
  );
}

// ---------- main ----------

type StatusFilter = RoutineStatus | "all";

export function FernwehRoutines() {
  const { companyPrefix } = useParams<{ companyPrefix: string }>();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id;
  const prefix = companyPrefix ?? selectedCompany?.issuePrefix ?? "";

  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("routine");
  const [filter, setFilter] = React.useState<StatusFilter>("all");
  const [showCreate, setShowCreate] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newProjectId, setNewProjectId] = React.useState("");
  const [newAssigneeAgentId, setNewAssigneeAgentId] = React.useState("");

  const setSelected = React.useCallback(
    (id: string | null) => {
      const next = new URLSearchParams(searchParams);
      if (id) next.set("routine", id);
      else next.delete("routine");
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const qc = useQueryClient();

  const createMutation = useMutation({
    mutationFn: () => routinesApi.create(companyId!, {
      title: newName.trim(),
      projectId: newProjectId,
      assigneeAgentId: newAssigneeAgentId,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.routines.list(companyId!) });
      setShowCreate(false);
      setNewName("");
      setNewProjectId("");
      setNewAssigneeAgentId("");
    },
  });

  const routinesQuery = useQuery({
    queryKey: queryKeys.routines.list(companyId!),
    queryFn: () => routinesApi.list(companyId!),
    enabled: !!companyId,
    refetchInterval: 30_000,
  });

  const agentsQuery = useQuery({
    queryKey: queryKeys.agents.list(companyId!),
    queryFn: () => agentsApi.list(companyId!),
    enabled: !!companyId,
  });

  const projectsQuery = useQuery({
    queryKey: queryKeys.projects.list(companyId!),
    queryFn: () => projectsApi.list(companyId!),
    enabled: !!companyId,
  });

  const routines = routinesQuery.data ?? [];
  const agents = agentsQuery.data ?? [];
  const agentById = React.useMemo(() => {
    const m = new Map<string, Agent>();
    for (const a of agents) m.set(a.id, a);
    return m;
  }, [agents]);

  const filtered = filter === "all" ? routines : routines.filter((r) => r.status === filter);

  const counts: Record<StatusFilter, number> = React.useMemo(() => {
    const c: Record<string, number> = { all: routines.length };
    for (const s of ROUTINE_STATUSES) c[s] = 0;
    for (const r of routines) c[r.status] = (c[r.status] ?? 0) + 1;
    return c as Record<StatusFilter, number>;
  }, [routines]);

  if (!companyId) {
    return (
      <div style={{ padding: 24, color: "var(--ink-dim)" }}>
        Select a company to view routines.
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
            Routines · {routines.length} total
          </span>
          <h1 className="fw-display" style={{ fontSize: 24, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>
            Scheduled & triggered workflows
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <NavLink
            to={`/${prefix}/routines`}
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
            Open classic routines
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
            New Routine
          </button>
        </div>
      </header>

      {/* Inline create form */}
      {showCreate ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (
              newName.trim() &&
              newProjectId &&
              newAssigneeAgentId &&
              !createMutation.isPending
            ) createMutation.mutate();
          }}
          style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
        >
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Routine name…"
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
          <select
            aria-label="Routine project"
            value={newProjectId}
            onChange={(e) => setNewProjectId(e.target.value)}
            disabled={projectsQuery.isLoading || createMutation.isPending}
            style={{
              minWidth: 150,
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid var(--line)",
              background: "var(--bg-raised)",
              color: "var(--ink)",
              fontSize: 12,
              fontFamily: "inherit",
            }}
          >
            <option value="">Select project…</option>
            {(projectsQuery.data ?? []).map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
          <select
            aria-label="Routine assignee"
            value={newAssigneeAgentId}
            onChange={(e) => setNewAssigneeAgentId(e.target.value)}
            disabled={agentsQuery.isLoading || createMutation.isPending}
            style={{
              minWidth: 150,
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid var(--line)",
              background: "var(--bg-raised)",
              color: "var(--ink)",
              fontSize: 12,
              fontFamily: "inherit",
            }}
          >
            <option value="">Select assignee…</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>{agent.name}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!newName.trim() || !newProjectId || !newAssigneeAgentId || createMutation.isPending}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid var(--accent)",
              background: "var(--accent)",
              color: "var(--bg)",
              fontSize: 12,
              fontWeight: 500,
              cursor: !newName.trim() || !newProjectId || !newAssigneeAgentId || createMutation.isPending ? "not-allowed" : "pointer",
              opacity: !newName.trim() || !newProjectId || !newAssigneeAgentId || createMutation.isPending ? 0.5 : 1,
            }}
          >
            {createMutation.isPending ? "Creating…" : "Create"}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCreate(false);
              setNewName("");
              setNewProjectId("");
              setNewAssigneeAgentId("");
            }}
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
              {createMutation.error instanceof Error ? createMutation.error.message : "Failed to create routine"}
            </span>
          ) : null}
        </form>
      ) : null}

      {/* Filter pills */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>Status</span>
        {(["all", ...ROUTINE_STATUSES] as StatusFilter[]).map((s) => {
          const active = filter === s;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
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
                textTransform: "capitalize",
              }}
            >
              <span>{s}</span>
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
                {counts[s] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {routinesQuery.isLoading ? (
        <LoadingState label="Loading routines…" />
      ) : routinesQuery.error ? (
        <ErrorState error={routinesQuery.error} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={I.clock}
          title={filter === "all" ? "No routines yet" : `No routines with status "${filter}"`}
          subtitle="Routines automate recurring agent work. Create one in classic Routines for now."
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filtered.map((r) => (
            <RoutineRow
              key={r.id}
              routine={r}
              agent={agentById.get(r.assigneeAgentId) ?? null}
              active={selectedId === r.id}
              onSelect={() => setSelected(r.id)}
            />
          ))}
        </div>
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
        <Icon d={I.clock} size={11} />
        <span>List refreshes every 30s · drawer polls every 15s · Run now fires an on-demand execution.</span>
      </footer>

      <RoutineDetailDrawer
        routineId={selectedId}
        prefix={prefix}
        agentById={agentById}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
