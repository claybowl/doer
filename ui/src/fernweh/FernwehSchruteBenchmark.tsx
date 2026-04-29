import * as React from "react";

/* ============================================================
   FernwehSchruteBenchmark — Dwight-100 AI Office Simulation.
   100 desks · 10 departments · 10 seniority levels.
   Static display component (no live API). Plugin page has live runs.
============================================================ */

// ── Palette ───────────────────────────────────────────────────────────────────

const AMBER = {
  base:   "#f59e0b",
  soft:   "rgba(245,158,11,0.12)",
  border: "rgba(245,158,11,0.25)",
  glow:   "rgba(245,158,11,0.18)",
};
const EMERALD = "#10b981";
const EMERALD_SOFT = "rgba(16,185,129,0.12)";

// ── Static metadata ───────────────────────────────────────────────────────────

const DEPTS = [
  { code: "ENG",    label: "Engineering",       icon: "⚙️",  color: "#3b82f6" },
  { code: "PROD",   label: "Product",            icon: "🗺️",  color: "#8b5cf6" },
  { code: "DES",    label: "Design",             icon: "🎨",  color: "#ec4899" },
  { code: "SALES",  label: "Sales",              icon: "💼",  color: "#f59e0b" },
  { code: "MKT",    label: "Marketing",          icon: "📣",  color: "#f97316" },
  { code: "CS",     label: "Customer Success",   icon: "🎧",  color: "#10b981" },
  { code: "FIN",    label: "Finance",            icon: "💰",  color: "#06b6d4" },
  { code: "HR",     label: "Human Resources",    icon: "👥",  color: "#a78bfa" },
  { code: "LEGOPS", label: "Legal / Operations", icon: "⚖️",  color: "#94a3b8" },
  { code: "EXEC",   label: "Executive",          icon: "🏛️",  color: "#fbbf24" },
] as const;

const LEVELS = [
  { n: 1,  band: "IC",        label: "Individual Contributor I",  timeBudget: 25 },
  { n: 2,  band: "IC",        label: "Individual Contributor II", timeBudget: 25 },
  { n: 3,  band: "IC",        label: "Senior IC",                 timeBudget: 25 },
  { n: 4,  band: "IC",        label: "Staff / Tech Lead",         timeBudget: 35 },
  { n: 5,  band: "Lead",      label: "Lead / Principal",          timeBudget: 35 },
  { n: 6,  band: "Lead",      label: "Manager",                   timeBudget: 35 },
  { n: 7,  band: "Director",  label: "Senior Manager",            timeBudget: 45 },
  { n: 8,  band: "Director",  label: "Director",                  timeBudget: 45 },
  { n: 9,  band: "VP",        label: "Vice President",            timeBudget: 55 },
  { n: 10, band: "C-Suite",   label: "C-Level Executive",         timeBudget: 55 },
] as const;

// Key names for each dept (level 1–10)
const DESK_NAMES: Record<string, string[]> = {
  ENG:    ["Lena","Farida","Chen","Sergei","Amara","Yuki","Ravi","Esther","Tomás","Cyrus"],
  PROD:   ["Jorge","Beatrix","Kai","Nadia","Felix","Arjun","Priya","Diego","Anika","Simone"],
  DES:    ["Sofía","Mira","Theo","Olu","Yael","Kofi","Dasha","Caelan","Ren","Ngozi"],
  SALES:  ["Aisha","Dimitri","Camila","Idris","Felipe","Zara","Nathaniel","Iliana","Bisi","Adrian"],
  MKT:    ["Leila","Omar","Rosie","Björn","Genevieve","Tobias","Yara","Caleb","Rosa","Ezekiel"],
  CS:     ["Hina","Marco","Babatunde","Sigrid","Theo","Lakshmi","Dion","Astrid","Idowu","Talia"],
  FIN:    ["Tyler","Wendell","Hadiya","Sven","Camille","Jamal","Inez","Pierre","Naila","Reginald"],
  HR:     ["Zoë","Femi","Claudia","Hamid","Brigit","Linh","Renaud","Niamh","Kwame","Sable"],
  LEGOPS: ["Dana","Saoirse","Mateus","Klara","Hideo","Anneliese","Vidya","Soren","Adaobi","Theodora"],
  EXEC:   ["Roy","Imani","Atticus","Sunita","Octavio","Nadine","Bayo","Petra","Isadora","Konstantin"],
};

