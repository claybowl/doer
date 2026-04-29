import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { NavLink, useParams } from "@/lib/router";
import type {
  BudgetIncident,
  BudgetPolicySummary,
  CostByAgent,
  CostByProject,
  CostSummary,
} from "@doerai/shared";
import { costsApi } from "@/api/costs";
import { budgetsApi } from "@/api/budgets";
import { useCompany } from "@/context/CompanyContext";
import { queryKeys } from "@/lib/queryKeys";
import { Icon, I, formatCents, formatRelative, Field } from "./utils";

/* ------------------------------------------------------------------
   Helpers
------------------------------------------------------------------ */

type DatePreset = "mtd" | "7d" | "30d" | "ytd";

const PRESET_LABEL: Record<DatePreset, string> = {
  mtd: "Month to date",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  ytd: "Year to date",
};

function computeRange(preset: DatePreset): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString();
  switch (preset) {
    case "mtd": {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: d.toISOString(), to };
    }
    case "7d": {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0);
      return { from: d.toISOString(), to };
    }
    case "30d": {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30, 0, 0, 0, 0);
      return { from: d.toISOString(), to };
    }
    case "ytd": {
      const d = new Date(now.getFullYear(), 0, 1);
      return { from: d.toISOString(), to };
    }
  }
}

