import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "@/lib/router";
import { useCompany } from "@/context/CompanyContext";
import { dashboardApi } from "@/api/dashboard";
import { agentsApi } from "@/api/agents";
import { issuesApi } from "@/api/issues";
import { activityApi } from "@/api/activity";
import { heartbeatsApi } from "@/api/heartbeats";
import { queryKeys } from "@/lib/queryKeys";
import { EmptyState, Icon, I } from "../utils";
import "./animations.css";
import { computeLayout, useMissionControlState } from "./engine";
import { PulseView, STAGE_W, STAGE_H } from "./Pulse";
import { FeedRail, StreamView, type MCSelect } from "./Stream";
import { WallboardView } from "./Wallboard";
import { MCDrawer, type MCSelection } from "./Drawer";

type Mode = "pulse" | "stream" | "wall";
const MODES: { id: Mode; label: string; icon: string }[] = [
  { id: "pulse", label: "Pulse", icon: I.activity },
  { id: "stream", label: "Stream", icon: I.issues },
  { id: "wall", label: "Wallboard", icon: I.stack },
];

const IMMERSIVE_KEY = "doer.mc.immersive";
const MOTION_KEY = "doer.mc.motion";

function loadBool(key: string, fallback: boolean): boolean {
  try { const v = localStorage.getItem(key); if (v === "1") return true; if (v === "0") return false; } catch { /* noop */ }
  return fallback;
}

function Seg({ value, onChange }: { value: Mode; onChange: (m: Mode) => void }) {
  return (
    <div style={{ display: "flex", gap: 2, padding: 3, background: "var(--bg-sunken)", border: "1px solid var(--line)", borderRadius: 10 }}>
      {MODES.map((o) => {
        const active = value === o.id;
        return (
          <button key={o.id} onClick={() => onChange(o.id)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 7, cursor: "pointer",
              border: "none", fontSize: 12, fontWeight: 500, fontFamily: "var(--fw-font-sans)",
              background: active ? "var(--bg-raised)" : "transparent", color: active ? "var(--ink)" : "var(--ink-dim)",
              boxShadow: active ? "0 1px 2px rgba(0,0,0,0.08)" : "none" }}>
            <Icon d={o.icon} size={13} />{o.label}
          </button>
        );
      })}
    </div>
  );
}

function Tick({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
      <span className="fw-display" style={{ fontSize: 16, fontWeight: 600, fontVariantNumeric: "tabular-nums", color: color ?? "var(--ink)" }}>{value}</span>
      <span className="fw-mono fw-uc" style={{ fontSize: 8, color: "var(--ink-faint)" }}>{label}</span>
    </div>
  );
}

function IconBtn({ title, onClick, active, children }: { title: string; onClick: () => void; active?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={title}
      style={{ width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: 8, cursor: "pointer",
        border: "1px solid var(--line)", background: active ? "var(--accent-soft)" : "var(--bg)", color: active ? "var(--accent)" : "var(--ink-dim)" }}>
      {children}
    </button>
  );
}

