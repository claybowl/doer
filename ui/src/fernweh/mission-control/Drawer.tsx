import * as React from "react";
import { Avatar, Drawer as FwDrawer, Field, Icon, I, PriorityChip, StatusChip, StatusDot } from "../utils";
import { fmtAgo, issueDisplayToFw, type MCState } from "./engine";
import { EventRow, type MCSelect } from "./Stream";

export interface MCSelection { id: string; kind: "agent" | "issue"; }

function AgentBody({ id, state, onSelect }: { id: string; state: MCState; onSelect: MCSelect }) {
  const a = state.agents[id];
  if (!a) return <div style={{ color: "var(--ink-dim)", fontSize: 13 }}>Agent not found.</div>;
  const mgr = a.reportsTo ? state.agents[a.reportsTo] : null;
  const reports = Object.values(state.agents).filter((x) => x.reportsTo === id);
  const recent = state.log.filter((e) => e.agent === a.name || e.target === a.name).slice(0, 8);
  const focus = a.focus ? state.issues[a.focus] : null;
  return (
    <>
      <Field label="Doing now">
        {a.status === "running" ? (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "10px 12px", background: "var(--pulse-soft)", border: "1px solid var(--pulse)", borderRadius: 10 }}>
            <Icon d={I.bolt} size={13} style={{ color: "var(--pulse)", marginTop: 1 }} />
            <div>
              {a.tool && <div className="fw-mono" style={{ fontSize: 11, color: "var(--ink)" }}>{a.tool}()</div>}
              <div style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.4 }}>{a.action ?? "working"}</div>
            </div>
          </div>
        ) : (
          <span style={{ fontSize: 12.5, color: "var(--ink-dim)" }}>{a.action ?? "Standing by — no active run."}</span>
        )}
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label="Focus">
          <span style={{ fontSize: 12.5 }}>
            {focus ? <button onClick={() => onSelect(focus.id, "issue")} className="fw-mono" style={{ fontSize: 11, border: "none", background: "none", color: "var(--accent)", cursor: "pointer", padding: 0 }}>{focus.id}</button> : "—"}
            {focus && <span style={{ color: "var(--ink-dim)" }}> · {focus.title}</span>}
          </span>
        </Field>
        <Field label="Tool calls (session)">
          <span style={{ fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>{a.toolCount}</span>
        </Field>
      </div>

      <Field label="Reporting line">
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {mgr ? (
            <button onClick={() => onSelect(mgr.id, "agent")} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, border: "none", background: "none", cursor: "pointer", padding: 0, color: "var(--ink)" }}>
              <Avatar name={mgr.name} size={20} /> <span>{mgr.name}</span>
              <span style={{ color: "var(--ink-faint)" }}>· manager</span>
            </button>
          ) : <span style={{ fontSize: 12.5, color: "var(--ink-dim)" }}>Root orchestrator</span>}
          {reports.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>manages</span>
              {reports.map((r) => (
                <button key={r.id} onClick={() => onSelect(r.id, "agent")} style={{ display: "inline-flex", alignItems: "center", gap: 5, border: "none", background: "none", cursor: "pointer", padding: 0, color: "var(--ink)" }}>
                  <Avatar name={r.name} size={18} /><span style={{ fontSize: 11.5 }}>{r.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </Field>

      <Field label="Recent reasoning & work">
        <div style={{ border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
          {recent.length
            ? recent.map((ev) => <EventRow key={ev.id} ev={ev} clock={state.clock} compact onSelect={onSelect} />)
            : <div style={{ padding: 16, fontSize: 12, color: "var(--ink-dim)" }}>No activity yet this session.</div>}
        </div>
      </Field>
    </>
  );
}

function IssueBody({ id, state, onSelect }: { id: string; state: MCState; onSelect: MCSelect }) {
  const i = state.issues[id];
  if (!i) return <div style={{ color: "var(--ink-dim)", fontSize: 13 }}>Issue not found.</div>;
  const owner = i.owner ? state.agents[i.owner] : null;
  const comments = i.comments;
  const events = state.log.filter((e) => e.issueId === id).slice(0, 8);
  return (
    <>
      <Field label="Owner">
        {owner ? (
          <button onClick={() => onSelect(owner.id, "agent")} style={{ display: "flex", alignItems: "center", gap: 8, padding: 0, background: "none", border: "none", cursor: "pointer", color: "var(--ink)" }}>
            <Avatar name={owner.name} size={22} /> <span style={{ fontSize: 12.5, fontWeight: 500 }}>{owner.name}</span>
            <StatusDot status={owner.status} size={7} />
            <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>{owner.title}</span>
          </button>
        ) : <span style={{ fontSize: 12.5, color: "var(--ink-dim)" }}>Unassigned</span>}
      </Field>

      <Field label={`Thread · ${comments.length} comment${comments.length === 1 ? "" : "s"}`}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {comments.length ? comments.map((c, k) => (
            <div key={k} className={k === comments.length - 1 && state.clock - c.t < 6 ? "mc-rise" : ""} style={{ display: "flex", gap: 9 }}>
              <Avatar name={c.agent} size={24} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{c.agent}</span>
                  <span className="fw-mono" style={{ fontSize: 9.5, color: "var(--ink-faint)" }}>{fmtAgo(state.clock - c.t)}</span>
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.45, color: "var(--ink-dim)", marginTop: 2 }}>{c.text}</div>
              </div>
            </div>
          )) : <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>No comments yet.</span>}
        </div>
      </Field>

      <Field label="Activity on this issue">
        <div style={{ border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden" }}>
          {events.length
            ? events.map((ev) => <EventRow key={ev.id} ev={ev} clock={state.clock} compact onSelect={onSelect} />)
            : <div style={{ padding: 16, fontSize: 12, color: "var(--ink-dim)" }}>No activity yet this session.</div>}
        </div>
      </Field>
    </>
  );
}

export function MCDrawer({ sel, state, onClose, onSelect }: { sel: MCSelection | null; state: MCState; onClose: () => void; onSelect: MCSelect }) {
  const open = !!sel;
  let title: React.ReactNode = "";
  let eyebrow: React.ReactNode = null;
  let body: React.ReactNode = null;

  if (sel?.kind === "agent") {
    const a = state.agents[sel.id];
    title = (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        {a?.name ?? "Agent"} {a && <StatusDot status={a.status} />}
      </span>
    );
    eyebrow = a ? `${a.title} · ${a.adapter || "agent"}` : "Agent";
    body = <AgentBody id={sel.id} state={state} onSelect={onSelect} />;
  } else if (sel?.kind === "issue") {
    const i = state.issues[sel.id];
    title = i?.title ?? "Issue";
    eyebrow = i ? (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <span className="fw-mono">{i.id}</span>
        <PriorityChip priority={i.priority} />
        <StatusChip status={issueDisplayToFw(i.status)} />
      </span>
    ) : "Issue";
    body = <IssueBody id={sel.id} state={state} onSelect={onSelect} />;
  }

  return (
    <FwDrawer open={open} onClose={onClose} title={title} eyebrow={eyebrow} width={440}>
      {body}
    </FwDrawer>
  );
}
