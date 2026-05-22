import { useState, useMemo } from "react";
import { Link } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import type { Issue } from "@doerai/shared";
import { heartbeatsApi, type LiveRunForIssue } from "../api/heartbeats";
import { issuesApi } from "../api/issues";
import type { TranscriptEntry } from "../adapters";
import { queryKeys } from "../lib/queryKeys";
import { relativeTime } from "../lib/utils";
import { RunTranscriptView } from "./transcript/RunTranscriptView";
import { useLiveRunTranscripts } from "./transcript/useLiveRunTranscripts";
import { Avatar } from "../fernweh/utils";

const MIN_DASHBOARD_RUNS = 4;

// ── Status mapping ──────────────────────────────────────────────────────────

type RunStatus = "live" | "success" | "blocked" | "error" | "idle";

function mapRunStatus(run: LiveRunForIssue): RunStatus {
  if (run.status === "queued" || run.status === "running") return "live";
  if (run.status === "succeeded") return "success";
  if (run.status === "failed" || run.status === "timed_out" || run.status === "cancelled") return "error";
  if (run.status === "blocked") return "blocked";
  return "idle";
}

const STATUS_DOT_COLOR: Record<RunStatus, string> = {
  live:    "var(--pulse)",
  success: "var(--pulse)",
  blocked: "var(--warn)",
  error:   "var(--danger)",
  idle:    "var(--ink-faint)",
};

const STATUS_LABEL: Record<RunStatus, string> = {
  live:    "live",
  success: "done",
  blocked: "blocked",
  error:   "error",
  idle:    "idle",
};

// fw-chip modifier per status (atop base "fw-chip" class)
const STATUS_CHIP_MOD: Record<RunStatus, string> = {
  live:    "pulse",
  success: "",       // no modifier — use base chip styling
  blocked: "warn",
  error:   "danger",
  idle:    "",
};

// ── Sub-components ──────────────────────────────────────────────────────────

function RunStatusDot({ status }: { status: RunStatus }) {
  const pulsing = status === "live";
  return (
    <span
      className={`fw-dot${pulsing ? " pulsing" : ""}`}
      style={{ background: STATUS_DOT_COLOR[status], color: STATUS_DOT_COLOR[status] }}
    />
  );
}

