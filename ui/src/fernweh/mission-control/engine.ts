import * as React from "react";
import type { ActivityEvent, Agent, Issue, IssuePriority, IssueStatus, LiveEvent } from "@doerai/shared";
import type { FwStatus } from "../utils";
import { I } from "../utils";
import { useLiveEventStream } from "@/lib/live-event-bus";

/* ============================================================
   Mission Control — live engine.
   Seeds renderable state from REST (agents, issues, activity),
   then folds the company live-event stream into it. One state
   object feeds all three views (Pulse / Stream / Wallboard).
============================================================ */

export const VIRTUAL_ROOT = "__company__";

export interface MCAgent {
  id: string;
  name: string;
  title: string;
  role: string;
  adapter: string;
  reportsTo: string | null;
  status: FwStatus;
  action: string | null;
  focus: string | null; // MCIssue.id
  tool: string | null;
  lastActiveAt: number; // seconds
  toolCount: number;
  synthetic?: boolean;
}

export interface MCComment {
  agent: string; // display name
  t: number;
  text: string;
}

export interface MCIssue {
  id: string; // identifier ?? short db id — the display key
  realId: string; // db id
  title: string;
  priority: string; // P0..P3
  owner: string | null; // agent id
  status: string; // in_progress | review | open | done | blocked
  comments: MCComment[];
  lastEventAt: number;
}

export type MCEventType = "tool_call" | "comment" | "handoff" | "collab" | "output" | "status";

export interface MCEvent {
  id: string;
  t: number; // seconds
  type: MCEventType;
  agent: string | null; // display name
  target: string | null; // display name
  issueId: string | null;
  tool: string | null;
  text: string | null;
  summary: string | null;
  steps: string[] | null;
  logs: string[] | null;
  artifact: string | null;
}

export type MCEffect =
  | { id: string; kind: "ripple"; agent: string; t: number }
  | { id: string; kind: "bloom"; agent: string; issueId: string | null; text: string; t: number }
  | { id: string; kind: "token"; from: string; to: string; issueId: string | null; t: number }
  | { id: string; kind: "ship"; agent: string; t: number }
  | { id: string; kind: "spark"; from: string; to: string; t: number };

export interface MCCollab {
  id: string;
  from: string; // agent id
  to: string; // agent id
  issueId: string | null;
  t: number;
}

export interface MCTotals {
  events: number;
  comments: number;
  handoffs: number;
  outputs: number;
  tools: number;
}

export interface MCState {
  clock: number;
  agents: Record<string, MCAgent>;
  issues: Record<string, MCIssue>;
  log: MCEvent[];
  effects: MCEffect[];
  collabs: MCCollab[];
  totals: MCTotals;
}

/* ---------- icon + label per feed type ---------- */
export const TYPE_META: Record<MCEventType, { label: string; icon: string; color: string }> = {
  tool_call: { label: "tool call", icon: I.bolt, color: "var(--ink-dim)" },
  comment: { label: "comment", icon: I.issues, color: "var(--accent)" },
  handoff: { label: "handoff", icon: I.arrow, color: "var(--warn)" },
  collab: { label: "pairing", icon: I.agents, color: "var(--accent)" },
  output: { label: "shipped", icon: I.check, color: "var(--pulse)" },
  status: { label: "status", icon: I.activity, color: "var(--ink-faint)" },
};

/* ---------- mappings ---------- */
export function agentStatusToFw(status: Agent["status"]): FwStatus {
  if (status === "running" || status === "active") return "running";
  if (status === "paused" || status === "terminated" || status === "pending_approval") return "paused";
  if (status === "error") return "error";
  return "idle";
}

export function priorityToChip(priority: IssuePriority | string): string {
  switch (priority) {
    case "critical": return "P0";
    case "high": return "P1";
    case "medium": return "P2";
    case "low": return "P3";
    default: return "P3";
  }
}

