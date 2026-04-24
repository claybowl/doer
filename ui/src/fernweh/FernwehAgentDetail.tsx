import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NavLink, useParams, useNavigate } from "@/lib/router";
import { agentsApi } from "@/api/agents";
import { heartbeatsApi } from "@/api/heartbeats";
import { issuesApi } from "@/api/issues";
import { useCompany } from "@/context/CompanyContext";
import { queryKeys } from "@/lib/queryKeys";
import type { Agent, HeartbeatRun, Issue } from "@doerai/shared";
import { AGENT_ROLES, AGENT_STATUSES } from "@doerai/shared";
import {
  Avatar,
  ErrorState,
  HeartbeatRibbon,
  Icon,
  I,
  LoadingState,
  StatusChip,
  StatusDot,
  formatCents,
  formatRelative,
  type FwStatus,
  type HeartbeatAmp,
} from "./utils";

/* ============================================================
   FernwehAgentDetail — dedicated detail page for a single agent.
   Route: /:companyPrefix/fernweh/agents/:agentId
   Parity: read-centric with inline edits on name/title, plus
   pause/resume/terminate actions. Deep adapter/permission/skill
   config still belongs in classic; we link there explicitly.
============================================================ */

function pulseStatus(agent: Agent): FwStatus {
  if (agent.status === "running" || agent.status === "active") return "running";
  if (agent.status === "paused" || agent.status === "terminated" || agent.status === "pending_approval")
    return "paused";
  if (agent.status === "error") return "error";
  return "idle";
}

function BudgetBar({ spent, budget }: { spent: number; budget: number }) {
  const pct = budget > 0 ? Math.min(100, Math.max(0, (spent / budget) * 100)) : 0;
  const over = budget > 0 && spent > budget;
  const near = pct >= 80 && !over;
  const color = over ? "var(--danger)" : near ? "var(--warn)" : "var(--accent)";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 180 }}>
      <div style={{ height: 6, borderRadius: 3, background: "var(--bg-sunken)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, transition: "width .3s ease" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-dim)" }}>
        <span>{formatCents(spent)} spent</span>
        <span>{formatCents(budget)} budget</span>
      </div>
    </div>
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
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
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

