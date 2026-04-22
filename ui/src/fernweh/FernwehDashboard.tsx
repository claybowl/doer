import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useCompany } from "@/context/CompanyContext";
import { dashboardApi } from "@/api/dashboard";
import { agentsApi } from "@/api/agents";
import { heartbeatsApi } from "@/api/heartbeats";
import { issuesApi } from "@/api/issues";
import { queryKeys } from "@/lib/queryKeys";
import {
  Avatar,
  HeartbeatRibbon,
  Icon,
  I,
  Spark,
  StatusDot,
  StatusChip,
  formatRelative,
  formatCents,
  type FwStatus,
  type HeartbeatAmp,
} from "./utils";
import type { Agent } from "@doerai/shared";

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
    <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <h2 className="fw-display" style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
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

function Stat({
  label,
  value,
  sub,
  pulse,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  pulse?: boolean;
}) {
  return (
    <div className="fw-card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 6 }}>
      <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
        {label}
      </span>
      <span
        className="fw-display"
        style={{
          fontSize: 28,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: pulse ? "var(--accent)" : "var(--ink)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
      {sub ? (
        <span style={{ fontSize: 11, color: "var(--ink-dim)" }}>{sub}</span>
      ) : null}
    </div>
  );
}

function pulseStatus(agent: Agent): FwStatus {
  if (agent.status === "running" || agent.status === "active") return "running";
  if (agent.status === "paused" || agent.status === "terminated" || agent.status === "pending_approval") return "paused";
  if (agent.status === "error") return "error";
  return "idle";
}

export function FernwehDashboard() {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id;

  const dashboardQuery = useQuery({
    queryKey: companyId ? queryKeys.dashboard(companyId) : ["dashboard", "none"],
    queryFn: () => dashboardApi.summary(companyId!),
    enabled: !!companyId,
    refetchInterval: 30_000,
  });

  const agentsQuery = useQuery({
    queryKey: companyId ? queryKeys.agents.list(companyId) : ["agents", "none"],
    queryFn: () => agentsApi.list(companyId!),
    enabled: !!companyId,
    refetchInterval: 30_000,
  });

  const liveRunsQuery = useQuery({
    queryKey: companyId ? ["heartbeats", "live-runs", companyId] : ["heartbeats", "live-runs", "none"],
    queryFn: () => heartbeatsApi.liveRunsForCompany(companyId!),
    enabled: !!companyId,
    refetchInterval: 5_000,
  });

  const recentRunsQuery = useQuery({
    queryKey: companyId ? ["heartbeats", "recent", companyId] : ["heartbeats", "recent", "none"],
    queryFn: () => heartbeatsApi.list(companyId!, undefined, 12),
    enabled: !!companyId,
    refetchInterval: 30_000,
  });

  const recentIssuesQuery = useQuery({
    queryKey: companyId ? ["issues", "recent", companyId] : ["issues", "recent", "none"],
    queryFn: () => issuesApi.list(companyId!),
    enabled: !!companyId,
    refetchInterval: 30_000,
  });

  if (!selectedCompany) {
    return (
      <div style={{ padding: 40, color: "var(--ink-dim)" }}>
        <p>Select a company to view the command deck.</p>
      </div>
    );
  }

  const summary = dashboardQuery.data;
  const agents = agentsQuery.data ?? [];
  const liveRuns = liveRunsQuery.data ?? [];
  const recentRuns = recentRunsQuery.data ?? [];
  const recentIssues = recentIssuesQuery.data ?? [];
  const agentNameById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const a of agents) m.set(a.id, a.name);
    return m;
  }, [agents]);
  const sortedRecentIssues = React.useMemo(() => {
    return [...recentIssues].sort((a, b) => {
      const ad = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bd = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bd - ad;
    });
  }, [recentIssues]);

  const liveRunsByAgent = new Map<string, number>();
  for (const r of liveRuns) {
    liveRunsByAgent.set(r.agentId, (liveRunsByAgent.get(r.agentId) ?? 0) + 1);
  }

  // Build a tiny sparkline of recent run counts per hour bucket (last 12 hours)
  const sparkValues = React.useMemo(() => {
    const buckets = new Array(12).fill(0);
    const now = Date.now();
    for (const r of recentRuns) {
      const startedAt = r.startedAt ? new Date(r.startedAt).getTime() : null;
      if (!startedAt) continue;
      const hoursAgo = Math.floor((now - startedAt) / (1000 * 60 * 60));
      if (hoursAgo >= 0 && hoursAgo < 12) {
        buckets[11 - hoursAgo] += 1;
      }
    }
    return buckets;
  }, [recentRuns]);

  return (
    <div
      style={{
        padding: "32px 36px 60px",
        display: "flex",
        flexDirection: "column",
        gap: 28,
        maxWidth: 1280,
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
            Command deck
          </span>
          <h1 className="fw-display" style={{ fontSize: 28, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>
            {selectedCompany.name}
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="fw-chip pulse">
            <span className="fw-dot pulsing" /> {liveRuns.length} live
          </span>
          <span className="fw-chip">{agents.length} agents</span>
        </div>
      </header>

      {/* Stat grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
        }}
      >
        <Stat
          label="Running"
          value={summary?.agents.running ?? "—"}
          sub={`${summary?.agents.active ?? 0} active`}
          pulse={(summary?.agents.running ?? 0) > 0}
        />
        <Stat
          label="Open work"
          value={summary?.tasks.open ?? "—"}
          sub={`${summary?.tasks.inProgress ?? 0} in progress · ${summary?.tasks.blocked ?? 0} blocked`}
        />
        <Stat
          label="Pending approvals"
          value={summary?.pendingApprovals ?? "—"}
          sub={(summary?.pendingApprovals ?? 0) > 0 ? "needs review" : "all clear"}
          pulse={(summary?.pendingApprovals ?? 0) > 0}
        />
        <Stat
          label="Spend (mo)"
          value={summary ? formatCents(summary.costs.monthSpendCents) : "—"}
          sub={
            summary
              ? `of ${formatCents(summary.costs.monthBudgetCents)} · ${summary.costs.monthUtilizationPercent}%`
              : undefined
          }
        />
      </div>

      {/* Activity row */}
      <Section
        title="Activity"
        hint="last 12h"
        right={
          <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>
            {recentRuns.length} runs
          </span>
        }
      >
        <div className="fw-card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 16 }}>
          <Spark values={sparkValues} width={300} height={42} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>Live</span>
            <HeartbeatRibbon
              beats={
                liveRuns.length > 0
                  ? (Array.from({ length: 24 }, (_, i) => (i % 4 === 0 ? "work" : "tick")) as HeartbeatAmp[])
                  : undefined
              }
              width={180}
              height={28}
            />
          </div>
        </div>
      </Section>

      {/* Agents */}
      <Section title="Agents" hint={`${agents.length} total`}>
        {agents.length === 0 ? (
          <div className="fw-card" style={{ padding: 24, color: "var(--ink-dim)" }}>
            No agents yet. Hire one to get started.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 12,
            }}
          >
            {agents.slice(0, 9).map((agent) => {
              const status = pulseStatus(agent);
              const liveCount = liveRunsByAgent.get(agent.id) ?? 0;
              const beats: HeartbeatAmp[] =
                liveCount > 0
                  ? (Array.from({ length: 24 }, (_, i) => (i % 3 === 0 ? "work" : "tick")) as HeartbeatAmp[])
                  : (Array.from({ length: 24 }, () => "idle") as HeartbeatAmp[]);
              return (
                <div
                  key={agent.id}
                  className="fw-card"
                  style={{
                    padding: 14,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Avatar name={agent.name} size={32} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
                      <span style={{ fontWeight: 500, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {agent.name}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--ink-dim)", textTransform: "capitalize" }}>
                        {agent.role}
                      </span>
                    </div>
                    <StatusDot status={status} />
                  </div>
                  <HeartbeatRibbon beats={beats} width={250} height={20} />
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, color: "var(--ink-dim)" }}>
                    <span>{formatCents(agent.spentMonthlyCents)} / {formatCents(agent.budgetMonthlyCents)}</span>
                    <span>{liveCount > 0 ? `${liveCount} running` : formatRelative(agent.lastHeartbeatAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Recent issues */}
      <Section title="Recent work" hint="last touched">
        <div className="fw-card" style={{ padding: 0, overflow: "hidden" }}>
          {sortedRecentIssues.length === 0 ? (
            <div style={{ padding: 24, color: "var(--ink-dim)" }}>No recent issues.</div>
          ) : (
            sortedRecentIssues.slice(0, 6).map((issue, idx) => {
              const visible = sortedRecentIssues.slice(0, 6);
              const assigneeName = issue.assigneeAgentId
                ? agentNameById.get(issue.assigneeAgentId) ?? null
                : null;
              return (
                <div
                  key={issue.id}
                  style={{
                    padding: "12px 16px",
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto auto auto",
                    gap: 12,
                    alignItems: "center",
                    borderBottom: idx < visible.length - 1 ? "1px solid var(--line-soft)" : "none",
                  }}
                >
                  <span className="fw-mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                    {issue.identifier ?? issue.id.slice(0, 6)}
                  </span>
                  <span style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {issue.title ?? "Untitled"}
                  </span>
                  <StatusChip status={issue.status ?? "idle"} />
                  <span style={{ fontSize: 11, color: "var(--ink-dim)" }}>
                    {assigneeName ?? "—"}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                    {formatRelative(issue.updatedAt)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </Section>

      {/* Live runs strip */}
      {liveRuns.length > 0 ? (
        <Section title="Live runs" hint="streaming">
          <div className="fw-card" style={{ padding: 0, overflow: "hidden" }}>
            {liveRuns.slice(0, 8).map((run, idx) => (
              <div
                key={run.id}
                style={{
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  borderBottom: idx < Math.min(8, liveRuns.length) - 1 ? "1px solid var(--line-soft)" : "none",
                }}
              >
                <Avatar name={run.agentName} size={24} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{run.agentName}</div>
                  <div style={{ fontSize: 10, color: "var(--ink-faint)" }}>
                    {run.invocationSource} · {run.adapterType}
                    {run.triggerDetail ? ` · ${run.triggerDetail}` : ""}
                  </div>
                </div>
                <span className="fw-chip pulse">
                  <span className="fw-dot pulsing" /> {run.status}
                </span>
                <span style={{ fontSize: 10, color: "var(--ink-faint)" }}>
                  {run.startedAt ? formatRelative(run.startedAt) : "queued"}
                </span>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {/* Footer */}
      <footer style={{ paddingTop: 12, borderTop: "1px solid var(--line-soft)", display: "flex", alignItems: "center", gap: 8, color: "var(--ink-faint)", fontSize: 11 }}>
        <Icon d={I.bolt} size={11} />
        <span>Fernweh preview · This page is a parallel UI; classic Doer is unaffected.</span>
      </footer>
    </div>
  );
}
