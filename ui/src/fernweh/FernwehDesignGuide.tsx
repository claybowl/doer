import * as React from "react";
import { Icon, I } from "./utils";

const TOKEN_SWATCHES = [
  { label: "Background", vars: [{ name: "--bg", desc: "Page surface" }, { name: "--bg-sunken", desc: "Sidebar / inset" }, { name: "--bg-raised", desc: "Card / elevated" }] },
  { label: "Ink", vars: [{ name: "--ink", desc: "Primary text" }, { name: "--ink-dim", desc: "Secondary text" }, { name: "--ink-faint", desc: "Tertiary / muted" }] },
  { label: "Lines", vars: [{ name: "--line", desc: "Borders" }, { name: "--line-soft", desc: "Subtle dividers" }] },
  { label: "Accent", vars: [{ name: "--accent", desc: "Primary action" }, { name: "--accent-soft", desc: "Accent bg tint" }] },
  { label: "Semantic", vars: [{ name: "--pulse", desc: "Success / done" }, { name: "--warn", desc: "Warning / review" }, { name: "--danger", desc: "Error / blocked" }] },
  { label: "Motion", vars: [{ name: "--fw-ease", desc: "cubic-bezier(0.16, 1, 0.3, 1)" }] },
];

const TYPOGRAPHY = [
  { label: "Display", cls: "fw-display", style: { fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" } },
  { label: "UC label", cls: "fw-uc", style: { fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--ink-faint)" } },
  { label: "Mono", cls: "fw-mono", style: { fontSize: 11, fontFamily: "'SF Mono', 'Fira Code', monospace" } },
  { label: "Body", cls: "", style: { fontSize: 13, color: "var(--ink)" } },
  { label: "Body dim", cls: "", style: { fontSize: 13, color: "var(--ink-dim)" } },
  { label: "Card", cls: "fw-card", style: { fontSize: 14, fontWeight: 500 } },
];

const COLORS = [
  { label: "bg", var: "--bg" },
  { label: "bg-sunken", var: "--bg-sunken" },
  { label: "bg-raised", var: "--bg-raised" },
  { label: "ink", var: "--ink" },
  { label: "ink-dim", var: "--ink-dim" },
  { label: "ink-faint", var: "--ink-faint" },
  { label: "line", var: "--line" },
  { label: "accent", var: "--accent" },
  { label: "pulse", var: "--pulse" },
  { label: "warn", var: "--warn" },
  { label: "danger", var: "--danger" },
];

const LOOKS = [
  { id: "atrium", desc: "Editorial · warm · serif-leaning" },
  { id: "telegraph", desc: "Mono · command-deck · high-density" },
  { id: "meridian", desc: "Pro · color-forward · motion-rich" },
];

function Swatch({ cssVar }: { cssVar: string }) {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: 6, border: "1px solid var(--line)",
      backgroundColor: `var(${cssVar})`, flexShrink: 0,
    }} />
  );
}