export function FernwehAgentDetail() {
  const { companyPrefix, agentId } = useParams<{ companyPrefix: string; agentId: string }>();
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const companyId = selectedCompany?.id;
  const prefix = companyPrefix ?? selectedCompany?.issuePrefix ?? "";

  const agentQuery = useQuery<Agent>({
    queryKey: queryKeys.agents.detail(agentId!),
    queryFn: () => agentsApi.get(agentId!, companyId) as Promise<Agent>,
    enabled: !!agentId,
    refetchInterval: 20_000,
  });

  const runsQuery = useQuery<HeartbeatRun[]>({
    queryKey: ["heartbeats", "agent", agentId ?? "none"],
    queryFn: () => heartbeatsApi.list(companyId!, agentId, 20),
    enabled: !!(companyId && agentId),
    refetchInterval: 10_000,
  });

  const issuesQuery = useQuery<Issue[]>({
    queryKey: ["issues", "agent", agentId ?? "none"],
    queryFn: () =>
      issuesApi.list(companyId!, { assigneeAgentId: agentId }) as Promise<Issue[]>,
    enabled: !!(companyId && agentId),
  });

  const agent = agentQuery.data ?? null;
  const runs = runsQuery.data ?? [];
  const issues = issuesQuery.data ?? [];

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      agentsApi.update(agentId!, data, companyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.agents.detail(agentId!) });
      if (companyId) qc.invalidateQueries({ queryKey: queryKeys.agents.list(companyId) });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: () => agentsApi.pause(agentId!, companyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.agents.detail(agentId!) });
      if (companyId) qc.invalidateQueries({ queryKey: queryKeys.agents.list(companyId) });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: () => agentsApi.resume(agentId!, companyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.agents.detail(agentId!) });
      if (companyId) qc.invalidateQueries({ queryKey: queryKeys.agents.list(companyId) });
    },
  });

  const terminateMutation = useMutation({
    mutationFn: () => agentsApi.terminate(agentId!, companyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.agents.detail(agentId!) });
      if (companyId) qc.invalidateQueries({ queryKey: queryKeys.agents.list(companyId) });
    },
  });

  // ---- local edit state ----
  const [nameDraft, setNameDraft] = React.useState("");
  const [titleDraft, setTitleDraft] = React.useState("");
  const [dirty, setDirty] = React.useState<{ name: boolean; title: boolean }>({
    name: false,
    title: false,
  });

  React.useEffect(() => {
    if (agent) {
      setNameDraft(agent.name);
      setTitleDraft(agent.title ?? "");
      setDirty({ name: false, title: false });
    }
  }, [agent?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (agentQuery.isLoading && !agent) {
    return <LoadingState label="Loading agent…" />;
  }
  if (agentQuery.error && !agent) {
    return (
      <div style={{ padding: 32 }}>
        <ErrorState error={agentQuery.error} hint={`Agent id: ${agentId ?? "—"}`} />
      </div>
    );
  }
  if (!agent) return null;

  const status = pulseStatus(agent);
  const canPause = agent.status === "active" || agent.status === "running" || agent.status === "idle";
  const canResume = agent.status === "paused";
  const canTerminate = agent.status !== "terminated";

  const beats: HeartbeatAmp[] = Array.from({ length: 32 }, (_, i) => {
    const hasRun = runs[Math.floor(i / 4)];
    if (!hasRun) return "idle";
    if (hasRun.status === "queued") return "work";
    if (hasRun.status === "succeeded") return "output";
    if (hasRun.status === "failed" || hasRun.status === "timed_out" || hasRun.status === "cancelled") return "tick";
    return "tick";
  });

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
          to={`/${prefix}/fernweh/agents`}
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
          <span>All agents</span>
        </NavLink>
      </div>

      {/* Header */}
      <header
        className="fw-card"
        style={{
          padding: 20,
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          alignItems: "center",
          gap: 18,
        }}
      >
        <Avatar name={agent.name} size={56} />
        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
          <input
            value={nameDraft}
            onChange={(e) => {
              setNameDraft(e.target.value);
              setDirty((d) => ({ ...d, name: true }));
            }}
            onBlur={() => {
              if (dirty.name && nameDraft.trim() && nameDraft !== agent.name) {
                updateMutation.mutate({ name: nameDraft.trim() });
                setDirty((d) => ({ ...d, name: false }));
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
          <input
            value={titleDraft}
            onChange={(e) => {
              setTitleDraft(e.target.value);
              setDirty((d) => ({ ...d, title: true }));
            }}
            onBlur={() => {
              if (dirty.title && titleDraft !== (agent.title ?? "")) {
                updateMutation.mutate({ title: titleDraft.trim() || null });
                setDirty((d) => ({ ...d, title: false }));
              }
            }}
            placeholder="Add a title / subrole…"
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 13,
              color: "var(--ink-dim)",
              fontFamily: "inherit",
              width: "100%",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
            <StatusChip status={status} />
            <span className="fw-chip" style={{ textTransform: "capitalize" }}>
              {agent.role}
            </span>
            <span className="fw-chip" style={{ color: "var(--ink-faint)" }}>
              {agent.adapterType.replace(/_/g, " ")}
            </span>
            {agent.lastHeartbeatAt ? (
              <span className="fw-mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                Last heartbeat {formatRelative(agent.lastHeartbeatAt)}
              </span>
            ) : null}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {canResume ? (
            <button
              onClick={() => resumeMutation.mutate()}
              disabled={resumeMutation.isPending}
              style={{
                padding: "7px 12px",
                borderRadius: 8,
                border: "1px solid var(--accent)",
                background: "var(--accent)",
                color: "var(--bg)",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Resume
            </button>
          ) : null}
          {canPause ? (
            <button
              onClick={() => pauseMutation.mutate()}
              disabled={pauseMutation.isPending}
              style={{
                padding: "7px 12px",
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: "var(--bg-raised)",
                color: "var(--ink-dim)",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Pause
            </button>
          ) : null}
          {canTerminate ? (
            <button
              onClick={() => {
                if (confirm(`Terminate ${agent.name}? This cannot be undone.`)) {
                  terminateMutation.mutate();
                }
              }}
              disabled={terminateMutation.isPending}
              style={{
                padding: "7px 12px",
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: "transparent",
                color: "var(--danger)",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Terminate
            </button>
          ) : null}
        </div>
      </header>

      {/* Heartbeat ribbon */}
      <div className="fw-card" style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
            Activity
          </span>
          <HeartbeatRibbon beats={beats} width={300} height={28} />
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11, color: "var(--ink-faint)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <StatusDot status="running" />
            <span>
              {runs.filter((r) => r.startedAt != null && r.finishedAt == null).length} in flight
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <StatusDot status="idle" />
            <span>{runs.length} in last 20</span>
          </div>
        </div>
      </div>

      {/* Grid: budget + properties */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Section title="Budget" hint="this month">
          <div className="fw-card" style={{ padding: 16 }}>
            <BudgetBar spent={agent.spentMonthlyCents} budget={agent.budgetMonthlyCents} />
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line-soft)" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
                  Monthly budget ($)
                </span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={agent.budgetMonthlyCents / 100}
                  onBlur={(e) => {
                    const cents = Math.round(parseFloat(e.target.value) * 100);
                    if (!Number.isFinite(cents) || cents < 0 || cents === agent.budgetMonthlyCents) return;
                    updateMutation.mutate({ budgetMonthlyCents: cents });
                  }}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 6,
                    border: "1px solid var(--line)",
                    background: "var(--bg-raised)",
                    color: "var(--ink)",
                    fontSize: 13,
                    fontFamily: "var(--fw-font-mono)",
                  }}
                />
              </label>
            </div>
          </div>
        </Section>

        <Section title="Properties">
          <div className="fw-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
                Role
              </span>
              <select
                value={agent.role}
                onChange={(e) => updateMutation.mutate({ role: e.target.value })}
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
                {AGENT_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
                Status
              </span>
              <select
                value={agent.status}
                disabled
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid var(--line)",
                  background: "var(--bg-sunken)",
                  color: "var(--ink-dim)",
                  fontSize: 13,
                  textTransform: "capitalize",
                  cursor: "not-allowed",
                }}
              >
                {AGENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <span style={{ fontSize: 10, color: "var(--ink-faint)" }}>
                Use Pause / Resume / Terminate above to change status.
              </span>
            </label>
            <NavLink
              to={`/${prefix}/agents/${agent.id}`}
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
              Edit adapter / permissions / skills in classic →
            </NavLink>
          </div>
        </Section>
      </div>

      {/* Recent runs */}
      <Section title="Recent runs" hint={`${runs.length}`}>
        {runsQuery.isLoading && runs.length === 0 ? (
          <LoadingState label="Loading runs…" />
        ) : runs.length === 0 ? (
          <div className="fw-card" style={{ padding: 20, color: "var(--ink-faint)", fontSize: 12 }}>
            No runs yet.
          </div>
        ) : (
          <div className="fw-card" style={{ padding: 0, overflow: "hidden" }}>
            {runs.slice(0, 12).map((run, idx) => (
              <div
                key={run.id}
                style={{
                  padding: "10px 14px",
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto auto",
                  gap: 12,
                  alignItems: "center",
                  borderBottom: idx < Math.min(12, runs.length) - 1 ? "1px solid var(--line-soft)" : "none",
                  fontSize: 12,
                }}
              >
                <StatusDot
                  status={
                    run.startedAt != null && run.finishedAt == null
                      ? "running"
                      : run.status === "failed" || run.status === "timed_out" || run.status === "cancelled"
                      ? "error"
                      : "idle"
                  }
                />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {run.invocationSource} · {run.triggerDetail ?? "—"}
                </span>
                <span className="fw-mono" style={{ color: "var(--ink-dim)" }}>
                  {run.status}
                </span>
                <span className="fw-mono" style={{ color: "var(--ink-faint)" }}>
                  {run.startedAt ? formatRelative(run.startedAt) : "queued"}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Assigned issues */}
      <Section
        title="Assigned issues"
        hint={`${issues.length}`}
        right={
          <NavLink
            to={`/${prefix}/fernweh/work`}
            style={{ fontSize: 11, color: "var(--accent)", textDecoration: "none" }}
          >
            Open board
          </NavLink>
        }
      >
        {issuesQuery.isLoading && issues.length === 0 ? (
          <LoadingState label="Loading issues…" />
        ) : issues.length === 0 ? (
          <div className="fw-card" style={{ padding: 20, color: "var(--ink-faint)", fontSize: 12 }}>
            No issues assigned.
          </div>
        ) : (
          <div className="fw-card" style={{ padding: 0, overflow: "hidden" }}>
            {issues.slice(0, 10).map((issue, idx) => (
              <NavLink
                key={issue.id}
                to={`/${prefix}/fernweh/work?issue=${issue.id}`}
                style={{
                  padding: "10px 14px",
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto auto",
                  gap: 12,
                  alignItems: "center",
                  borderBottom: idx < Math.min(10, issues.length) - 1 ? "1px solid var(--line-soft)" : "none",
                  fontSize: 12.5,
                  textDecoration: "none",
                  color: "var(--ink)",
                }}
              >
                <span className="fw-mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                  {issue.identifier ?? issue.id.slice(0, 6)}
                </span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {issue.title ?? "Untitled"}
                </span>
                <StatusChip status={issue.status ?? "idle"} />
                <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                  {formatRelative(issue.updatedAt)}
                </span>
              </NavLink>
            ))}
          </div>
        )}
      </Section>

      {/* Footer metadata */}
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
        <span>Created {formatRelative(agent.createdAt)}</span>
        <span>·</span>
        <span>Updated {formatRelative(agent.updatedAt)}</span>
        <span>·</span>
        <span className="fw-mono">{agent.id.slice(0, 8)}</span>
        {agent.reportsTo ? (
          <>
            <span>·</span>
            <span>Reports to {agent.reportsTo.slice(0, 8)}</span>
          </>
        ) : null}
      </footer>
    </div>
  );
}
