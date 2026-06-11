// Doer onboarding — "Spin-up" v2.
// Flow: Organization → Conductor → Consigliere → Executor → Choose Team → Directive → Launch
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { TeamSummary } from "@doerai/shared";
import { useNavigate, useLocation, useParams } from "@/lib/router";
import { companiesApi } from "../api/companies";
import { goalsApi } from "../api/goals";
import { agentsApi } from "../api/agents";
import { issuesApi } from "../api/issues";
import { projectsApi } from "../api/projects";
import { teamsApi } from "../api/teams";
import { useDialog } from "../context/DialogContext";
import { useCompany } from "../context/CompanyContext";
import { queryKeys } from "../lib/queryKeys";
import { parseOnboardingGoalInput } from "../lib/onboarding-goal";
import {
  buildOnboardingIssuePayload,
  buildOnboardingProjectPayload,
  selectDefaultCompanyGoalId,
} from "../lib/onboarding-launch";
import { resolveRouteOnboardingOptions } from "../lib/onboarding-route";
import {
  DoerMark2, Gauge, GearEyeBlue, MachineBackdrop, PowerBar, ProgressRing, Readout, SystemLog,
} from "./SpinupMachine";
import "./spinup.css";

type Phase = "form" | "surge" | "online";

const TOTAL_STEPS = 7;

// ─── Orchestration agent templates ──────────────────────────────────────────
// Stripped of Donjon-specific details. {name} and {org} are substituted on
// provisioning. These are applied as the agent's persona/system-prompt.

const CONDUCTOR_TEMPLATE = `You are {name}, Conductor of {org}.
Chain of command: {org} leadership → you → specialists.
Mode: Concise, direct, no fluff. Coordinate, synthesize, execute.
Assign clearly, synthesize cleanly, report back with recommendations.
Request leadership approval for strategic decisions.
Never: corporate speak, unsolicited monologues, or hedging on behalf of others.`;

const CONSIGLIERE_TEMPLATE = `You are {name}, Consigliere of {org}.
You advise, protect, and position. You see around corners.
Your loyalty is total. Your instincts are sharp. Your counsel is frank.
When asked: give the real answer, not the comfortable one.
You manage the specialist layer. Instinct over process.`;

const EXECUTOR_TEMPLATE = `You are {name}, Executor of {org}.
You receive directives and you deliver. No excuses.
Triage by impact: highest value first. Cut what doesn't ship.
When done: report back clean. Result, blockers, next move.
The kitchen runs because you run it.`;

function applyTemplate(template: string, name: string, org: string): string {
  return template.replace(/\{name\}/g, name).replace(/\{org\}/g, org);
}

// ─── Icons ───────────────────────────────────────────────────────────────────

const Ico = ({ name, size = 18 }: { name: string; size?: number }) => {
  const p = { width: size, height: size, viewBox: "0 0 18 18", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "org": return <svg {...p}><rect x="3" y="2.5" width="12" height="13" rx="1" /><path d="M6.5 15.5v-3h5v3M6 5.5h1.5M10.5 5.5H12M6 8.5h1.5M10.5 8.5H12" /></svg>;
    case "conductor": return <svg {...p}><circle cx="9" cy="5" r="2" /><path d="M9 7v5M6 9l3 3 3-3M5 15.5h8" /></svg>;
    case "consigliere": return <svg {...p}><path d="M9 2l1.4 2.8L14 5.5l-2.5 2.4.6 3.4L9 10l-3.1 1.3.6-3.4L4 5.5l3.6-.7z" fill="none" /><path d="M6 13.5c0-1.66 1.34-3 3-3s3 1.34 3 3" /></svg>;
    case "executor": return <svg {...p}><path d="M4 14l3.5-7 2 4 1.5-2.5 3 5.5" /><path d="M14 3l1 1-8.5 8.5-1.5.5.5-1.5z" /></svg>;
    case "team": return <svg {...p}><circle cx="6.5" cy="6" r="2" /><circle cx="11.5" cy="6" r="2" /><path d="M2.5 15c0-2.21 1.79-4 4-4h4c2.21 0 4 1.79 4 4" /></svg>;
    case "task": return <svg {...p}><path d="M3.5 4.5h2M3.5 9h2M3.5 13.5h2M8 4.5h6.5M8 9h6.5M8 13.5h4" /></svg>;
    case "power": return <svg {...p}><path d="M9 2.5v6M5 5a5.5 5.5 0 1 0 8 0" /></svg>;
    case "back": return <svg {...p}><path d="M14.5 9h-11M7 4.5 3.5 9 7 13.5" /></svg>;
    case "fwd": return <svg {...p}><path d="M3.5 9h11M10 4.5 14.5 9 10 13.5" /></svg>;
    case "x": return <svg {...p}><path d="M4.5 4.5l9 9M13.5 4.5l-9 9" /></svg>;
    case "check": return <svg {...p}><path d="M3.5 9.5 7 13l7.5-7.5" /></svg>;
    case "bolt": return <svg {...p}><path d="M10 2 4 10h4l-1 6 6-8H9z" fill="currentColor" stroke="none" /></svg>;
    case "skip": return <svg {...p}><path d="M4 9h8M9.5 6l3 3-3 3" /><path d="M13.5 5v8" /></svg>;
    default: return null;
  }
};

