import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useCompany } from "@/context/CompanyContext";
import { issuesApi } from "@/api/issues";
import { agentsApi } from "@/api/agents";
import { queryKeys } from "@/lib/queryKeys";
import {
  Avatar,
  Icon,
  I,
  PriorityChip,
  StatusChip,
  formatRelative,
  Field,
} from "./utils";
import type { Agent, Issue } from "@doerai/shared";

/* ------------------------------------------------------------------
   Lane definitions — collapse the 7 IssueStatus values into 4 lanes.
   `blocked` stays a badge on the card (shows up inside Doing).
------------------------------------------------------------------ */
type LaneKey = "todo" | "doing" | "review" | "done";

const LANE_DEF: Record<LaneKey, { label: string; statuses: string[]; accent: string }> = {
  todo: { label: "Up next", statuses: ["backlog", "todo"], accent: "var(--ink-dim)" },
  doing: { label: "Doing", statuses: ["in_progress", "blocked"], accent: "var(--accent)" },
  review: { label: "Review", statuses: ["in_review"], accent: "var(--warn)" },
  done: { label: "Done", statuses: ["done", "cancelled"], accent: "var(--pulse)" },
};

function laneForStatus(status: string): LaneKey | null {
  for (const key of Object.keys(LANE_DEF) as LaneKey[]) {
    if (LANE_DEF[key].statuses.includes(status)) return key;
  }
  return null;
}

type PriorityFilter = "all" | "critical" | "high" | "medium" | "low";

function shortPriority(p: string): "P0" | "P1" | "P2" | "P3" | string {
  if (p === "critical") return "P0";
  if (p === "high") return "P1";
  if (p === "medium") return "P2";
  if (p === "low") return "P3";
  return p;
}

