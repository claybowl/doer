import * as React from "react";
import { Icon, StatusDot } from "../utils";
import { TYPE_META, fmtAgo, type MCEvent, type MCState } from "./engine";

export type MCSelect = (id: string, kind: "agent" | "issue") => void;

function TypeBadge({ type }: { type: MCEvent["type"] }) {
  const m = TYPE_META[type];
  return (
    <span style={{ width: 26, height: 26, flexShrink: 0, borderRadius: 8, display: "grid", placeItems: "center",
      background: "var(--bg-sunken)", border: "1px solid var(--line-soft)", color: m.color }}>
      <Icon d={m.icon} size={13} />
    </span>
  );
}

function VerbLine({ ev }: { ev: MCEvent }) {
  const wrap: React.CSSProperties = { fontSize: 12.5, color: "var(--ink)", lineHeight: 1.35, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: "1 1 auto", minWidth: 0 };
  const name = (n: string | null) => <span style={{ fontWeight: 600 }}>{n ?? "Agent"}</span>;
  const dim = (str: string) => <span style={{ color: "var(--ink-faint)" }}>{str}</span>;
  if (ev.type === "handoff")
    return <div style={wrap}>{name(ev.agent)} <span className="mc-arrow" style={{ color: "var(--warn)", margin: "0 3px" }}>→</span> {name(ev.target)}</div>;
  if (ev.type === "collab")
    return <div style={wrap}>{name(ev.agent)} {dim("paired with")} {name(ev.target)}</div>;
  if (ev.type === "comment")
    return <div style={wrap}>{name(ev.agent)} {dim("commented")}</div>;
  if (ev.type === "output")
    return <div style={wrap}>{name(ev.agent)} {dim("shipped work")}</div>;
  if (ev.type === "tool_call")
    return <div style={wrap}>{name(ev.agent)} {dim("ran")} <span className="fw-mono" style={{ fontSize: 11, color: "var(--ink)", whiteSpace: "nowrap" }}>{ev.tool}()</span></div>;
  return <div style={wrap}>{name(ev.agent)} {dim(ev.summary ?? "active")}</div>;
}

function IssueChip({ id, onSelect }: { id: string | null; onSelect?: MCSelect }) {
  if (!id) return null;
  return (
    <button onClick={() => onSelect && onSelect(id, "issue")}
      style={{ display: "inline-flex", alignItems: "center", padding: "1px 7px", borderRadius: 999, cursor: "pointer",
        border: "1px solid var(--line)", background: "var(--bg-sunken)", color: "var(--ink-dim)",
        fontFamily: "var(--fw-font-mono)", fontSize: 10, whiteSpace: "nowrap", flexShrink: 0 }}>{id}</button>
  );
}