export function issueStatusToDisplay(status: IssueStatus | string): string {
  switch (status) {
    case "in_progress": return "in_progress";
    case "in_review": return "review";
    case "blocked": return "blocked";
    case "done": return "done";
    case "cancelled": return "done";
    default: return "open"; // backlog | todo
  }
}

export function issueDisplayToFw(display: string): FwStatus {
  if (display === "in_progress") return "running";
  if (display === "review") return "paused";
  if (display === "blocked") return "error";
  if (display === "done") return "idle";
  return "idle";
}

export function fmtAgo(s: number): string {
  s = Math.max(0, Math.round(s));
  if (s < 5) return "just now";
  if (s < 60) return s + "s ago";
  const m = Math.floor(s / 60);
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  return Math.floor(h / 24) + "d ago";
}

/* ---------- radial org layout (root center, reports on rings) ---------- */
export interface MCLayout {
  pos: Record<string, { x: number; y: number; depth: number }>;
  kids: Record<string, string[]>;
  rootId: string;
}

export function computeLayout(agents: MCAgent[], W: number, H: number): MCLayout {
  const byId = Object.fromEntries(agents.map((a) => [a.id, a]));
  const present = (id: string | null) => !!id && !!byId[id];
  const hasSynthetic = !!byId[VIRTUAL_ROOT];
  const roots = agents.filter((a) => a.id !== VIRTUAL_ROOT && !present(a.reportsTo));

  const all = [...agents];
  // Stay consistent with the engine: it injects a synthetic company root only
  // when there isn't a single top agent. Honor that node when it exists.
  const rootId = hasSynthetic ? VIRTUAL_ROOT : roots.length === 1 ? roots[0]!.id : VIRTUAL_ROOT;

  const kids: Record<string, string[]> = {};
  for (const a of all) kids[a.id] = [];
  kids[rootId] = kids[rootId] ?? [];
  for (const a of all) {
    if (a.id === rootId) continue;
    const parent = present(a.reportsTo) && a.reportsTo !== a.id ? a.reportsTo! : rootId;
    if (parent === a.id) continue;
    (kids[parent] = kids[parent] ?? []).push(a.id);
  }

  const leaves: Record<string, number> = {};
  const countLeaves = (n: string): number => {
    const ch = kids[n] ?? [];
    if (!ch.length) return (leaves[n] = 1);
    return (leaves[n] = ch.reduce((s, c) => s + countLeaves(c), 0));
  };
  countLeaves(rootId);

  const cx = W / 2, cy = H / 2;
  const RING = [0, Math.min(W, H) * 0.27, Math.min(W, H) * 0.46, Math.min(W, H) * 0.6];
  const pos: MCLayout["pos"] = {};

  const place = (id: string, depth: number, a0: number, a1: number) => {
    const ang = (a0 + a1) / 2;
    const r = RING[Math.min(depth, RING.length - 1)]!;
    pos[id] = {
      x: cx + r * Math.cos(ang),
      y: cy + r * Math.sin(ang) * 0.86,
      depth,
    };
    const ch = kids[id] ?? [];
    if (!ch.length) return;
    let a = a0;
    const span = a1 - a0;
    for (const c of ch) {
      const w = (leaves[c] ?? 1) / (leaves[id] ?? 1);
      place(c, depth + 1, a, a + span * w);
      a += span * w;
    }
  };
  place(rootId, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2);

  return { pos, kids, rootId };
}