function utilColor(pct: number): string {
  if (pct >= 100) return "var(--danger)";
  if (pct >= 90) return "var(--danger)";
  if (pct >= 70) return "var(--warn)";
  return "var(--pulse)";
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function metricUnit(metric: string): string {
  if (metric === "spend_cents") return "$";
  if (metric.includes("token")) return "tok";
  if (metric === "run_count") return "runs";
  return "";
}

function formatMetricValue(metric: string, value: number): string {
  if (metric === "spend_cents") return formatCents(value);
  if (metric.includes("token")) return formatTokens(value);
  return String(value);
}

const SCOPE_LABEL: Record<string, string> = {
  company: "Company",
  agent: "Agent",
  project: "Project",
};

/* ------------------------------------------------------------------
   UI — Metric tile
------------------------------------------------------------------ */

function MetricTile({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warn" | "danger" | "pulse";
}) {
  const color =
    tone === "danger"
      ? "var(--danger)"
      : tone === "warn"
      ? "var(--warn)"
      : tone === "pulse"
      ? "var(--pulse)"
      : "var(--ink)";
  return (
    <div
      className="fw-card"
      style={{
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
        {label}
      </span>
      <span
        className="fw-display"
        style={{
          fontSize: 22,
          fontWeight: 600,
          color,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
      {hint ? (
        <span style={{ fontSize: 11, color: "var(--ink-dim)" }}>{hint}</span>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------
   UI — Utilization bar
------------------------------------------------------------------ */

function UtilBar({
  pct,
  warnPct = 80,
  height = 6,
}: {
  pct: number;
  warnPct?: number;
  height?: number;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  const color = utilColor(pct);
  return (
    <div
      style={{
        position: "relative",
        height,
        borderRadius: 999,
        background: "var(--bg-sunken)",
        overflow: "hidden",
        border: "1px solid var(--line)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: `${clamped}%`,
          background: color,
          opacity: 0.85,
          transition: "width .3s var(--fw-ease)",
        }}
      />
      {warnPct > 0 && warnPct < 100 ? (
        <div
          style={{
            position: "absolute",
            top: -1,
            bottom: -1,
            left: `${warnPct}%`,
            width: 1,
            background: "var(--ink-faint)",
            opacity: 0.7,
          }}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------
   UI — Incidents banner
------------------------------------------------------------------ */

function IncidentsBanner({ incidents }: { incidents: BudgetIncident[] }) {
  if (!incidents.length) return null;
  return (
    <div
      className="fw-card"
      style={{
        padding: "14px 18px",
        borderColor: "var(--danger)",
        background: "color-mix(in oklab, var(--danger) 8%, var(--bg-raised))",
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: "var(--danger)",
          color: "var(--bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon d={I.bolt} size={14} />
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontWeight: 600, fontSize: 13, color: "var(--danger)" }}>
          {incidents.length} active budget incident{incidents.length === 1 ? "" : "s"}
        </span>
        <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>
          {incidents
            .slice(0, 3)
            .map((i) => `${i.scopeName} · ${i.thresholdType.replace(/_/g, " ")}`)
            .join(" · ")}
          {incidents.length > 3 ? ` · +${incidents.length - 3} more` : ""}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   UI — Policy row
------------------------------------------------------------------ */

function PolicyRow({
  policy,
  onClick,
}: {
  policy: BudgetPolicySummary;
  onClick: () => void;
}) {
  const unit = metricUnit(policy.metric);
  const observed = formatMetricValue(policy.metric, policy.observedAmount);
  const limit = formatMetricValue(policy.metric, policy.amount);
  const pctLabel = `${Math.round(policy.utilizationPercent)}%`;
  const status = policy.paused
    ? "paused"
    : policy.status === "hard_stop"
    ? "over limit"
    : policy.status === "warning"
    ? "warning"
    : "ok";
  const statusColor =
    policy.paused || policy.status === "hard_stop"
      ? "var(--danger)"
      : policy.status === "warning"
      ? "var(--warn)"
      : "var(--pulse)";

  return (
    <button
      onClick={onClick}
      className="fw-card"
      style={{
        padding: "14px 18px",
        textAlign: "left",
        background: "var(--bg-raised)",
        cursor: "pointer",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 10,
        rowGap: 8,
        alignItems: "center",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>{policy.scopeName}</span>
          <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
            {SCOPE_LABEL[policy.scopeType] ?? policy.scopeType}
          </span>
          <span
            className="fw-chip"
            style={{
              color: statusColor,
              fontSize: 10,
            }}
          >
            {status}
          </span>
          {policy.windowKind ? (
            <span
              className="fw-chip"
              style={{ fontSize: 10, color: "var(--ink-dim)" }}
            >
              {policy.windowKind}
            </span>
          ) : null}
        </div>
        <span className="fw-mono" style={{ fontSize: 11, color: "var(--ink-dim)" }}>
          {observed} / {limit} {unit}
        </span>
      </div>
      <span
        className="fw-mono"
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: utilColor(policy.utilizationPercent),
          fontVariantNumeric: "tabular-nums",
          minWidth: 60,
          textAlign: "right",
        }}
      >
        {pctLabel}
      </span>
      <div style={{ gridColumn: "1 / -1" }}>
        <UtilBar pct={policy.utilizationPercent} warnPct={policy.warnPercent} />
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------
   UI — Leaderboard row (agent or project)
------------------------------------------------------------------ */

function LeaderRow({
  name,
  costCents,
  totalCents,
  subtitle,
  to,
}: {
  name: string;
  costCents: number;
  totalCents: number;
  subtitle?: string;
  to?: string;
}) {
  const pct = totalCents > 0 ? (costCents / totalCents) * 100 : 0;
  const body = (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {name}
        </span>
        <span
          className="fw-mono"
          style={{ fontSize: 12, fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}
        >
          {formatCents(costCents)}
        </span>
      </div>
      {subtitle ? (
        <span className="fw-mono" style={{ fontSize: 10, color: "var(--ink-dim)" }}>
          {subtitle}
        </span>
      ) : null}
      <div
        style={{
          height: 4,
          borderRadius: 999,
          background: "var(--bg-sunken)",
          overflow: "hidden",
          marginTop: 2,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.max(1, Math.min(100, pct))}%`,
            background: "var(--accent)",
            opacity: 0.85,
          }}
        />
      </div>
    </>
  );

  const padding = "10px 14px";
  if (to) {
    return (
      <NavLink
        to={to}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          padding,
          borderRadius: 8,
          border: "1px solid transparent",
          transition: "border-color .15s var(--fw-ease), background .15s var(--fw-ease)",
        }}
      >
        {body}
      </NavLink>
    );
  }
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding,
        borderRadius: 8,
      }}
    >
      {body}
    </div>
  );
}

/* ------------------------------------------------------------------
   UI — Policy drawer
------------------------------------------------------------------ */

function PolicyDrawer({
  policy,
  incidents,
  prefix,
  onClose,
}: {
  policy: BudgetPolicySummary | null;
  incidents: BudgetIncident[];
  prefix: string;
  onClose: () => void;
}) {
  React.useEffect(() => {
    if (!policy) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [policy, onClose]);

  if (!policy) return null;

  const matchingIncident = incidents.find((i) => i.policyId === policy.policyId) ?? null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.32)",
          backdropFilter: "blur(4px)",
          zIndex: 40,
          animation: "fw-fade-in .15s var(--fw-ease)",
        }}
      />
      <aside
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(520px, 100%)",
          background: "var(--bg)",
          borderLeft: "1px solid var(--line)",
          zIndex: 41,
          display: "flex",
          flexDirection: "column",
          animation: "fw-slide-in-right .22s var(--fw-ease)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 22px",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
              {SCOPE_LABEL[policy.scopeType] ?? policy.scopeType} · {policy.windowKind}
            </span>
            <span className="fw-display" style={{ fontSize: 18, fontWeight: 600 }}>
              {policy.scopeName}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              border: "1px solid var(--line)",
              background: "var(--bg-raised)",
              color: "var(--ink-dim)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Icon d={I.x} size={12} />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "18px 22px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {/* big utilization */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
                Utilization
              </span>
              <span
                className="fw-display"
                style={{
                  fontSize: 28,
                  fontWeight: 600,
                  color: utilColor(policy.utilizationPercent),
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {Math.round(policy.utilizationPercent)}%
              </span>
            </div>
            <UtilBar pct={policy.utilizationPercent} warnPct={policy.warnPercent} height={10} />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                color: "var(--ink-dim)",
              }}
              className="fw-mono"
            >
              <span>{formatMetricValue(policy.metric, policy.observedAmount)} observed</span>
              <span>{formatMetricValue(policy.metric, policy.amount)} limit</span>
            </div>
          </div>

          {/* Details grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Metric">
              <span style={{ fontSize: 12 }}>{policy.metric}</span>
            </Field>
            <Field label="Window">
              <span style={{ fontSize: 12 }}>{policy.windowKind}</span>
            </Field>
            <Field label="Warn at">
              <span className="fw-mono" style={{ fontSize: 12 }}>
                {policy.warnPercent}%
              </span>
            </Field>
            <Field label="Hard stop">
              <span style={{ fontSize: 12 }}>
                {policy.hardStopEnabled ? "Enabled" : "Disabled"}
              </span>
            </Field>
            <Field label="Status">
              <span
                style={{
                  fontSize: 12,
                  color: policy.paused
                    ? "var(--danger)"
                    : policy.status === "hard_stop"
                    ? "var(--danger)"
                    : policy.status === "warning"
                    ? "var(--warn)"
                    : "var(--pulse)",
                  textTransform: "capitalize",
                }}
              >
                {policy.paused ? `paused · ${policy.pauseReason ?? "unknown"}` : policy.status}
              </span>
            </Field>
            <Field label="Remaining">
              <span className="fw-mono" style={{ fontSize: 12 }}>
                {formatMetricValue(policy.metric, Math.max(0, policy.remainingAmount))}
              </span>
            </Field>
            <Field label="Window start">
              <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>
                {policy.windowStart ? new Date(policy.windowStart).toLocaleString() : "—"}
              </span>
            </Field>
            <Field label="Window end">
              <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>
                {policy.windowEnd ? new Date(policy.windowEnd).toLocaleString() : "—"}
              </span>
            </Field>
          </div>

          {/* Active incident */}
          {matchingIncident ? (
            <div
              className="fw-card"
              style={{
                padding: "12px 14px",
                borderColor: "var(--danger)",
                background: "color-mix(in oklab, var(--danger) 6%, var(--bg-raised))",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <span className="fw-uc" style={{ color: "var(--danger)" }}>
                Active incident
              </span>
              <span style={{ fontSize: 12 }}>
                {matchingIncident.thresholdType.replace(/_/g, " ")} · opened{" "}
                {formatRelative(matchingIncident.createdAt)}
              </span>
              {matchingIncident.approvalStatus ? (
                <span className="fw-mono" style={{ fontSize: 11, color: "var(--ink-dim)" }}>
                  Approval: {matchingIncident.approvalStatus}
                </span>
              ) : null}
            </div>
          ) : null}

          {/* Footer — deep link to classic */}
          <div style={{ marginTop: "auto", paddingTop: 12, borderTop: "1px solid var(--line-soft, var(--line))" }}>
            <NavLink
              to={`/${prefix}/costs`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: "var(--ink-dim)",
              }}
            >
              <Icon d={I.arrow} size={12} />
              <span>Manage policy in classic UI</span>
            </NavLink>
          </div>
        </div>
      </aside>
    </>
  );
}

/* ------------------------------------------------------------------
   Page
------------------------------------------------------------------ */

export function FernwehCosts() {
  const { companyPrefix } = useParams<{ companyPrefix: string }>();
  const { selectedCompany, selectedCompanyId, companies } = useCompany();

  const [preset, setPreset] = React.useState<DatePreset>("mtd");
  const [selectedPolicyId, setSelectedPolicyId] = React.useState<string | null>(null);

  // Recompute range on minute-tick for sliding presets. Cheap; stays stable between ticks.
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  const range = React.useMemo(() => computeRange(preset), [preset, tick]);

  const summaryQuery = useQuery({
    queryKey: queryKeys.costs(selectedCompanyId ?? "__empty__", range.from, range.to),
    queryFn: () => costsApi.summary(selectedCompanyId!, range.from, range.to),
    enabled: !!selectedCompanyId,
    refetchInterval: 30_000,
  });

  const byAgentQuery = useQuery({
    queryKey: ["costs", "by-agent", selectedCompanyId ?? "__empty__", range.from, range.to],
    queryFn: () => costsApi.byAgent(selectedCompanyId!, range.from, range.to),
    enabled: !!selectedCompanyId,
    refetchInterval: 30_000,
  });

  const byProjectQuery = useQuery({
    queryKey: ["costs", "by-project", selectedCompanyId ?? "__empty__", range.from, range.to],
    queryFn: () => costsApi.byProject(selectedCompanyId!, range.from, range.to),
    enabled: !!selectedCompanyId,
    refetchInterval: 30_000,
  });

  const budgetQuery = useQuery({
    queryKey: queryKeys.budgets.overview(selectedCompanyId ?? "__empty__"),
    queryFn: () => budgetsApi.overview(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: 15_000,
  });

  const summary: CostSummary | null = summaryQuery.data ?? null;
  const byAgent: CostByAgent[] = byAgentQuery.data ?? [];
  const byProject: CostByProject[] = byProjectQuery.data ?? [];
  const budget = budgetQuery.data ?? null;

  const topAgents = React.useMemo(
    () => [...byAgent].sort((a, b) => b.costCents - a.costCents).slice(0, 8),
    [byAgent],
  );
  const topProjects = React.useMemo(
    () => [...byProject].sort((a, b) => b.costCents - a.costCents).slice(0, 8),
    [byProject],
  );

  const overBudgetCount = React.useMemo(() => {
    if (!budget) return 0;
    return budget.policies.filter((p) => p.status === "hard_stop" || p.utilizationPercent >= 100).length;
  }, [budget]);

  const selectedPolicy: BudgetPolicySummary | null = React.useMemo(() => {
    if (!selectedPolicyId || !budget) return null;
    return budget.policies.find((p) => p.policyId === selectedPolicyId) ?? null;
  }, [selectedPolicyId, budget]);

  // Early return AFTER hooks
  if (!selectedCompany) {
    return (
      <div style={{ padding: 40, color: "var(--ink-faint)", fontSize: 13 }}>
        Pick a company to see costs and budgets.
      </div>
    );
  }

  const prefix = companyPrefix ?? selectedCompany.issuePrefix ?? companies[0]?.issuePrefix ?? "";

  const presets: DatePreset[] = ["mtd", "7d", "30d", "ytd"];

  const utilizationPercent = summary?.utilizationPercent ?? 0;
  const utilizationTone: "default" | "warn" | "danger" | "pulse" =
    utilizationPercent >= 90 ? "danger" : utilizationPercent >= 70 ? "warn" : "pulse";

  return (
    <div style={{ padding: "28px 36px", maxWidth: 1200, margin: "0 auto" }}>
      {/* header */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 6,
        }}
      >
        <h1 className="fw-display" style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.01em" }}>
          Costs
        </h1>
        <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
          {PRESET_LABEL[preset]}
        </span>
      </div>
      <p style={{ color: "var(--ink-dim)", fontSize: 13, margin: "0 0 20px" }}>
        Where the money goes, what's getting close to the ceiling, and who's driving burn.
      </p>

      {/* preset toggle */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {presets.map((p) => {
          const active = preset === p;
          return (
            <button
              key={p}
              onClick={() => setPreset(p)}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: "1px solid var(--line)",
                background: active ? "var(--accent-soft)" : "var(--bg-raised)",
                color: active ? "var(--accent)" : "var(--ink-dim)",
                fontSize: 12,
                fontWeight: active ? 600 : 500,
                cursor: "pointer",
              }}
            >
              {PRESET_LABEL[p]}
            </button>
          );
        })}
      </div>

      {/* Metrics strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 10,
          marginBottom: 18,
        }}
      >
        <MetricTile
          label="Spend"
          value={summary ? formatCents(summary.spendCents) : "—"}
          hint={PRESET_LABEL[preset]}
        />
        <MetricTile
          label="Budget"
          value={summary && summary.budgetCents > 0 ? formatCents(summary.budgetCents) : "—"}
          hint={summary && summary.budgetCents > 0 ? "Company cap" : "Not set"}
        />
        <MetricTile
          label="Utilization"
          value={summary ? `${Math.round(summary.utilizationPercent)}%` : "—"}
          tone={utilizationTone}
          hint={summary && summary.budgetCents > 0 ? "of company cap" : undefined}
        />
        <MetricTile
          label="Over budget"
          value={String(overBudgetCount)}
          tone={overBudgetCount > 0 ? "danger" : "default"}
          hint={`${budget?.policies.length ?? 0} polic${(budget?.policies.length ?? 0) === 1 ? "y" : "ies"} tracked`}
        />
        <MetricTile
          label="Paused"
          value={String((budget?.pausedAgentCount ?? 0) + (budget?.pausedProjectCount ?? 0))}
          tone={(budget?.pausedAgentCount ?? 0) + (budget?.pausedProjectCount ?? 0) > 0 ? "warn" : "default"}
          hint="Agents + projects"
        />
      </div>

      {/* Incidents banner */}
      {budget?.activeIncidents.length ? (
        <div style={{ marginBottom: 18 }}>
          <IncidentsBanner incidents={budget.activeIncidents} />
        </div>
      ) : null}

      {/* Budget heatmap */}
      <section style={{ marginBottom: 26 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <h2 className="fw-display" style={{ fontSize: 16, fontWeight: 600 }}>
            Budget policies
          </h2>
          <NavLink
            to={`/${prefix}/costs`}
            style={{ fontSize: 11, color: "var(--ink-faint)" }}
            className="fw-uc"
          >
            Manage in classic →
          </NavLink>
        </div>
        {budget && budget.policies.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[...budget.policies]
              .sort((a, b) => b.utilizationPercent - a.utilizationPercent)
              .map((p) => (
                <PolicyRow
                  key={p.policyId}
                  policy={p}
                  onClick={() => setSelectedPolicyId(p.policyId)}
                />
              ))}
          </div>
        ) : (
          <div
            className="fw-card"
            style={{
              padding: "24px 18px",
              textAlign: "center",
              color: "var(--ink-faint)",
              fontSize: 12,
            }}
          >
            No budget policies yet. Set one up in the classic UI to gate agent spend.
          </div>
        )}
      </section>

      {/* Leaderboards */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 14,
        }}
      >
        {/* By agent */}
        <div className="fw-card" style={{ padding: "16px 14px 12px" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "0 6px", marginBottom: 8 }}>
            <h2 className="fw-display" style={{ fontSize: 15, fontWeight: 600 }}>
              By agent
            </h2>
            <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
              Top {topAgents.length}
            </span>
          </div>
          {topAgents.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {topAgents.map((a) => {
                const total = topAgents.reduce((sum, x) => Math.max(sum, x.costCents), 0);
                const subtitle = [
                  a.apiRunCount ? `${a.apiRunCount} API` : null,
                  a.subscriptionRunCount ? `${a.subscriptionRunCount} sub` : null,
                  a.inputTokens + a.outputTokens > 0
                    ? `${formatTokens(a.inputTokens + a.outputTokens)} tok`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <LeaderRow
                    key={a.agentId}
                    name={a.agentName ?? "(unnamed)"}
                    costCents={a.costCents}
                    totalCents={total}
                    subtitle={subtitle || undefined}
                    to={`/${prefix}/agents/${a.agentId}`}
                  />
                );
              })}
            </div>
          ) : (
            <div style={{ padding: "18px 12px", color: "var(--ink-faint)", fontSize: 12, textAlign: "center" }}>
              No agent spend in this window.
            </div>
          )}
        </div>

        {/* By project */}
        <div className="fw-card" style={{ padding: "16px 14px 12px" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "0 6px", marginBottom: 8 }}>
            <h2 className="fw-display" style={{ fontSize: 15, fontWeight: 600 }}>
              By project
            </h2>
            <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
              Top {topProjects.length}
            </span>
          </div>
          {topProjects.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {topProjects.map((p) => {
                const total = topProjects.reduce((sum, x) => Math.max(sum, x.costCents), 0);
                const subtitle =
                  p.inputTokens + p.outputTokens > 0
                    ? `${formatTokens(p.inputTokens + p.outputTokens)} tok`
                    : undefined;
                return (
                  <LeaderRow
                    key={p.projectId ?? "__none__"}
                    name={p.projectName ?? "(unassigned)"}
                    costCents={p.costCents}
                    totalCents={total}
                    subtitle={subtitle}
                    to={p.projectId ? `/${prefix}/projects/${p.projectId}` : undefined}
                  />
                );
              })}
            </div>
          ) : (
            <div style={{ padding: "18px 12px", color: "var(--ink-faint)", fontSize: 12, textAlign: "center" }}>
              No project spend in this window.
            </div>
          )}
        </div>
      </section>

      {/* Drawer */}
      <PolicyDrawer
        policy={selectedPolicy}
        incidents={budget?.activeIncidents ?? []}
        prefix={prefix}
        onClose={() => setSelectedPolicyId(null)}
      />
    </div>
  );
}
