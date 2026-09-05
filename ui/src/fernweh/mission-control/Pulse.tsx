import * as React from "react";
import { Avatar, Icon, I, StatusDot } from "../utils";
import type { MCLayout, MCState, MCIssue } from "./engine";
import type { MCSelect } from "./Stream";

export const STAGE_W = 900;
export const STAGE_H = 580;
const CX = STAGE_W / 2;
const CY = STAGE_H / 2;

function nodeSize(depth: number) { return depth === 0 ? 60 : depth === 1 ? 42 : 34; }
function restLen(depth: number) { return depth <= 1 ? 158 : 120; }
function nodeRadius(depth: number) { return depth === 0 ? 58 : depth === 1 ? 48 : 42; }

interface PNode { x: number; y: number; vx: number; vy: number; depth: number; home: { x: number; y: number }; }
interface DragState { name: string; dx: number; dy: number; moved: number; lastx: number; lasty: number; }

function usePhysics(
  layout: MCLayout,
  collabs: MCState["collabs"],
  motion: "calm" | "live",
  innerRef: React.RefObject<HTMLDivElement | null>,
  onClick: (id: string) => void,
) {
  const { pos, kids } = layout;

  const edges = React.useMemo(() => {
    const e: { a: string; b: string; depth: number }[] = [];
    for (const parent in kids) (kids[parent] ?? []).forEach((c) => { if (pos[c]) e.push({ a: parent, b: c, depth: pos[c]!.depth }); });
    return e;
  }, [layout]); // eslint-disable-line react-hooks/exhaustive-deps

  const nodesRef = React.useRef<Record<string, PNode> | null>(null);
  if (!nodesRef.current) {
    const n: Record<string, PNode> = {};
    for (const name in pos) n[name] = { x: pos[name]!.x, y: pos[name]!.y, vx: 0, vy: 0, depth: pos[name]!.depth, home: { x: pos[name]!.x, y: pos[name]!.y } };
    nodesRef.current = n;
  }

  // reconcile node set when agents load/change
  React.useEffect(() => {
    const nodes = nodesRef.current!;
    for (const name in pos) {
      if (!nodes[name]) nodes[name] = { x: pos[name]!.x, y: pos[name]!.y, vx: 0, vy: 0, depth: pos[name]!.depth, home: { x: pos[name]!.x, y: pos[name]!.y } };
      else { nodes[name].depth = pos[name]!.depth; nodes[name].home = { x: pos[name]!.x, y: pos[name]!.y }; }
    }
    for (const name in nodes) if (!pos[name]) delete nodes[name];
  }, [pos]);

  const dragRef = React.useRef<DragState | null>(null);
  const collabRef = React.useRef(collabs);
  const motionRef = React.useRef(motion);
  const clickRef = React.useRef(onClick);
  React.useEffect(() => { collabRef.current = collabs; }, [collabs]);
  React.useEffect(() => { motionRef.current = motion; }, [motion]);
  React.useEffect(() => { clickRef.current = onClick; }, [onClick]);

  const [, setTick] = React.useState(0);

  const toStage = React.useCallback((e: { clientX: number; clientY: number }) => {
    const el = innerRef.current; if (!el) return { x: CX, y: CY };
    const r = el.getBoundingClientRect();
    const s = r.width / STAGE_W || 1;
    return { x: (e.clientX - r.left) / s, y: (e.clientY - r.top) / s };
  }, [innerRef]);

  React.useEffect(() => {
    let raf = 0, last = 0, acc = 0;
    const STEP = 1 / 60;

    function physics() {
      const nodes = nodesRef.current!;
      const names = Object.keys(nodes);
      const calm = motionRef.current === "calm";
      const springK = 0.014;
      const repK = 9000;
      const damp = calm ? 0.78 : 0.86;
      const drag = dragRef.current;

      for (let i = 0; i < names.length; i++) {
        for (let j = i + 1; j < names.length; j++) {
          const A = nodes[names[i]!]!, B = nodes[names[j]!]!;
          let dx = A.x - B.x, dy = A.y - B.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 1) { d2 = 1; dx = Math.random() - 0.5; dy = Math.random() - 0.5; }
          const d = Math.sqrt(d2);
          const min = nodeRadius(A.depth) + nodeRadius(B.depth);
          const f = repK / d2 + (d < min ? (min - d) * 0.18 : 0);
          const fx = (dx / d) * f, fy = (dy / d) * f;
          A.vx += fx; A.vy += fy; B.vx -= fx; B.vy -= fy;
        }
      }
      for (const e of edges) {
        const A = nodes[e.a], B = nodes[e.b];
        if (!A || !B) continue;
        const dx = B.x - A.x, dy = B.y - A.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = (d - restLen(e.depth)) * springK;
        const fx = (dx / d) * f, fy = (dy / d) * f;
        A.vx += fx; A.vy += fy; B.vx -= fx; B.vy -= fy;
      }
      for (const c of collabRef.current) {
        const A = nodes[c.from], B = nodes[c.to];
        if (!A || !B) continue;
        const dx = B.x - A.x, dy = B.y - A.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const f = (d - 120) * 0.012;
        const fx = (dx / d) * f, fy = (dy / d) * f;
        A.vx += fx; A.vy += fy; B.vx -= fx; B.vy -= fy;
      }
      // Per-depth home anchoring keeps the org hierarchy legible: the root owns
      // the center, each level holds its concentric ring, while springs +
      // repulsion + drag still give the web its flex. Inner rings are anchored
      // harder so a big hub (e.g. Alfie) can't drift into the focal center.
      for (const name in nodes) {
        const N = nodes[name]!;
        const homeK = N.depth === 1 ? 0.024 : N.depth === 2 ? 0.018 : 0.013;
        N.vx += (N.home.x - N.x) * homeK;
        N.vy += (N.home.y - N.y) * homeK;
      }
      for (const name in nodes) {
        const N = nodes[name]!;
        if (drag && drag.name === name) { N.vx = 0; N.vy = 0; continue; }
        // The top of the org chart is the focal point: pin it dead center
        // (still draggable above, snaps back on release).
        if (N.depth === 0) { N.x = N.home.x; N.y = N.home.y; N.vx = 0; N.vy = 0; continue; }
        N.vx *= damp; N.vy *= damp;
        const sp = Math.hypot(N.vx, N.vy);
        if (sp > 40) { N.vx *= 40 / sp; N.vy *= 40 / sp; }
        N.x += N.vx; N.y += N.vy;
        const pad = 72;
        if (N.x < pad) { N.x = pad; N.vx *= -0.5; }
        if (N.x > STAGE_W - pad) { N.x = STAGE_W - pad; N.vx *= -0.5; }
        if (N.y < pad) { N.y = pad; N.vy *= -0.5; }
        if (N.y > STAGE_H - pad) { N.y = STAGE_H - pad; N.vy *= -0.5; }
      }
    }

    function frame(t: number) {
      raf = requestAnimationFrame(frame);
      if (!last) last = t;
      acc += Math.min(0.1, (t - last) / 1000);
      last = t;
      let steps = 0;
      while (acc >= STEP && steps++ < 4) { physics(); acc -= STEP; }
      setTick((v) => (v + 1) & 0xffff);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [edges]);

  const onNodeDown = React.useCallback((name: string, e: React.PointerEvent) => {
    e.preventDefault();
    const p = toStage(e);
    const N = nodesRef.current![name]!;
    dragRef.current = { name, dx: N.x - p.x, dy: N.y - p.y, moved: 0, lastx: p.x, lasty: p.y };

    const move = (ev: PointerEvent) => {
      const d = dragRef.current; if (!d) return;
      const q = toStage(ev);
      const nx = q.x + d.dx, ny = q.y + d.dy;
      const N2 = nodesRef.current![name]!;
      d.moved += Math.abs(q.x - d.lastx) + Math.abs(q.y - d.lasty);
      N2.vx = (nx - N2.x) * 0.6; N2.vy = (ny - N2.y) * 0.6;
      N2.x = nx; N2.y = ny;
      d.lastx = q.x; d.lasty = q.y;
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const d = dragRef.current; dragRef.current = null;
      if (d && d.moved < 5) clickRef.current(name);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }, [toStage]);

  return { nodes: nodesRef.current!, edges, onNodeDown, dragRef };
}

/* ============================================================
   Queue Health HUD — overlay showing queue stats + fleet health
   ============================================================ */

const STALE_THRESHOLD_SEC = 48 * 3600; // 48 hours

interface QueueStats {
  todo: number;
  inProgress: number;
  blocked: number;
  done: number;
  stale: number;
  errorAgents: number;
  totalAgents: number;
  runningAgents: number;
}

function computeQueueStats(state: MCState): QueueStats {
  const issues = Object.values(state.issues);
  const agents = Object.values(state.agents).filter((a) => !a.synthetic);
  let todo = 0, inProgress = 0, blocked = 0, done = 0, stale = 0;

  for (const i of issues) {
    if (i.status === "done") { done++; continue; }
    if (i.status === "blocked") blocked++;
    else if (i.status === "in_progress") inProgress++;
    else todo++;

    // stale: open issue with no activity in 48h
    if (i.status !== "done" && state.clock - i.lastEventAt > STALE_THRESHOLD_SEC) {
      stale++;
    }
  }

  return {
    todo,
    inProgress,
    blocked,
    done,
    stale,
    errorAgents: agents.filter((a) => a.status === "error").length,
    totalAgents: agents.length,
    runningAgents: agents.filter((a) => a.status === "running").length,
  };
}

function StatChip({ label, value, color, alert }: { label: string; value: number; color?: string; alert?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, minWidth: 44 }}>
      <span className="fw-display" style={{
        fontSize: 18, fontWeight: 600, lineHeight: 1, fontVariantNumeric: "tabular-nums",
        color: color ?? "var(--ink)",
        ...(alert ? { animation: "mc-stale-k 1.6s ease-in-out infinite" } : {}),
      }}>{value}</span>
      <span className="fw-mono fw-uc" style={{ fontSize: 7.5, color: "var(--ink-faint)" }}>{label}</span>
    </div>
  );
}

