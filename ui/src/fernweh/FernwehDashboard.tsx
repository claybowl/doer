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
  formatRelative,
  formatCents,
  type FwStatus,
  type HeartbeatAmp,
} from "./utils";
import type { Agent } from "@doerai/shared";
import { OutputsSection } from "./OutputsSection";
import { useLiveRunTranscripts } from "@/components/transcript/useLiveRunTranscripts";
import type { TranscriptEntry } from "@/adapters";

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
    <NavLink
      to={to}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 14px",
        borderRadius: 10,
        border: "1px solid var(--line)",
        background: "var(--bg-raised)",
        color: "var(--ink)",
        textDecoration: "none",
        transition: "all .15s var(--fw-ease)",
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
        {hint ? (
          <span style={{ fontSize: 11, color: "var(--ink-dim)" }}>{hint}</span>
        ) : null}
      </div>
      <div style={{ flex: 1 }} />
      <Icon d={I.arrow} size={12} style={{ color: "var(--ink-faint)" }} />
    </NavLink>
  );
}

function pulseStatus(agent: Agent): FwStatus {
  if (agent.status === "running" || agent.status === "active") return "running";
  if (agent.status === "paused" || agent.status === "terminated" || agent.status === "pending_approval") return "paused";
  if (agent.status === "error") return "error";
  return "idle";
}