/* ---------- small helpers for reading untyped payloads ---------- */
function readStr(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}
function readRec(v: unknown): Record<string, unknown> | null {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

let _eid = 0;
const uid = () => "mc" + ++_eid;

const nowSec = () => Date.now() / 1000;

/* ============================================================
   useMissionControlState
============================================================ */
export interface MissionControlInput {
  companyName: string;
  agents: Agent[];
  issues: Issue[];
  activity: ActivityEvent[];
  liveRunAgentIds: string[];
  paused: boolean;
}

export function useMissionControlState(input: MissionControlInput): MCState {
  const { companyName, agents, issues, activity, liveRunAgentIds, paused } = input;
  const pausedRef = React.useRef(paused);
  React.useEffect(() => { pausedRef.current = paused; }, [paused]);

  // --- seed: rebuild the base maps whenever the REST snapshots change ---
  const seed = React.useMemo(() => {
    const now = nowSec();
    const liveSet = new Set(liveRunAgentIds);

    const agentMap: Record<string, MCAgent> = {};
    for (const a of agents) {
      const status = liveSet.has(a.id) ? "running" : agentStatusToFw(a.status);
      agentMap[a.id] = {
        id: a.id,
        name: a.name,
        title: a.title ?? a.role,
        role: a.role,
        adapter: a.adapterType,
        reportsTo: a.reportsTo,
        status,
        action: null,
        focus: null,
        tool: null,
        lastActiveAt: a.lastHeartbeatAt ? new Date(a.lastHeartbeatAt).getTime() / 1000 : now - 86400,
        toolCount: 0,
      };
    }
    // synthetic company root when there is no single top agent
    const present = (id: string | null) => !!id && !!agentMap[id];
    const roots = Object.values(agentMap).filter((a) => !present(a.reportsTo));
    if (roots.length !== 1) {
      agentMap[VIRTUAL_ROOT] = {
        id: VIRTUAL_ROOT, name: companyName, title: "Company", role: "company",
        adapter: "", reportsTo: null, status: "idle", action: null, focus: null,
        tool: null, lastActiveAt: now - 86400, toolCount: 0, synthetic: true,
      };
    }

    const nameById = new Map(Object.values(agentMap).map((a) => [a.id, a.name]));
    const issueMap: Record<string, MCIssue> = {};
    const issueKeyByRealId = new Map<string, string>();
    for (const i of issues) {
      const key = i.identifier ?? i.id.slice(0, 6);
      issueKeyByRealId.set(i.id, key);
      if (i.identifier) issueKeyByRealId.set(i.identifier, key);
      const updated = i.updatedAt ? new Date(i.updatedAt).getTime() / 1000 : now - 3600;
      issueMap[key] = {
        id: key,
        realId: i.id,
        title: i.title,
        priority: priorityToChip(i.priority),
        owner: i.assigneeAgentId,
        status: issueStatusToDisplay(i.status),
        comments: [],
        lastEventAt: updated,
      };
      if (i.assigneeAgentId && agentMap[i.assigneeAgentId]) {
        agentMap[i.assigneeAgentId].focus = agentMap[i.assigneeAgentId].focus ?? key;
      }
    }

    // backfill the feed from recent activity (newest first)
    const log: MCEvent[] = [];
    const totals: MCTotals = { events: 0, comments: 0, handoffs: 0, outputs: 0, tools: 0 };
    const recent = [...activity]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 40);
    for (const ev of recent) {
      const t = new Date(ev.createdAt).getTime() / 1000;
      const agentName =
        (ev.agentId ? nameById.get(ev.agentId) ?? null : null) ??
        (ev.actorType === "agent" ? nameById.get(ev.actorId) ?? null : null) ??
        (ev.actorType === "user" ? "You" : null) ??
        (ev.actorType === "system" ? "System" : null);
      const details = readRec((ev as { details?: unknown }).details);
      const title = readStr(details?.title) ?? readStr(details?.issueTitle);
      const issueKey =
        ev.entityType === "issue" && ev.entityId
          ? issueKeyByRealId.get(ev.entityId) ?? readStr(details?.identifier) ?? null
          : null;
      const mapped = mapActivityAction(ev.action);
      log.push({
        id: uid(), t, type: mapped.type, agent: agentName, target: null,
        issueId: issueKey, tool: null, text: mapped.type === "comment" ? readStr(details?.bodySnippet) : null,
        summary: title ?? mapped.label, steps: null, logs: null, artifact: null,
      });
      totals.events++;
      if (mapped.type === "comment") totals.comments++;
      else if (mapped.type === "handoff") totals.handoffs++;
      else if (mapped.type === "output") totals.outputs++;
      else if (mapped.type === "tool_call") totals.tools++;
    }

    return { agentMap, issueMap, issueKeyByRealId, nameById, log, totals };
  }, [agents, issues, activity, liveRunAgentIds, companyName]);

  const [state, setState] = React.useState<MCState>(() => ({
    clock: nowSec(),
    agents: seed.agentMap,
    issues: seed.issueMap,
    log: seed.log,
    effects: [],
    collabs: [],
    totals: seed.totals,
  }));

  // when the REST seed changes, merge it in without throwing away live deltas
  const seedRef = React.useRef(seed);
  React.useEffect(() => {
    seedRef.current = seed;
    setState((s) => {
      const agentsMerged: Record<string, MCAgent> = { ...seed.agentMap };
      for (const id in agentsMerged) {
        const prev = s.agents[id];
        if (prev) {
          agentsMerged[id] = {
            ...agentsMerged[id],
            // keep live-driven transient fields
            action: prev.action ?? agentsMerged[id].action,
            tool: prev.tool,
            toolCount: Math.max(prev.toolCount, 0),
            lastActiveAt: Math.max(prev.lastActiveAt, agentsMerged[id].lastActiveAt),
            status: prev.lastActiveAt > agentsMerged[id].lastActiveAt ? prev.status : agentsMerged[id].status,
          };
        }
      }
      const issuesMerged: Record<string, MCIssue> = { ...seed.issueMap };
      for (const id in issuesMerged) {
        const prev = s.issues[id];
        if (prev) issuesMerged[id] = { ...issuesMerged[id], comments: prev.comments };
      }
      // keep live feed entries that are newer than the backfill, prepend backfill
      const seedIds = new Set(seed.log.map((e) => e.id));
      const liveOnly = s.log.filter((e) => !seedIds.has(e.id) && e.id.startsWith("mc") && e.t >= (seed.log[0]?.t ?? 0));
      return {
        ...s,
        agents: agentsMerged,
        issues: issuesMerged,
        log: [...liveOnly, ...seed.log].slice(0, 80),
        totals: { ...seed.totals, ...sumTotals(liveOnly, seed.totals) },
      };
    });
  }, [seed]);

  // --- live event folding ---
  useLiveEventStream((event: LiveEvent) => {
    if (pausedRef.current) return;
    setState((s) => applyLiveEvent(s, event, nowSec(), seedRef.current.issueKeyByRealId));
  });

  // --- clock tick: age labels, expire effects + collabs ---
  React.useEffect(() => {
    const id = window.setInterval(() => {
      const now = nowSec();
      setState((s) => {
        const effects = s.effects.filter((e) => now - e.t < (e.kind === "bloom" ? 8 : 4));
        const collabs = s.collabs.filter((c) => now - c.t < 18);
        if (effects.length === s.effects.length && collabs.length === s.collabs.length && Math.abs(now - s.clock) < 0.9) {
          return { ...s, clock: now };
        }
        return { ...s, clock: now, effects, collabs };
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  return state;
}

function sumTotals(events: MCEvent[], base: MCTotals): Partial<MCTotals> {
  const t = { ...base };
  for (const e of events) {
    t.events++;
    if (e.type === "comment") t.comments++;
    else if (e.type === "handoff") t.handoffs++;
    else if (e.type === "output") t.outputs++;
    else if (e.type === "tool_call") t.tools++;
  }
  return t;
}

function mapActivityAction(action: string): { type: MCEventType; label: string } {
  if (action.includes("comment")) return { type: "comment", label: "commented" };
  if (action === "issue.status_changed" || action.includes("reassign")) return { type: "handoff", label: "moved issue" };
  if (action === "run.completed" || action.includes("deliverable") || action.includes("output"))
    return { type: "output", label: "shipped work" };
  if (action === "run.started") return { type: "tool_call", label: "started run" };
  if (action.includes("created")) return { type: "status", label: "created" };
  return { type: "status", label: action.replace(/[._]/g, " ") };
}

function applyLiveEvent(
  s: MCState,
  event: LiveEvent,
  now: number,
  issueKeyByRealId: Map<string, string>,
): MCState {
  const payload = event.payload ?? {};
  const agentId = readStr(payload.agentId);
  const agents = { ...s.agents };
  const issues = { ...s.issues };
  let collabs = s.collabs;
  const effects: MCEffect[] = [];
  const totals = { ...s.totals };
  const log = [...s.log];

  const touch = (id: string) => {
    if (agents[id]) agents[id] = { ...agents[id] };
  };
  const nameOf = (id: string | null) => (id && agents[id] ? agents[id].name : null);
  const pushLog = (e: Omit<MCEvent, "id" | "t">) => {
    log.unshift({ id: uid(), t: now, ...e });
    totals.events++;
  };

  if (event.type === "heartbeat.run.event") {
    if (!agentId || !agents[agentId]) return s;
    const details = readRec(payload.payload);
    const tool = readStr(details?.tool) ?? readStr(details?.name) ?? readStr(payload.eventType) ?? "run";
    const message = readStr(payload.message);
    touch(agentId);
    agents[agentId].status = "running";
    agents[agentId].lastActiveAt = now;
    agents[agentId].tool = tool;
    agents[agentId].action = message ?? `${tool}()`;
    agents[agentId].toolCount += 1;
    totals.tools++;
    effects.push({ id: uid(), kind: "ripple", agent: agentId, t: now });
    pushLog({
      type: "tool_call", agent: agents[agentId].name, target: null,
      issueId: agents[agentId].focus, tool, text: null, summary: message,
      steps: null, logs: null, artifact: null,
    });
  } else if (event.type === "heartbeat.run.status" || event.type === "heartbeat.run.queued") {
    if (!agentId || !agents[agentId]) return s;
    const status = readStr(payload.status) ?? (event.type === "heartbeat.run.queued" ? "queued" : null);
    touch(agentId);
    agents[agentId].lastActiveAt = now;
    if (status === "running" || status === "queued") {
      agents[agentId].status = "running";
      agents[agentId].action = status === "queued" ? "queued a run" : "running";
      pushLog({
        type: "status", agent: agents[agentId].name, target: null, issueId: agents[agentId].focus,
        tool: null, text: null, summary: status === "queued" ? "queued a run" : "started running",
        steps: null, logs: null, artifact: null,
      });
    } else if (status === "succeeded") {
      agents[agentId].status = "idle";
      agents[agentId].action = "completed a run";
      totals.outputs++;
      effects.push({ id: uid(), kind: "ship", agent: agentId, t: now });
      pushLog({
        type: "output", agent: agents[agentId].name, target: null, issueId: agents[agentId].focus,
        tool: null, text: null, summary: "completed a run", steps: null, logs: null, artifact: null,
      });
    } else if (status === "failed" || status === "timed_out" || status === "cancelled") {
      agents[agentId].status = status === "cancelled" ? "idle" : "error";
      agents[agentId].action = `run ${status.replace("_", " ")}`;
      pushLog({
        type: "status", agent: agents[agentId].name, target: null, issueId: agents[agentId].focus,
        tool: null, text: null, summary: `run ${status.replace("_", " ")}`, steps: null, logs: null, artifact: null,
      });
    }
  } else if (event.type === "agent.status") {
    if (!agentId || !agents[agentId]) return s;
    const status = readStr(payload.status);
    touch(agentId);
    agents[agentId].lastActiveAt = now;
    if (status) agents[agentId].status = agentStatusToFw(status as Agent["status"]);
  } else if (event.type === "activity.logged") {
    const action = readStr(payload.action) ?? "";
    const entityType = readStr(payload.entityType);
    const entityId = readStr(payload.entityId);
    const details = readRec(payload.details);
    const actorAgentName = nameOf(agentId);
    const issueKey =
      entityType === "issue" && entityId
        ? issueKeyByRealId.get(entityId) ?? readStr(details?.identifier) ?? null
        : null;
    const issue = issueKey ? issues[issueKey] : null;

    if (action.includes("comment")) {
      const text = readStr(details?.bodySnippet) ?? readStr(details?.body) ?? "commented";
      if (issue && issueKey) {
        issues[issueKey] = { ...issue, comments: [...issue.comments, { agent: actorAgentName ?? "Agent", t: now, text }], lastEventAt: now };
      }
      totals.comments++;
      if (agentId && agents[agentId]) { touch(agentId); agents[agentId].lastActiveAt = now; agents[agentId].action = `commented on ${issueKey ?? "an issue"}`; effects.push({ id: uid(), kind: "bloom", agent: agentId, issueId: issueKey, text, t: now }); }
      pushLog({ type: "comment", agent: actorAgentName, target: null, issueId: issueKey, tool: null, text, summary: null, steps: null, logs: null, artifact: null });
    } else if (action === "issue.status_changed" || action.includes("reassign") || (action === "issue.updated" && readStr(details?.assigneeAgentId))) {
      const newOwnerId = readStr(details?.assigneeAgentId);
      const fromId = issue?.owner ?? null;
      if (issue && issueKey) {
        const newStatus = readStr(details?.status);
        issues[issueKey] = { ...issue, owner: newOwnerId ?? issue.owner, status: newStatus ? issueStatusToDisplay(newStatus) : issue.status, lastEventAt: now };
      }
      if (newOwnerId && fromId && agents[fromId] && agents[newOwnerId]) {
        totals.handoffs++;
        effects.push({ id: uid(), kind: "token", from: fromId, to: newOwnerId, issueId: issueKey, t: now });
        pushLog({ type: "handoff", agent: agents[fromId].name, target: agents[newOwnerId].name, issueId: issueKey, tool: null, text: null, summary: null, steps: null, logs: null, artifact: null });
      } else {
        pushLog({ type: "status", agent: actorAgentName, target: null, issueId: issueKey, tool: null, text: null, summary: "moved an issue", steps: null, logs: null, artifact: null });
      }
    } else if (action === "run.completed" || action.includes("deliverable") || action.includes("output")) {
      totals.outputs++;
      if (agentId && agents[agentId]) effects.push({ id: uid(), kind: "ship", agent: agentId, t: now });
      pushLog({ type: "output", agent: actorAgentName, target: null, issueId: issueKey, tool: null, text: null, summary: "shipped work", artifact: readStr(details?.title), steps: null, logs: null });
    } else {
      const mapped = mapActivityAction(action);
      pushLog({ type: mapped.type, agent: actorAgentName, target: null, issueId: issueKey, tool: null, text: null, summary: readStr(details?.title) ?? mapped.label, steps: null, logs: null, artifact: null });
    }
  } else {
    return s;
  }

  // derive pairing: two agents active on the same issue inside the window
  if (agentId && agents[agentId] && agents[agentId].focus) {
    const focus = agents[agentId].focus;
    const co = Object.values(agents).find(
      (a) => a.id !== agentId && !a.synthetic && a.focus === focus && now - a.lastActiveAt < 12,
    );
    if (co) {
      const exists = collabs.some((c) => (c.from === agentId && c.to === co.id) || (c.from === co.id && c.to === agentId));
      if (!exists) collabs = [...collabs, { id: uid(), from: agentId, to: co.id, issueId: focus, t: now }].slice(-6);
    }
  }

  return {
    ...s,
    clock: now,
    agents,
    issues,
    log: log.slice(0, 80),
    effects: [...s.effects, ...effects].slice(-24),
    collabs: collabs.slice(-6),
    totals,
  };
}
