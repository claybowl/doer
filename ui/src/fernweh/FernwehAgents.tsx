import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useCompany } from "@/context/CompanyContext";
import { agentsApi } from "@/api/agents";
import { queryKeys } from "@/lib/queryKeys";
import {
  Avatar,
  Icon,
  I,
  StatusDot,
  StatusChip,
  formatRelative,
  formatCents,
  Field,
  type FwStatus,
} from "./utils";
import type { Agent } from "@doerai/shared";

/* ------------------------------------------------------------------
   Helpers
------------------------------------------------------------------ */
function pulseStatus(agent: Agent): FwStatus {
  if (agent.status === "running" || agent.status === "active") return "running";
  if (agent.status === "paused" || agent.status === "terminated" || agent.status === "pending_approval") return "paused";
  if (agent.status === "error") return "error";
  return "idle";
}

type FilterKey = "all" | "running" | "paused" | "error" | "idle";

/* ------------------------------------------------------------------
   BudgetBar — monthly utilization with over-budget coloring
------------------------------------------------------------------ */
function BudgetBar({ spent, budget }: { spent: number; budget: number }) {
  const pct = budget > 0 ? Math.min(100, Math.max(0, (spent / budget) * 100)) : 0;
  const over = budget > 0 && spent > budget;
  const near = pct >= 80 && !over;
  const color = over ? "var(--danger)" : near ? "var(--warn)" : "var(--accent)";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 140 }}>
      <div
        style={{
          height: 4,
          borderRadius: 2,
          background: "var(--bg-sunken)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            transition: "width .3s var(--fw-ease)",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 10,
          color: "var(--ink-faint)",
          fontFamily: "var(--fw-font-mono)",
        }}
      >
        <span>{formatCents(spent)}</span>
        <span>{formatCents(budget)}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Detail drawer
------------------------------------------------------------------ */
function DetailDrawer({
  agent,
  byId,
  onClose,
}: {
  agent: Agent | null;
  byId: Map<string, Agent>;
  onClose: () => void;
}) {
  React.useEffect(() => {
    if (!agent) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [agent, onClose]);

  if (!agent) return null;

  const status = pulseStatus(agent);
  const reportsToAgent = agent.reportsTo ? byId.get(agent.reportsTo) : null;
  const pct =
    agent.budgetMonthlyCents > 0
      ? Math.round((agent.spentMonthlyCents / agent.budgetMonthlyCents) * 100)
      : 0;

  return (
    <>
      {/* Backdrop */}
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
      {/* Panel */}
      <aside
        role="dialog"
        aria-label={`Agent ${agent.name}`}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(480px, 90vw)",
          background: "var(--bg, #fafafa)",
          borderLeft: "1px solid var(--line)",
          boxShadow: "-12px 0 32px rgba(0,0,0,0.18)",
          zIndex: 41,
          display: "flex",
          flexDirection: "column",
          animation: "fw-slide-in-right .22s var(--fw-ease)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px 16px",
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
            borderBottom: "1px solid var(--line-soft)",
          }}
        >
          <Avatar name={agent.name} size={48} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2
                className="fw-display"
                style={{ margin: 0, fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em" }}
              >
                {agent.name}
              </h2>
              <StatusDot status={status} />
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 2 }}>
              {agent.title ?? agent.role}
            </div>
            <div
              className="fw-mono"
              style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 4 }}
            >
              {agent.urlKey} · {agent.adapterType}
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
              justifyContent: "center",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "18px 24px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Status + pause reason */}
          <Field label="Status">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <StatusChip status={agent.status} />
              {agent.pauseReason ? (
                <span style={{ fontSize: 11, color: "var(--ink-dim)" }}>· {agent.pauseReason}</span>
              ) : null}
            </div>
          </Field>

          {/* Budget */}
          <Field label="Monthly budget">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <BudgetBar spent={agent.spentMonthlyCents} budget={agent.budgetMonthlyCents} />
              <div style={{ fontSize: 11, color: "var(--ink-dim)" }}>{pct}% used</div>
            </div>
          </Field>

          {/* Reports to */}
          <Field label="Reports to">
            {reportsToAgent ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Avatar name={reportsToAgent.name} size={20} />
                <span style={{ fontSize: 13 }}>{reportsToAgent.name}</span>
                <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                  · {reportsToAgent.title ?? reportsToAgent.role}
                </span>
              </div>
            ) : (
              <span style={{ fontSize: 13, color: "var(--ink-dim)" }}>— root agent</span>
            )}
          </Field>

          {/* Last heartbeat */}
          <Field label="Last heartbeat">
            <span style={{ fontSize: 13 }}>{formatRelative(agent.lastHeartbeatAt)}</span>
          </Field>

          {/* Capabilities */}
          {agent.capabilities ? (
            <Field label="Capabilities">
              <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: "var(--ink-dim)" }}>
                {agent.capabilities}
              </p>
            </Field>
          ) : null}

          {/* Created / updated */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Created">
              <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>{formatRelative(agent.createdAt)}</span>
            </Field>
            <Field label="Updated">
              <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>{formatRelative(agent.updatedAt)}</span>
            </Field>
          </div>

          {/* ID — for debugging / deep links */}
          <Field label="ID">
            <code
              className="fw-mono"
              style={{
                fontSize: 10,
                color: "var(--ink-faint)",
                background: "var(--bg-sunken)",
                padding: "2px 6px",
                borderRadius: 4,
                userSelect: "all",
              }}
            >
              {agent.id}
            </code>
          </Field>
        </div>
      </aside>
    </>
  );
}

