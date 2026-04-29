import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NavLink, useParams } from "@/lib/router";
import { useCompany } from "@/context/CompanyContext";
import { routinesApi } from "@/api/routines";
import { queryKeys } from "@/lib/queryKeys";
import type { RoutineDetail, RoutineTrigger, RoutineRunSummary } from "@doerai/shared";
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
   FernwehRoutineDetail — detail view for a single routine.
   Route: /:companyPrefix/routines/:routineId
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

export function FernwehRoutineDetail() {
  const { companyPrefix, routineId } = useParams<{ companyPrefix: string; routineId: string }>();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id ?? "";
  const qc = useQueryClient();

  // Local edit state
  const [editTitle, setEditTitle] = React.useState<string | null>(null);
  const [editDesc, setEditDesc] = React.useState<string | null>(null);

  // Queries
  const routineQuery = useQuery({
    queryKey: queryKeys.routines.detail(routineId!),
    queryFn: () => routinesApi.get(routineId!),
    enabled: !!routineId,
  });

  // Mutations
  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => routinesApi.update(routineId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.routines.detail(routineId!) });
    },
  });

  const runMutation = useMutation({
    mutationFn: () => routinesApi.run(routineId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.routines.runs(routineId!) });
      qc.invalidateQueries({ queryKey: queryKeys.routines.detail(routineId!) });
    },
  });

  // Guards
  if (routineQuery.isLoading) return <LoadingState />;
  if (routineQuery.error) return <ErrorState error={routineQuery.error} />;
  const routine = routineQuery.data as RoutineDetail | undefined;
  if (!routine) return <EmptyState title="Routine not found." />;

  const titleValue = editTitle ?? routine.title;
  const descValue = editDesc ?? (routine.description ?? "");
  const recentRuns: RoutineRunSummary[] = (routine.recentRuns ?? []).slice(0, 10);

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
          to={`/${companyPrefix}/routines`}
          style={{ color: "var(--ink-dim)", textDecoration: "none", fontSize: 14 }}
        >
          ← Routines
        </NavLink>
      </div>

      {/* Header card */}
      <div className="fw-card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
            <Icon d={I.bolt} size={18} style={{ color: "var(--accent)", flexShrink: 0 }} />
            {/* Inline-editable title */}
            <input
              value={titleValue}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={() => {
                if (editTitle !== null && editTitle !== routine.title) {
                  updateMutation.mutate({ title: editTitle });
                }
                setEditTitle(null);
              }}
              style={{
                font: "inherit",
                fontSize: 20,
                fontWeight: 700,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--ink)",
                flex: 1,
                minWidth: 0,
                padding: 0,
              }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <StatusChip status={routine.status} />
            <button
              onClick={() => runMutation.mutate()}
              disabled={runMutation.isPending}
              style={{
                background: "var(--accent)",
                color: "var(--bg-raised)",
                border: "none",
                borderRadius: 6,
                padding: "6px 14px",
                fontSize: 13,
                fontWeight: 600,
                cursor: runMutation.isPending ? "not-allowed" : "pointer",
                opacity: runMutation.isPending ? 0.6 : 1,
                transition: "opacity var(--fw-ease)",
              }}
            >
              {runMutation.isPending ? "Running…" : "Run now"}
            </button>
          </div>
        </div>
        <div style={{ color: "var(--ink-faint)", fontSize: 13 }}>
          Created {formatRelative(routine.createdAt)} · Updated {formatRelative(routine.updatedAt)}
        </div>
      </div>

      {/* Description */}
      <Section label="Description">
        <textarea
          value={descValue}
          onChange={(e) => setEditDesc(e.target.value)}
          onBlur={() => {
            if (editDesc !== null && editDesc !== (routine.description ?? "")) {
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

      {/* Assignee */}
      <Section label="Assignee">
        {routine.assignee ? (
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
              <Avatar name={routine.assignee.name} size={32} />
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>
                  {routine.assignee.name}
                </span>
                <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>
                  {routine.assignee.title ?? routine.assignee.role}
                </span>
              </div>
            </div>
            <NavLink
              to={`/${companyPrefix}/agents/${routine.assignee.id}`}
              style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none" }}
            >
              Open ↗
            </NavLink>
          </div>
        ) : (
          <span style={{ color: "var(--ink-faint)", fontSize: 14 }}>No assignee.</span>
        )}
      </Section>

      {/* Schedule / Triggers */}
      <Section label="Schedule / Triggers">
        {!routine.triggers || routine.triggers.length === 0 ? (
          <span style={{ color: "var(--ink-faint)", fontSize: 14 }}>
            No triggers configured.
          </span>
        ) : (
          <div
            className="fw-card"
            style={{ display: "flex", flexDirection: "column", gap: 0, overflow: "hidden" }}
          >
            {routine.triggers.map((trigger: RoutineTrigger, idx: number) => (
              <div
                key={trigger.id}
                style={{
                  padding: "12px 14px",
                  borderTop: idx === 0 ? "none" : "1px solid var(--line-soft)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    className="fw-chip fw-uc"
                    style={{ fontSize: 11, color: "var(--ink-dim)" }}
                  >
                    {trigger.kind}
                  </span>
                  {trigger.label ? (
                    <span style={{ fontSize: 14, color: "var(--ink)", fontWeight: 500 }}>
                      {trigger.label}
                    </span>
                  ) : null}
                  <span
                    className="fw-chip"
                    style={{
                      fontSize: 11,
                      marginLeft: "auto",
                      color: trigger.enabled ? "var(--pulse)" : "var(--ink-faint)",
                    }}
                  >
                    {trigger.enabled ? "enabled" : "disabled"}
                  </span>
                </div>
                {trigger.cronExpression ? (
                  <span className="fw-mono" style={{ fontSize: 13, color: "var(--ink-dim)" }}>
                    {trigger.cronExpression}
                    {trigger.timezone ? ` (${trigger.timezone})` : ""}
                  </span>
                ) : null}
                {trigger.nextRunAt ? (
                  <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>
                    Next: {formatRelative(trigger.nextRunAt)}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Active Issue */}
      <Section label="Active Issue">
        {routine.activeIssue ? (
          <NavLink
            to={`/${companyPrefix}/work/${routine.activeIssue.id}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              textDecoration: "none",
              color: "var(--ink)",
            }}
            className="fw-card"
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {routine.activeIssue.identifier ? (
                <span className="fw-mono" style={{ fontSize: 12, color: "var(--ink-faint)" }}>
                  {routine.activeIssue.identifier}
                </span>
              ) : null}
              <span style={{ fontSize: 14 }}>{routine.activeIssue.title}</span>
            </div>
            <StatusChip status={routine.activeIssue.status} />
          </NavLink>
        ) : (
          <span style={{ color: "var(--ink-faint)", fontSize: 14 }}>No active issue.</span>
        )}
      </Section>

      {/* Linked Project */}
      <Section label="Linked Project">
        {routine.project ? (
          <NavLink
            to={`/${companyPrefix}/projects/${routine.project.id}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              textDecoration: "none",
              color: "var(--ink)",
            }}
            className="fw-card"
          >
            <span style={{ fontSize: 14 }}>{routine.project.name}</span>
            <StatusChip status={routine.project.status} />
          </NavLink>
        ) : (
          <span style={{ color: "var(--ink-faint)", fontSize: 14 }}>No project linked.</span>
        )}
      </Section>

      {/* Parent Issue */}
      <Section label="Parent Issue">
        {routine.parentIssue ? (
          <NavLink
            to={`/${companyPrefix}/work/${routine.parentIssue.id}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "var(--ink)",
              textDecoration: "none",
              fontSize: 14,
            }}
          >
            {routine.parentIssue.identifier ? (
              <span className="fw-mono" style={{ fontSize: 12, color: "var(--ink-faint)" }}>
                {routine.parentIssue.identifier}
              </span>
            ) : null}
            <span>{routine.parentIssue.title}</span>
            <StatusChip status={routine.parentIssue.status} />
          </NavLink>
        ) : (
          <span style={{ color: "var(--ink-faint)", fontSize: 14 }}>—</span>
        )}
      </Section>

      {/* Recent Runs */}
      <Section label={`Recent Runs (${recentRuns.length})`}>
        {recentRuns.length === 0 ? (
          <EmptyState title="No runs yet." />
        ) : (
          <div
            className="fw-card"
            style={{ display: "flex", flexDirection: "column", gap: 0, overflow: "hidden" }}
          >
            {recentRuns.map((run: RoutineRunSummary, idx: number) => (
              <div
                key={run.id}
                style={{
                  padding: "10px 14px",
                  borderTop: idx === 0 ? "none" : "1px solid var(--line-soft)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <span style={{ fontSize: 13, color: "var(--ink-dim)", flexShrink: 0 }}>
                    {run.triggeredAt ? formatRelative(run.triggeredAt) : "—"}
                  </span>
                  {run.trigger ? (
                    <span
                      className="fw-chip fw-uc"
                      style={{ fontSize: 11, color: "var(--ink-faint)", flexShrink: 0 }}
                    >
                      {run.trigger.kind}
                    </span>
                  ) : null}
                  {run.linkedIssue ? (
                    <NavLink
                      to={`/${companyPrefix}/work/${run.linkedIssue.id}`}
                      style={{
                        fontSize: 12,
                        color: "var(--ink-dim)",
                        textDecoration: "none",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {run.linkedIssue.identifier ? `${run.linkedIssue.identifier} ` : ""}
                      {run.linkedIssue.title}
                    </NavLink>
                  ) : null}
                </div>
                <StatusChip status={run.status} />
              </div>
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
          justifyContent: "space-between",
        }}
      >
        <span className="fw-mono" style={{ fontSize: 12, color: "var(--ink-faint)" }}>
          {routine.id}
        </span>
        <NavLink
          to={`/${companyPrefix}/routines/${routineId}`}
          style={{ fontSize: 13, color: "var(--ink-dim)", textDecoration: "none" }}
        >
          Classic view ↗
        </NavLink>
      </div>
    </div>
  );
}
