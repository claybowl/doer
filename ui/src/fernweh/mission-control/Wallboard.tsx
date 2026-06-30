import { type MCState } from "./engine";
import { ActiveAgentsPanel } from "@/components/ActiveAgentsPanel";

function Kpi({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div style={{ flex: 1, padding: "14px 18px", borderRight: "1px solid var(--line-soft)", display: "flex", flexDirection: "column", gap: 4 }}>
      <span className="fw-uc" style={{ fontSize: 9.5, color: "var(--ink-faint)" }}>{label}</span>
      <span className="fw-display" style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1, fontVariantNumeric: "tabular-nums", color: accent ?? "var(--ink)" }}>{value}</span>
    </div>
  );
}

export function WallboardView({ state, companyId }: { state: MCState; companyId: string }) {
  const { agents, issues, totals } = state;
  const list = Object.values(agents).filter((a) => !a.synthetic);
  const running = list.filter((a) => a.status === "running").length;
  const openIssues = Object.values(issues).filter((i) => i.status !== "done").length;
  return (
    <div className="mc-scroll" style={{ position: "absolute", inset: 0, overflowY: "auto", padding: 22 }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>

        {/* KPI bar */}
        <div style={{ display: "flex", background: "var(--bg-raised)", border: "1px solid var(--line)", borderRadius: "var(--radius-card, 14px)", overflow: "hidden" }}>
          <Kpi label="Working now" value={running} accent="var(--pulse)" />
          <Kpi label="Tool calls" value={totals.tools} />
          <Kpi label="Handoffs" value={totals.handoffs} accent="var(--warn)" />
          <Kpi label="Comments" value={totals.comments} accent="var(--accent)" />
          <Kpi label="Shipped" value={totals.outputs} accent="var(--pulse)" />
          <div style={{ flex: 1, padding: "14px 18px", display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="fw-uc" style={{ fontSize: 9.5, color: "var(--ink-faint)" }}>Open issues</span>
            <span className="fw-display" style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{openIssues}</span>
          </div>
        </div>

        {/* Agent run tiles — real heartbeat runs with live transcript previews */}
        <ActiveAgentsPanel companyId={companyId} />
      </div>
    </div>
  );
}
