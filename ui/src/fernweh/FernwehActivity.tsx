import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useCompany } from "@/context/CompanyContext";
import { heartbeatsApi, type LiveRunForIssue } from "@/api/heartbeats";
import { agentsApi } from "@/api/agents";
import { queryKeys } from "@/lib/queryKeys";
import {
  Avatar,
  HeartbeatRibbon,
  Icon,
  I,
  StatusDot,
  formatRelative,
  type FwStatus,
  type HeartbeatAmp,
} from "./utils";
import type { Agent, HeartbeatRun, HeartbeatRunStatus } from "@doerai/shared";

/* ------------------------------------------------------------------
   Helpers
------------------------------------------------------------------ */
function runStatusToFw(s: HeartbeatRunStatus | string): FwStatus {
  if (s === "running" || s === "queued") return "running";
  if (s === "succeeded") return "idle"; // reuse idle as neutral-completed
  if (s === "failed" || s === "timed_out") return "error";
  if (s === "cancelled") return "paused";
  return "idle";
}

const STATUS_COLOR: Record<string, string> = {
  queued: "var(--ink-faint)",
  running: "var(--pulse)",
  succeeded: "var(--ink-dim)",
  failed: "var(--danger)",
  timed_out: "var(--danger)",
  cancelled: "var(--ink-faint)",
};