export function EventRow({ ev, clock, fresh, compact, onSelect }: { ev: MCEvent; clock: number; fresh?: boolean; compact?: boolean; onSelect?: MCSelect }) {
  const [open, setOpen] = React.useState(false);
  const expandable = ev.type === "tool_call" && !!(ev.steps || ev.logs);
  return (
    <div className={fresh ? "mc-rise" : ""}
      style={{ display: "flex", gap: 10, padding: compact ? "10px 12px" : "14px 16px", borderBottom: "1px solid var(--line-soft)" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <TypeBadge type={ev.type} />
        {!compact && <div style={{ flex: 1, width: 1, background: "var(--line-soft)" }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <VerbLine ev={ev} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <IssueChip id={ev.issueId} onSelect={onSelect} />
            <span className="fw-mono" style={{ fontSize: 10, color: "var(--ink-faint)", whiteSpace: "nowrap" }}>{fmtAgo(clock - ev.t)}</span>
          </div>
        </div>

        {ev.type === "comment" && ev.text ? (
          <div onClick={() => ev.issueId && onSelect?.(ev.issueId, "issue")}
            style={{ marginTop: 6, padding: "8px 11px", borderLeft: "2px solid var(--accent)", background: "var(--accent-soft)",
              borderRadius: "0 8px 8px 0", fontSize: 12, lineHeight: 1.45, color: "var(--ink)", cursor: "pointer" }}>{ev.text}</div>
        ) : ev.summary ? (
          <div style={{ marginTop: 4, fontSize: 12, lineHeight: 1.4, color: "var(--ink-dim)" }}>{ev.summary}</div>
        ) : null}

        {ev.type === "output" && ev.artifact && (
          <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 9px",
            border: "1px solid var(--line)", borderRadius: 999, background: "var(--bg-raised)" }}>
            <Icon d={TYPE_META.output.icon} size={11} style={{ color: "var(--pulse)" }} />
            <span className="fw-mono" style={{ fontSize: 10.5, color: "var(--ink)" }}>{ev.artifact}</span>
          </div>
        )}

        {expandable && (
          <button onClick={() => setOpen((o) => !o)}
            className="fw-uc"
            style={{ marginTop: 7, display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px",
              border: "1px solid var(--line)", borderRadius: 999, background: "transparent", cursor: "pointer",
              fontSize: 9.5, color: "var(--ink-dim)" }}>
            {open ? "Hide steps" : "Show steps & logs"}
          </button>
        )}
        {expandable && open && (
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
            {ev.steps && (
              <ol style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                {ev.steps.map((str, i) => (
                  <li key={i} style={{ display: "flex", gap: 8, fontSize: 11.5, color: "var(--ink-dim)", lineHeight: 1.4 }}>
                    <span className="fw-mono" style={{ fontSize: 10, color: "var(--accent)" }}>{String(i + 1).padStart(2, "0")}</span>
                    <span>{str}</span>
                  </li>
                ))}
              </ol>
            )}
            {ev.logs && (
              <pre className="fw-mono" style={{ margin: 0, padding: "9px 11px", background: "var(--bg-sunken)", border: "1px solid var(--line-soft)",
                borderRadius: 8, fontSize: 10.5, lineHeight: 1.6, color: "var(--ink-dim)", overflowX: "auto", whiteSpace: "pre" }}>{ev.logs.join("\n")}</pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function FeedRail({ state, onSelect, title = "Live activity" }: { state: MCState; onSelect?: MCSelect; title?: string }) {
  const { log, clock } = state;
  const freshId = log[0]?.id;
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, background: "var(--bg)", borderLeft: "1px solid var(--line)" }}>
      <div style={{ padding: "13px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <span className="fw-uc" style={{ fontSize: 10, color: "var(--ink-faint)" }}>{title}</span>
        <span className="fw-mono" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, color: "var(--pulse)" }}>
          <StatusDot status="running" size={7} /> live
        </span>
      </div>
      <div className="mc-scroll" style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {log.length === 0
          ? <div style={{ padding: 28, textAlign: "center", color: "var(--ink-dim)", fontSize: 12 }}>Waiting for the first heartbeat…</div>
          : log.map((ev) => <EventRow key={ev.id} ev={ev} clock={clock} fresh={ev.id === freshId} compact onSelect={onSelect} />)}
      </div>
    </div>
  );
}

export function StreamView({ state, onSelect }: { state: MCState; onSelect?: MCSelect }) {
  const { log, clock } = state;
  const freshId = log[0]?.id;
  return (
    <div className="mc-scroll" style={{ position: "absolute", inset: 0, overflowY: "auto" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "26px 24px 60px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <div className="fw-uc" style={{ fontSize: 10, color: "var(--ink-faint)" }}>Activity stream</div>
            <h2 className="fw-display" style={{ fontSize: 24, fontWeight: 600, margin: "2px 0 0", letterSpacing: "-0.02em" }}>
              Everything your team is doing, narrated.
            </h2>
          </div>
          <span className="fw-mono" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--pulse)" }}>
            <StatusDot status="running" size={8} /> live
          </span>
        </div>
        <div style={{ background: "var(--bg-raised)", border: "1px solid var(--line)", borderRadius: "var(--radius-card, 14px)", overflow: "hidden" }}>
          {log.length === 0
            ? <div style={{ padding: 40, textAlign: "center", color: "var(--ink-dim)", fontSize: 13 }}>Waiting for the first heartbeat…</div>
            : log.map((ev) => <EventRow key={ev.id} ev={ev} clock={clock} fresh={ev.id === freshId} onSelect={onSelect} />)}
        </div>
      </div>
    </div>
  );
}