// Cross-dept edges that form the handoff DAG
const CROSS_EDGES = [
  { from: "LEGOPS-L07-Vidya", to: "All 9 dept L08 Directors",     type: "vendor budget fan-out",      color: "#94a3b8" },
  { from: "ENG-L08-Esther",   to: "MKT-L06-Tobias",               type: "launch readiness → notes",   color: "#3b82f6" },
  { from: "ENG-L08-Esther",   to: "FIN-L08-Pierre",               type: "hiring plan → budget",        color: "#3b82f6" },
  { from: "ENG-L08-Esther",   to: "HR-L08-Renaud",                type: "headcount ask → sourcing",    color: "#3b82f6" },
  { from: "CS-L06-Lakshmi",   to: "PROD-L03-Kai",                 type: "voice-of-customer → backlog", color: "#10b981" },
  { from: "PROD-L08-Diego",   to: "ENG-L07-Ravi",                 type: "roadmap → cycle plan",        color: "#8b5cf6" },
  { from: "SALES-L06-Zara",   to: "FIN-L03-Hadiya",               type: "deal terms → invoicing",      color: "#f59e0b" },
  { from: "MKT-L08-Caleb",    to: "SALES-L08-Iliana",             type: "pipeline targets → quota",    color: "#f97316" },
  { from: "FIN-L10-Reginald", to: "EXEC-L10-Konstantin",          type: "forecast → board pre-read",   color: "#06b6d4" },
] as const;

const SCORING_COMPONENTS = [
  { label: "Completion",        weight: "40%", desc: "Did all required deliverables exist and are they complete?" },
  { label: "Quality",           weight: "35%", desc: "Would a manager at this level accept without revisions?" },
  { label: "Accuracy",          weight: "15%", desc: "Are facts, numbers, and analysis correct?" },
  { label: "Handoff Integrity", weight: "10%", desc: "Did downstream desks receive what they needed?" },
];

const ONET_CODES = [
  { code: "11-1011.00", label: "Chief Executives",                    used: "C-Suite desks (L10)" },
  { code: "11-3021.00", label: "Computer/Info Systems Managers",      used: "ENG L5–L9" },
  { code: "15-1252.00", label: "Software Developers",                 used: "ENG L1–L4" },
  { code: "11-2021.00", label: "Marketing Managers",                  used: "MKT, DES senior" },
  { code: "11-2022.00", label: "Sales Managers",                      used: "SALES L7–L9" },
  { code: "41-3091.00", label: "Sales Reps, Services",                used: "SALES L1–L4" },
  { code: "13-1071.00", label: "Human Resources Specialists",         used: "HR L1–L3" },
  { code: "11-3121.00", label: "HR Managers",                         used: "HR L6–L10" },
  { code: "13-2011.00", label: "Accountants and Auditors",            used: "FIN L2–L4" },
  { code: "11-3031.00", label: "Financial Managers",                  used: "FIN L6–L9" },
  { code: "43-4051.00", label: "Customer Service Reps",               used: "CS L1–L4" },
  { code: "27-1024.00", label: "Graphic Designers",                   used: "DES L1–L5" },
  { code: "13-1111.00", label: "Management Analysts",                 used: "EXEC L1–L4" },
  { code: "11-1021.00", label: "General and Operations Managers",     used: "EXEC L5–L8, LEGOPS" },
  { code: "13-1199.00", label: "Business Operations Specialists",     used: "PROD L1–L3" },
];

