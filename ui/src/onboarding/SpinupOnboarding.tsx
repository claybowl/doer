// Doer onboarding — a minimal company + local Letta agent spin-up.
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation, useParams } from "@/lib/router";
import { companiesApi } from "../api/companies";
import { agentsApi } from "../api/agents";
import { useDialog } from "../context/DialogContext";
import { useCompany } from "../context/CompanyContext";
import { queryKeys } from "../lib/queryKeys";
import {
  buildLocalLettaAgentPayload,
  buildOnboardingCompanyPayload,
  getOnboardingCompanyRoute,
  isValidOnboardingName,
} from "../lib/simplified-onboarding";
import { resolveRouteOnboardingOptions } from "../lib/onboarding-route";
import {
  DoerMark2,
  Gauge,
  GearEyeBlue,
  MachineBackdrop,
  PowerBar,
  ProgressRing,
  Readout,
  SystemLog,
} from "./SpinupMachine";
import "./spinup.css";

type Phase = "form" | "surge" | "online";

const TOTAL_STEPS = 2;
const FLOOD_THEATER = [
  "provisioning local Letta runtime",
  "allocating company workspace",
  "wiring persistent memory",
  "arming local tool access",
  "loading Letta Agent SDK",
  "heartbeat scheduler standing by",
];

const Ico = ({ name, size = 18 }: { name: string; size?: number }) => {
  const p = {
    width: size,
    height: size,
    viewBox: "0 0 18 18",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "org":
      return <svg {...p}><rect x="3" y="2.5" width="12" height="13" rx="1" /><path d="M6.5 15.5v-3h5v3M6 5.5h1.5M10.5 5.5H12M6 8.5h1.5M10.5 8.5H12" /></svg>;
    case "agent":
      return <svg {...p}><circle cx="9" cy="7" r="3" /><path d="M4 15c.5-2.5 2.2-3.8 5-3.8s4.5 1.3 5 3.8M9 2v2M3 7h2M13 7h2" /></svg>;
    case "power":
      return <svg {...p}><path d="M9 2.5v6M5 5a5.5 5.5 0 1 0 8 0" /></svg>;
    case "back":
      return <svg {...p}><path d="M14.5 9h-11M7 4.5 3.5 9 7 13.5" /></svg>;
    case "fwd":
      return <svg {...p}><path d="M3.5 9h11M10 4.5 14.5 9 10 13.5" /></svg>;
    case "x":
      return <svg {...p}><path d="M4.5 4.5l9 9M13.5 4.5l-9 9" /></svg>;
    case "check":
      return <svg {...p}><path d="M3.5 9.5 7 13l7.5-7.5" /></svg>;
    case "bolt":
      return <svg {...p}><path d="M10 2 4 10h4l-1 6 6-8H9z" fill="currentColor" stroke="none" /></svg>;
    default:
      return null;
  }
};

const STEP_META = [
  { icon: "org", title: "Name your company", sub: "The home your Letta agent will work for." },
  { icon: "agent", title: "Hire your Letta agent", sub: "A local-first agent with persistent Doer-managed memory." },
];

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: 14 }}>
    <label className="d2-label" style={{ display: "block", marginBottom: 6 }}>{label}</label>
    {children}
  </div>
);

const StatusChip = ({ phase }: { phase: Phase }) => {
  const map: Record<Phase, [string, string]> = {
    form: ["var(--d2-warn)", "Spin-up"],
    surge: ["var(--d2-blue-bright)", "Ignition"],
    online: ["var(--d2-pulse)", "Online"],
  };
  const [color, label] = map[phase];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "4px 10px", borderRadius: 999, border: "1px solid var(--d2-line)", background: "color-mix(in srgb, var(--d2-bg-deep) 40%, transparent)" }}>
      <span style={{ width: 6, height: 6, borderRadius: 9, background: color, boxShadow: `0 0 8px ${color}` }} />
      <span className="d2-uc" style={{ fontSize: 9, color: "var(--d2-ink-dim)", whiteSpace: "nowrap" }}>{label}</span>
    </span>
  );
};

