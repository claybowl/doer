import * as React from "react";
import { useParams, useNavigate } from "@/lib/router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "@/context/CompanyContext";
import { heartbeatsApi } from "@/api/heartbeats";
import { agentsApi } from "@/api/agents";
import { queryKeys } from "@/lib/queryKeys";
import type { HeartbeatRun } from "@doerai/shared";
import { Icon, I, ErrorState, LoadingState, formatRelative, formatCents } from "./utils";

/* ============================================================
   FernwehRunDetail — single heartbeat run transcript viewer
   Route: /:companyPrefix/fernweh/agents/:agentId/runs/:runId
============================================================ */

// ── Status helpers ────────────────────────────────────────────

type RunStatus = HeartbeatRun["status"];

function statusColor(s: RunStatus): string {
  switch (s) {
    case "running": return "var(--accent)";
    case "succeeded": return "var(--ok)";
    case "failed":
    case "timed_out": return "var(--danger)";
    case "cancelled": return "var(--warn)";
    case "queued": return "var(--ink-dim)";
    default: return "var(--ink-dim)";
  }
}

function statusLabel(s: RunStatus): string {
  switch (s) {
    case "timed_out": return "Timed out";
    default: return s.charAt(0).toUpperCase() + s.slice(1);
  }
}

function isLive(s: RunStatus): boolean {
  return s === "queued" || s === "running";
}

// ── Duration ─────────────────────────────────────────────────

function formatDuration(start: Date | null, end: Date | null): string {
  if (!start) return "—";
  const endMs = end ? new Date(end).getTime() : Date.now();
  const ms = endMs - new Date(start).getTime();
  if (ms < 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const rem = secs % 60;
  return `${mins}m ${rem}s`;
}

// ── Stat row item ─────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-faint)" }}>
        {label}
      </span>
      <span style={{ fontSize: 13, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
        {value}
      </span>
    </div>
  );
}

// ── Status chip ───────────────────────────────────────────────

function RunStatusChip({ status }: { status: RunStatus }) {
  const color = statusColor(status);
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      padding: "3px 9px",
      borderRadius: 999,
      background: `color-mix(in oklab, ${color} 12%, var(--bg-raised))`,
      border: `1px solid color-mix(in oklab, ${color} 30%, var(--line))`,
      fontSize: 11,
      fontWeight: 600,
      color,
    }}>
      <span style={{
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: color,
        flexShrink: 0,
        ...(status === "running" ? { animation: "pulse 1.4s ease-in-out infinite" } : {}),
      }} />
      {statusLabel(status)}
    </span>
  );
}

// ── Log viewer ────────────────────────────────────────────────

function LogViewer({ runId, live }: { runId: string; live: boolean }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["run-log", runId],
    queryFn: () => heartbeatsApi.log(runId, 0, 256_000),
    refetchInterval: live ? 4_000 : false,
  });

  if (isLoading) return <LoadingState label="Loading log…" />;
  if (error) return <ErrorState error={error} hint="Log unavailable." />;
  if (!data?.content) {
    return (
      <div style={{ padding: 24, color: "var(--ink-faint)", fontSize: 12, textAlign: "center" }}>
        No log output yet.
      </div>
    );
  }

  return (
    <pre style={{
      margin: 0,
      padding: 16,
      fontSize: 11,
      lineHeight: 1.6,
      color: "var(--ink)",
      fontFamily: "var(--fw-font-mono, monospace)",
      whiteSpace: "pre-wrap",
      wordBreak: "break-all",
      overflowX: "auto",
    }}>
      {data.content}
    </pre>
  );
}

// ── Main component ────────────────────────────────────────────

