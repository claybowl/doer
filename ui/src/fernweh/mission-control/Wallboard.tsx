import { Avatar, Icon, I, StatusDot } from "../utils";
import { fmtAgo, type MCAgent, type MCState } from "./engine";
import type { MCSelect } from "./Stream";

function Kpi({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div style={{ flex: 1, padding: "14px 18px", borderRight: "1px solid var(--line-soft)", display: "flex", flexDirection: "column", gap: 4 }}>
      <span className="fw-uc" style={{ fontSize: 9.5, color: "var(--ink-faint)" }}>{label}</span>
      <span className="fw-display" style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1, fontVariantNumeric: "tabular-nums", color: accent ?? "var(--ink)" }}>{value}</span>
    </div>
  );
}

function AgentTile({ a, clock, onSelect }: { a: MCAgent; clock: number; onSelect: MCSelect }) {
  const live = a.status === "running";
  const since = clock - a.lastActiveAt;
  return (
    <button onClick={() => onSelect(a.id, "agent")}
      style={{ textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", gap: 9, padding: 14,
        borderRadius: "var(--radius-card, 14px)", background: "var(--bg-raised)",
        border: live ? "1px solid var(--pulse)" : "1px solid var(--line)",
        boxShadow: live ? "0 0 0 3px var(--pulse-soft)" : "none", transition: "box-shadow .3s, border-color .3s", minHeight: 118 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ position: "relative" }}>
          {live && <span className="mc-halo" style={{ position: "absolute", inset: -5, borderRadius: 12, border: "1.5px solid var(--pulse)" }} />}
          <Avatar name={a.name} size={34} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>{a.name}</span>
            <StatusDot status={a.status} size={8} />
          </div>
          <div style={{ fontSize: 10.5, color: "var(--ink-faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.title}</div>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {live && a.tool ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Icon d={I.bolt} size={11} style={{ color: "var(--pulse)" }} />
            <span className="fw-mono" style={{ fontSize: 11, color: "var(--pulse)" }}>{a.tool}()</span>
          </div>
        ) : a.action ? (
          <span style={{ fontSize: 11, color: "var(--ink-dim)" }}>{a.action}</span>
        ) : (
          <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>standing by</span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {a.focus ? <span className="fw-mono" style={{ fontSize: 10, color: "var(--ink-dim)", whiteSpace: "nowrap" }}>{a.focus}</span> : <span />}
        <span className="fw-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)" }}>{live ? "active now" : fmtAgo(since)}</span>
      </div>
    </button>
  );
}

export function WallboardView({ state, onSelect }: { state: MCState; onSelect: MCSelect }) {
  const { agents, issues, totals, clock } = state;
  const list = Object.values(agents).filter((a) => !a.synthetic);
  const running = list.filter((a) => a.status === "running").length;
  const openIssues = Object.values(issues).filter((i) => i.status !== "done").length;
  return (
    <div className="mc-scroll" style={{ position: "absolute", inset: 0, overflowY: "auto", padding: 22 }}>
      <div style={{ maxWidth: 1320, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
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

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {list.map((a) => <AgentTile key={a.id} a={a} clock={clock} onSelect={onSelect} />)}
        </div>
      </div>
    </div>
  );
}
