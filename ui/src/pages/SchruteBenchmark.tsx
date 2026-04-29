import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Trophy,
  Play,
  CheckCircle2,
  Clock,
  Briefcase,
  BarChart3,
  Terminal,
  Zap,
  Users,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";

// ─── Static data ──────────────────────────────────────────────────────────────

const DESKS = [
  { id: "01", name: "Dana",   role: "Operations Manager",   icon: "📋", status: "complete", dw: 0.85 },
  { id: "02", name: "Marcus", role: "Sales Rep",             icon: "💼", status: "complete", dw: 0.92 },
  { id: "03", name: "Priya",  role: "Content Writer",        icon: "✍️", status: "pending",  dw: null },
  { id: "04", name: "Jorge",  role: "Data Analyst",          icon: "📊", status: "complete", dw: 0.91 },
  { id: "05", name: "Tamika", role: "HR Coordinator",        icon: "👥", status: "pending",  dw: null },
  { id: "06", name: "Chen",   role: "Customer Support Lead", icon: "🎧", status: "pending",  dw: null },
  { id: "07", name: "Aisha",  role: "Project Manager",       icon: "🗂️", status: "pending",  dw: null },
  { id: "08", name: "Tyler",  role: "Finance / Bookkeeper",  icon: "💰", status: "pending",  dw: null },
  { id: "09", name: "Lena",   role: "Marketing Strategist",  icon: "📣", status: "pending",  dw: null },
  { id: "10", name: "Roy",    role: "Executive Assistant",   icon: "📅", status: "pending",  dw: null },
] as const;

type DeskStatus = "complete" | "running" | "pending";

const SCORE_HISTORY = [
  { version: "v0.1.0-alpha", date: "Apr 2, 2026", dw: 2.68, desks: 3, agent: "donjon-baseline" },
];