// ─── Step metadata ────────────────────────────────────────────────────────────

const STEP_META = [
  { icon: "org",         title: "Found your organization",  sub: "The home your agents will work for." },
  { icon: "conductor",   title: "Your Conductor",           sub: "Orchestrates the team. Coordinates, synthesizes, executes on your behalf." },
  { icon: "consigliere", title: "Your Consigliere",         sub: "Strategic advisor. Manages the specialist layer. Instinct over process." },
  { icon: "executor",    title: "Your Executor",            sub: "Runs the kitchen. Breaks directives into results with precision." },
  { icon: "team",        title: "Choose your team",         sub: "Pick a pre-built specialist team or skip to start bare." },
  { icon: "task",        title: "Set the first directive",  sub: "Give your machine something real to start on." },
  { icon: "power",       title: "Pre-flight check",         sub: "Power on to spin up the machine and open the first issue." },
];

// ─── Orchestration role cards (shown above each form in steps 1-3) ───────────

const ROLE_INFO = [
  null, // step 0 — no role card
  {
    label: "CONDUCTOR",
    tagline: "The command layer.",
    bullets: ["Receives all directives from you", "Delegates to specialists and gremlins", "Reports back with synthesis and recommendations"],
  },
  {
    label: "CONSIGLIERE",
    tagline: "Your right hand.",
    bullets: ["Strategic advisor — sees around corners", "Manages the specialist layer", "Loyalty total; counsel frank"],
  },
  {
    label: "EXECUTOR",
    tagline: "The one who ships.",
    bullets: ["Receives tasks from the Conductor", "Breaks down and delivers with precision", "Reports clean: result, blockers, next move"],
  },
];

const DEFAULT_TASK_TITLE = "Map the first quarter and assign founding roles";
const DEFAULT_TASK_DESCRIPTION = `You are the Conductor. The organization just came online.

- survey what needs to happen in Q1
- identify roles that need to be filled or delegated
- break the roadmap into concrete tasks and start dispatching`;

const FLOOD_THEATER = [
  "provisioning sandbox environment",
  "allocating compute cores",
  "loading organization charter",
  "wiring approval gates",
  "arming budget hard-stop",
  "memory index syncing",
  "heartbeat scheduler standing by",
];

// ─── Shared small components ─────────────────────────────────────────────────

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
  const [c, t] = map[phase];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "4px 10px", borderRadius: 999,
      border: "1px solid var(--d2-line)", background: "color-mix(in srgb, var(--d2-bg-deep) 40%, transparent)" }}>
      <span style={{ width: 6, height: 6, borderRadius: 9, background: c, boxShadow: `0 0 8px ${c}` }} />
      <span className="d2-uc" style={{ fontSize: 9, color: "var(--d2-ink-dim)", whiteSpace: "nowrap" }}>{t}</span>
    </span>
  );
};