function QueueHUD({ state }: { state: MCState }) {
  const [collapsed, setCollapsed] = React.useState(false);
  const stats = React.useMemo(() => computeQueueStats(state), [state]);
  const openTotal = stats.todo + stats.inProgress + stats.blocked;
  const queueColor = openTotal > 30 ? "var(--warn)" : openTotal > 15 ? "var(--accent)" : "var(--pulse)";
  const hasStale = stats.stale > 0;
  const hasErrors = stats.errorAgents > 0;

  if (collapsed) {
    return (
      <button onClick={() => setCollapsed(false)}
        style={{
          position: "absolute", top: 14, left: 14, zIndex: 12,
          display: "flex", alignItems: "center", gap: 6, padding: "7px 11px",
          background: "var(--bg-raised)", border: "1px solid var(--line)", borderRadius: 10,
          cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
        }}>
        <Icon d={I.activity} size={13} style={{ color: queueColor }} />
        <span className="fw-mono fw-uc" style={{ fontSize: 9, color: "var(--ink-dim)" }}>{openTotal} open</span>
        {(hasStale || hasErrors) && (
          <span style={{ display: "flex", gap: 3 }}>
            {hasStale && <span className="mc-stale-pulse" style={{ width: 7, height: 7, borderRadius: 999, background: "var(--warn)" }} />}
            {hasErrors && <span style={{ width: 7, height: 7, borderRadius: 999, background: "#e5484d" }} />}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="mc-hud-in" style={{
      position: "absolute", top: 14, left: 14, zIndex: 12,
      background: "var(--bg-raised)", border: "1px solid var(--line)", borderRadius: 12,
      boxShadow: "0 8px 24px rgba(0,0,0,0.16)", overflow: "hidden",
    }}>
      {/* header row */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 12px", borderBottom: "1px solid var(--line-soft)",
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon d={I.activity} size={12} style={{ color: "var(--ink-dim)" }} />
          <span className="fw-mono fw-uc" style={{ fontSize: 9, color: "var(--ink-dim)" }}>Queue Health</span>
        </span>
        <button onClick={() => setCollapsed(true)}
          style={{ border: "none", background: "transparent", cursor: "pointer", padding: 2, display: "grid", placeItems: "center" }}>
          <Icon d={I.chevron} size={12} style={{ color: "var(--ink-faint)", transform: "rotate(-90deg)" }} />
        </button>
      </div>

      {/* queue stats */}
      <div style={{ display: "flex", gap: 4, padding: "10px 12px 8px", justifyContent: "space-between" }}>
        <StatChip label="Todo" value={stats.todo} />
        <StatChip label="Active" value={stats.inProgress} color="var(--pulse)" />
        <StatChip label="Blocked" value={stats.blocked} color={stats.blocked > 0 ? "#e5484d" : undefined} alert={stats.blocked > 0} />
        <StatChip label="Done" value={stats.done} color="var(--ink-dim)" />
      </div>

      {/* alerts row */}
      {(hasStale || hasErrors) && (
        <div style={{ padding: "0 12px 8px", display: "flex", flexDirection: "column", gap: 4 }}>
          {hasStale && (
            <div className="mc-stale-pulse" style={{
              display: "flex", alignItems: "center", gap: 6, padding: "4px 8px",
              background: "rgba(229,72,77,0.08)", border: "1px solid rgba(229,72,77,0.2)", borderRadius: 7,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--warn)", flexShrink: 0 }} />
              <span className="fw-mono" style={{ fontSize: 9.5, color: "var(--ink-dim)" }}>
                {stats.stale} stale {stats.stale === 1 ? "issue" : "issues"} (&gt;48h)
              </span>
            </div>
          )}
          {hasErrors && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6, padding: "4px 8px",
              background: "rgba(229,72,77,0.08)", border: "1px solid rgba(229,72,77,0.2)", borderRadius: 7,
            }}>
              <span style={{ width: 7, height: 7, borderRadius: 999, background: "#e5484d", flexShrink: 0 }} />
              <span className="fw-mono" style={{ fontSize: 9.5, color: "var(--ink-dim)" }}>
                {stats.errorAgents} {stats.errorAgents === 1 ? "agent" : "agents"} in error
              </span>
            </div>
          )}
        </div>
      )}

      {/* fleet row */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "7px 12px", borderTop: "1px solid var(--line-soft)",
      }}>
        <span className="fw-mono fw-uc" style={{ fontSize: 8, color: "var(--ink-faint)" }}>Fleet</span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <StatusDot status="running" size={7} />
            <span className="fw-mono" style={{ fontSize: 9.5, color: "var(--ink-dim)" }}>{stats.runningAgents}</span>
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <StatusDot status="idle" size={7} />
            <span className="fw-mono" style={{ fontSize: 9.5, color: "var(--ink-dim)" }}>{stats.totalAgents - stats.runningAgents - stats.errorAgents}</span>
          </span>
          {hasErrors && (
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <StatusDot status="error" size={7} />
              <span className="fw-mono" style={{ fontSize: 9.5, color: "#e5484d" }}>{stats.errorAgents}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Quick Actions bar — bottom center
   ============================================================ */

function QuickActions({ state, onSelect }: { state: MCState; onSelect: MCSelect }) {
  const stats = React.useMemo(() => computeQueueStats(state), [state]);

  // Find stale issue IDs to surface
  const staleIssues = React.useMemo(() => {
    return Object.values(state.issues)
      .filter((i) => i.status !== "done" && state.clock - i.lastEventAt > STALE_THRESHOLD_SEC)
      .sort((a, b) => a.lastEventAt - b.lastEventAt)
      .slice(0, 5);
  }, [state]);

  const [staleOpen, setStaleOpen] = React.useState(false);

  return (
    <div style={{
      position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)",
      zIndex: 12, display: "flex", alignItems: "center", gap: 8,
    }}>
      {staleOpen && staleIssues.length > 0 && (
        <div style={{
          position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)",
          marginBottom: 8, background: "var(--bg-raised)", border: "1px solid var(--line)",
          borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.16)", padding: "8px 10px",
          display: "flex", flexDirection: "column", gap: 4, minWidth: 200,
        }}>
          <div className="fw-mono fw-uc" style={{ fontSize: 8.5, color: "var(--ink-faint)", marginBottom: 2 }}>
            Stale issues (&gt;48h)
          </div>
          {staleIssues.map((i) => (
            <button key={i.id} onClick={() => { onSelect(i.id, "issue"); setStaleOpen(false); }}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "4px 7px",
                border: "1px solid var(--line-soft)", borderRadius: 7, cursor: "pointer",
                background: "transparent", textAlign: "left",
              }}>
              <span className="fw-mono" style={{ fontSize: 9, color: "var(--accent)", flexShrink: 0 }}>{i.id}</span>
              <span style={{ fontSize: 10.5, color: "var(--ink-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.title}</span>
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => staleIssues.length > 0 ? setStaleOpen((o) => !o) : undefined}
        style={{
          display: "flex", alignItems: "center", gap: 6, padding: "7px 13px",
          background: "var(--bg-raised)", border: "1px solid var(--line)", borderRadius: 10,
          cursor: staleIssues.length > 0 ? "pointer" : "default",
          opacity: staleIssues.length > 0 ? 1 : 0.5,
          boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
        }}>
        <Icon d={I.clock} size={13} style={{ color: stats.stale > 0 ? "var(--warn)" : "var(--ink-faint)" }} />
        <span className="fw-mono fw-uc" style={{ fontSize: 9, color: "var(--ink-dim)" }}>
          {stats.stale > 0 ? `${stats.stale} Stale` : "No Stale"}
        </span>
      </button>

      <button
        onClick={() => {
          // Navigate to issues page — uses window.location since we don't have router here
          const path = window.location.pathname.replace(/\/mission-control$/, "/issues");
          window.location.href = path;
        }}
        style={{
          display: "flex", alignItems: "center", gap: 6, padding: "7px 13px",
          background: "var(--bg-raised)", border: "1px solid var(--line)", borderRadius: 10,
          cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
        }}>
        <Icon d={I.plus} size={13} style={{ color: "var(--accent)" }} />
        <span className="fw-mono fw-uc" style={{ fontSize: 9, color: "var(--ink-dim)" }}>New Issue</span>
      </button>
    </div>
  );
}

/* ============================================================
   PulseNode — agent node with queue badge on root
   ============================================================ */

function PulseNode({ a, n, sz, isRoot, dragging, selected, onPointerDown, queueDepth }: {
  a: MCState["agents"][string]; n: PNode; sz: number; isRoot: boolean; dragging: boolean; selected: boolean;
  onPointerDown: (name: string, e: React.PointerEvent) => void;
  queueDepth?: number;
}) {
  const live = a.status === "running";
  const isErr = a.status === "error";
  const ring = selected ? "0 0 0 2px var(--accent)" : isErr ? "0 0 0 2px #e5484d" : "0 0 0 1px var(--line)";

  // Queue badge color for root node
  const badgeColor = queueDepth === undefined ? undefined
    : queueDepth > 30 ? "#e5484d"
    : queueDepth > 15 ? "var(--warn)"
    : "var(--pulse)";

  return (
    <div
      onPointerDown={(e) => onPointerDown(a.id, e)}
      style={{
        position: "absolute", left: n.x, top: n.y, transform: "translate(-50%,-50%)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
        cursor: dragging ? "grabbing" : "grab", zIndex: dragging ? 9 : selected ? 6 : live ? 5 : 3,
        width: 116, touchAction: "none", userSelect: "none",
        transition: dragging ? "none" : "filter .2s", filter: dragging ? "drop-shadow(0 8px 18px rgba(0,0,0,0.22))" : "none",
      }}
    >
      <div style={{ position: "relative", width: sz, height: sz, display: "grid", placeItems: "center", pointerEvents: "none" }}>
        {live && <span className="mc-halo" style={{ position: "absolute", inset: -7, borderRadius: 14, border: "1.5px solid var(--pulse)", pointerEvents: "none" }} />}
        {isRoot ? (
          <>
            <img src="/brands/doer-logo.jpg" width={sz} height={sz} alt={a.name} draggable={false}
              style={{ borderRadius: 12, objectFit: "cover", display: "block", boxShadow: ring }} />
            {queueDepth !== undefined && queueDepth > 0 && (
              <span style={{
                position: "absolute", top: -6, right: -6,
                minWidth: 22, height: 22, borderRadius: 999,
                background: badgeColor, color: "#fff",
                display: "grid", placeItems: "center",
                fontSize: 11, fontWeight: 700, fontFamily: "var(--fw-font-mono)",
                boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                border: "2px solid var(--bg)",
                fontVariantNumeric: "tabular-nums",
              }}>{queueDepth}</span>
            )}
          </>
        ) : (
          <div style={{ borderRadius: 11, boxShadow: ring, display: "grid", placeItems: "center" }}>
            <Avatar name={a.name} size={sz} />
          </div>
        )}
        <span style={{ position: "absolute", right: -2, bottom: -2, width: 13, height: 13, borderRadius: 999, background: "var(--bg)", display: "grid", placeItems: "center", boxShadow: "0 0 0 1.5px var(--bg)" }}>
          <StatusDot status={a.status} size={9} />
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1.15, maxWidth: 120, pointerEvents: "none" }}>
        <span className={isRoot ? "fw-display" : undefined} style={{ fontSize: isRoot ? 13 : 11.5, fontWeight: 600, color: "var(--ink)" }}>{a.name}</span>
        {live && a.tool ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
            <span className="fw-mono" style={{ fontSize: 9, color: "var(--pulse)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120 }}>{a.tool}()</span>
            {a.focus && (
              <span className="fw-mono" style={{
                fontSize: 8, color: "var(--accent)", whiteSpace: "nowrap",
                overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120,
                padding: "1px 5px", borderRadius: 4,
                background: "var(--accent-soft)", border: "1px solid var(--line-soft)",
              }}>{a.focus}</span>
            )}
          </div>
        ) : (
          <span className="fw-mono fw-uc" style={{ fontSize: 8.5, color: isErr ? "#e5484d" : "var(--ink-faint)" }}>{a.role}</span>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   Legend (unchanged)
   ============================================================ */

function LegendRow({ glyph, label, desc }: { glyph: React.ReactNode; label: string; desc: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <div style={{ width: 26, height: 22, flexShrink: 0, position: "relative", display: "grid", placeItems: "center" }}>{glyph}</div>
      <div style={{ minWidth: 0, lineHeight: 1.25 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap" }}>{label}</div>
        <div style={{ fontSize: 9.5, color: "var(--ink-faint)", whiteSpace: "nowrap" }}>{desc}</div>
      </div>
    </div>
  );
}
function LegendHead({ children }: { children: React.ReactNode }) {
  return <div className="fw-mono fw-uc" style={{ fontSize: 8.5, color: "var(--ink-faint)", margin: "2px 0 1px" }}>{children}</div>;
}
function dot(color: string) { return <span style={{ width: 9, height: 9, borderRadius: 999, background: color, display: "block" }} />; }

function Legend({ motion }: { motion: "calm" | "live" }) {
  const [open, setOpen] = React.useState(true);
  const liveMotion = motion !== "calm";
  return (
    <div style={{ position: "absolute", top: 14, right: 14, zIndex: 12, width: open ? 224 : "auto",
      background: "var(--bg-raised)", border: "1px solid var(--line)", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.16)", overflow: "hidden" }}>
      <button onClick={() => setOpen((o) => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: open ? "9px 12px" : "8px 11px", border: "none", background: "transparent", cursor: "pointer" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon d={I.org} size={12} style={{ color: "var(--ink-dim)" }} />
          <span className="fw-mono fw-uc" style={{ fontSize: 9.5, color: "var(--ink-dim)" }}>Key</span>
        </span>
        <Icon d={I.chevron} size={13} style={{ color: "var(--ink-faint)", transform: open ? "rotate(90deg)" : "none", transition: "transform .2s" }} />
      </button>
      {open && (
        <div style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 7, borderTop: "1px solid var(--line-soft)" }}>
          <LegendHead>Agents</LegendHead>
          <LegendRow glyph={dot("var(--pulse)")} label="Working" desc="running a task now" />
          <LegendRow glyph={dot("var(--warn)")} label="Idle" desc="no active run" />
          <LegendRow glyph={<span style={{ width: 9, height: 9, borderRadius: 999, background: "#e5484d" }} />} label="Error" desc="needs attention" />
          <LegendRow glyph={<span className={liveMotion ? "mc-halo" : ""} style={{ width: 17, height: 17, borderRadius: 6, border: "1.5px solid var(--pulse)" }} />} label="Live pulse" desc="executing right now" />
          <LegendHead>Events</LegendHead>
          <LegendRow glyph={<><span style={{ position: "absolute", width: 9, height: 9, borderRadius: 999, border: "1px solid var(--pulse)" }} /><span style={{ position: "absolute", width: 18, height: 18, borderRadius: 999, border: "1px solid var(--pulse)", opacity: 0.45 }} /></>} label="Tool call" desc="ring ripples out" />
          <LegendRow glyph={<span style={{ width: 18, height: 14, borderRadius: 4, border: "1px solid var(--accent)", background: "var(--accent-soft)" }} />} label="Comment" desc="bubble blooms" />
          <LegendRow glyph={<svg width="26" height="14"><line className={liveMotion ? "mc-flow" : ""} x1="2" y1="7" x2="24" y2="7" stroke="var(--accent)" strokeWidth="1.6" strokeDasharray="3 4" strokeLinecap="round" /></svg>} label="Pairing" desc="agents share an issue" />
          <LegendRow glyph={<><span style={{ position: "absolute", left: 0, right: 0, height: 1, background: "var(--line)" }} /><span style={{ width: 11, height: 11, borderRadius: 999, background: "var(--warn)", boxShadow: "0 0 7px 1px var(--warn)" }} /></>} label="Handoff" desc="ownership passes" />
          <LegendRow glyph={<Icon d={I.check} size={13} style={{ color: "var(--pulse)" }} />} label="Shipped" desc="output delivered" />
          <LegendHead>Queue HUD</LegendHead>
          <LegendRow glyph={<span style={{ width: 18, height: 18, borderRadius: 999, background: "var(--pulse)", display: "grid", placeItems: "center", color: "#fff", fontSize: 9, fontWeight: 700 }}>N</span>} label="Queue badge" desc="open issues on root" />
          <LegendRow glyph={<span className="mc-stale-pulse" style={{ width: 9, height: 9, borderRadius: 999, background: "var(--warn)" }} />} label="Stale alert" desc="issue stuck &gt;48h" />
        </div>
      )}
    </div>
  );
}

/* ============================================================
   PulseView — main view with QueueHUD + QuickActions
   ============================================================ */

export function PulseView({ state, layout, onSelect, selected, motion }: {
  state: MCState; layout: MCLayout; onSelect: MCSelect; selected: string | null; motion: "calm" | "live";
}) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const innerRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);
  const { agents, effects, collabs, clock } = state;

  const handleClick = React.useCallback((id: string) => {
    if (agents[id]?.synthetic) return;
    onSelect(id, "agent");
  }, [agents, onSelect]);

  const { nodes, edges, onNodeDown, dragRef } = usePhysics(layout, collabs, motion, innerRef, handleClick);

  const measure = React.useCallback(() => {
    const el = wrapRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width && r.height) {
      const next = Math.min(1, (r.width - 80) / STAGE_W, (r.height - 24) / STAGE_H);
      setScale((prev) => (Math.abs(prev - next) > 0.002 ? next : prev));
    }
  }, []);
  React.useLayoutEffect(() => { measure(); });
  React.useEffect(() => {
    measure();
    const id = window.setTimeout(measure, 80);
    window.addEventListener("resize", measure);
    let ro: ResizeObserver | undefined;
    try { ro = new ResizeObserver(measure); if (wrapRef.current) ro.observe(wrapRef.current); } catch { /* noop */ }
    return () => { window.clearTimeout(id); window.removeEventListener("resize", measure); ro?.disconnect(); };
  }, [measure]);

  const tokens = effects.filter((e) => e.kind === "token");
  const ripples = effects.filter((e) => e.kind === "ripple");
  const blooms = effects.filter((e) => e.kind === "bloom");
  const liveMotion = motion !== "calm";
  const dragName = dragRef.current?.name;
  const P = (id: string) => nodes[id] ?? layout.pos[id];

  // Compute queue depth for root badge
  const queueDepth = React.useMemo(() => {
    return Object.values(state.issues).filter((i) => i.status !== "done").length;
  }, [state.issues]);

  return (
    <div ref={wrapRef} style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", overflow: "hidden" }}>
      <QueueHUD state={state} />
      <Legend motion={motion} />
      <div ref={innerRef} style={{ position: "relative", width: STAGE_W, height: STAGE_H, transform: `scale(${scale})`, transformOrigin: "center" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.4, pointerEvents: "none",
          backgroundImage: "linear-gradient(var(--line-soft) 1px, transparent 1px), linear-gradient(90deg, var(--line-soft) 1px, transparent 1px)",
          backgroundSize: "40px 40px", maskImage: "radial-gradient(circle at 50% 50%, #000 30%, transparent 80%)", WebkitMaskImage: "radial-gradient(circle at 50% 50%, #000 30%, transparent 80%)" }} />

        <svg width={STAGE_W} height={STAGE_H} style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}>
          {edges.map((e, i) => {
            const a = P(e.a), b = P(e.b);
            if (!a || !b) return null;
            const childRecent = clock - (agents[e.b]?.lastActiveAt ?? -99) < 7;
            return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={childRecent ? "var(--accent)" : "var(--line)"}
              strokeWidth={childRecent ? 1.4 : 1} strokeOpacity={childRecent ? 0.5 : 1} />;
          })}
          {collabs.map((c) => {
            const a = P(c.from), b = P(c.to);
            if (!a || !b) return null;
            return <line key={c.id} className={liveMotion ? "mc-flow" : ""} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke="var(--accent)" strokeWidth={1.6} strokeDasharray="3 5" strokeLinecap="round" strokeOpacity={0.85} />;
          })}
        </svg>

        {tokens.map((tk) => {
          if (tk.kind !== "token") return null;
          const a = P(tk.from), b = P(tk.to);
          if (!a || !b) return null;
          return (
            <div key={tk.id} className="mc-token"
              style={{ position: "absolute", left: 0, top: 0, width: 16, height: 16, marginLeft: -8, marginTop: -8, borderRadius: 999,
                background: "var(--warn)", boxShadow: "0 0 16px 3px var(--warn)", offsetPath: `path('M ${a.x} ${a.y} L ${b.x} ${b.y}')`, zIndex: 7 }}>
              <span style={{ position: "absolute", inset: 4, borderRadius: 999, background: "var(--bg)" }} />
            </div>
          );
        })}

        {liveMotion && ripples.map((r) => {
          if (r.kind !== "ripple") return null;
          const p = P(r.agent); if (!p) return null;
          return <span key={r.id} className="mc-ripple" style={{ position: "absolute", left: p.x, top: p.y, width: 80, height: 80, marginLeft: -40, marginTop: -40, borderRadius: 999, border: "1.5px solid var(--pulse)", zIndex: 2 }} />;
        })}

        {Object.values(agents).map((a) => {
          const n = nodes[a.id]; if (!n) return null;
          return <PulseNode key={a.id} a={a} n={n} sz={nodeSize(n.depth)} isRoot={n.depth === 0} dragging={dragName === a.id} selected={selected === a.id} onPointerDown={onNodeDown} queueDepth={n.depth === 0 ? queueDepth : undefined} />;
        })}

        {blooms.map((bl) => {
          if (bl.kind !== "bloom") return null;
          const p = P(bl.agent); if (!p) return null;
          return (
            <div key={bl.id} className="mc-bloom" onClick={() => bl.issueId && onSelect(bl.issueId, "issue")}
              style={{ position: "absolute", left: p.x + 26, top: p.y - 30, width: 188, zIndex: 8, cursor: "pointer",
                background: "var(--bg-raised)", border: "1px solid var(--accent)", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.16)", padding: "8px 10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                <Icon d={I.issues} size={10} style={{ color: "var(--accent)" }} />
                <span className="fw-mono" style={{ fontSize: 9, color: "var(--accent)" }}>{agents[bl.agent]?.name ?? "Agent"}{bl.issueId ? ` · ${bl.issueId}` : ""}</span>
              </div>
              <div style={{ fontSize: 11, lineHeight: 1.35, color: "var(--ink)", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{bl.text}</div>
            </div>
          );
        })}

        <div className="fw-mono" style={{ position: "absolute", left: 14, bottom: 12, display: "flex", alignItems: "center", gap: 6, fontSize: 9.5, color: "var(--ink-faint)", pointerEvents: "none" }}>
          <Icon d={I.agents} size={11} /> drag any agent — the graph flexes
        </div>
      </div>
      <QuickActions state={state} onSelect={onSelect} />
    </div>
  );
}