function StatusChip({ status }: { status: RunStatus }) {
  const mod = STATUS_CHIP_MOD[status];
  return (
    <span className={`fw-chip${mod ? ` ${mod}` : ""}`} style={{ fontSize: 10, lineHeight: 1 }}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function TranscriptCardPreview({ entries }: { entries: TranscriptEntry[] }) {
  const tail = entries.slice(-3);

  if (tail.length === 0) {
    return (
      <div style={{
        borderTop: "1px solid var(--line)",
        paddingTop: 10,
        fontFamily: "var(--fw-font-mono)",
        fontSize: 11,
        color: "var(--ink-faint)",
        minHeight: 54,
      }}>
        no output yet
      </div>
    );
  }

  return (
    <div style={{
      borderTop: "1px solid var(--line)",
      paddingTop: 10,
      fontFamily: "var(--fw-font-mono)",
      fontSize: 11,
      display: "flex",
      flexDirection: "column",
      gap: 5,
      minHeight: 54,
    }}>
      {tail.map((entry, i) => {
        let prefix = "·";
        let color = "var(--ink-faint)";
        let italic = false;
        let text = "";

        if (entry.kind === "tool_call") {
          prefix = "⟶";
          color = "var(--accent)";
          const raw = typeof entry.input === "string" ? entry.input : JSON.stringify(entry.input);
          text = `${entry.name}(${raw.slice(0, 40)}${raw.length > 40 ? "…" : ""})`;
        } else if (entry.kind === "assistant") {
          prefix = "›";
          color = "var(--ink-dim)";
          text = entry.text;
        } else if (entry.kind === "thinking") {
          prefix = "*";
          color = "var(--ink-faint)";
          italic = true;
          text = entry.text;
        } else if (entry.kind === "tool_result") {
          prefix = "←";
          color = "color-mix(in oklab, var(--accent) 60%, var(--ink-faint))";
          text = entry.content;
        } else {
          text = "text" in entry ? (entry as { text: string }).text : "";
        }

        return (
          <div key={i} style={{ display: "flex", gap: 6, overflow: "hidden" }}>
            <span style={{ color: "var(--line)", flexShrink: 0 }}>{prefix}</span>
            <span style={{
              color,
              fontStyle: italic ? "italic" : "normal",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              flex: 1,
            }}>
              {text}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Modal ───────────────────────────────────────────────────────────────────
// Rendered inside the Fernweh DOM tree so it inherits all var(--*) tokens.
// position:fixed breaks it out visually without losing CSS variable inheritance.

function AgentTranscriptModal({
  run,
  issue,
  transcript,
  isActive,
  onClose,
}: {
  run: LiveRunForIssue;
  issue?: Issue;
  transcript: TranscriptEntry[];
  isActive: boolean;
  onClose: () => void;
}) {
  const status = mapRunStatus(run);
  const workingOn = issue?.title ?? run.triggerDetail ?? "Running…";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "color-mix(in oklab, var(--bg) 75%, transparent)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        animation: "fw-fade-in .16s var(--fw-ease) both",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="fw-card"
        style={{
          width: "100%",
          maxWidth: 720,
          height: "min(86vh, 760px)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "fw-rise .2s var(--fw-ease) both",
          boxShadow: "0 28px 64px -20px rgba(0,0,0,0.30), 0 8px 24px -8px rgba(0,0,0,0.15)",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 18px",
          borderBottom: "1px solid var(--line)",
          flexShrink: 0,
        }}>
          <Avatar name={run.agentName} size={38} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{run.agentName}</span>
              <RunStatusDot status={status} />
              <StatusChip status={status} />
            </div>
            <div style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              marginTop: 3,
              fontFamily: "var(--fw-font-mono)",
              display: "flex",
              gap: 6,
            }}>
              {issue?.identifier && <><span>{issue.identifier}</span><span>·</span></>}
              <span>{run.adapterType}</span>
              <span>·</span>
              <span>{relativeTime(run.createdAt)}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: "1px solid var(--line)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--ink-faint)",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--ink)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--ink-faint)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-faint)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--line)";
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* Current task strip */}
        <div style={{
          padding: "9px 18px",
          borderBottom: "1px solid var(--line-soft)",
          background: "var(--bg-sunken)",
          flexShrink: 0,
        }}>
          <div className="fw-uc" style={{ color: "var(--ink-faint)", marginBottom: 3 }}>Current Task</div>
          <div style={{ fontSize: 13, color: "var(--ink-dim)", lineHeight: 1.4 }}>{workingOn}</div>
        </div>

        {/* Scrollable transcript */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "18px" }}>
          <RunTranscriptView
            entries={transcript}
            streaming={isActive}
            emptyMessage={isActive ? "Waiting for output…" : "No transcript captured."}
          />
        </div>

        {/* Footer */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 18px",
          borderTop: "1px solid var(--line)",
          background: "var(--bg-sunken)",
          flexShrink: 0,
        }}>
          <span style={{ fontFamily: "var(--fw-font-mono)", fontSize: 11, color: "var(--ink-faint)" }}>
            {transcript.length} entries
          </span>
          <div style={{ flex: 1 }} />
          <Link
            to={`/agents/${run.agentId}/runs/${run.id}`}
            onClick={onClose}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 12px",
              borderRadius: 6,
              background: "var(--accent)",
              color: "var(--bg)",
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            Open full run →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Card ────────────────────────────────────────────────────────────────────

function AgentRunCard({
  run,
  issue,
  transcript,
  hasOutput,
  isActive,
  onOpen,
}: {
  run: LiveRunForIssue;
  issue?: Issue;
  transcript: TranscriptEntry[];
  hasOutput: boolean;
  isActive: boolean;
  onOpen: () => void;
}) {
  const status = mapRunStatus(run);
  const workingOn = issue?.title ?? run.triggerDetail ?? "Running…";

  return (
    <button
      onClick={onOpen}
      className="fw-card"
      style={{
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        cursor: "pointer",
        width: "100%",
        textAlign: "left",
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <Avatar name={run.agentName} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--ink)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {run.agentName}
            </span>
            <RunStatusDot status={status} />
          </div>
          <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2 }}>{run.adapterType}</div>
        </div>
        <StatusChip status={status} />
      </div>

      {/* Working on */}
      <div>
        <div className="fw-uc" style={{ color: "var(--ink-faint)", marginBottom: 4 }}>Working On</div>
        <div style={{
          fontSize: 13,
          color: "var(--ink-dim)",
          lineHeight: 1.35,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          minHeight: 36,
        }}>
          {workingOn}
        </div>
      </div>

      {/* Elapsed + issue identifier */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: 11,
        color: "var(--ink-faint)",
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
          </svg>
          {isActive
            ? relativeTime(run.createdAt)
            : run.finishedAt
              ? relativeTime(run.finishedAt)
              : relativeTime(run.createdAt)}
        </span>
        {issue?.identifier && (
          <span style={{ fontFamily: "var(--fw-font-mono)", fontSize: 10, color: "var(--ink-faint)" }}>
            {issue.identifier}
          </span>
        )}
      </div>

      {/* Transcript tail */}
      <TranscriptCardPreview entries={hasOutput ? transcript : []} />
    </button>
  );
}