/* ------------------------------------------------------------------
   Card
------------------------------------------------------------------ */
function IssueCard({
  issue,
  assignee,
  active,
  onClick,
}: {
  issue: Issue;
  assignee: Agent | null;
  active: boolean;
  onClick: () => void;
}) {
  const blocked = issue.status === "blocked";
  const cancelled = issue.status === "cancelled";
  return (
    <div
      onClick={onClick}
      className="fw-card"
      style={{
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        cursor: "pointer",
        border: active ? "1px solid var(--accent)" : undefined,
        boxShadow: active ? "0 0 0 2px var(--accent-soft)" : undefined,
        opacity: cancelled ? 0.55 : 1,
        transition: "border .1s var(--fw-ease), box-shadow .1s var(--fw-ease)",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "var(--bg-raised)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "";
      }}
    >
      {/* Top row: identifier + priority + blocked flag */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span
          className="fw-mono"
          style={{ fontSize: 10, color: "var(--ink-faint)" }}
        >
          {issue.identifier ?? issue.id.slice(0, 6)}
        </span>
        <PriorityChip priority={shortPriority(issue.priority)} />
        {blocked ? (
          <span
            className="fw-chip"
            style={{ color: "var(--danger)", borderColor: "var(--danger)", fontSize: 10 }}
          >
            blocked
          </span>
        ) : null}
      </div>

      {/* Title */}
      <span
        style={{
          fontSize: 13,
          fontWeight: 500,
          lineHeight: 1.35,
          textDecoration: cancelled ? "line-through" : undefined,
          color: "var(--ink)",
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {issue.title ?? "Untitled"}
      </span>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          {assignee ? (
            <>
              <Avatar name={assignee.name} size={18} />
              <span
                style={{
                  fontSize: 11,
                  color: "var(--ink-dim)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {assignee.name}
              </span>
            </>
          ) : (
            <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>unassigned</span>
          )}
        </div>
        <span
          style={{
            fontSize: 10,
            color: "var(--ink-faint)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {formatRelative(issue.updatedAt)}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Lane column
------------------------------------------------------------------ */
function Lane({
  laneKey,
  issues,
  byId,
  selectedId,
  onSelect,
}: {
  laneKey: LaneKey;
  issues: Issue[];
  byId: Map<string, Agent>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const def = LANE_DEF[laneKey];
  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minWidth: 260,
        flex: 1,
        maxWidth: 360,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "4px 2px 6px",
          borderBottom: `2px solid ${def.accent}`,
        }}
      >
        <span className="fw-uc" style={{ color: def.accent, fontWeight: 600 }}>
          {def.label}
        </span>
        <span style={{ fontSize: 11, color: "var(--ink-faint)", marginLeft: "auto" }}>
          {issues.length}
        </span>
      </header>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 40 }}>
        {issues.length === 0 ? (
          <div
            style={{
              padding: 14,
              border: "1px dashed var(--line)",
              borderRadius: 8,
              textAlign: "center",
              fontSize: 11,
              color: "var(--ink-faint)",
            }}
          >
            Nothing here.
          </div>
        ) : (
          issues.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              assignee={issue.assigneeAgentId ? byId.get(issue.assigneeAgentId) ?? null : null}
              active={selectedId === issue.id}
              onClick={() => onSelect(issue.id)}
            />
          ))
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------
   Detail drawer
------------------------------------------------------------------ */
function IssueDrawer({
  issue,
  byId,
  companyPrefix,
  onClose,
}: {
  issue: Issue | null;
  byId: Map<string, Agent>;
  companyPrefix: string;
  onClose: () => void;
}) {
  React.useEffect(() => {
    if (!issue) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [issue, onClose]);

  if (!issue) return null;

  const assignee = issue.assigneeAgentId ? byId.get(issue.assigneeAgentId) ?? null : null;

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
        aria-label={`Issue ${issue.identifier ?? issue.id}`}
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
        {/* Header */}
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
              <span className="fw-mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                {issue.identifier ?? issue.id.slice(0, 8)}
              </span>
              <StatusChip status={issue.status} />
              <PriorityChip priority={shortPriority(issue.priority)} />
            </div>
            <h2
              className="fw-display"
              style={{ margin: 0, fontSize: 18, fontWeight: 600, lineHeight: 1.3 }}
            >
              {issue.title ?? "Untitled"}
            </h2>
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

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "18px 24px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
          {issue.description ? (
            <Field label="Description">
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: "var(--ink-dim)",
                  whiteSpace: "pre-wrap",
                }}
              >
                {issue.description}
              </p>
            </Field>
          ) : null}

          <Field label="Assignee">
            {assignee ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Avatar name={assignee.name} size={22} />
                <span style={{ fontSize: 13 }}>{assignee.name}</span>
                <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                  · {assignee.title ?? assignee.role}
                </span>
              </div>
            ) : (
              <span style={{ fontSize: 13, color: "var(--ink-dim)" }}>unassigned</span>
            )}
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Started">
              <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>
                {issue.startedAt ? formatRelative(issue.startedAt) : "—"}
              </span>
            </Field>
            <Field label="Completed">
              <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>
                {issue.completedAt ? formatRelative(issue.completedAt) : "—"}
              </span>
            </Field>
            <Field label="Updated">
              <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>{formatRelative(issue.updatedAt)}</span>
            </Field>
            <Field label="Created">
              <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>{formatRelative(issue.createdAt)}</span>
            </Field>
          </div>

          {issue.projectId ? (
            <Field label="Project">
              <span className="fw-mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                {issue.projectId}
              </span>
            </Field>
          ) : null}

          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            <a
              href={`/${companyPrefix}/issues/${issue.identifier ?? issue.id}`}
              style={{
                fontSize: 12,
                padding: "6px 12px",
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: "var(--bg-raised)",
                color: "var(--ink)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              Open in classic UI <Icon d={I.arrow} size={11} />
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}

/* ------------------------------------------------------------------
   Page
------------------------------------------------------------------ */
export function FernwehWork() {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id;
  const companyPrefix = selectedCompany?.issuePrefix ?? "";

  const issuesQuery = useQuery({
    queryKey: companyId ? queryKeys.issues.list(companyId) : ["issues", "none"],
    queryFn: () => issuesApi.list(companyId!),
    enabled: !!companyId,
    refetchInterval: 30_000,
  });

  const agentsQuery = useQuery({
    queryKey: companyId ? queryKeys.agents.list(companyId) : ["agents", "none"],
    queryFn: () => agentsApi.list(companyId!),
    enabled: !!companyId,
    refetchInterval: 60_000,
  });

  // All hooks above the conditional return.
  const [search, setSearch] = React.useState("");
  const [priorityFilter, setPriorityFilter] = React.useState<PriorityFilter>("all");
  const [onlyMine, setOnlyMine] = React.useState(false); // placeholder for future
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const issues = issuesQuery.data ?? [];
  const agents = agentsQuery.data ?? [];

  const agentById = React.useMemo(() => {
    const m = new Map<string, Agent>();
    for (const a of agents) m.set(a.id, a);
    return m;
  }, [agents]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return issues.filter((issue) => {
      if (priorityFilter !== "all" && issue.priority !== priorityFilter) return false;
      if (q) {
        const assignee = issue.assigneeAgentId ? agentById.get(issue.assigneeAgentId)?.name ?? "" : "";
        const hay = [issue.title ?? "", issue.identifier ?? "", assignee].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [issues, priorityFilter, search, agentById]);

  const byLane = React.useMemo(() => {
    const map: Record<LaneKey, Issue[]> = { todo: [], doing: [], review: [], done: [] };
    for (const issue of filtered) {
      const lane = laneForStatus(issue.status);
      if (!lane) continue;
      map[lane].push(issue);
    }
    // Sort each lane: priority ascending, then updatedAt descending.
    const prioRank = { critical: 0, high: 1, medium: 2, low: 3 } as Record<string, number>;
    for (const k of Object.keys(map) as LaneKey[]) {
      map[k].sort((a, b) => {
        const ap = prioRank[a.priority] ?? 99;
        const bp = prioRank[b.priority] ?? 99;
        if (ap !== bp) return ap - bp;
        const at = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bt = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return bt - at;
      });
    }
    return map;
  }, [filtered]);

  const selected = selectedId ? issues.find((i) => i.id === selectedId) ?? null : null;

  if (!selectedCompany) {
    return (
      <div style={{ padding: 40, color: "var(--ink-dim)" }}>
        <p>Select a company to view work.</p>
      </div>
    );
  }

  const total = issues.length;

  return (
    <div
      style={{
        padding: "32px 36px 60px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
        margin: "0 auto",
        maxWidth: 1600,
        width: "100%",
      }}
    >
      {/* Header */}
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
            Work
          </span>
          <h1 className="fw-display" style={{ fontSize: 28, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>
            {selectedCompany.name}
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="fw-chip">{total} issues</span>
          <span className="fw-chip">{byLane.doing.length} doing</span>
          <span className="fw-chip">{byLane.review.length} review</span>
        </div>
      </header>

      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {(["all", "critical", "high", "medium", "low"] as PriorityFilter[]).map((key) => {
            const active = priorityFilter === key;
            const label = key === "all" ? "All" : key[0].toUpperCase() + key.slice(1);
            return (
              <button
                key={key}
                onClick={() => setPriorityFilter(key)}
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
                {label}
              </button>
            );
          })}
        </div>

        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            color: "var(--ink-dim)",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={onlyMine}
            onChange={(e) => setOnlyMine(e.target.checked)}
            style={{ accentColor: "var(--accent)" }}
          />
          <span style={{ textDecoration: onlyMine ? "none" : "line-through", opacity: 0.6 }}>
            Only mine
          </span>
          <span style={{ fontSize: 10, color: "var(--ink-faint)" }}>(coming soon)</span>
        </label>

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
              minWidth: 240,
            }}
          >
            <Icon
              d="M21 21l-4.35-4.35 M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z"
              size={13}
              style={{ color: "var(--ink-faint)" }}
            />
            <input
              placeholder="Search issues…"
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

      {/* Board */}
      {total === 0 ? (
        <div className="fw-card" style={{ padding: 40, textAlign: "center", color: "var(--ink-dim)" }}>
          No issues yet. Create one from the classic UI to get the lanes moving.
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            gap: 14,
            alignItems: "flex-start",
            overflowX: "auto",
            paddingBottom: 12,
          }}
        >
          {(Object.keys(LANE_DEF) as LaneKey[]).map((key) => (
            <Lane
              key={key}
              laneKey={key}
              issues={byLane[key]}
              byId={agentById}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          ))}
        </div>
      )}

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
        <Icon d={I.issues} size={11} />
        <span>Click a card for detail · Esc to close · refetches every 30s.</span>
      </footer>

      {/* Drawer */}
      <IssueDrawer
        issue={selected}
        byId={agentById}
        companyPrefix={companyPrefix}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