function RunStatusChip({ status }: { status: HeartbeatRunStatus | string }) {
  const color = STATUS_COLOR[status] ?? "var(--ink-faint)";
  return (
    <span
      className="fw-chip"
      style={{
        color,
        fontSize: 10,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      <StatusDot status={runStatusToFw(status)} size={5} />
      <span>{status}</span>
    </span>
  );
}

function durationMs(r: HeartbeatRun): number | null {
  if (!r.startedAt) return null;
  const start = new Date(r.startedAt).getTime();
  const end = r.finishedAt ? new Date(r.finishedAt).getTime() : Date.now();
  return Math.max(0, end - start);
}

function fmtDuration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m < 60) return rem ? `${m}m ${rem}s` : `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function absoluteTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

/* ------------------------------------------------------------------
   Live row — pulsing EKG, cancellable (not wired)
------------------------------------------------------------------ */
function LiveRow({ run, agent }: { run: LiveRunForIssue; agent: Agent | null }) {
  const beats: HeartbeatAmp[] = Array.from(
    { length: 28 },
    (_, i) => (i % 3 === 0 ? "work" : i % 7 === 0 ? "output" : "tick")
  ) as HeartbeatAmp[];
  return (
    <div
      style={{
        padding: "12px 16px",
        display: "grid",
        gridTemplateColumns: "auto 1fr auto auto auto",
        gap: 12,
        alignItems: "center",
        borderBottom: "1px solid var(--line-soft)",
      }}
    >
      <Avatar name={run.agentName} size={28} />
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>{run.agentName}</span>
          <span className="fw-mono" style={{ fontSize: 10, color: "var(--ink-faint)" }}>
            {run.adapterType}
          </span>
        </div>
        <div style={{ fontSize: 11, color: "var(--ink-dim)", marginTop: 2 }}>
          {run.invocationSource}
          {run.triggerDetail ? ` · ${run.triggerDetail}` : ""}
          {agent?.title ? ` · ${agent.title}` : ""}
        </div>
      </div>
      <HeartbeatRibbon beats={beats} width={160} height={22} />
      <span className="fw-chip pulse">
        <span className="fw-dot pulsing" /> {run.status}
      </span>
      <span style={{ fontSize: 10, color: "var(--ink-faint)", fontVariantNumeric: "tabular-nums" }}>
        {run.startedAt ? formatRelative(run.startedAt) : "queued"}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------
   Run row — completed/past runs
------------------------------------------------------------------ */
function RunRow({
  run,
  agent,
  active,
  onClick,
}: {
  run: HeartbeatRun;
  agent: Agent | null;
  active: boolean;
  onClick: () => void;
}) {
  const dur = durationMs(run);
  return (
    <div
      onClick={onClick}
      style={{
        padding: "10px 16px",
        display: "grid",
        gridTemplateColumns: "74px auto 1fr auto auto auto",
        gap: 12,
        alignItems: "center",
        borderBottom: "1px solid var(--line-soft)",
        cursor: "pointer",
        background: active ? "var(--bg-raised)" : "transparent",
        transition: "background .1s var(--fw-ease)",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "var(--bg-sunken)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      <span
        className="fw-mono"
        style={{ fontSize: 10, color: "var(--ink-faint)", fontVariantNumeric: "tabular-nums" }}
      >
        {absoluteTime(run.startedAt ?? run.createdAt)}
      </span>

      <Avatar name={agent?.name ?? "?"} size={22} />

      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 500 }}>{agent?.name ?? "unknown"}</span>
          <span className="fw-mono" style={{ fontSize: 10, color: "var(--ink-faint)" }}>
            {run.invocationSource}
            {run.triggerDetail ? `/${run.triggerDetail}` : ""}
          </span>
        </div>
        {run.error ? (
          <span
            style={{
              fontSize: 10,
              color: "var(--danger)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 360,
            }}
          >
            {run.errorCode ? `${run.errorCode}: ` : ""}
            {run.error}
          </span>
        ) : null}
      </div>

      <span style={{ fontSize: 10, color: "var(--ink-faint)", fontVariantNumeric: "tabular-nums" }}>
        {fmtDuration(dur)}
      </span>

      <RunStatusChip status={run.status} />

      <span style={{ fontSize: 10, color: "var(--ink-faint)", textAlign: "right" }}>
        {formatRelative(run.startedAt ?? run.createdAt)}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------
   Run drawer
------------------------------------------------------------------ */
function RunDrawer({
  run,
  agent,
  onClose,
}: {
  run: HeartbeatRun | null;
  agent: Agent | null;
  onClose: () => void;
}) {
  React.useEffect(() => {
    if (!run) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run, onClose]);

  if (!run) return null;

  const dur = durationMs(run);
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.35)",
          backdropFilter: "blur(2px)",
          zIndex: 40,
          animation: "fw-fade-in .15s var(--fw-ease)",
        }}
      />
      <aside
        role="dialog"
        aria-label={`Run ${run.id}`}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(560px, 92vw)",
          background: "var(--bg, #fafafa)",
          borderLeft: "1px solid var(--line)",
          boxShadow: "-12px 0 32px rgba(0,0,0,0.18)",
          zIndex: 41,
          display: "flex",
          flexDirection: "column",
          animation: "fw-slide-in-right .22s var(--fw-ease)",
        }}
      >
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid var(--line-soft)",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
                Run
              </span>
              <RunStatusChip status={run.status} />
            </div>
            <h2 className="fw-display" style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
              {agent?.name ?? "unknown agent"}
            </h2>
            <div className="fw-mono" style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 4 }}>
              {run.id}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              border: "1px solid var(--line)",
              background: "var(--bg-raised)",
              borderRadius: 8,
              padding: 6,
              color: "var(--ink-dim)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "18px 24px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Invocation">
              <span style={{ fontSize: 12 }}>
                {run.invocationSource}
                {run.triggerDetail ? ` · ${run.triggerDetail}` : ""}
              </span>
            </Field>
            <Field label="Duration">
              <span style={{ fontSize: 12, fontVariantNumeric: "tabular-nums" }}>{fmtDuration(dur)}</span>
            </Field>
            <Field label="Started">
              <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>
                {run.startedAt ? new Date(run.startedAt).toLocaleString() : "—"}
              </span>
            </Field>
            <Field label="Finished">
              <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>
                {run.finishedAt ? new Date(run.finishedAt).toLocaleString() : "—"}
              </span>
            </Field>
            {run.exitCode != null ? (
              <Field label="Exit code">
                <span className="fw-mono" style={{ fontSize: 12 }}>
                  {run.exitCode}
                </span>
              </Field>
            ) : null}
            {run.signal ? (
              <Field label="Signal">
                <span className="fw-mono" style={{ fontSize: 12 }}>
                  {run.signal}
                </span>
              </Field>
            ) : null}
          </div>

          {run.error ? (
            <Field label="Error">
              <pre
                className="fw-mono"
                style={{
                  margin: 0,
                  padding: 12,
                  borderRadius: 8,
                  background: "var(--bg-sunken)",
                  border: "1px solid var(--line)",
                  fontSize: 11,
                  color: "var(--danger)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {run.errorCode ? `[${run.errorCode}] ` : ""}
                {run.error}
              </pre>
            </Field>
          ) : null}

          {run.stdoutExcerpt ? (
            <Field label="Stdout (excerpt)">
              <pre
                className="fw-mono"
                style={{
                  margin: 0,
                  padding: 12,
                  borderRadius: 8,
                  background: "var(--bg-sunken)",
                  border: "1px solid var(--line)",
                  fontSize: 11,
                  color: "var(--ink-dim)",
                  whiteSpace: "pre-wrap",
                  maxHeight: 220,
                  overflow: "auto",
                }}
              >
                {run.stdoutExcerpt}
              </pre>
            </Field>
          ) : null}

          {run.stderrExcerpt ? (
            <Field label="Stderr (excerpt)">
              <pre
                className="fw-mono"
                style={{
                  margin: 0,
                  padding: 12,
                  borderRadius: 8,
                  background: "var(--bg-sunken)",
                  border: "1px solid var(--warn)",
                  fontSize: 11,
                  color: "var(--warn)",
                  whiteSpace: "pre-wrap",
                  maxHeight: 220,
                  overflow: "auto",
                }}
              >
                {run.stderrExcerpt}
              </pre>
            </Field>
          ) : null}

          {run.usageJson ? (
            <Field label="Usage">
              <pre
                className="fw-mono"
                style={{
                  margin: 0,
                  padding: 12,
                  borderRadius: 8,
                  background: "var(--bg-sunken)",
                  border: "1px solid var(--line)",
                  fontSize: 11,
                  color: "var(--ink-dim)",
                  whiteSpace: "pre-wrap",
                  maxHeight: 160,
                  overflow: "auto",
                }}
              >
                {JSON.stringify(run.usageJson, null, 2)}
              </pre>
            </Field>
          ) : null}
        </div>
      </aside>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
        {label}
      </span>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------
   Page
------------------------------------------------------------------ */
export function FernwehActivity() {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id;

  const agentsQuery = useQuery({
    queryKey: companyId ? queryKeys.agents.list(companyId) : ["agents", "none"],
    queryFn: () => agentsApi.list(companyId!),
    enabled: !!companyId,
    refetchInterval: 60_000,
  });

  const liveRunsQuery = useQuery({
    queryKey: companyId ? ["heartbeats", "live-runs", companyId] : ["heartbeats", "live-runs", "none"],
    queryFn: () => heartbeatsApi.liveRunsForCompany(companyId!),
    enabled: !!companyId,
    refetchInterval: 5_000,
  });

  const runsQuery = useQuery({
    queryKey: companyId ? ["heartbeats", "recent-feed", companyId] : ["heartbeats", "recent-feed", "none"],
    queryFn: () => heartbeatsApi.list(companyId!, undefined, 100),
    enabled: !!companyId,
    refetchInterval: 15_000,
  });

  // Hooks above the early-return gate.
  const [agentFilter, setAgentFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const agents = agentsQuery.data ?? [];
  const liveRuns = liveRunsQuery.data ?? [];
  const runs = runsQuery.data ?? [];

  const agentById = React.useMemo(() => {
    const m = new Map<string, Agent>();
    for (const a of agents) m.set(a.id, a);
    return m;
  }, [agents]);

  const filteredRuns = React.useMemo(() => {
    return runs
      .filter((r) => {
        if (agentFilter !== "all" && r.agentId !== agentFilter) return false;
        if (statusFilter !== "all" && r.status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => {
        const at = a.startedAt ? new Date(a.startedAt).getTime() : new Date(a.createdAt).getTime();
        const bt = b.startedAt ? new Date(b.startedAt).getTime() : new Date(b.createdAt).getTime();
        return bt - at;
      });
  }, [runs, agentFilter, statusFilter]);

  const selected = selectedId ? runs.find((r) => r.id === selectedId) ?? null : null;
  const selectedAgent = selected ? agentById.get(selected.agentId) ?? null : null;

  if (!selectedCompany) {
    return (
      <div style={{ padding: 40, color: "var(--ink-dim)" }}>
        <p>Select a company to see activity.</p>
      </div>
    );
  }

  const statusCounts: Record<string, number> = {};
  for (const r of runs) statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1;

  return (
    <div
      style={{
        padding: "32px 36px 60px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
        maxWidth: 1400,
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
            Activity
          </span>
          <h1 className="fw-display" style={{ fontSize: 28, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>
            {selectedCompany.name}
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {liveRuns.length > 0 ? (
            <span className="fw-chip pulse">
              <span className="fw-dot pulsing" /> {liveRuns.length} live
            </span>
          ) : null}
          <span className="fw-chip">{runs.length} recent</span>
          {statusCounts.failed ? (
            <span className="fw-chip" style={{ color: "var(--danger)" }}>
              {statusCounts.failed} failed
            </span>
          ) : null}
        </div>
      </header>

      {/* Live runs */}
      {liveRuns.length > 0 ? (
        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <header style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <h2 className="fw-display" style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
              Live
            </h2>
            <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
              streaming · 5s
            </span>
          </header>
          <div className="fw-card" style={{ padding: 0, overflow: "hidden" }}>
            {liveRuns.slice(0, 10).map((r) => (
              <LiveRow key={r.id} run={r} agent={agentById.get(r.agentId) ?? null} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span className="fw-uc" style={{ color: "var(--ink-faint)", fontSize: 10 }}>
            Agent
          </span>
          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            style={{
              padding: "5px 8px",
              borderRadius: 8,
              border: "1px solid var(--line)",
              background: "var(--bg-raised)",
              color: "var(--ink)",
              fontSize: 12,
            }}
          >
            <option value="all">All agents</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {(["all", "succeeded", "running", "failed", "cancelled", "timed_out"] as const).map((key) => {
            const active = statusFilter === key;
            const count = key === "all" ? runs.length : statusCounts[key] ?? 0;
            return (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                style={{
                  padding: "5px 10px",
                  borderRadius: 999,
                  border: "1px solid var(--line)",
                  background: active ? "var(--accent-soft)" : "transparent",
                  color: active ? "var(--accent)" : "var(--ink-dim)",
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {key} · {count}
              </button>
            );
          })}
        </div>
      </div>

      {/* Timeline */}
      <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <header style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <h2 className="fw-display" style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
            Timeline
          </h2>
          <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
            last {runs.length} · 15s refresh
          </span>
        </header>
        {runs.length === 0 ? (
          <div className="fw-card" style={{ padding: 40, textAlign: "center", color: "var(--ink-dim)" }}>
            No runs yet. Trigger a heartbeat from the classic UI.
          </div>
        ) : filteredRuns.length === 0 ? (
          <div className="fw-card" style={{ padding: 40, textAlign: "center", color: "var(--ink-dim)" }}>
            No runs match the current filters.
          </div>
        ) : (
          <div className="fw-card" style={{ padding: 0, overflow: "hidden" }}>
            {filteredRuns.map((r) => (
              <RunRow
                key={r.id}
                run={r}
                agent={agentById.get(r.agentId) ?? null}
                active={selectedId === r.id}
                onClick={() => setSelectedId(r.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 0",
          borderTop: "1px solid var(--line-soft)",
          color: "var(--ink-faint)",
          fontSize: 11,
        }}
      >
        <Icon d={I.activity} size={11} />
        <span>Click a run for details · Esc to close · Live 5s · Timeline 15s.</span>
      </footer>

      {/* Drawer */}
      <RunDrawer run={selected} agent={selectedAgent} onClose={() => setSelectedId(null)} />
    </div>
  );
}