// ── Filter pills ────────────────────────────────────────────────────────────

const FILTERS = [
  { key: "all" as const,     label: "All" },
  { key: "live" as const,    label: "Live" },
  { key: "blocked" as const, label: "Blocked" },
  { key: "error" as const,   label: "Error" },
  { key: "success" as const, label: "Done" },
  { key: "idle" as const,    label: "Idle" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

// ── Panel ───────────────────────────────────────────────────────────────────

interface ActiveAgentsPanelProps {
  companyId: string;
}

export function ActiveAgentsPanel({ companyId }: ActiveAgentsPanelProps) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [openRunId, setOpenRunId] = useState<string | null>(null);

  const { data: liveRuns } = useQuery({
    queryKey: [...queryKeys.liveRuns(companyId), "dashboard"],
    queryFn: () => heartbeatsApi.liveRunsForCompany(companyId, MIN_DASHBOARD_RUNS),
  });

  const runs = liveRuns ?? [];

  const { data: issues } = useQuery({
    queryKey: queryKeys.issues.list(companyId),
    queryFn: () => issuesApi.list(companyId),
    enabled: runs.length > 0,
  });

  const issueById = useMemo(() => {
    const map = new Map<string, Issue>();
    for (const issue of issues ?? []) map.set(issue.id, issue);
    return map;
  }, [issues]);

  const { transcriptByRun, hasOutputForRun } = useLiveRunTranscripts({
    runs,
    companyId,
    maxChunksPerRun: 120,
  });

  const counts = useMemo(() => {
    const c = { all: runs.length, live: 0, success: 0, blocked: 0, error: 0, idle: 0 };
    for (const r of runs) c[mapRunStatus(r)]++;
    return c;
  }, [runs]);

  const filtered = filter === "all" ? runs : runs.filter((r) => mapRunStatus(r) === filter);
  const openRun = openRunId ? runs.find((r) => r.id === openRunId) : null;

  return (
    <div>
      {/* Section label + filter pills */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>Agents</span>
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
          {FILTERS.map(({ key, label }) => {
            const active = filter === key;
            const dotColor = key !== "all" ? STATUS_DOT_COLOR[key] : null;
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "2px 10px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 500,
                  fontFamily: "var(--fw-font-mono)",
                  border: "1px solid",
                  borderColor: active ? "transparent" : "var(--line)",
                  background: active ? "var(--accent-soft)" : "var(--bg-sunken)",
                  color: active ? "var(--accent)" : "var(--ink-faint)",
                  cursor: "pointer",
                  transition: "all .15s var(--fw-ease)",
                }}
              >
                {dotColor && (
                  <span style={{
                    width: 5,
                    height: 5,
                    borderRadius: 999,
                    background: dotColor,
                    display: "inline-block",
                    flexShrink: 0,
                  }} />
                )}
                {label}
                <span style={{ opacity: 0.5 }}>{counts[key]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid / empty states */}
      {runs.length === 0 ? (
        <div className="fw-card" style={{ padding: 16 }}>
          <p style={{ fontSize: 13, color: "var(--ink-faint)", margin: 0 }}>No recent agent runs.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          border: "1px dashed var(--line)",
          borderRadius: "var(--fw-radius-lg)",
          padding: 32,
          textAlign: "center",
          fontSize: 13,
          color: "var(--ink-faint)",
        }}>
          No agents in this state.
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 12,
        }}>
          {filtered.map((run) => {
            const issue = run.issueId ? issueById.get(run.issueId) : undefined;
            return (
              <AgentRunCard
                key={run.id}
                run={run}
                issue={issue}
                transcript={transcriptByRun.get(run.id) ?? []}
                hasOutput={hasOutputForRun(run.id)}
                isActive={run.status === "queued" || run.status === "running"}
                onOpen={() => setOpenRunId(run.id)}
              />
            );
          })}
        </div>
      )}

      {/* Modal — fixed overlay, rendered in-tree to inherit Fernweh CSS vars */}
      {openRun && (
        <AgentTranscriptModal
          run={openRun}
          issue={openRun.issueId ? issueById.get(openRun.issueId) : undefined}
          transcript={transcriptByRun.get(openRun.id) ?? []}
          isActive={openRun.status === "queued" || openRun.status === "running"}
          onClose={() => setOpenRunId(null)}
        />
      )}
    </div>
  );
}