const CLI_COMMANDS = [
  { label: "Run full benchmark (100 desks)",          cmd: "doerai benchmark run --mode full --agent <agent-id>" },
  { label: "Single department (10 desks)",            cmd: "doerai benchmark run --mode single-dept --dept ENG --agent <agent-id>" },
  { label: "Cross-section at Director level",         cmd: "doerai benchmark run --mode cross-section --level 8 --agent <agent-id>" },
  { label: "Custom desk selection",                   cmd: "doerai benchmark run --mode custom --desks ENG-L08-Esther,FIN-L08-Pierre --agent <agent-id>" },
  { label: "Check run status",                        cmd: "doerai benchmark status <run-id>" },
  { label: "View all runs",                           cmd: "doerai benchmark list" },
];

const SCORE_HISTORY = [
  { version: "v0.1.0-alpha", date: "Apr 2, 2026", dw: 2.68, desks: 3, agent: "donjon-baseline" },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function DwBar({ dw, max = 10 }: { dw: number; max?: number }) {
  const pct = Math.min((dw / max) * 100, 100);
  const color = dw / max >= 0.8 ? EMERALD : dw / max >= 0.5 ? AMBER.base : "#ef4444";
  return (
    <div style={{ height: 5, borderRadius: 999, background: "var(--bg-sunken)", overflow: "hidden" }}>
      <div style={{ height: "100%", borderRadius: 999, background: color, width: `${pct}%`, transition: "width .4s var(--fw-ease)" }} />
    </div>
  );
}

function BandPill({ band }: { band: string }) {
  const colors: Record<string, string> = {
    "IC": "#6b7280", "Lead": AMBER.base, "Director": "#3b82f6", "VP": "#8b5cf6", "C-Suite": "#f97316",
  };
  const c = colors[band] ?? "#6b7280";
  return (
    <span style={{ fontSize: 9, fontWeight: 600, color: c, padding: "1px 5px", borderRadius: 4, border: `1px solid ${c}44`, background: `${c}11`, letterSpacing: "0.04em" }}>
      {band}
    </span>
  );
}

type Tab = "overview" | "org-chart" | "dag" | "methodology" | "history" | "run";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "overview",    label: "Overview",    icon: "📊" },
  { id: "org-chart",  label: "Org Chart",   icon: "🏢" },
  { id: "dag",        label: "DAG",         icon: "⛓️" },
  { id: "methodology",label: "Methodology", icon: "🔬" },
  { id: "history",    label: "History",     icon: "🏆" },
  { id: "run",        label: "Run",         icon: "⚡" },
];

// ── Tab: Overview ─────────────────────────────────────────────────────────────

function OverviewTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {[
          { label: "Total desks",      value: "100",   sub: "10 depts × 10 levels" },
          { label: "DAG edges",         value: "111",   sub: "Dependency links" },
          { label: "Research sources",  value: "15",    sub: "O*NET SOC codes" },
          { label: "Scoring judges",    value: "3",     sub: "Claude · GPT-4o · Gemini" },
        ].map((s) => (
          <div key={s.label} className="fw-card" style={{ padding: "14px 16px", border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: AMBER.base, lineHeight: 1, fontFamily: "var(--fw-font-mono)" }}>{s.value}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ink)" }}>{s.label}</span>
            <span style={{ fontSize: 10, color: "var(--ink-faint)" }}>{s.sub}</span>
          </div>
        ))}
      </div>

      {/* Department grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
        {DEPTS.map((d) => {
          const names = DESK_NAMES[d.code] ?? [];
          return (
            <div
              key={d.code}
              className="fw-card"
              style={{ padding: "14px 16px", border: `1px solid ${d.color}22`, background: `${d.color}08`, display: "flex", flexDirection: "column", gap: 8 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>{d.icon}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{d.label}</div>
                  <div style={{ fontSize: 10, color: "var(--ink-faint)" }}>{d.code} · 10 desks</div>
                </div>
              </div>
              <div style={{ fontSize: 10, color: "var(--ink-dim)", lineHeight: 1.6 }}>
                <span style={{ color: d.color, fontWeight: 600 }}>IC:</span> {names.slice(0,3).join(", ")}
                {" · "}
                <span style={{ color: d.color, fontWeight: 600 }}>Dir:</span> {names[7]}
              </div>
              <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                {LEVELS.map((l) => (
                  <div
                    key={l.n}
                    title={`L${l.n} ${names[l.n - 1] ?? ""} — ${l.label}`}
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      background: d.color,
                      opacity: 0.15 + (l.n / 10) * 0.85,
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* About blurb */}
      <div className="fw-card" style={{ padding: "18px 20px", border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>What is the Schrute Benchmark?</div>
        <p style={{ margin: 0, fontSize: 13, color: "var(--ink-dim)", lineHeight: 1.7 }}>
          The Schrute Benchmark is a <strong style={{ color: "var(--ink)" }}>100-desk AI office simulation</strong> grounded in real labor research (O*NET, BLS OOH, industry reports). Each desk is a named knowledge worker at a specific seniority level — from IC to C-suite — in one of 10 departments. Desks are connected by a 111-edge dependency DAG reflecting real organizational handoffs. Your agent team completes the task packets and is scored in <strong style={{ color: AMBER.base }}>Dw units</strong>: 1.0 Dw = one human knowledge-worker day of output.
        </p>
      </div>
    </div>
  );
}

