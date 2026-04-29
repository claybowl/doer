import { useState } from "react";
import {
  usePluginData,
  usePluginAction,
  useHostContext,
  type PluginPageProps,
} from "@doerai/plugin-sdk/ui";
import { DATA_KEYS, ACTION_KEYS, ALL_DESKS } from "../constants.js";
import type { DeskDefinition } from "../constants.js";
import type { BenchmarkRun, DeskResult, RunStatus } from "../types.js";

// ── Design tokens (Fernweh-compatible) ──────────────────────────────────────
const AMBER = { base: "#f59e0b", soft: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.25)" };
const EMERALD = "#10b981";
const EMERALD_SOFT = "rgba(16,185,129,0.10)";

// ── Components ───────────────────────────────────────────────────────────────

function DwBar({ dw }: { dw: number }) {
  const pct = Math.min((dw / 10) * 100, 100);
  const color = dw >= 0.8 ? EMERALD : dw >= 0.5 ? AMBER.base : "#ef4444";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#9ca3af" }}>
        <span>Dw score</span>
        <span style={{ fontWeight: 600, color: "#f3f4f6" }}>{dw.toFixed(2)} / 10</span>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: "#1f2937", overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 999, background: color, width: `${pct}%`, transition: "width .4s ease" }} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string }> = {
    scored:   { color: EMERALD,    label: "Scored" },
    complete: { color: "#60a5fa",  label: "Complete" },
    running:  { color: AMBER.base, label: "Running" },
    failed:   { color: "#ef4444",  label: "Failed" },
    pending:  { color: "#6b7280",  label: "Pending" },
  };
  const s = map[status] ?? map["pending"]!;
  return (
    <span style={{ fontSize: 11, fontWeight: 500, color: s.color, padding: "2px 8px", borderRadius: 999, border: `1px solid ${s.color}33`, background: `${s.color}11` }}>
      {s.label}
    </span>
  );
}

function RunStatusBadge({ status }: { status: RunStatus }) {
  const map: Record<RunStatus, { color: string; label: string }> = {
    completed: { color: EMERALD,    label: "Completed" },
    running:   { color: AMBER.base, label: "Running" },
    pending:   { color: "#6b7280",  label: "Pending" },
    failed:    { color: "#ef4444",  label: "Failed" },
  };
  const s = map[status];
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: s.color, padding: "3px 10px", borderRadius: 999, background: `${s.color}18`, border: `1px solid ${s.color}33` }}>
      {s.label}
    </span>
  );
}

const DEPT_ICON: Record<string, string> = {
  ENG: "⚙️", PROD: "🗺️", DES: "🎨", SALES: "💼", MKT: "📣",
  CS: "🎧", FIN: "💰", HR: "👥", LEGOPS: "⚖️", EXEC: "🏛️",
};

function DeskCard({ desk, def }: { desk: DeskResult; def: DeskDefinition | undefined }) {
  return (
    <div style={{ padding: "14px 16px", borderRadius: 10, border: `1px solid ${desk.status === "scored" ? "rgba(16,185,129,0.2)" : "#374151"}`, background: desk.status === "scored" ? EMERALD_SOFT : "#111827", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>{DEPT_ICON[def?.dept ?? ""] ?? "📋"}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#f3f4f6" }}>{def?.name ?? desk.deskId}</div>
            <div style={{ fontSize: 10, color: "#6b7280" }}>{desk.deskId} · L{def?.level}</div>
          </div>
        </div>
        <StatusBadge status={desk.status} />
      </div>
      <div style={{ fontSize: 11.5, color: "#9ca3af" }}>{def?.title ?? "—"}</div>
      {desk.dw !== null ? <DwBar dw={desk.dw} /> : <div style={{ height: 6, borderRadius: 999, background: "#1f2937" }} />}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {desk.dw !== null ? (
          <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: EMERALD }}>{desk.dw.toFixed(2)} Dw</span>
        ) : (
          <span style={{ fontSize: 11, color: "#6b7280" }}>
            {desk.issueId ? `Issue ${desk.issueId.slice(0, 8)}…` : "Not dispatched"}
          </span>
        )}
        {desk.issueId && (
          <span style={{ fontSize: 10, color: "#4b5563", fontFamily: "monospace" }}>
            #{desk.issueId.slice(0, 8)}
          </span>
        )}
      </div>
      {desk.notes && desk.status !== "scored" && (
        <div style={{ fontSize: 11, color: "#9ca3af", fontStyle: "italic" }}>{desk.notes}</div>
      )}
    </div>
  );
}