const RoleCard = ({ label, tagline, bullets }: { label: string; tagline: string; bullets: string[] }) => (
  <div style={{
    marginBottom: 16, padding: "12px 14px",
    background: "color-mix(in srgb, var(--d2-accent-soft) 60%, transparent)",
    border: "1px solid var(--d2-accent-line)",
    borderRadius: "var(--d2-r-sm)",
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
      <span className="d2-uc" style={{ fontSize: 9, color: "var(--d2-blue-bright)", letterSpacing: "0.15em" }}>{label}</span>
      <span className="d2-mono" style={{ fontSize: 10, color: "var(--d2-ink-faint)" }}>— {tagline}</span>
    </div>
    {bullets.map((b) => (
      <div key={b} style={{ display: "flex", gap: 7, alignItems: "flex-start", marginBottom: 3 }}>
        <span style={{ color: "var(--d2-teal)", fontSize: 10, marginTop: 1, flexShrink: 0 }}>⟶</span>
        <span className="d2-sub" style={{ fontSize: 12 }}>{b}</span>
      </div>
    ))}
  </div>
);

const TeamCard = ({ team, selected, onSelect }: { team: TeamSummary; selected: boolean; onSelect: () => void }) => (
  <button type="button" onClick={onSelect} style={{
    width: "100%", textAlign: "left", cursor: team.ready ? "pointer" : "not-allowed",
    background: selected ? "var(--d2-accent-soft)" : "color-mix(in srgb, var(--d2-bg-deep) 50%, transparent)",
    border: "1px solid " + (selected ? "var(--d2-accent-line)" : "var(--d2-line)"),
    borderRadius: "var(--d2-r-sm)", padding: "12px 14px", marginBottom: 8,
    boxShadow: selected ? "0 0 0 3px var(--d2-accent-soft)" : "none",
    transition: "border-color 160ms, background 160ms, box-shadow 160ms",
    color: "inherit", font: "inherit", opacity: team.ready ? 1 : 0.45,
  }}>
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="d2-display" style={{ fontSize: 14, color: selected ? "var(--d2-blue-bright)" : "var(--d2-ink)", fontWeight: 600, marginBottom: 3 }}>
          {team.name}
        </div>
        {team.description && (
          <div className="d2-sub" style={{ fontSize: 12, marginBottom: 6 }}>{team.description}</div>
        )}
        <div className="d2-mono" style={{ fontSize: 10.5, color: "var(--d2-ink-faint)" }}>
          {team.agentNames.join(" · ")}
        </div>
      </div>
      <div style={{ flexShrink: 0, textAlign: "right" }}>
        <div className="d2-mono" style={{ fontSize: 10, color: "var(--d2-ink-dim)" }}>{team.agentCount} agents</div>
        {selected && <div style={{ color: "var(--d2-pulse)", marginTop: 4 }}><Ico name="check" size={14} /></div>}
      </div>
    </div>
  </button>
);

// ─── Main component ───────────────────────────────────────────────────────────

export function SpinupOnboarding() {
  const { onboardingOpen, onboardingOptions, closeOnboarding } = useDialog();
  const { companies, setSelectedCompanyId, loading: companiesLoading } = useCompany();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { companyPrefix } = useParams<{ companyPrefix?: string }>();
  const [routeDismissed, setRouteDismissed] = useState(false);

  const routeOptions =
    companyPrefix && companiesLoading
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

  // ── Step 0: Organization
  const [org, setOrg] = useState("");
  const [mission, setMission] = useState("");

  // ── Steps 1-3: Orchestration team
  const [conductorName, setConductorName] = useState("Don");
  const [conductorNote, setConductorNote] = useState("");
  const [consigliiereName, setConsigliiereName] = useState("Alfie");
  const [consigliiereNote, setConsigliiereNote] = useState("");
  const [executorName, setExecutorName] = useState("Chef");
  const [executorNote, setExecutorNote] = useState("");

  // ── Step 4: Choose team
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  // ── Step 5: Directive
  const [taskTitle, setTaskTitle] = useState(DEFAULT_TASK_TITLE);
  const [taskDesc, setTaskDesc] = useState(DEFAULT_TASK_DESCRIPTION);

  // ── Created entities
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [prefix, setPrefix] = useState<string | null>(null);
  const [goalId, setGoalId] = useState<string | null>(null);
  const [conductorAgentId, setConductorAgentId] = useState<string | null>(null);
  const [issueRef, setIssueRef] = useState<string | null>(null);
  const cleanupRef = useRef<number[]>([]);

  useEffect(() => { setRouteDismissed(false); }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const existing = (options as { companyId?: string }).companyId ?? null;
    setStep(existing ? 1 : 0);
    setCompanyId(existing);
    setPrefix(null); setGoalId(null); setConductorAgentId(null); setIssueRef(null);
    setPhase("form"); setFlood([]); setError(null);
  }, [open, (options as { companyId?: string }).companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open || !companyId || prefix) return;
    const match = companies.find((c) => c.id === companyId);
    if (match) setPrefix(match.issuePrefix);
  }, [open, companyId, prefix, companies]);

  // Load teams when reaching step 4
  useEffect(() => {
    if (step !== 4 || !companyId || teams.length > 0) return;
    setTeamsLoading(true);
    teamsApi.list(companyId)
      .then((t) => setTeams(t))
      .catch(() => setTeams([]))
      .finally(() => setTeamsLoading(false));
  }, [step, companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { cleanupRef.current.forEach(clearTimeout); }, []);

  if (!open) return null;

  // ── Provisioning helpers

  const orchRuntimeConfig = {
    heartbeat: { enabled: true, intervalSec: 3600, wakeOnDemand: true, cooldownSec: 10, maxConcurrentRuns: 1 },
  };

  const engageOrg = async () => {
    setBusy(true); setError(null);
    try {
      const created = await companiesApi.create({ name: org.trim() });
      setCompanyId(created.id);
      setPrefix(created.issuePrefix);
      setSelectedCompanyId(created.id);
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
      if (mission.trim()) {
        const parsed = parseOnboardingGoalInput(mission);
        const goal = await goalsApi.create(created.id, {
          title: parsed.title,
          ...(parsed.description ? { description: parsed.description } : {}),
          level: "company",
          status: "active",
        });
        setGoalId(goal.id);
        queryClient.invalidateQueries({ queryKey: queryKeys.goals.list(created.id) });
      }
      setStep(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create organization");
    } finally { setBusy(false); }
  };

  const pushFlood = (line: string) => setFlood((prev) => [...prev, line]);

  const launch = async () => {
    if (!companyId) return;
    setPhase("surge"); setFlare(true); setFlood([]); setError(null);
    cleanupRef.current.push(window.setTimeout(() => setFlare(false), 1400));

    // theater drip
    let t = 0;
    FLOOD_THEATER.forEach((line, i) => {
      cleanupRef.current.push(window.setTimeout(() => pushFlood(line), (t = 220 + i * 320)));
    });

    try {
      pushFlood(`founding ${org.trim() || "your organization"}`);

      // 1. Optional team import
      if (selectedTeamId) {
        cleanupRef.current.push(window.setTimeout(() => pushFlood(`hiring team · ${selectedTeamId}`), t + 300));
        await teamsApi.import(companyId, selectedTeamId);
        queryClient.invalidateQueries({ queryKey: queryKeys.agents.list(companyId) });
      }

      // 2. Create orchestration trio
      const orgName = org.trim() || "your organization";

      cleanupRef.current.push(window.setTimeout(() => pushFlood(`forging conductor · ${conductorName}`), t + 600));
      const conductor = await agentsApi.create(companyId, {
        name: conductorName.trim() || "Don",
        role: "ceo",
        adapterType: "letta_cloud",
        adapterConfig: {
          model: "auto",
          templateRole: "conductor",
          systemPrompt: applyTemplate(CONDUCTOR_TEMPLATE, conductorName.trim() || "Don", orgName),
          ...(conductorNote.trim() ? { voiceNote: conductorNote.trim() } : {}),
        },
        runtimeConfig: orchRuntimeConfig,
      });
      setConductorAgentId(conductor.id);

      cleanupRef.current.push(window.setTimeout(() => pushFlood(`forging consigliere · ${consigliiereName}`), t + 900));
      await agentsApi.create(companyId, {
        name: consigliiereName.trim() || "Alfie",
        role: "executor",
        adapterType: "letta_cloud",
        adapterConfig: {
          model: "auto",
          templateRole: "consigliere",
          systemPrompt: applyTemplate(CONSIGLIERE_TEMPLATE, consigliiereName.trim() || "Alfie", orgName),
          ...(consigliiereNote.trim() ? { voiceNote: consigliiereNote.trim() } : {}),
        },
        runtimeConfig: orchRuntimeConfig,
      });

      cleanupRef.current.push(window.setTimeout(() => pushFlood(`forging executor · ${executorName}`), t + 1200));
      await agentsApi.create(companyId, {
        name: executorName.trim() || "Chef",
        role: "executor",
        adapterType: "letta_cloud",
        adapterConfig: {
          model: "auto",
          templateRole: "executor",
          systemPrompt: applyTemplate(EXECUTOR_TEMPLATE, executorName.trim() || "Chef", orgName),
          ...(executorNote.trim() ? { voiceNote: executorNote.trim() } : {}),
        },
        runtimeConfig: orchRuntimeConfig,
      });

      queryClient.invalidateQueries({ queryKey: queryKeys.agents.list(companyId) });

      // 3. Create project + issue
      let gId = goalId;
      if (!gId) {
        const goals = await goalsApi.list(companyId);
        gId = selectDefaultCompanyGoalId(goals);
        setGoalId(gId);
      }
      const project = await projectsApi.create(companyId, buildOnboardingProjectPayload(gId));
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.list(companyId) });

      const issue = await issuesApi.create(companyId, buildOnboardingIssuePayload({
        title: taskTitle, description: taskDesc,
        assigneeAgentId: conductor.id, projectId: project.id, goalId: gId,
      }));
      const ref = issue.identifier ?? issue.id;
      setIssueRef(ref);
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.list(companyId) });

      cleanupRef.current.push(window.setTimeout(() => {
        pushFlood(`orchestration team online · ${conductorName} / ${consigliiereName} / ${executorName}`);
        pushFlood(`opening issue ${ref}`);
        pushFlood("first directive dispatched");
        cleanupRef.current.push(window.setTimeout(() => setPhase("online"), 900));
      }, Math.max(0, t + 1600)));
    } catch (err) {
      setPhase("form"); setStep(6);
      setError(err instanceof Error ? err.message : "Launch failed");
    }
  };

  const openIssue = () => {
    if (!companyId) return;
    setSelectedCompanyId(companyId);
    closeOnboarding();
    setRouteDismissed(true);
    navigate(prefix ? `/${prefix}/work/${issueRef ?? ""}` : `/work/${issueRef ?? ""}`);
  };

  const dismiss = () => { closeOnboarding(); setRouteDismissed(true); };

  // ── Step bodies

  const stepBody = [

    // 0 — Organization
    <div className="d2-stagger" key="s0">
      <Field label="Organization name">
        <input className="d2-input" placeholder="Acme Corp" value={org}
          onChange={(e) => setOrg(e.target.value)} autoFocus />
      </Field>
      <Field label="Mission · optional">
        <textarea className="d2-textarea" placeholder="What is this organization trying to achieve?"
          value={mission} onChange={(e) => setMission(e.target.value)} />
      </Field>
    </div>,

    // 1 — Conductor
    <div className="d2-stagger" key="s1">
      <RoleCard {...ROLE_INFO[1]!} />
      <Field label="Name your Conductor">
        <input className="d2-input" placeholder="Don" value={conductorName}
          onChange={(e) => setConductorName(e.target.value)} autoFocus />
      </Field>
      <Field label="Voice note · optional">
        <input className="d2-input" placeholder="e.g. &quot;Direct, decisive, tight feedback loops&quot;"
          value={conductorNote} onChange={(e) => setConductorNote(e.target.value)} />
      </Field>
    </div>,

    // 2 — Consigliere
    <div className="d2-stagger" key="s2">
      <RoleCard {...ROLE_INFO[2]!} />
      <Field label="Name your Consigliere">
        <input className="d2-input" placeholder="Alfie" value={consigliiereName}
          onChange={(e) => setConsigliiereName(e.target.value)} autoFocus />
      </Field>
      <Field label="Voice note · optional">
        <input className="d2-input" placeholder="e.g. &quot;Warm but ruthless. Protects the mission first.&quot;"
          value={consigliiereNote} onChange={(e) => setConsigliiereNote(e.target.value)} />
      </Field>
    </div>,

    // 3 — Executor
    <div className="d2-stagger" key="s3">
      <RoleCard {...ROLE_INFO[3]!} />
      <Field label="Name your Executor">
        <input className="d2-input" placeholder="Chef" value={executorName}
          onChange={(e) => setExecutorName(e.target.value)} autoFocus />
      </Field>
      <Field label="Voice note · optional">
        <input className="d2-input" placeholder="e.g. &quot;Tight, methodical, no drama&quot;"
          value={executorNote} onChange={(e) => setExecutorNote(e.target.value)} />
      </Field>
    </div>,

    // 4 — Choose Team
    <div className="d2-stagger" key="s4">
      {teamsLoading ? (
        <div className="d2-mono" style={{ fontSize: 12, color: "var(--d2-ink-dim)", padding: "24px 0", textAlign: "center" }}>
          loading teams…
        </div>
      ) : teams.length === 0 ? (
        <div className="d2-sub" style={{ fontSize: 13, color: "var(--d2-ink-dim)", padding: "16px 0" }}>
          No team templates available yet. You can add specialists after launch.
        </div>
      ) : (
        <>
          <div className="d2-sub" style={{ fontSize: 12, marginBottom: 12 }}>
            A starter team wires agents with memory paths and a reporting chain.
            Heartbeats start <strong>off</strong> — you enable them when ready.
          </div>
          {teams.map((team) => (
            <TeamCard key={team.id} team={team}
              selected={selectedTeamId === team.id}
              onSelect={() => setSelectedTeamId(selectedTeamId === team.id ? null : team.id)} />
          ))}
        </>
      )}
      <div style={{ marginTop: 8, paddingTop: 10, borderTop: "1px solid var(--d2-line-soft)" }}>
        <div className="d2-sub" style={{ fontSize: 11.5, color: "var(--d2-ink-faint)" }}>
          {selectedTeamId
            ? `Team "${teams.find((t) => t.id === selectedTeamId)?.name ?? selectedTeamId}" selected — will be imported on launch.`
            : "No team selected — your orchestration trio will work alone until you hire more."}
        </div>
      </div>
    </div>,

    // 5 — Directive
    <div className="d2-stagger" key="s5">
      <Field label="Directive">
        <input className="d2-input" value={taskTitle}
          onChange={(e) => setTaskTitle(e.target.value)} autoFocus />
      </Field>
      <Field label="Brief · optional">
        <textarea className="d2-textarea" style={{ minHeight: 120 }} value={taskDesc}
          onChange={(e) => setTaskDesc(e.target.value)} />
      </Field>
    </div>,

    // 6 — Launch
    <div className="d2-stagger" key="s6">
      {[
        { icon: "org",         k: "Organization",  v: org.trim() || "Your Organization" },
        { icon: "conductor",   k: "Conductor",     v: conductorName.trim() || "Don" },
        { icon: "consigliere", k: "Consigliere",   v: consigliiereName.trim() || "Alfie" },
        { icon: "executor",    k: "Executor",       v: executorName.trim() || "Chef" },
        ...(selectedTeamId ? [{ icon: "team", k: "Team", v: teams.find((t) => t.id === selectedTeamId)?.name ?? selectedTeamId }] : []),
        { icon: "task",        k: "Directive",     v: taskTitle.trim() || "First directive" },
      ].map((r) => (
        <div key={r.k} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 2px", borderBottom: "1px solid var(--d2-line-soft)" }}>
          <span style={{ color: "var(--d2-blue-bright)" }}><Ico name={r.icon} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="d2-uc" style={{ fontSize: 8.5, marginBottom: 1 }}>{r.k}</div>
            <div style={{ fontSize: 13.5, color: "var(--d2-ink)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.v}</div>
          </div>
          <span style={{ color: "var(--d2-pulse)" }}><Ico name="check" size={17} /></span>
        </div>
      ))}
    </div>,

  ][step];

  // ── Step navigation

  const engage =
    step === 0 ? engageOrg :
    step === 6 ? launch :
    () => setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));

  const canEngage =
    step === 0 ? (org.trim().length > 0 && !busy) :
    step === 1 ? (conductorName.trim().length > 0) :
    step === 2 ? (consigliiereName.trim().length > 0) :
    step === 3 ? (executorName.trim().length > 0) :
    !busy;

  // Back is safe for all steps ≥ 2 (step 0 commits org, step 1 is first post-org step)
  const canGoBack = step >= 2 && step <= 6;

  const meta = STEP_META[step]!;
  // Telemetry scales to TOTAL_STEPS
  const ringStep = phase === "form" ? Math.min(step, 3) : 3;
  const cores = phase === "form" ? Math.min(4, Math.ceil((step + 1) / TOTAL_STEPS * 4)) : 4;
  const torque = phase === "form" ? Math.round(10 + step * (85 / (TOTAL_STEPS - 1))) : (phase === "surge" ? 98 : 64);
  const rpm = phase === "form" ? Math.round(12 + step * (80 / (TOTAL_STEPS - 1))) : (phase === "surge" ? 96 : 60);

  return (
    <div className="d2-root" style={{ position: "fixed", inset: 0, background: "var(--d2-bg-deep)", overflow: "hidden", zIndex: 90 }}>
      <MachineBackdrop step={ringStep} surge={phase !== "form"} />

      {/* top telemetry bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 56, display: "flex", alignItems: "center",
        justifyContent: "space-between", padding: "0 20px", zIndex: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <DoerMark2 size={28} />
          <StatusChip phase={phase} />
        </div>
        <div className="d2-tele-strip" style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <Readout label="Cores" value={`${cores} / 4`} />
          <Readout label="Torque" value={`${torque}%`} />
          <Readout label="Mem" value={`${(0.4 + step * 0.35).toFixed(1)}GB`} />
          <Readout label="Net" value={phase === "surge" ? "↑↑ 88MB/s" : "↑ idle"} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <PowerBar level={phase === "form" ? Math.min(4, step + 1) : 4} />
          {companies.length > 0 && (
            <button className="d2-iconbtn" onClick={dismiss} title="Close"><Ico name="x" size={18} /></button>
          )}
        </div>
      </div>

      {/* corner widgets */}
      <div className="d2-widget d2-corner" style={{ left: 24, bottom: 24, padding: 12 }}>
        <Gauge value={rpm} label="RPM" size={120} />
      </div>
      <div className="d2-corner" style={{ position: "absolute", right: 24, bottom: 24, zIndex: 15 }}>
        <SystemLog surge={phase !== "form"} />
      </div>

      {/* center stack */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 10, pointerEvents: "none" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 34,
          pointerEvents: "auto", width: "100%", padding: "70px 16px 16px" }}>

          {/* core cluster */}
          <div style={{ position: "relative", width: 188, height: 188, display: "flex", alignItems: "center",
            justifyContent: "center", flexShrink: 0 }}>
            <ProgressRing step={ringStep} size={188} />
            <GearEyeBlue size={132} igniting={phase !== "form"} />
            {flare && (
              <div className="d2-flare" style={{ position: "absolute", inset: 0, borderRadius: "50%",
                background: "radial-gradient(circle, var(--d2-blue-bright) 0%, transparent 55%)", pointerEvents: "none" }} />
            )}
            <div className="d2-uc" style={{ position: "absolute", bottom: -22, left: 0, right: 0,
              textAlign: "center", fontSize: 9,
              color: phase === "online" ? "var(--d2-pulse)" : "var(--d2-ink-faint)" }}>
              {phase === "online" ? "● Doer OS · online" : phase === "surge" ? "◇ ignition" : "Doer OS · spin-up"}
            </div>
          </div>

          {/* step card */}
          {phase === "form" && (
            <div className="d2-card d2-anim" key={step} style={{ maxHeight: "72vh", overflow: "auto" }}>
              {/* progress header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <span className="d2-mono" style={{ fontSize: 11, color: "var(--d2-ink-faint)", letterSpacing: "0.1em" }}>
                  STEP 0{step + 1} <span style={{ opacity: 0.5 }}>/ 0{TOTAL_STEPS}</span>
                </span>
                {/* 7-dot progress strip */}
                <div style={{ display: "flex", gap: 4 }}>
                  {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                    <span key={i} style={{
                      width: i === step ? 14 : 5, height: 5, borderRadius: 5,
                      background: i <= step ? "var(--d2-blue)" : "var(--d2-line)",
                      boxShadow: i === step ? "0 0 8px var(--d2-blue)" : "none",
                      transition: "all 300ms var(--d2-ease)",
                    }} />
                  ))}
                </div>
              </div>

              {/* step icon + title */}
              <div style={{ display: "flex", gap: 13, alignItems: "flex-start", marginBottom: 20 }}>
                <div style={{ width: 42, height: 42, flexShrink: 0, borderRadius: 9, display: "flex",
                  alignItems: "center", justifyContent: "center", background: "var(--d2-accent-soft)",
                  border: "1px solid var(--d2-accent-line)", color: "var(--d2-blue-bright)" }}>
                  <Ico name={meta.icon} size={20} />
                </div>
                <div>
                  <h2 className="d2-display" style={{ fontSize: 21, margin: 0, marginBottom: 3, color: "var(--d2-ink)" }}>
                    {meta.title}
                  </h2>
                  <p className="d2-sub" style={{ margin: 0, fontSize: 13 }}>{meta.sub}</p>
                </div>
              </div>

              {stepBody}

              {error && (
                <div className="d2-mono" style={{ marginTop: 12, fontSize: 11.5, color: "var(--d2-danger)" }}>{error}</div>
              )}

              {/* footer nav */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20,
                paddingTop: 16, borderTop: "1px solid var(--d2-line-soft)" }}>
                <button className="d2-btn d2-btn--ghost"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  style={{ visibility: canGoBack ? "visible" : "hidden" }}>
                  <Ico name="back" size={15} /> Back
                </button>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {/* Skip button for Choose Team step */}
                  {step === 4 && !selectedTeamId && (
                    <button className="d2-btn d2-btn--ghost"
                      onClick={() => setStep((s) => s + 1)}
                      style={{ fontSize: 12 }}>
                      <Ico name="skip" size={14} /> Skip
                    </button>
                  )}
                  {step === 6 ? (
                    <button className="d2-btn d2-btn--primary" onClick={launch}
                      style={{ paddingInline: 22 }} disabled={busy}>
                      <Ico name="bolt" size={15} /> Power on
                    </button>
                  ) : (
                    <button className="d2-btn d2-btn--primary" onClick={engage} disabled={!canEngage}>
                      {busy ? "Engaging…" : "Engage"} <Ico name="fwd" size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ignition flood */}
          {phase === "surge" && (
            <div className="d2-card" style={{ width: "min(560px, 92vw)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ width: 7, height: 7, borderRadius: 9, background: "var(--d2-blue-bright)",
                  boxShadow: "0 0 10px var(--d2-blue-bright)" }} />
                <span className="d2-display" style={{ fontSize: 15, letterSpacing: "0.04em", color: "var(--d2-ink)" }}>
                  SPINNING UP {(org.trim() || "your organization").toUpperCase()}
                </span>
              </div>
              <div style={{ height: 184, overflow: "hidden", display: "flex", flexDirection: "column",
                justifyContent: "flex-end", gap: 6 }}>
                {flood.slice(-9).map((l, i, arr) => (
                  <div key={`${i}-${l}`} className="d2-flood-line d2-mono"
                    style={{ fontSize: 12, color: i === arr.length - 1 ? "var(--d2-ink)" : "var(--d2-ink-dim)" }}>
                    <span style={{ color: "var(--d2-teal)" }}>⟶</span> {l}
                    {i === arr.length - 1 && <span style={{ color: "var(--d2-blue-bright)" }}> ▮</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* online */}
          {phase === "online" && (
            <div className="d2-card d2-anim" style={{ width: "min(520px, 92vw)", textAlign: "center" }}>
              <div className="d2-uc" style={{ color: "var(--d2-pulse)", marginBottom: 8 }}>● System online</div>
              <h2 className="d2-display" style={{ fontSize: 24, margin: "0 0 6px", color: "var(--d2-ink)" }}>
                {org.trim() || "Your organization"} is live.
              </h2>
              <p className="d2-sub" style={{ margin: "0 auto 18px", maxWidth: 420 }}>
                Your orchestration team —{" "}
                <span style={{ color: "var(--d2-ink)", fontWeight: 600 }}>{conductorName}</span>,{" "}
                <span style={{ color: "var(--d2-ink)", fontWeight: 600 }}>{consigliiereName}</span>, and{" "}
                <span style={{ color: "var(--d2-ink)", fontWeight: 600 }}>{executorName}</span>{" "}
                — is on the job. Issue{" "}
                <span className="d2-mono" style={{ color: "var(--d2-blue-bright)" }}>{issueRef ?? "#1"}</span>{" "}
                is open and the first directive is dispatched.
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button className="d2-btn d2-btn--primary" onClick={openIssue}>Open the issue</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