export function FernwehRunDetail() {
  const { companyPrefix, agentId, runId } = useParams<{
    companyPrefix: string;
    agentId: string;
    runId: string;
  }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { selectedCompany, selectedCompanyId } = useCompany();
  const companyId = selectedCompanyId ?? selectedCompany?.id ?? "";

  // Run query — poll while live
  const { data: run, isLoading, error } = useQuery<HeartbeatRun>({
    queryKey: queryKeys.runDetail(runId ?? ""),
    queryFn: () => heartbeatsApi.get(runId!),
    enabled: !!runId,
    refetchInterval: (query) => {
      const s = (query.state.data as HeartbeatRun | undefined)?.status;
      return s && isLive(s) ? 3_000 : false;
    },
  });

  // Agent name (best-effort, for breadcrumb)
  const agentQuery = useQuery({
    queryKey: queryKeys.agents.detail(agentId ?? ""),
    queryFn: () => agentsApi.get(agentId!, companyId),
    enabled: !!agentId && !!companyId,
  });

  const cancelMut = useMutation({
    mutationFn: () => heartbeatsApi.cancel(runId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.runDetail(runId ?? "") });
    },
  });

  const prefix = companyPrefix ?? "";
  const agentName = agentQuery.data?.name ?? agentId ?? "Agent";

  const backHref = `/${prefix}/fernweh/agents/${agentId}/runs`;

  if (isLoading) return <LoadingState label="Loading run…" />;
  if (error || !run) return <ErrorState error={error ?? "Run not found"} hint="The run may have been deleted." />;

  const live = isLive(run.status);
  const tokens = (run.usageJson?.total_tokens as number | undefined) ?? null;
  const costCents = (run.usageJson?.cost_cents as number | undefined) ?? null;
  const durationStr = formatDuration(run.startedAt, run.finishedAt);

  const shortId = run.id.slice(0, 8);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0, height: "100%", gap: 0 }}>
      {/* ── Header ── */}
      <div style={{
        padding: "16px 28px",
        borderBottom: "1px solid var(--line)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexShrink: 0,
        flexWrap: "wrap",
      }}>
        {/* Back */}
        <button
          onClick={() => navigate(backHref)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--ink-dim)",
            fontSize: 12,
            padding: 0,
          }}
        >
          <Icon d={I.arrow} size={12} style={{ transform: "rotate(180deg)" }} />
          {agentName}
        </button>

        <span style={{ color: "var(--line)", fontSize: 14 }}>/</span>

        <span className="fw-mono" style={{ fontSize: 13, color: "var(--ink-dim)" }}>
          run:{shortId}
        </span>

        <RunStatusChip status={run.status} />

        {live && (
          <button
            disabled={cancelMut.isPending}
            onClick={() => cancelMut.mutate()}
            style={{
              marginLeft: "auto",
              padding: "5px 12px",
              borderRadius: 8,
              border: "1px solid var(--danger)",
              background: "color-mix(in oklab, var(--danger) 10%, var(--bg-raised))",
              color: "var(--danger)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {cancelMut.isPending ? "Cancelling…" : "Cancel run"}
          </button>
        )}
      </div>

      {/* ── Stat bar ── */}
      <div style={{
        padding: "14px 28px",
        borderBottom: "1px solid var(--line)",
        display: "flex",
        flexWrap: "wrap",
        gap: "20px 36px",
        background: "var(--bg-sunken)",
        flexShrink: 0,
      }}>
        <Stat label="Source" value={run.invocationSource?.replace(/_/g, " ") ?? "—"} />
        <Stat
          label="Started"
          value={run.startedAt ? formatRelative(run.startedAt) : "—"}
        />
        <Stat label="Duration" value={durationStr} />
        {tokens !== null && <Stat label="Tokens" value={tokens.toLocaleString()} />}
        {costCents !== null && costCents > 0 && (
          <Stat label="Cost" value={formatCents(costCents)} />
        )}
        {run.exitCode !== null && <Stat label="Exit code" value={run.exitCode} />}
        {run.triggerDetail && (
          <Stat label="Trigger" value={String(run.triggerDetail).replace(/_/g, " ")} />
        )}
      </div>

      {/* ── Error banner ── */}
      {run.error && (
        <div style={{
          margin: "12px 28px 0",
          padding: "10px 14px",
          borderRadius: 8,
          background: "color-mix(in oklab, var(--danger) 8%, var(--bg-raised))",
          border: "1px solid color-mix(in oklab, var(--danger) 25%, var(--line))",
          fontSize: 12,
          color: "var(--danger)",
          fontFamily: "var(--fw-font-mono, monospace)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          flexShrink: 0,
        }}>
          <strong>Error: </strong>{run.error}
        </div>
      )}

      {/* ── Log ── */}
      <div style={{
        flex: 1,
        minHeight: 0,
        overflow: "auto",
        background: "var(--bg-sunken)",
        margin: "12px 28px 28px",
        borderRadius: 10,
        border: "1px solid var(--line)",
      }}>
        {runId ? <LogViewer runId={runId} live={live} /> : null}
      </div>

      {/* ── Stderr excerpt (fallback when no full log) ── */}
      {!run.logRef && run.stderrExcerpt && (
        <div style={{
          margin: "0 28px 16px",
          padding: "10px 14px",
          borderRadius: 8,
          background: "var(--bg-sunken)",
          border: "1px solid var(--line)",
          fontSize: 11,
          color: "var(--ink-dim)",
          fontFamily: "var(--fw-font-mono, monospace)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          flexShrink: 0,
        }}>
          <div style={{ fontWeight: 600, marginBottom: 4, fontFamily: "inherit", color: "var(--ink-faint)" }}>stderr excerpt</div>
          {run.stderrExcerpt}
        </div>
      )}
    </div>
  );
}