export function FernwehMissionControl() {
  const { companyPrefix } = useParams<{ companyPrefix: string }>();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id;
  const companyName = selectedCompany?.name ?? "Company";
  const prefix = companyPrefix ?? selectedCompany?.issuePrefix ?? "";

  const [mode, setMode] = React.useState<Mode>("wall");
  const [paused, setPaused] = React.useState(false);
  const [immersive, setImmersive] = React.useState(() => loadBool(IMMERSIVE_KEY, true));
  const [calm, setCalm] = React.useState(() => loadBool(MOTION_KEY, false));
  const [sel, setSel] = React.useState<MCSelection | null>(null);

  React.useEffect(() => { try { localStorage.setItem(IMMERSIVE_KEY, immersive ? "1" : "0"); } catch { /* noop */ } }, [immersive]);
  React.useEffect(() => { try { localStorage.setItem(MOTION_KEY, calm ? "1" : "0"); } catch { /* noop */ } }, [calm]);

  const agentsQuery = useQuery({
    queryKey: companyId ? queryKeys.agents.list(companyId) : ["agents", "none"],
    queryFn: () => agentsApi.list(companyId!),
    enabled: !!companyId,
    refetchInterval: 30_000,
  });
  const issuesQuery = useQuery({
    queryKey: companyId ? queryKeys.issues.list(companyId) : ["issues", "none"],
    queryFn: () => issuesApi.list(companyId!),
    enabled: !!companyId,
    refetchInterval: 30_000,
  });
  const activityQuery = useQuery({
    queryKey: companyId ? queryKeys.activity(companyId) : ["activity", "none"],
    queryFn: () => activityApi.list(companyId!),
    enabled: !!companyId,
    refetchInterval: 60_000,
  });
  const liveRunsQuery = useQuery({
    queryKey: companyId ? ["heartbeats", "live-runs", companyId] : ["heartbeats", "live-runs", "none"],
    queryFn: () => heartbeatsApi.liveRunsForCompany(companyId!),
    enabled: !!companyId,
    refetchInterval: 5_000,
  });

  const agents = React.useMemo(() => agentsQuery.data ?? [], [agentsQuery.data]);
  const issues = React.useMemo(() => issuesQuery.data ?? [], [issuesQuery.data]);
  const activity = React.useMemo(() => activityQuery.data ?? [], [activityQuery.data]);
  const liveRunAgentIds = React.useMemo(
    () => (liveRunsQuery.data ?? []).map((r) => r.agentId),
    [liveRunsQuery.data],
  );

  const state = useMissionControlState({ companyName, agents, issues, activity, liveRunAgentIds, paused });

  // layout depends only on the agent topology, not on transient live fields
  const layoutKey = Object.keys(state.agents).sort().join("|");
  const layout = React.useMemo(
    () => computeLayout(Object.values(state.agents), STAGE_W, STAGE_H),
    [layoutKey], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const onSelect = React.useCallback<MCSelect>((id, kind) => setSel({ id, kind }), []);
  const running = Object.values(state.agents).filter((a) => a.status === "running" && !a.synthetic).length;
  const realAgentCount = Object.values(state.agents).filter((a) => !a.synthetic).length;
  const motion: "calm" | "live" = calm ? "calm" : "live";
  const showRail = mode === "pulse";

  const outer: React.CSSProperties = immersive
    ? { position: "fixed", inset: 0, zIndex: 30, display: "flex", flexDirection: "column", background: "var(--bg)", color: "var(--ink)" }
    : { position: "relative", height: "100%", display: "flex", flexDirection: "column", background: "var(--bg)", color: "var(--ink)" };

  return (
    <div style={outer}>
      {/* Header */}
      <header style={{ flexShrink: 0, height: 58, display: "flex", alignItems: "center", gap: 16, padding: "0 18px", borderBottom: "1px solid var(--line)", background: "var(--bg-raised)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/brands/doer-logo.jpg" width={32} height={32} alt="Doer" style={{ borderRadius: 8, objectFit: "cover", display: "block" }} />
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
            <span className="fw-display" style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em" }}>Mission Control</span>
            <span className="fw-mono fw-uc" style={{ fontSize: 8.5, color: "var(--ink-faint)" }}>{companyName} · {prefix}</span>
          </div>
        </div>

        <div style={{ marginLeft: 8 }}><Seg value={mode} onChange={setMode} /></div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Tick label="Working" value={running} color="var(--pulse)" />
            <Tick label="Tools" value={state.totals.tools} />
            <Tick label="Handoffs" value={state.totals.handoffs} color="var(--warn)" />
            <Tick label="Comments" value={state.totals.comments} color="var(--accent)" />
            <Tick label="Shipped" value={state.totals.outputs} color="var(--pulse)" />
          </div>
          <div style={{ width: 1, height: 28, background: "var(--line)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <IconBtn title={calm ? "Motion: calm" : "Motion: live"} active={!calm} onClick={() => setCalm((c) => !c)}>
              <Icon d={I.activity} size={14} />
            </IconBtn>
            <IconBtn title={paused ? "Resume live feed" : "Pause live feed"} onClick={() => setPaused((p) => !p)}>
              {paused
                ? <svg width="12" height="12" viewBox="0 0 12 12"><path d="M3 2l7 4-7 4z" fill="currentColor" /></svg>
                : <svg width="12" height="12" viewBox="0 0 12 12"><rect x="3" y="2" width="2.4" height="8" fill="currentColor" /><rect x="6.6" y="2" width="2.4" height="8" fill="currentColor" /></svg>}
            </IconBtn>
            <IconBtn title={immersive ? "Show navigation" : "Full screen"} active={immersive} onClick={() => setImmersive((v) => !v)}>
              {immersive
                ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3H5a2 2 0 00-2 2v4M15 3h4a2 2 0 012 2v4M9 21H5a2 2 0 01-2-2v-4M15 21h4a2 2 0 002-2v-4" /></svg>
                : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>}
            </IconBtn>
          </div>
        </div>
      </header>

      {/* Body */}
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: showRail ? "1fr 340px" : "1fr" }}>
        <div style={{ position: "relative", minWidth: 0, overflow: "hidden" }}>
          {realAgentCount === 0 ? (
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", padding: 24 }}>
              <EmptyState
                icon={I.agents}
                title="No agents yet"
                subtitle="Hire your first agent and Mission Control will light up as they start working."
              />
            </div>
          ) : mode === "pulse" ? (
            <PulseView state={state} layout={layout} selected={sel?.kind === "agent" ? sel.id : null} onSelect={onSelect} motion={motion} />
          ) : mode === "stream" ? (
            <StreamView state={state} onSelect={onSelect} />
          ) : (
            <WallboardView state={state} companyId={companyId!} />
          )}
        </div>
        {showRail && realAgentCount > 0 && <FeedRail state={state} onSelect={onSelect} />}
      </div>

      <MCDrawer sel={sel} state={state} onClose={() => setSel(null)} onSelect={onSelect} />
    </div>
  );
}