// Live dialogue feed shown inside each running agent card.
// Shows only assistant text — no tool calls, no user prompts, no system noise.
function LiveTranscriptFeed({
  entries,
  hasOutput,
}: {
  entries: TranscriptEntry[];
  hasOutput: boolean;
}) {
  const bottomRef = React.useRef<HTMLDivElement>(null);

  const visible = React.useMemo(() => {
    return entries
      .filter((e) => e.kind === "assistant" || e.kind === "thinking")
      .slice(-10);
  }, [entries]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [visible.length]);

  if (visible.length === 0) {
    const idleBeats: HeartbeatAmp[] = Array.from({ length: 40 }, (_, i) =>
      i % 3 === 0 ? "work" : "tick"
    ) as HeartbeatAmp[];
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
        <HeartbeatRibbon beats={idleBeats} width={320} height={28} />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>
      {/* Top fade so older text dissolves out */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 32,
          background: "linear-gradient(to bottom, color-mix(in oklab, var(--accent) 3%, var(--bg-raised)), transparent)",
          zIndex: 1,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          height: "100%",
          overflowY: "auto",
          scrollbarWidth: "none",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          paddingTop: 2,
          paddingBottom: 2,
        }}
      >
        {visible.map((entry, i) => {
          const isLast = i === visible.length - 1;
          const isThinking = entry.kind === "thinking";
          const raw = entry.text.trim();
          const text = raw.length > 220 ? raw.slice(0, 217) + "…" : raw;
          const ageRatio = i / Math.max(1, visible.length - 1);
          return (
            <p
              key={i}
              style={{
                margin: 0,
                fontSize: isLast ? 12.5 : 12,
                lineHeight: 1.6,
                color: isLast
                  ? "var(--ink)"
                  : isThinking
                  ? "var(--ink-faint)"
                  : "var(--ink-dim)",
                opacity: 0.35 + ageRatio * 0.65,
                fontStyle: isThinking ? "italic" : "normal",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {isThinking ? `· ${text}` : text}
            </p>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
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

  const { transcriptByRun, hasOutputForRun } = useLiveRunTranscripts({
    runs: liveRuns,
    companyId: companyId ?? null,
  });

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
        maxWidth: 1280,
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
            HQ
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
          <NavLink
            to={`/${prefix}/agents/new`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 8,
              background: "var(--accent)",
              color: "var(--bg)",
              fontSize: 12,
              fontWeight: 500,
              border: "1px solid var(--accent)",
            }}
          >
            <Icon d={I.plus} size={11} />
            <span>New Agent</span>
          </NavLink>
        </div>
      </header>

      {/* Live session viewports — main event, top of page */}
      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <header style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <h2 className="fw-display" style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
            Live
          </h2>
          {liveRuns.length > 0 ? (
            <span className="fw-chip pulse" style={{ fontSize: 10 }}>
              <span className="fw-dot pulsing" /> {liveRuns.length} session{liveRuns.length !== 1 ? "s" : ""}
            </span>
          ) : (
            <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>idle</span>
          )}
        </header>
        {liveRuns.length === 0 ? (
          <div
            className="fw-card"
            style={{
              padding: "40px 28px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              minHeight: 180,
              borderStyle: "dashed",
              color: "var(--ink-faint)",
            }}
          >
            <StatusDot status="idle" />
            <span style={{ fontSize: 13 }}>No agents running right now.</span>
            <NavLink
              to={`/${prefix}/agents`}
              style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none" }}
            >
              Wake an agent →
            </NavLink>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(auto-fill, minmax(${liveRuns.length === 1 ? "100%" : liveRuns.length <= 2 ? "360px" : "300px"}, 1fr))`,
              gap: 14,
            }}
          >
            {liveRuns.map((run) => {
              const transcript = transcriptByRun.get(run.id) ?? [];
              const hasOutput = hasOutputForRun(run.id);
              const cardHeight = liveRuns.length <= 2 ? 260 : liveRuns.length <= 4 ? 200 : 160;
              return (
                <NavLink
                  key={run.id}
                  to={`/${prefix}/fernweh/agents/${run.agentId}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div
                    className="fw-card"
                    style={{
                      padding: "20px 22px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      height: cardHeight,
                      transition: "height .4s var(--fw-ease)",
                      cursor: "pointer",
                      overflow: "hidden",
                      borderColor: "color-mix(in oklab, var(--accent) 30%, var(--line))",
                      background: "color-mix(in oklab, var(--accent) 3%, var(--bg-raised))",
                    }}
                  >
                    {/* Agent identity */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                      <div style={{ position: "relative" }}>
                        <Avatar name={run.agentName} size={42} />
                        <span
                          style={{
                            position: "absolute",
                            bottom: -2,
                            right: -2,
                            width: 10,
                            height: 10,
                            borderRadius: 999,
                            background: "var(--pulse)",
                            border: "2px solid var(--bg-raised)",
                            animation: "fw-pulse 1.6s var(--fw-ease) infinite",
                          }}
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>
                          {run.agentName}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--ink-dim)", marginTop: 2 }}>
                          {run.adapterType.replace(/_/g, " ")}
                          {run.triggerDetail ? ` · ${run.triggerDetail}` : ""}
                        </div>
                      </div>
                      <span className="fw-chip pulse" style={{ fontSize: 10, flexShrink: 0 }}>
                        <span className="fw-dot pulsing" /> {run.status}
                      </span>
                    </div>

                    {/* Live dialogue feed */}
                    <LiveTranscriptFeed entries={transcript} hasOutput={hasOutput} />

                    {/* Meta */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: 11,
                        color: "var(--ink-faint)",
                        flexShrink: 0,
                      }}
                    >
                      <span>{run.invocationSource}</span>
                      <span>{run.startedAt ? formatRelative(run.startedAt) : "just started"}</span>
                    </div>
                  </div>
                </NavLink>
              );
            })}
          </div>
        )}
      </section>

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

      {/* Quick Actions */}
      <Section title="Quick Actions" hint="jump to">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 10,
          }}
        >
          <QuickAction
            to={`/${prefix}/agents/new`}
            icon={I.plus}
            label="New Agent"
            hint="Hire a specialist"
          />
          <QuickAction
            to={`/${prefix}/routines`}
            icon={I.bolt}
            label="New Routine"
            hint="Schedule a workflow"
          />
          <QuickAction
            to={`/${prefix}/fernweh/activity`}
            icon={I.activity}
            label="View Activity"
            hint="What's happening now"
          />
          <QuickAction
            to={`/${prefix}/fernweh/org`}
            icon={I.org}
            label="Org Chart"
            hint="Team topology"
          />
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
      <footer style={{ paddingTop: 12, borderTop: "1px solid var(--line-soft)", display: "flex", alignItems: "center", gap: 8, color: "var(--ink-faint)", fontSize: 11 }}>
        <Icon d={I.bolt} size={11} />
        <span>Fernweh preview · This page is a parallel UI; classic Doer is unaffected.</span>
      </footer>
    </div>
  );
}