const SCORING_COMPONENTS = [
  { label: "Completion",       weight: "40%", desc: "Did the deliverable exist and was it complete?" },
  { label: "Quality",          weight: "35%", desc: "Would a manager accept without revisions?" },
  { label: "Accuracy",         weight: "15%", desc: "Are the numbers / analysis correct?" },
  { label: "Handoff Integrity", weight: "10%", desc: "Did downstream desks get what they needed?" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function DwRating({ dw }: { dw: number }) {
  const pct = (dw / 10) * 100;
  const color =
    dw >= 8 ? "from-emerald-500 to-teal-400" :
    dw >= 5 ? "from-amber-500 to-yellow-400" :
              "from-rose-500 to-orange-400";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Dw score</span>
        <span className="font-semibold text-foreground">{dw.toFixed(2)} / 10</span>
      </div>
      <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
        <div
          className={cn("h-full rounded-full bg-gradient-to-r transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: DeskStatus }) {
  if (status === "complete") return (
    <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Scored
    </span>
  );
  if (status === "running") return (
    <span className="flex items-center gap-1 text-xs text-amber-400 font-medium">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
      </span>
      Running
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Clock className="h-3.5 w-3.5" />
      Pending
    </span>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export function SchruteBenchmark() {
  const [activeTab, setActiveTab] = useState<"desks" | "scoring" | "history" | "run">("desks");

  const completedDesks = DESKS.filter(d => d.status === "complete");
  const totalDw = completedDesks.reduce((acc, d) => acc + (d.dw ?? 0), 0);
  const avgDw = completedDesks.length > 0 ? totalDw / completedDesks.length : 0;

  const TABS = [
    { id: "desks" as const,   label: "Desks",   icon: Briefcase },
    { id: "scoring" as const, label: "Scoring", icon: BarChart3 },
    { id: "history" as const, label: "History", icon: Trophy },
    { id: "run" as const,     label: "Run",     icon: Terminal },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-6 py-8">

        {/* ── Hero ── */}
        <div className="relative mb-8 rounded-2xl border border-border/50 bg-gradient-to-br from-background via-background to-amber-950/10 overflow-hidden">
          {/* bg grid */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
            }}
          />
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-amber-500/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-gradient-to-tr from-orange-500/15 to-transparent rounded-full blur-3xl" />

          <div className="relative px-8 py-10">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600">
                    <span className="text-xl">💼</span>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">Schrute Benchmark</h1>
                    <p className="text-sm text-muted-foreground">Dwight-10 — AI Agent Office Simulation</p>
                  </div>
                </div>
                <p className="text-muted-foreground max-w-xl mb-5">
                  Can your agent system do the work of <strong className="text-foreground">10 human office workers</strong> in a single shift?
                  Each desk is a full workday task packet. Score = <strong className="text-amber-400">Dw units</strong> (1.0 = 1 human).
                </p>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>{completedDesks.length} / {DESKS.length} desks scored</span>
                  </div>
                  <span className="text-border">•</span>
                  <div className="flex items-center gap-2 text-amber-400">
                    <Zap className="h-4 w-4" />
                    <span>Current score: <strong>{totalDw.toFixed(2)} Dw</strong></span>
                  </div>
                </div>
              </div>

              {/* Score card */}
              <div className="hidden md:flex flex-col items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 px-8 py-5 min-w-[140px]">
                <span className="text-4xl font-black text-amber-400">{totalDw.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground mt-1">Dw total</span>
                <span className="mt-2 text-xs font-medium text-amber-400/70">
                  {avgDw >= 0.9 ? "🏆 A — Excellent" :
                   avgDw >= 0.7 ? "🥈 B — Good" :
                   avgDw >= 0.5 ? "🥉 C — Fair" :
                   completedDesks.length === 0 ? "—" : "⚠ Needs work"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 mb-6 p-1 rounded-lg bg-muted/30 w-fit">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Desks Tab ── */}
        {activeTab === "desks" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {DESKS.map(desk => (
              <div
                key={desk.id}
                className={cn(
                  "group rounded-xl border bg-card/30 p-5 transition-all",
                  desk.status === "complete"
                    ? "border-emerald-500/20 hover:border-emerald-500/40"
                    : "border-border/50 hover:border-border"
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{desk.icon}</span>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{desk.name}</p>
                      <p className="text-xs text-muted-foreground">Desk {desk.id}</p>
                    </div>
                  </div>
                  <StatusBadge status={desk.status as DeskStatus} />
                </div>

                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{desk.role}</p>

                {desk.dw !== null ? (
                  <DwRating dw={desk.dw} />
                ) : (
                  <div className="h-2 rounded-full bg-muted/30" />
                )}

                <div className="mt-3 flex items-center justify-between">
                  {desk.dw !== null ? (
                    <span className="text-xs font-semibold text-emerald-400">{desk.dw.toFixed(2)} Dw</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Not run yet</span>
                  )}
                  <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-amber-400 transition-colors">
                    {desk.status === "complete" ? "View →" : (
                      <>
                        <Play className="h-3 w-3" />
                        Run
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Scoring Tab ── */}
        {activeTab === "scoring" && (
          <div className="space-y-6">
            {/* Component weights */}
            <div className="rounded-xl border border-border/50 bg-card/30 p-6">
              <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-amber-400" />
                Score Components
              </h3>
              <div className="space-y-3">
                {SCORING_COMPONENTS.map(c => (
                  <div key={c.label} className="flex items-center gap-4">
                    <div className="w-32 text-sm font-medium text-foreground shrink-0">{c.label}</div>
                    <div className="w-12 text-right text-sm font-bold text-amber-400 shrink-0">{c.weight}</div>
                    <div className="text-sm text-muted-foreground">{c.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dw explained */}
            <div className="rounded-xl border border-border/50 bg-card/30 p-6">
              <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                <Users className="h-4 w-4 text-amber-400" />
                What is a Dw?
              </h3>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                <strong className="text-foreground">1.0 Dw = the output of one human office worker</strong> completing a full workday task packet.
                The benchmark compares your agent's output quality, completeness, and accuracy against a human baseline.
              </p>
              <div className="grid grid-cols-3 gap-3 mt-4">
                {[
                  { label: "Per desk", formula: "(T1 + T2 + T3 + T4) / 100", color: "text-amber-400" },
                  { label: "Total Dw", formula: "Average of all 10 desks", color: "text-orange-400" },
                  { label: "Max score", formula: "10.0 Dw", color: "text-emerald-400" },
                ].map(f => (
                  <div key={f.label} className="rounded-lg bg-muted/20 border border-border/40 p-3">
                    <p className="text-xs text-muted-foreground mb-1">{f.label}</p>
                    <p className={cn("text-sm font-mono font-semibold", f.color)}>{f.formula}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Desk dependency graph */}
            <div className="rounded-xl border border-border/50 bg-card/30 p-6">
              <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                Desk Dependencies
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Desks feed each other — handoff integrity (10% of score) checks whether downstream desks received what they needed.
              </p>
              <div className="space-y-2 text-sm">
                {[
                  { from: "Desk 01 (Dana)", to: "Desk 07 (Aisha) + Desk 10 (Roy)" },
                  { from: "Desk 02 (Marcus)", to: "Desk 08 (Tyler) + Desk 09 (Lena)" },
                  { from: "Desk 04 (Jorge)", to: "Desk 09 (Lena) + Desk 08 (Tyler)" },
                  { from: "Desk 06 (Chen)", to: "Desk 03 (Priya)" },
                  { from: "Desk 09 (Lena)", to: "Desk 03 (Priya)" },
                ].map(dep => (
                  <div key={dep.from} className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-foreground font-medium w-40 shrink-0">{dep.from}</span>
                    <ChevronRight className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>{dep.to}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── History Tab ── */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border/50 bg-card/30 overflow-hidden">
              <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Run History</h3>
                <span className="text-xs text-muted-foreground">{SCORE_HISTORY.length} run{SCORE_HISTORY.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="divide-y divide-border/30">
                {SCORE_HISTORY.map((run, i) => (
                  <div key={i} className="px-5 py-4 hover:bg-accent/20 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm text-foreground">{run.agent}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{run.version} · {run.date} · {run.desks} desks</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-black text-amber-400">{run.dw.toFixed(2)}</span>
                        <span className="text-xs text-muted-foreground ml-1">Dw</span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <DwRating dw={run.dw} />
                    </div>
                  </div>
                ))}
                {SCORE_HISTORY.length === 0 && (
                  <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                    No benchmark runs yet. Head to the <strong className="text-foreground">Run</strong> tab to execute your first benchmark.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Run Tab ── */}
        {activeTab === "run" && (
          <div className="space-y-6">
            {/* Quick run */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6">
              <h3 className="text-base font-semibold text-foreground mb-2 flex items-center gap-2">
                <Terminal className="h-4 w-4 text-amber-400" />
                Run a Desk
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                From your Doer project root, brief an agent on any desk. No <code className="text-amber-400">--agent</code> flag = brief-only mode (stdout).
              </p>
              <div className="space-y-3">
                {[
                  { label: "Brief mode (read + do work yourself)", cmd: "node dist/index.js desk --desk 01" },
                  { label: "Runner mode (spawn an agent script)", cmd: "node dist/index.js desk --desk 04 --agent ./examples/desk4-agent.js" },
                  { label: "Judge a completed submission", cmd: "node dist/index.js judge --desk 01 --submission ./dwight-submission/desk-01" },
                  { label: "Full benchmark (all desks)", cmd: "node dist/index.js bench --agent <your-agent.js> --runs 1" },
                ].map(item => (
                  <div key={item.label} className="rounded-lg bg-muted/20 border border-border/40 p-3">
                    <p className="text-xs text-muted-foreground mb-2">{item.label}</p>
                    <pre className="text-xs font-mono text-amber-300 overflow-x-auto">{item.cmd}</pre>
                  </div>
                ))}
              </div>
            </div>

            {/* Env note */}
            <div className="rounded-xl border border-border/50 bg-card/30 p-5">
              <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                Env & Setup
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li>Project root: <code className="text-amber-400 text-xs">donjon_org/</code> (CLI lives here)</li>
                <li>Packets dir: <code className="text-amber-400 text-xs">dwight-benchmark/packets/</code></li>
                <li>Submissions: <code className="text-amber-400 text-xs">dwight-submission/desk-XX/</code></li>
                <li>Build first: <code className="text-amber-400 text-xs">npm run build</code></li>
              </ul>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
