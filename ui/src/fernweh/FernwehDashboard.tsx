import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { NavLink, useParams } from "@/lib/router";
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
  Card,
  Button,
  Badge,
  formatRelative,
  formatCents,
  type FwStatus,
  type HeartbeatAmp,
} from "./utils";
import type { Agent } from "@doerai/shared";
import { OutputsSection } from "./OutputsSection";
import { ActiveAgentsPanel } from "@/components/ActiveAgentsPanel";

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
  icon,
  label,
  value,
  sub,
  pulse,
}: {
  icon: string;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  pulse?: boolean;
}) {
  return (
    <Card padding={14} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--ink-faint)" }}>
        <Icon d={icon} size={12} />
        <span className="fw-uc" style={{ fontSize: 10, letterSpacing: "0.1em" }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <span
          className="fw-display"
          style={{
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            fontVariantNumeric: "tabular-nums",
            color: pulse ? "var(--accent)" : "var(--ink)",
          }}
        >
          {value}
        </span>
        {sub ? <span style={{ fontSize: 11, color: "var(--ink-dim)", whiteSpace: "nowrap" }}>{sub}</span> : null}
      </div>
    </Card>
  );
}

function QuickAction({
  to,
  icon,
  label,
  hint,
}: {
  to: string;
  icon: string;
  label: string;
  hint?: string;
}) {
  return (
    <NavLink to={to} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
      <Card
        hover
        padding="12px 14px"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          borderRadius: 10,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: "color-mix(in oklab, var(--accent) 10%, var(--bg-sunken))",
            border: "1px solid color-mix(in oklab, var(--accent) 25%, var(--line))",
            color: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon d={icon} size={13} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{label}</span>
          {hint ? <span style={{ fontSize: 11, color: "var(--ink-dim)" }}>{hint}</span> : null}
        </div>
        <div style={{ flex: 1 }} />
        <Icon d={I.arrow} size={12} style={{ color: "var(--ink-faint)" }} />
      </Card>
    </NavLink>
  );
}

function pulseStatus(agent: Agent): FwStatus {
  if (agent.status === "running" || agent.status === "active") return "running";
  if (agent.status === "paused" || agent.status === "terminated" || agent.status === "pending_approval") return "paused";
  if (agent.status === "error") return "error";
  return "idle";
}