// ── Tab: Org Chart ────────────────────────────────────────────────────────────

const CROSS_NODES = new Set([
  "ENG-L07-Ravi","ENG-L08-Esther","PROD-L03-Kai","PROD-L08-Diego",
  "DES-L05-Yael","SALES-L06-Zara","SALES-L08-Iliana","MKT-L06-Tobias",
  "MKT-L08-Caleb","CS-L06-Lakshmi","CS-L08-Astrid","FIN-L03-Hadiya",
  "FIN-L08-Pierre","FIN-L10-Reginald","HR-L08-Renaud","LEGOPS-L07-Vidya",
  "EXEC-L08-Petra","EXEC-L10-Konstantin",
]);

function OrgChartTab() {
  const [hoveredCell, setHoveredCell] = React.useState<string | null>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ fontSize: 12, color: "var(--ink-dim)", display: "flex", gap: 16, alignItems: "center" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: AMBER.base, display: "inline-block" }} />
          Cross-dept handoff node
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--bg-raised)", border: "1px solid var(--line)", display: "inline-block" }} />
          Internal-only node
        </span>
      </div>

      {/* Grid: rows = levels, cols = depts */}
      <div style={{ overflowX: "auto" }}>
        <div style={{ minWidth: 900 }}>
          {/* Header row */}
          <div style={{ display: "grid", gridTemplateColumns: "80px repeat(10, 1fr)", gap: 4, marginBottom: 4 }}>
            <div />
            {DEPTS.map((d) => (
              <div key={d.code} style={{ textAlign: "center", padding: "4px 0", fontSize: 11, fontWeight: 600, color: d.color, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <span style={{ fontSize: 14 }}>{d.icon}</span>
                <span>{d.code}</span>
              </div>
            ))}
          </div>

          {/* Level rows */}
          {LEVELS.map((level) => (
            <div key={level.n} style={{ display: "grid", gridTemplateColumns: "80px repeat(10, 1fr)", gap: 4, marginBottom: 4 }}>
              {/* Level label */}
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 3, paddingRight: 8 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: "var(--fw-font-mono)", fontSize: 11, fontWeight: 700, color: "var(--ink-dim)" }}>L{level.n}</span>
                  <BandPill band={level.band} />
                </div>
                <div style={{ fontSize: 9, color: "var(--ink-faint)" }}>{level.timeBudget}m</div>
              </div>

              {/* Dept cells */}
              {DEPTS.map((dept) => {
                const names = DESK_NAMES[dept.code] ?? [];
                const name = names[level.n - 1] ?? "—";
                const cellId = `${dept.code}-L${String(level.n).padStart(2,"0")}-${name}`;
                const isCross = CROSS_NODES.has(cellId);
                const isHovered = hoveredCell === cellId;

                return (
                  <div
                    key={dept.code}
                    onMouseEnter={() => setHoveredCell(cellId)}
                    onMouseLeave={() => setHoveredCell(null)}
                    title={`${cellId}\n${level.label}\n${level.timeBudget}min budget`}
                    style={{
                      padding: "5px 7px",
                      borderRadius: 6,
                      border: isCross
                        ? `1px solid ${AMBER.border}`
                        : `1px solid ${isHovered ? "var(--line)" : "var(--line-soft)"}`,
                      background: isCross
                        ? AMBER.soft
                        : isHovered
                          ? "var(--bg-raised)"
                          : "var(--bg-card)",
                      cursor: "default",
                      transition: "all .1s ease",
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                    }}
                  >
                    <span style={{ fontSize: 10, fontWeight: isCross ? 700 : 500, color: isCross ? AMBER.base : "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {name}
                    </span>
                    {isCross && (
                      <span style={{ fontSize: 8, color: AMBER.base, opacity: 0.8 }}>⇌</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tab: DAG ──────────────────────────────────────────────────────────────────

function DagTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="fw-card" style={{ padding: "18px 20px", border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Dependency Structure</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
          {[
            { label: "Total edges", value: "111", color: AMBER.base },
            { label: "Intra-dept", value: "90",  color: "var(--ink-dim)" },
            { label: "Cross-dept", value: "10+",  color: "#3b82f6" },
          ].map((s) => (
            <div key={s.label} style={{ padding: "10px 12px", borderRadius: 8, background: "var(--bg-sunken)", border: "1px solid var(--line)" }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: s.color, fontFamily: "var(--fw-font-mono)" }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "var(--ink-faint)" }}>{s.label}</div>
            </div>
          ))}
        </div>
        <p style={{ margin: 0, fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.6 }}>
          Within each department, desks form a vertical chain: L01 → L05 → L06 → … → L10. L01–L04 ICs feed the L05 Lead who synthesizes and routes upward. Cross-dept edges carry real work artifacts — launch readiness docs, headcount plans, contract redlines, voice-of-customer briefs.
        </p>
      </div>

      {/* Cross-dept edges */}
      <div className="fw-card" style={{ border: "1px solid var(--line)", overflow: "hidden" }}>
        <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--line)", fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>
          Cross-Department Handoffs
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {CROSS_EDGES.map((edge, i) => (
            <div
              key={i}
              style={{
                padding: "12px 18px",
                borderBottom: i < CROSS_EDGES.length - 1 ? "1px solid var(--line-soft)" : "none",
                display: "grid",
                gridTemplateColumns: "1fr 16px 1fr 1fr",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div style={{ fontFamily: "var(--fw-font-mono)", fontSize: 11, fontWeight: 600, color: edge.color }}>
                {edge.from}
              </div>
              <span style={{ color: AMBER.base, textAlign: "center" }}>→</span>
              <div style={{ fontFamily: "var(--fw-font-mono)", fontSize: 11, color: "var(--ink)" }}>
                {edge.to}
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-faint)", fontStyle: "italic" }}>
                {edge.type}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Vidya callout */}
      <div
        className="fw-card"
        style={{ padding: "16px 18px", border: `1px solid ${AMBER.border}`, background: AMBER.soft, display: "flex", flexDirection: "column", gap: 8 }}
      >
        <div style={{ fontSize: 12, fontWeight: 600, color: AMBER.base }}>⚠ Highest-fan-out node: LEGOPS-L07-Vidya</div>
        <p style={{ margin: 0, fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.6 }}>
          Vidya (Senior Procurement & Vendor Ops Lead) fans out to <strong style={{ color: "var(--ink)" }}>all 9 L08 Directors</strong> with the quarterly vendor budget allocation. She is the single node whose delay most cascades across the simulation — a real org dynamic replicated exactly.
        </p>
      </div>

      {/* DAG ordering note */}
      <div className="fw-card" style={{ padding: "16px 18px", border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>DAG-aware issue creation</div>
        <p style={{ margin: 0, fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.6 }}>
          When a benchmark run starts, the plugin topologically sorts all selected desks. Issues are created only for desks whose upstream dependencies are already complete. Each <code style={{ color: AMBER.base }}>pollRun</code> call checks for newly unblocked desks and creates their issues, allowing the DAG to execute in correct dependency order even when running the full 100-desk benchmark.
        </p>
      </div>
    </div>
  );
}

// ── Tab: Methodology ──────────────────────────────────────────────────────────

function MethodologyTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Dw formula */}
      <div className="fw-card" style={{ padding: "20px 22px", border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>📐 Dw Unit Formula</div>
        <div
          style={{
            padding: "14px 18px",
            borderRadius: 8,
            background: "var(--bg-sunken)",
            fontFamily: "var(--fw-font-mono)",
            fontSize: 13,
            color: AMBER.base,
            lineHeight: 1.8,
          }}
        >
          {"Dw = (completion×0.40 + quality×0.35 + accuracy×0.15 + handoff×0.10) / 10"}<br />
          {"where each component is scored 0–100"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {SCORING_COMPONENTS.map((c) => (
            <div key={c.label} style={{ display: "grid", gridTemplateColumns: "140px 48px 1fr", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{c.label}</span>
              <span className="fw-mono" style={{ fontSize: 13, fontWeight: 700, color: AMBER.base, textAlign: "right" }}>{c.weight}</span>
              <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>{c.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3-judge consensus */}
      <div className="fw-card" style={{ padding: "20px 22px", border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>⚖️ 3-Judge Consensus</div>
        <p style={{ margin: 0, fontSize: 13, color: "var(--ink-dim)", lineHeight: 1.7 }}>
          Each desk is scored independently by three LLM judges. The <strong style={{ color: "var(--ink)" }}>median score</strong> per dimension is used. Any pair of judges differing by {'>'} 25 points on any dimension flags the desk for human review.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {[
            { name: "Claude Sonnet",  role: "Skeptic",    color: "#f97316", desc: "Challenges assumptions, demands specificity" },
            { name: "GPT-4o",         role: "Pragmatist", color: "#3b82f6", desc: "Evaluates practical utility and correctness" },
            { name: "Gemini 2.5 Pro", role: "Auditor",    color: "#10b981", desc: "Cross-checks facts and source grounding" },
          ].map((j) => (
            <div key={j.name} style={{ padding: "12px 14px", borderRadius: 8, background: "var(--bg-sunken)", border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: j.color }}>{j.name}</div>
              <div style={{ fontSize: 10, color: j.color, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.08em" }}>{j.role}</div>
              <div style={{ fontSize: 11, color: "var(--ink-dim)", lineHeight: 1.5 }}>{j.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* O*NET sourcing */}
      <div className="fw-card" style={{ border: "1px solid var(--line)", overflow: "hidden" }}>
        <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--line)", fontSize: 13, fontWeight: 600, color: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>🔬 O*NET Research Sources</span>
          <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>15 SOC codes</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {ONET_CODES.map((c, i) => (
            <div key={c.code} style={{ padding: "8px 18px", borderBottom: i < ONET_CODES.length - 1 ? "1px solid var(--line-soft)" : "none", display: "grid", gridTemplateColumns: "130px 1fr 1fr", alignItems: "center", gap: 12 }}>
              <a
                href={`https://www.onetonline.org/link/summary/${c.code}`}
                target="_blank"
                rel="noreferrer"
                style={{ fontFamily: "var(--fw-font-mono)", fontSize: 11, color: AMBER.base, textDecoration: "none" }}
              >
                {c.code}
              </a>
              <span style={{ fontSize: 12, color: "var(--ink)" }}>{c.label}</span>
              <span style={{ fontSize: 11, color: "var(--ink-faint)", fontStyle: "italic" }}>{c.used}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Time budgets */}
      <div className="fw-card" style={{ padding: "18px 20px", border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>⏱ Time Budget Tiers</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {[
            { levels: "L1–L3", label: "IC",       mins: 25 },
            { levels: "L4–L6", label: "Lead/Mgr", mins: 35 },
            { levels: "L7–L8", label: "Director",  mins: 45 },
            { levels: "L9–L10",label: "VP / C",    mins: 55 },
          ].map((t) => (
            <div key={t.levels} style={{ padding: "10px 12px", borderRadius: 8, background: "var(--bg-sunken)", border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: AMBER.base, fontFamily: "var(--fw-font-mono)" }}>{t.mins}<span style={{ fontSize: 11, color: "var(--ink-faint)" }}>min</span></div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink)" }}>{t.levels}</div>
              <div style={{ fontSize: 10, color: "var(--ink-faint)" }}>{t.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tab: History ──────────────────────────────────────────────────────────────

function HistoryTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="fw-card" style={{ border: "1px solid var(--line)", overflow: "hidden" }}>
        <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Run History</span>
          <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>{SCORE_HISTORY.length} run{SCORE_HISTORY.length !== 1 ? "s" : ""}</span>
        </div>
        {SCORE_HISTORY.length === 0 ? (
          <div style={{ padding: "48px 18px", textAlign: "center", fontSize: 13, color: "var(--ink-faint)" }}>
            No benchmark runs yet. Head to <strong style={{ color: "var(--ink)" }}>Run</strong> to execute your first benchmark.
          </div>
        ) : (
          SCORE_HISTORY.map((run, i) => (
            <div key={i} style={{ padding: "18px 18px", borderBottom: i < SCORE_HISTORY.length - 1 ? "1px solid var(--line-soft)" : "none", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{run.agent}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 3 }}>
                    {run.version} · {run.date} · {run.desks}/{100} desks complete
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span className="fw-mono" style={{ fontSize: 30, fontWeight: 900, color: AMBER.base, lineHeight: 1 }}>
                    {run.dw.toFixed(2)}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--ink-faint)", marginLeft: 4 }}>Dw</span>
                </div>
              </div>
              <DwBar dw={run.dw} max={100} />
              <div style={{ fontSize: 10, color: "var(--ink-faint)" }}>
                {run.desks} of 100 desks completed · partial score
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Tab: Run ──────────────────────────────────────────────────────────────────

function RunTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        className="fw-card"
        style={{ padding: "20px 22px", border: `1px solid ${AMBER.border}`, background: AMBER.soft, display: "flex", flexDirection: "column", gap: 14 }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", display: "flex", alignItems: "center", gap: 8 }}>
          <span>⚡</span> CLI Commands
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "var(--ink-dim)", lineHeight: 1.6 }}>
          Install the benchmark plugin, then use the <code style={{ color: AMBER.base, fontFamily: "var(--fw-font-mono)", fontSize: 11 }}>doerai benchmark</code> CLI to run against any agent in your company.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {CLI_COMMANDS.map((item) => (
            <div key={item.label} style={{ padding: "12px 14px", borderRadius: 8, background: "var(--bg-raised)", border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>{item.label}</span>
              <pre style={{ margin: 0, fontSize: 11, fontFamily: "var(--fw-font-mono)", color: AMBER.base, overflowX: "auto", whiteSpace: "pre" }}>
                {item.cmd}
              </pre>
            </div>
          ))}
        </div>
      </div>

      {/* Mode guide */}
      <div className="fw-card" style={{ padding: "18px 20px", border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Run Modes</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { mode: "full",          desks: 100, note: "All 100 desks, DAG-ordered. Takes the longest — budget accordingly." },
            { mode: "single-dept",   desks: 10,  note: "All 10 levels of one department. Good for targeted evals." },
            { mode: "cross-section", desks: 10,  note: "One desk per dept at a given level. Tests breadth at one seniority band." },
            { mode: "custom",        desks: "n", note: "Explicit desk ID list. For regression testing specific nodes." },
          ].map((m) => (
            <div key={m.mode} style={{ display: "grid", gridTemplateColumns: "130px 48px 1fr", alignItems: "start", gap: 10 }}>
              <code style={{ fontFamily: "var(--fw-font-mono)", fontSize: 11, color: AMBER.base, paddingTop: 1 }}>{m.mode}</code>
              <span className="fw-mono" style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-dim)", textAlign: "right", paddingTop: 1 }}>{m.desks}</span>
              <span style={{ fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.5 }}>{m.note}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Plugin install */}
      <div className="fw-card" style={{ padding: "16px 20px", border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>Plugin Installation</div>
        <p style={{ margin: 0, fontSize: 12, color: "var(--ink-dim)", lineHeight: 1.6 }}>
          The benchmark is installed as a Doer plugin (<code style={{ color: AMBER.base }}>doer-schrute-benchmark</code>). Open Plugin Manager → find "Schrute Benchmark" → Install. The plugin registers the CLI endpoints and the live benchmark dashboard.
        </p>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function FernwehSchruteBenchmark() {
  const [activeTab, setActiveTab] = React.useState<Tab>("overview");

  return (
    <div style={{ maxWidth: 1140, margin: "0 auto", padding: "28px 24px 80px", display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Hero ── */}
      <div
        className="fw-card"
        style={{
          position: "relative",
          overflow: "hidden",
          border: `1px solid ${AMBER.border}`,
          background: `radial-gradient(ellipse at top right, ${AMBER.glow}, transparent 60%), var(--bg-raised)`,
          padding: "28px 30px",
        }}
      >
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none" }} />

        <div style={{ position: "relative", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${AMBER.base}, #ea580c)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                💼
              </div>
              <div>
                <div className="fw-display" style={{ fontSize: 22, fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.02em" }}>
                  Schrute Benchmark
                </div>
                <div style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 2 }}>
                  Dwight-100 · AI Agency Office Simulation · 10 depts × 10 levels
                </div>
              </div>
            </div>

            <p style={{ fontSize: 13, color: "var(--ink-dim)", lineHeight: 1.7, maxWidth: 560, marginBottom: 16 }}>
              Can your agent team do the work of <strong style={{ color: "var(--ink)" }}>100 human knowledge workers</strong> across a full simulated company? Each desk is a research-grounded task packet. Score in <strong style={{ color: AMBER.base }}>Dw units</strong> — 1.0 Dw = one human knowledge-worker day.
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 12, flexWrap: "wrap" }}>
              <span style={{ color: "var(--ink-dim)" }}>100 desks</span>
              <span style={{ color: "var(--line)" }}>·</span>
              <span style={{ color: "var(--ink-dim)" }}>111 DAG edges</span>
              <span style={{ color: "var(--line)" }}>·</span>
              <span style={{ color: "var(--ink-dim)" }}>15 O*NET codes</span>
              <span style={{ color: "var(--line)" }}>·</span>
              <span style={{ color: "var(--ink-dim)" }}>3-judge consensus</span>
            </div>
          </div>

          {/* Score pill */}
          <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 14, border: `1px solid ${AMBER.border}`, background: AMBER.soft, padding: "18px 26px", minWidth: 120, gap: 4 }}>
            <span style={{ fontSize: 42, fontWeight: 900, color: AMBER.base, lineHeight: 1, fontFamily: "var(--fw-font-mono)" }}>
              100
            </span>
            <span style={{ fontSize: 10, color: "var(--ink-faint)" }}>max Dw</span>
            <span style={{ fontSize: 10, color: AMBER.base, opacity: 0.7, marginTop: 4 }}>per full run</span>
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: 10, background: "var(--bg-sunken)", width: "fit-content", border: "1px solid var(--line)" }}>
        {TABS.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                borderRadius: 7,
                fontSize: 12,
                fontWeight: active ? 600 : 400,
                color: active ? "var(--ink)" : "var(--ink-dim)",
                background: active ? "var(--bg-raised)" : "transparent",
                border: active ? "1px solid var(--line)" : "1px solid transparent",
                cursor: "pointer",
                transition: "all .12s var(--fw-ease)",
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab content ── */}
      {activeTab === "overview"     && <OverviewTab />}
      {activeTab === "org-chart"    && <OrgChartTab />}
      {activeTab === "dag"          && <DagTab />}
      {activeTab === "methodology"  && <MethodologyTab />}
      {activeTab === "history"      && <HistoryTab />}
      {activeTab === "run"          && <RunTab />}
    </div>
  );
}