/* ------------------------------------------------------------------
   Page
------------------------------------------------------------------ */
export function FernwehAgents() {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id;

  const agentsQuery = useQuery({
    queryKey: companyId ? queryKeys.agents.list(companyId) : ["agents", "none"],
    queryFn: () => agentsApi.list(companyId!),
    enabled: !!companyId,
    refetchInterval: 30_000,
  });

  // Hooks must run on every render — keep above any conditional return.
  const [filter, setFilter] = React.useState<FilterKey>("all");
  const [search, setSearch] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const agents = agentsQuery.data ?? [];

  const byId = React.useMemo(() => {
    const m = new Map<string, Agent>();
    for (const a of agents) m.set(a.id, a);
    return m;
  }, [agents]);

  const counts = React.useMemo(() => {
    const c = { all: agents.length, running: 0, paused: 0, error: 0, idle: 0 };
    for (const a of agents) {
      const s = pulseStatus(a);
      c[s] += 1;
    }
    return c;
  }, [agents]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return agents
      .filter((a) => {
        if (filter !== "all") {
          if (pulseStatus(a) !== filter) return false;
        }
        if (q) {
          const hay = [a.name, a.title ?? "", a.role, a.urlKey, a.adapterType].join(" ").toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [agents, filter, search]);

  const selected = selectedId ? byId.get(selectedId) ?? null : null;

  if (!selectedCompany) {
    return (
      <div style={{ padding: 40, color: "var(--ink-dim)" }}>
        <p>Select a company to view agents.</p>
      </div>
    );
  }

  const totalAgents = agents.length;

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
            Agents
          </span>
          <h1 className="fw-display" style={{ fontSize: 28, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>
            {selectedCompany.name}
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="fw-chip">{totalAgents} total</span>
          {counts.running > 0 ? (
            <span className="fw-chip pulse">
              <span className="fw-dot pulsing" /> {counts.running} running
            </span>
          ) : null}
        </div>
      </header>

      {/* Controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {([
            ["all", `All · ${counts.all}`],
            ["running", `Running · ${counts.running}`],
            ["paused", `Paused · ${counts.paused}`],
            ["error", `Error · ${counts.error}`],
            ["idle", `Idle · ${counts.idle}`],
          ] as const).map(([key, label]) => {
            const active = filter === key;
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                style={{
                  padding: "5px 10px",
                  borderRadius: 999,
                  border: "1px solid var(--line)",
                  background: active ? "var(--accent-soft)" : "transparent",
                  color: active ? "var(--accent)" : "var(--ink-dim)",
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all .12s var(--fw-ease)",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid var(--line)",
              background: "var(--bg-raised)",
              minWidth: 220,
            }}
          >
            <Icon d="M21 21l-4.35-4.35 M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" size={13} style={{ color: "var(--ink-faint)" }} />
            <input
              placeholder="Search agents…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: 12,
                color: "var(--ink)",
                width: "100%",
              }}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      {totalAgents === 0 ? (
        <div className="fw-card" style={{ padding: 40, textAlign: "center", color: "var(--ink-dim)" }}>
          No agents yet. Hire one from the classic UI to see them here.
        </div>
      ) : filtered.length === 0 ? (
        <div className="fw-card" style={{ padding: 40, textAlign: "center", color: "var(--ink-dim)" }}>
          No agents match the current filters.
        </div>
      ) : (
        <div className="fw-card" style={{ padding: 0, overflow: "hidden" }}>
          {/* Column headers */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(200px, 2fr) 120px 120px 110px minmax(160px, 1fr) 110px",
              gap: 16,
              padding: "10px 18px",
              borderBottom: "1px solid var(--line-soft)",
              fontSize: 10,
              color: "var(--ink-faint)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            <span>Agent</span>
            <span>Role</span>
            <span>Adapter</span>
            <span>Status</span>
            <span>Budget</span>
            <span style={{ textAlign: "right" }}>Last seen</span>
          </div>

          {/* Rows */}
          {filtered.map((agent, idx) => {
            const status = pulseStatus(agent);
            const isSelected = selectedId === agent.id;
            return (
              <div
                key={agent.id}
                onClick={() => setSelectedId(agent.id)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(200px, 2fr) 120px 120px 110px minmax(160px, 1fr) 110px",
                  gap: 16,
                  padding: "12px 18px",
                  alignItems: "center",
                  borderBottom: idx < filtered.length - 1 ? "1px solid var(--line-soft)" : "none",
                  cursor: "pointer",
                  background: isSelected ? "var(--bg-raised)" : "transparent",
                  transition: "background .1s var(--fw-ease)",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "var(--bg-sunken)";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = "transparent";
                }}
              >
                {/* Agent */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <Avatar name={agent.name} size={28} />
                  <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {agent.name}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--ink-dim)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {agent.title ?? "—"}
                    </span>
                  </div>
                </div>

                {/* Role */}
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--ink-dim)",
                    textTransform: "capitalize",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {agent.role}
                </span>

                {/* Adapter */}
                <span
                  className="fw-mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-faint)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {agent.adapterType}
                </span>

                {/* Status */}
                <StatusChip status={status} />

                {/* Budget */}
                <BudgetBar spent={agent.spentMonthlyCents} budget={agent.budgetMonthlyCents} />

                {/* Last seen */}
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--ink-faint)",
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {formatRelative(agent.lastHeartbeatAt)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer hint */}
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
        <Icon d={I.bolt} size={11} />
        <span>Click a row for detail · Esc to close · refetches every 30s.</span>
      </footer>

      {/* Drawer */}
      <DetailDrawer agent={selected} byId={byId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