function RunCard({ run, onSelect }: { run: BenchmarkRun; onSelect: () => void }) {
  const completed = run.desks.filter((d) => d.status === "scored" || d.status === "complete").length;
  return (
    <button onClick={onSelect} style={{ width: "100%", padding: "14px 16px", borderRadius: 10, border: "1px solid #374151", background: "#0f172a", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", textAlign: "left", transition: "border-color .15s" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#f3f4f6", fontFamily: "monospace" }}>{run.id.slice(-8)}</span>
          <RunStatusBadge status={run.status} />
        </div>
        <div style={{ fontSize: 11, color: "#6b7280" }}>
          Agent: {run.agentName} · {completed}/{run.selectedDesks.length} desks · {new Date(run.startedAt).toLocaleString()}
        </div>
      </div>
      {run.totalDw !== null && (
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: AMBER.base, fontFamily: "monospace" }}>{run.totalDw.toFixed(2)}</div>
          <div style={{ fontSize: 10, color: "#6b7280" }}>Dw</div>
        </div>
      )}
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function SchruteBenchmarkPage({ context }: PluginPageProps) {
  const hostCtx = useHostContext();
  const companyId = hostCtx.companyId ?? context.companyId;

  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState("");
  const [agentName, setAgentName] = useState("");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const startRun = usePluginAction(ACTION_KEYS.startRun);
  const pollRun = usePluginAction(ACTION_KEYS.pollRun);
  const judgeDesk = usePluginAction(ACTION_KEYS.judgeDesk);

  const {
    data: runs,
    loading: runsLoading,
    refresh: refreshRuns,
  } = usePluginData<BenchmarkRun[]>(DATA_KEYS.runs, { companyId });

  const {
    data: selectedRun,
    refresh: refreshRun,
  } = usePluginData<BenchmarkRun | null>(DATA_KEYS.run, { runId: selectedRunId });

  const activeRun = selectedRunId ? selectedRun : null;

  async function handleStartRun() {
    if (!agentId.trim()) return;
    setStarting(true);
    setStartError(null);
    try {
      const result = await startRun({
        companyId: companyId ?? "",
        agentId: agentId.trim(),
        agentName: agentName.trim() || agentId.trim(),
      });
      const run = result as BenchmarkRun;
      setSelectedRunId(run.id);
      refreshRuns();
    } catch (err) {
      setStartError(err instanceof Error ? err.message : String(err));
    } finally {
      setStarting(false);
    }
  }

  async function handlePoll() {
    if (!activeRun) return;
    await pollRun({ runId: activeRun.id, companyId: activeRun.companyId });
    refreshRun();
    refreshRuns();
  }

  async function handleJudge(deskId: string) {
    if (!activeRun) return;
    await judgeDesk({ runId: activeRun.id, companyId: activeRun.companyId, deskId });
    refreshRun();
    refreshRuns();
  }

  const completedInRun = activeRun?.desks.filter((d) => d.status === "complete").length ?? 0;
  const scoredInRun = activeRun?.desks.filter((d) => d.status === "scored").length ?? 0;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px 80px", display: "flex", flexDirection: "column", gap: 24, color: "#e5e7eb", fontFamily: "system-ui, sans-serif" }}>

      {/* Hero */}
      <div style={{ position: "relative", overflow: "hidden", borderRadius: 12, border: AMBER.border, background: `radial-gradient(ellipse at top right, ${AMBER.soft}, transparent 60%), #0f172a`, padding: "24px 28px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg, ${AMBER.base}, #ea580c)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>💼</div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#f9fafb" }}>Schrute Benchmark</div>
                <div style={{ fontSize: 12, color: "#9ca3af" }}>Dwight-10 — AI Agent Office Simulation</div>
              </div>
            </div>
            <p style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.6, maxWidth: 500 }}>
              Dispatch your agent team across <strong style={{ color: "#f3f4f6" }}>10 human office worker desks</strong>.
              Score in <strong style={{ color: AMBER.base }}>Dw units</strong> — 1.0 Dw = 1 human workday output.
            </p>
          </div>
          {activeRun?.totalDw != null && (
            <div style={{ flexShrink: 0, borderRadius: 10, border: AMBER.border, background: AMBER.soft, padding: "14px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: AMBER.base, fontFamily: "monospace" }}>{activeRun.totalDw.toFixed(1)}</div>
              <div style={{ fontSize: 10, color: "#9ca3af" }}>Dw total</div>
            </div>
          )}
        </div>
      </div>

      {/* New run form */}
      <div style={{ borderRadius: 10, border: "1px solid #374151", background: "#0f172a", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#f3f4f6" }}>Start New Run</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const }}>
          <input
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            placeholder="Agent ID (UUID)"
            style={{ flex: 1, minWidth: 200, padding: "8px 12px", borderRadius: 7, border: "1px solid #374151", background: "#1f2937", color: "#f3f4f6", fontSize: 12, fontFamily: "monospace" }}
          />
          <input
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            placeholder="Agent name (display)"
            style={{ flex: 1, minWidth: 150, padding: "8px 12px", borderRadius: 7, border: "1px solid #374151", background: "#1f2937", color: "#f3f4f6", fontSize: 12 }}
          />
          <button
            onClick={handleStartRun}
            disabled={starting || !agentId.trim()}
            style={{ padding: "8px 20px", borderRadius: 7, border: `1px solid ${AMBER.base}`, background: AMBER.base, color: "#000", fontSize: 12, fontWeight: 600, cursor: starting || !agentId.trim() ? "not-allowed" : "pointer", opacity: starting || !agentId.trim() ? 0.6 : 1 }}
          >
            {starting ? "Starting…" : "Run All 10 Desks"}
          </button>
        </div>
        {startError && <div style={{ fontSize: 11, color: "#ef4444" }}>{startError}</div>}
      </div>

      {/* Run list + detail */}
      <div style={{ display: "grid", gridTemplateColumns: activeRun ? "320px 1fr" : "1fr", gap: 16 }}>

        {/* Run list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 2 }}>
            Run History {runsLoading ? "…" : `· ${runs?.length ?? 0}`}
          </div>
          {(runs ?? []).length === 0 && !runsLoading && (
            <div style={{ fontSize: 12, color: "#6b7280", padding: "20px 0" }}>No runs yet. Start one above.</div>
          )}
          {(runs ?? []).map((run) => (
            <RunCard
              key={run.id}
              run={run}
              onSelect={() => setSelectedRunId(run.id === selectedRunId ? null : run.id)}
            />
          ))}
        </div>

        {/* Active run detail */}
        {activeRun && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Run header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const }}>
              <RunStatusBadge status={activeRun.status} />
              <span style={{ fontSize: 12, color: "#6b7280" }}>{activeRun.agentName}</span>
              <span style={{ fontSize: 12, color: "#4b5563" }}>·</span>
              <span style={{ fontSize: 12, color: "#6b7280" }}>{scoredInRun} scored, {completedInRun} awaiting scoring</span>
              <span style={{ flex: 1 }} />
              {activeRun.status === "running" && (
                <button onClick={handlePoll} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #374151", background: "transparent", color: "#9ca3af", fontSize: 11, cursor: "pointer" }}>
                  Poll status
                </button>
              )}
              {completedInRun > 0 && (
                <button
                  onClick={() => {
                    const d = activeRun.desks.find((d) => d.status === "complete");
                    if (d) void handleJudge(d.deskId);
                  }}
                  style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${AMBER.border}`, background: AMBER.soft, color: AMBER.base, fontSize: 11, cursor: "pointer" }}
                >
                  Score next desk
                </button>
              )}
            </div>

            {/* Desk grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
              {activeRun.desks.map((desk) => {
                const def = ALL_DESKS.find((d: DeskDefinition) => d.id === desk.deskId);
                return <DeskCard key={desk.deskId} desk={desk} def={def} />;
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