export function FernwehDashboard() {
  const { companyPrefix } = useParams<{ companyPrefix: string }>();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id;
  const prefix = companyPrefix ?? selectedCompany?.issuePrefix ?? "";

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

  // NOTE: all hooks must run on every render (React hooks rule). Keep them
  // above any conditional return. Derived values that don't need memoization
  // can live below the early return.
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

  if (!selectedCompany) {
    return (
      <div style={{ padding: 40, color: "var(--ink-dim)" }}>
        <p>Select a company to view the command deck.</p>
      </div>
    );
  }

  const liveRunsByAgent = new Map<string, number>();
  for (const r of liveRuns) {
    liveRunsByAgent.set(r.agentId, (liveRunsByAgent.get(r.agentId) ?? 0) + 1);
  }

  return (
    <div
      style={{
        padding: "32px 36px 60px",
        display: "flex",
        flexDirection: "column",
        gap: 28,
        maxWidth: 1200,
        margin: "0 auto",
      }}
    >
      {/* Hero */}
      <section
        style={{
          position: "relative",
          borderRadius: 16,
          border: "1px solid var(--line)",
          overflow: "hidden",
          background:
            "linear-gradient(135deg, var(--bg-raised) 0%, var(--bg) 60%, color-mix(in oklab, var(--accent) 6%, var(--bg)) 100%)",
          padding: "40px 36px 44px",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.04,
            pointerEvents: "none",
            backgroundImage:
              "linear-gradient(var(--ink) 1px, transparent 1px), linear-gradient(90deg, var(--ink) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: -80,
            right: -80,
            width: 260,
            height: 260,
            borderRadius: 999,
            background: "radial-gradient(circle, color-mix(in oklab, var(--accent) 35%, transparent) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "var(--accent)",
                color: "var(--bg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon d={I.bolt} size={16} stroke={1.8} />
            </div>
            <span className="fw-uc" style={{ fontSize: 11, letterSpacing: "0.1em", color: "var(--ink-faint)" }}>
              Welcome · {selectedCompany.name}
            </span>
          </div>
          <h1
            className="fw-display"
            style={{
              fontSize: 36,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              margin: 0,
              maxWidth: 640,
            }}
          >
            Your AI agent workforce,
            <br />
            <span style={{ color: "var(--accent)" }}>organized and running.</span>
          </h1>
          <p style={{ fontSize: 15, color: "var(--ink-dim)", maxWidth: 560, margin: 0 }}>
            Deploy agents, automate workflows, and scale your operations — all from one command center.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", paddingTop: 4 }}>
            <NavLink to={`/${prefix}`} style={{ textDecoration: "none" }}>
              <Button variant="primary" icon={I.home}>
                Open HQ
              </Button>
            </NavLink>
            <NavLink to={`/${prefix}/agents/new`} style={{ textDecoration: "none" }}>
              <Button variant="secondary" icon={I.plus}>
                New Agent
              </Button>
            </NavLink>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--accent)" }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: "var(--pulse)",
                  animation: "fw-pulse 1.6s ease infinite",
                }}
              />
              All systems operational
            </span>
          </div>
        </div>
      </section>

      {/* Agent grid — existing ActiveAgentsPanel preserves its internal features */}
      <ActiveAgentsPanel companyId={companyId!} />

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
        }}
      >
        <Stat
          icon={I.agents}
          label="Running"
          value={summary?.agents.running ?? "—"}
          sub={`${summary?.agents.active ?? 0} active`}
          pulse={(summary?.agents.running ?? 0) > 0}
        />
        <Stat
          icon={I.issues}
          label="Open work"
          value={summary?.tasks.open ?? "—"}
          sub={`${summary?.tasks.inProgress ?? 0} in progress · ${summary?.tasks.blocked ?? 0} blocked`}
        />
        <Stat
          icon={I.shield}
          label="Pending approvals"
          value={summary?.pendingApprovals ?? "—"}
          sub={(summary?.pendingApprovals ?? 0) > 0 ? "needs review" : "all clear"}
          pulse={(summary?.pendingApprovals ?? 0) > 0}
        />
        <Stat
          icon={I.dollar}
          label="Spend (mo)"
          value={summary ? formatCents(summary.costs.monthSpendCents) : "—"}
          sub={
            summary
              ? `of ${formatCents(summary.costs.monthBudgetCents)} · ${summary.costs.monthUtilizationPercent}%`
              : undefined
          }
        />
      </div>

      {/* Quick Actions */}
      <Section title="Quick Actions" hint="jump to">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 10,
          }}
        >
          <QuickAction to={`/${prefix}/agents/new`} icon={I.plus} label="New Agent" hint="Hire a specialist" />
          <QuickAction to={`/${prefix}/routines`} icon={I.bolt} label="New Routine" hint="Schedule a workflow" />
          <QuickAction to={`/${prefix}/activity`} icon={I.activity} label="View Activity" hint="What's happening now" />
          <QuickAction to={`/${prefix}/org`} icon={I.org} label="Org Chart" hint="Team topology" />
        </div>
      </Section>

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
        <Card padding={16} style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <Spark values={sparkValues} width={300} height={42} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
              Live
            </span>
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
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Badge tone="pulse" dot>
              {liveRuns.length} live
            </Badge>
            <Badge tone="neutral">{agents.length} agents</Badge>
          </div>
        </Card>
      </Section>

      {/* Agents */}
      <Section title="Agents" hint={`${agents.length} total`}>
        {agents.length === 0 ? (
          <Card padding={24} style={{ color: "var(--ink-dim)" }}>
            No agents yet. Hire one to get started.
          </Card>
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
                <NavLink
                  key={agent.id}
                  to={`/${prefix}/agents/${agent.id}`}
                  style={{ textDecoration: "none", color: "inherit", display: "block" }}
                >
                  <Card
                    hover
                    padding={14}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      borderRadius: 12,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar name={agent.name} size={32} />
                      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
                        <span
                          style={{
                            fontWeight: 500,
                            fontSize: 13,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {agent.name}
                        </span>
                        <span style={{ fontSize: 11, color: "var(--ink-dim)", textTransform: "capitalize" }}>
                          {agent.role}
                        </span>
                      </div>
                      <StatusDot status={status} />
                    </div>
                    <HeartbeatRibbon beats={beats} width={250} height={20} />
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: 11,
                        color: "var(--ink-dim)",
                      }}
                    >
                      <span>
                        {formatCents(agent.spentMonthlyCents)} / {formatCents(agent.budgetMonthlyCents)}
                      </span>
                      <span>{liveCount > 0 ? `${liveCount} running` : formatRelative(agent.lastHeartbeatAt)}</span>
                    </div>
                  </Card>
                </NavLink>
              );
            })}
          </div>
        )}
      </Section>

      {/* Recent issues */}
      <Section title="Recent work" hint="last touched">
        <Card padding={0} style={{ overflow: "hidden" }}>
          {sortedRecentIssues.length === 0 ? (
            <div style={{ padding: 24, color: "var(--ink-dim)" }}>No recent issues.</div>
          ) : (
            sortedRecentIssues.slice(0, 6).map((issue, idx) => {
              const visible = sortedRecentIssues.slice(0, 6);
              const assigneeName = issue.assigneeAgentId ? agentNameById.get(issue.assigneeAgentId) ?? null : null;
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
                  <span
                    style={{
                      fontSize: 13,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {issue.title ?? "Untitled"}
                  </span>
                  <StatusChip status={issue.status ?? "idle"} />
                  <span style={{ fontSize: 11, color: "var(--ink-dim)" }}>{assigneeName ?? "—"}</span>
                  <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>{formatRelative(issue.updatedAt)}</span>
                </div>
              );
            })
          )}
        </Card>
      </Section>

      {/* Recent outputs across all agents */}
      {companyId ? (
        <OutputsSection
          companyId={companyId}
          prefix={prefix}
          title="Recent outputs"
          hint="files your agents produced"
          limit={5}
        />
      ) : null}

      {/* Footer */}
      <footer
        style={{
          paddingTop: 12,
          borderTop: "1px solid var(--line-soft)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "var(--ink-faint)",
          fontSize: 11,
        }}
      >
        <Icon d={I.bolt} size={11} />
        <span>Fernweh preview · This page is a parallel UI; classic Doer is unaffected.</span>
      </footer>
    </div>
  );
}