export function FernwehDesignGuide() {
  return (
    <div style={{ padding: "32px 40px", maxWidth: 860, overflow: "auto" }}>
      <h1 className="fw-display" style={{ fontSize: 24, fontWeight: 700, margin: "0 0 6px" }}>Fernweh Design Guide</h1>
      <p style={{ color: "var(--ink-dim)", fontSize: 13, margin: "0 0 32px" }}>
        Design tokens, typography, and pattern reference for the Fernweh UI layer.
      </p>

      {/* Looks */}
      <section style={{ marginBottom: 32 }}>
        <h2 className="fw-uc" style={{ margin: "0 0 12px" }}>Looks</h2>
        <div style={{ display: "flex", gap: 12 }}>
          {LOOKS.map((look) => (
            <div key={look.id} style={{
              padding: "14px 18px", borderRadius: 10, border: "1px solid var(--line)",
              background: "var(--bg-sunken)", flex: 1,
            }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{look.id}</div>
              <div style={{ color: "var(--ink-dim)", fontSize: 12 }}>{look.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Color tokens */}
      <section style={{ marginBottom: 32 }}>
        <h2 className="fw-uc" style={{ margin: "0 0 12px" }}>Color Tokens</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
          {COLORS.map((c) => (
            <div key={c.var} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 12px", borderRadius: 8, border: "1px solid var(--line-soft)",
              background: "var(--bg-sunken)",
            }}>
              <Swatch cssVar={c.var} />
              <div>
                <div className="fw-mono" style={{ fontSize: 10, color: "var(--ink)" }}>{c.var}</div>
                <div style={{ fontSize: 10, color: "var(--ink-faint)" }}>{c.label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Token groups */}
      {TOKEN_SWATCHES.map((group) => (
        <section key={group.label} style={{ marginBottom: 24 }}>
          <h2 className="fw-uc" style={{ margin: "0 0 8px" }}>{group.label}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {group.vars.map((v) => (
              <div key={v.name} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "8px 12px", borderRadius: 6, border: "1px solid var(--line-soft)",
                background: "var(--bg-sunken)",
              }}>
                <div style={{ width: 180, flexShrink: 0 }}>
                  <code className="fw-mono" style={{ fontSize: 11, color: "var(--accent)" }}>{v.name}</code>
                </div>
                <div style={{ width: 32, height: 24, borderRadius: 4, backgroundColor: `var(${v.name})`, border: "1px solid var(--line-soft)", flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>{v.desc}</span>
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Typography */}
      <section style={{ marginBottom: 32 }}>
        <h2 className="fw-uc" style={{ margin: "0 0 12px" }}>Typography</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {TYPOGRAPHY.map((t, i) => (
            <div key={i} style={{
              padding: "10px 14px", borderRadius: 8, border: "1px solid var(--line-soft)",
              background: "var(--bg-sunken)",
            }}>
              <span className={t.cls || undefined} style={{ ...t.style, display: "block" }}>
                {t.label} — The quick brown fox jumps over the lazy dog
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* UI primitives showcase */}
      <section style={{ marginBottom: 32 }}>
        <h2 className="fw-uc" style={{ margin: "0 0 12px" }}>Primitives</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <button className="fw-card" style={{ padding: "10px 18px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--bg-raised)", color: "var(--ink)", cursor: "pointer", fontWeight: 500 }}>
            Primary Button
          </button>
          <button className="fw-card" style={{ padding: "10px 18px", borderRadius: 8, border: "1px solid var(--accent)", background: "var(--bg-raised)", color: "var(--accent)", cursor: "pointer", fontWeight: 500 }}>
            Accent Action
          </button>
          <button style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: "var(--danger)", color: "#fff", cursor: "pointer", fontWeight: 500 }}>
            Destructive
          </button>
          <button style={{ padding: "10px 18px", borderRadius: 8, border: "1px solid var(--line)", background: "transparent", color: "var(--ink-faint)", cursor: "pointer", fontSize: 12 }}>
            Muted
          </button>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
          {["active", "paused", "done", "error", "pending"].map((s) => (
            <span key={s} style={{
              fontSize: 10, padding: "2px 8px", borderRadius: 999, fontWeight: 500,
              background: s === "active" ? "var(--pulse-soft)" : s === "error" ? "var(--danger-soft)" : "var(--bg-sunken)",
              color: s === "active" ? "var(--pulse)" : s === "error" ? "var(--danger)" : "var(--ink-dim)",
              border: "1px solid var(--line-soft)",
            }}>
              {s}
            </span>
          ))}
        </div>
      </section>

      {/* Component inventory */}
      <section>
        <h2 className="fw-uc" style={{ margin: "0 0 12px" }}>Component Inventory</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {[
            "FernwehShell", "FernwehDashboard", "FernwehHome", "FernwehAgents", "FernwehWork",
            "FernwehIssues", "FernwehGoals", "FernwehProjects", "FernwehRoutines", "FernwehApprovals",
            "FernwehCosts", "FernwehActivity", "FernwehMemory", "FernwehInbox", "FernwehDeliverables",
            "FernwehCompanies", "FernwehCompanyExport", "FernwehCompanyImport", "FernwehCompanySettings",
            "FernwehCompanySkills", "FernwehCompanyBranding", "FernwehWebhooks",
            "FernwehSchruteBenchmark", "FernwehWikiGraph", "FernwehDesignGuide",
            "FernwehPreferences", "FernwehInstanceSettings",
            "FernwehOrgChart", "FernwehNewAgent", "FernwehAgentDetail", "FernwehRunDetail",
            "FernwehIssueDetail", "FernwehGoalDetail", "FernwehProjectDetail",
            "FernwehRoutineDetail", "FernwehApprovalDetail", "FernwehExecutionWorkspaceDetail",
            "Icon", "Avatar", "PriorityChip", "StatusChip", "Field",
          ].map((name) => (
            <span key={name} className="fw-mono" style={{
              fontSize: 10, padding: "3px 8px", borderRadius: 5,
              background: "var(--bg-sunken)", border: "1px solid var(--line-soft)",
              color: "var(--ink-dim)",
            }}>
              {name}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