export function SpinupOnboarding() {
  const { onboardingOpen, onboardingOptions, closeOnboarding } = useDialog();
  const { companies, setSelectedCompanyId, loading: companiesLoading } = useCompany();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { companyPrefix } = useParams<{ companyPrefix?: string }>();
  const [routeDismissed, setRouteDismissed] = useState(false);
  const routeOptions = companyPrefix && companiesLoading
    ? null
    : resolveRouteOnboardingOptions({ pathname: location.pathname, companyPrefix, companies });
  const open = onboardingOpen || (routeOptions !== null && !routeDismissed);
  const options = onboardingOpen ? onboardingOptions : routeOptions ?? {};

  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<Phase>("form");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flood, setFlood] = useState<string[]>([]);
  const [flare, setFlare] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [agentName, setAgentName] = useState("Letta");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [prefix, setPrefix] = useState<string | null>(null);
  const cleanupRef = useRef<number[]>([]);
  const requestedCompanyId = (options as { companyId?: string }).companyId ?? null;

  useEffect(() => { setRouteDismissed(false); }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const existingCompany = companies.find((company) => company.id === requestedCompanyId);
    const startStep = requestedCompanyId ? 1 : 0;
    setStep(startStep);
    setCompanyId(requestedCompanyId);
    setPrefix(existingCompany?.issuePrefix ?? null);
    setCompanyName(existingCompany?.name ?? "");
    setAgentName("Letta");
    setPhase("form");
    setFlood([]);
    setError(null);
  }, [open, requestedCompanyId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { cleanupRef.current.forEach(clearTimeout); }, []);

  if (!open) return null;

  const pushFlood = (line: string) => setFlood((previous) => [...previous, line]);

  const engageCompany = async () => {
    if (!isValidOnboardingName(companyName)) return;
    setBusy(true);
    setError(null);
    try {
      const created = await companiesApi.create(buildOnboardingCompanyPayload(companyName));
      setCompanyId(created.id);
      setPrefix(created.issuePrefix);
      setCompanyName(created.name);
      setSelectedCompanyId(created.id);
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
      setStep(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create company");
    } finally {
      setBusy(false);
    }
  };

  const launch = async () => {
    if (!companyId || !isValidOnboardingName(agentName)) return;
    setBusy(true);
    setPhase("surge");
    setFlare(true);
    setFlood([]);
    setError(null);
    cleanupRef.current.push(window.setTimeout(() => setFlare(false), 1400));
    FLOOD_THEATER.forEach((line, index) => {
      cleanupRef.current.push(window.setTimeout(() => pushFlood(line), 220 + index * 320));
    });

    try {
      pushFlood(`founding ${companyName.trim() || "your company"}`);
      await agentsApi.create(companyId, buildLocalLettaAgentPayload(agentName));
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.list(companyId) });
      cleanupRef.current.push(window.setTimeout(() => {
        pushFlood(`Letta agent online · ${agentName.trim()}`);
        pushFlood("persistent memory mounted inside Doer");
        cleanupRef.current.push(window.setTimeout(() => setPhase("online"), 900));
      }, 2200));
    } catch (err) {
      setPhase("form");
      setStep(1);
      setError(err instanceof Error ? err.message : "Failed to hire Letta agent");
    } finally {
      setBusy(false);
    }
  };

  const openCompany = () => {
    if (!companyId || !prefix) return;
    setSelectedCompanyId(companyId);
    closeOnboarding();
    setRouteDismissed(true);
    navigate(getOnboardingCompanyRoute(prefix));
  };

  const dismiss = () => {
    closeOnboarding();
    setRouteDismissed(true);
  };

  const canContinue = step === 0
    ? isValidOnboardingName(companyName) && !busy
    : isValidOnboardingName(agentName) && !busy;
  const meta = STEP_META[step]!;
  const ringStep = phase === "form" ? step : 1;
  const cores = phase === "form" ? step + 1 : 2;
  const torque = phase === "form" ? 18 + step * 50 : phase === "surge" ? 98 : 64;
  const rpm = phase === "form" ? 18 + step * 48 : phase === "surge" ? 96 : 60;

  return (
    <div className="d2-root" style={{ position: "fixed", inset: 0, background: "var(--d2-bg-deep)", overflow: "hidden", zIndex: 90 }}>
      <MachineBackdrop step={ringStep} surge={phase !== "form"} />

      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", zIndex: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}><DoerMark2 size={28} /><StatusChip phase={phase} /></div>
        <div className="d2-tele-strip" style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <Readout label="Cores" value={`${cores} / 2`} />
          <Readout label="Torque" value={`${torque}%`} />
          <Readout label="Mem" value={phase === "online" ? "persistent" : "standby"} />
          <Readout label="Net" value={phase === "surge" ? "↑↑ active" : "↑ idle"} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <PowerBar level={phase === "form" ? step + 1 : 2} segments={2} />
          {companies.length > 0 && <button className="d2-iconbtn" onClick={dismiss} title="Close"><Ico name="x" size={18} /></button>}
        </div>
      </div>

      <div className="d2-widget d2-corner" style={{ left: 24, bottom: 24, padding: 12 }}><Gauge value={rpm} label="RPM" size={120} /></div>
      <div className="d2-corner" style={{ position: "absolute", right: 24, bottom: 24, zIndex: 15 }}><SystemLog surge={phase !== "form"} /></div>

      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, pointerEvents: "none" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 34, pointerEvents: "auto", width: "100%", padding: "70px 16px 16px" }}>
          <div style={{ position: "relative", width: 188, height: 188, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ProgressRing step={ringStep} size={188} />
            <GearEyeBlue size={132} igniting={phase !== "form"} />
            {flare && <div className="d2-flare" style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "radial-gradient(circle, var(--d2-blue-bright) 0%, transparent 55%)", pointerEvents: "none" }} />}
            <div className="d2-uc" style={{ position: "absolute", bottom: -22, left: 0, right: 0, textAlign: "center", fontSize: 9, color: phase === "online" ? "var(--d2-pulse)" : "var(--d2-ink-faint)" }}>
              {phase === "online" ? "● Doer OS · online" : phase === "surge" ? "◇ ignition" : "Doer OS · spin-up"}
            </div>
          </div>

          {phase === "form" && (
            <div className="d2-card d2-anim" key={step} style={{ maxHeight: "72vh", overflow: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <span className="d2-mono" style={{ fontSize: 11, color: "var(--d2-ink-faint)", letterSpacing: "0.1em" }}>STEP 0{step + 1} <span style={{ opacity: 0.5 }}>/ 0{TOTAL_STEPS}</span></span>
                <div style={{ display: "flex", gap: 4 }}>{Array.from({ length: TOTAL_STEPS }, (_, index) => <span key={index} style={{ width: index === step ? 14 : 5, height: 5, borderRadius: 5, background: index <= step ? "var(--d2-blue)" : "var(--d2-line)", boxShadow: index === step ? "0 0 8px var(--d2-blue)" : "none", transition: "all 300ms var(--d2-ease)" }} />)}</div>
              </div>
              <div style={{ display: "flex", gap: 13, alignItems: "flex-start", marginBottom: 20 }}>
                <div style={{ width: 42, height: 42, flexShrink: 0, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--d2-accent-soft)", border: "1px solid var(--d2-accent-line)", color: "var(--d2-blue-bright)" }}><Ico name={meta.icon} size={20} /></div>
                <div><h2 className="d2-display" style={{ fontSize: 21, margin: 0, marginBottom: 3, color: "var(--d2-ink)" }}>{meta.title}</h2><p className="d2-sub" style={{ margin: 0, fontSize: 13 }}>{meta.sub}</p></div>
              </div>

              {step === 0 ? (
                <div className="d2-stagger">
                  <Field label="Company name"><input className="d2-input" placeholder="Acme Corp" value={companyName} onChange={(event) => setCompanyName(event.target.value)} autoFocus /></Field>
                </div>
              ) : (
                <div className="d2-stagger">
                  <div style={{ marginBottom: 16, padding: "12px 14px", background: "color-mix(in srgb, var(--d2-accent-soft) 60%, transparent)", border: "1px solid var(--d2-accent-line)", borderRadius: "var(--d2-r-sm)" }}>
                    <div className="d2-uc" style={{ fontSize: 9, color: "var(--d2-blue-bright)", letterSpacing: "0.15em", marginBottom: 7 }}>LOCAL LETTA RUNTIME</div>
                    <div className="d2-sub" style={{ fontSize: 12 }}>Shell and filesystem tools stay on this Doer machine. Memory is persisted in the company’s Doer-managed MemFS.</div>
                  </div>
                  <Field label="Agent name"><input className="d2-input" placeholder="Letta" value={agentName} onChange={(event) => setAgentName(event.target.value)} autoFocus /></Field>
                </div>
              )}

              {error && <div className="d2-mono" style={{ marginTop: 12, fontSize: 11.5, color: "var(--d2-danger)" }}>{error}</div>}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--d2-line-soft)" }}>
                <button className="d2-btn d2-btn--ghost" onClick={() => setStep((value) => Math.max(0, value - 1))} style={{ visibility: step > 0 ? "visible" : "hidden" }}><Ico name="back" size={15} /> Back</button>
                <button className="d2-btn d2-btn--primary" onClick={step === 0 ? engageCompany : launch} disabled={!canContinue} style={{ paddingInline: 22 }}>
                  {busy ? "Working…" : step === 0 ? "Continue" : <><Ico name="bolt" size={15} /> Power on</>} {step === 0 && <Ico name="fwd" size={15} />}
                </button>
              </div>
            </div>
          )}

          {phase === "surge" && (
            <div className="d2-card" style={{ width: "min(560px, 92vw)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><span style={{ width: 7, height: 7, borderRadius: 9, background: "var(--d2-blue-bright)", boxShadow: "0 0 10px var(--d2-blue-bright)" }} /><span className="d2-display" style={{ fontSize: 15, letterSpacing: "0.04em", color: "var(--d2-ink)" }}>SPINNING UP {(companyName.trim() || "YOUR COMPANY").toUpperCase()}</span></div>
              <div style={{ height: 184, overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 6 }}>{flood.slice(-9).map((line, index, array) => <div key={`${index}-${line}`} className="d2-flood-line d2-mono" style={{ fontSize: 12, color: index === array.length - 1 ? "var(--d2-ink)" : "var(--d2-ink-dim)" }}><span style={{ color: "var(--d2-teal)" }}>⟶</span> {line}{index === array.length - 1 && <span style={{ color: "var(--d2-blue-bright)" }}> ▮</span>}</div>)}</div>
            </div>
          )}

          {phase === "online" && (
            <div className="d2-card d2-anim" style={{ width: "min(520px, 92vw)", textAlign: "center" }}>
              <div className="d2-uc" style={{ color: "var(--d2-pulse)", marginBottom: 8 }}>● System online</div>
              <h2 className="d2-display" style={{ fontSize: 24, margin: "0 0 6px", color: "var(--d2-ink)" }}>{companyName || "Your company"} is live.</h2>
              <p className="d2-sub" style={{ margin: "0 auto 18px", maxWidth: 420 }}>Your Letta agent <span style={{ color: "var(--d2-ink)", fontWeight: 600 }}>{agentName}</span> is ready with persistent memory inside Doer.</p>
              <button className="d2-btn d2-btn--primary" onClick={openCompany}>Open company</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
