import * as React from "react";
import { NavLink, Outlet, useLocation, useParams } from "@/lib/router";
import { useCompany } from "@/context/CompanyContext";
import { Icon, I } from "./utils";
import "./tokens.css";

type Look = "atrium" | "telegraph" | "meridian";
type Theme = "light" | "dark";

const LOOK_KEY = "doer.fernweh.look";
const THEME_KEY = "doer.fernweh.theme";

function loadLook(): Look {
  try {
    const v = localStorage.getItem(LOOK_KEY);
    if (v === "atrium" || v === "telegraph" || v === "meridian") return v;
  } catch {}
  return "atrium";
}

function loadTheme(): Theme {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === "light" || v === "dark") return v;
  } catch {}
  return "light";
}

interface NavItemDef {
  to: string;
  label: string;
  icon: string;
}

function buildNav(prefix: string): NavItemDef[] {
  return [
    { to: `/${prefix}/fernweh`, label: "Command", icon: I.home },
    { to: `/${prefix}/fernweh/org`, label: "Org Chart", icon: I.org },
    { to: `/${prefix}/fernweh/agents`, label: "Agents", icon: I.agents },
    { to: `/${prefix}/fernweh/work`, label: "Work", icon: I.issues },
    { to: `/${prefix}/fernweh/activity`, label: "Activity", icon: I.activity },
    { to: `/${prefix}/fernweh/approvals`, label: "Approvals", icon: I.shield },
  ];
}

export function FernwehShell() {
  const { companyPrefix } = useParams<{ companyPrefix: string }>();
  const { selectedCompany, companies } = useCompany();
  const location = useLocation();

  const [look, setLook] = React.useState<Look>(loadLook);
  const [theme, setTheme] = React.useState<Theme>(loadTheme);
  const [tweaksOpen, setTweaksOpen] = React.useState(false);

  React.useEffect(() => {
    try { localStorage.setItem(LOOK_KEY, look); } catch {}
  }, [look]);

  React.useEffect(() => {
    try { localStorage.setItem(THEME_KEY, theme); } catch {}
  }, [theme]);

  const prefix = companyPrefix ?? selectedCompany?.issuePrefix ?? companies[0]?.issuePrefix ?? "";
  const nav = buildNav(prefix);

  const company = selectedCompany ?? companies.find((c) => c.issuePrefix === prefix) ?? companies[0] ?? null;

  // Defensive fallbacks — if the tokens stylesheet ever fails to resolve
  // (stale bundle, unsupported color-space, attr-selector mismatch) we still
  // paint a legible surface instead of pitch black.
  const fallbackBg = theme === "dark" ? "#121418" : "#fafafa";
  const fallbackInk = theme === "dark" ? "#e8e8ec" : "#1b1c20";
  const fallbackSunken = theme === "dark" ? "#0e1014" : "#f1f1f2";
  const fallbackLine = theme === "dark" ? "#2a2d33" : "#e4e4e7";

  return (
    <div
      data-fernweh
      data-look={look}
      data-theme={theme}
      style={{
        position: "fixed",
        inset: 0,
        display: "grid",
        gridTemplateColumns: "240px 1fr",
        overflow: "hidden",
        zIndex: 1,
        background: `var(--bg, ${fallbackBg})`,
        color: `var(--ink, ${fallbackInk})`,
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          background: `var(--bg-sunken, ${fallbackSunken})`,
          borderRight: `1px solid var(--line, ${fallbackLine})`,
          display: "flex",
          flexDirection: "column",
          padding: "20px 14px",
          gap: 18,
          overflow: "hidden",
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 6px" }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: "var(--accent)",
              color: "var(--bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontFamily: "var(--font-display-active)",
            }}
          >
            D
          </div>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
            <span className="fw-display" style={{ fontSize: 16, fontWeight: 600 }}>Doer</span>
            <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>Fernweh · preview</span>
          </div>
        </div>

        {/* Company */}
        {company ? (
          <div
            className="fw-card"
            style={{
              padding: "10px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>Company</span>
            <span style={{ fontWeight: 500, fontSize: 13 }}>{company.name}</span>
            <span className="fw-mono" style={{ fontSize: 10, color: "var(--ink-dim)" }}>
              {company.issuePrefix}
            </span>
          </div>
        ) : null}

        {/* Nav */}
        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {nav.map((item) => {
            const active = location.pathname === item.to ||
              (item.to !== `/${prefix}/fernweh` && location.pathname.startsWith(item.to));
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === `/${prefix}/fernweh`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  borderRadius: 8,
                  fontSize: 13,
                  color: active ? "var(--ink)" : "var(--ink-dim)",
                  background: active ? "var(--bg-raised)" : "transparent",
                  border: active ? "1px solid var(--line)" : "1px solid transparent",
                  transition: "all .15s var(--fw-ease)",
                }}
              >
                <Icon d={item.icon} size={14} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div style={{ flex: 1 }} />

        {/* Footer controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <button
            onClick={() => setTweaksOpen((o) => !o)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid var(--line)",
              color: "var(--ink-dim)",
              fontSize: 12,
              background: "var(--bg-raised)",
            }}
          >
            <Icon d={I.sliders} size={12} />
            <span>Tweaks</span>
          </button>
          <NavLink
            to={`/${prefix}/dashboard`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid var(--line)",
              color: "var(--ink-faint)",
              fontSize: 11,
              background: "transparent",
            }}
          >
            <Icon d={I.arrow} size={12} />
            <span>Back to classic UI</span>
          </NavLink>
        </div>
      </aside>

      {/* Main */}
      <main
        style={{
          overflow: "auto",
          background: `var(--bg, ${fallbackBg})`,
        }}
      >
        <Outlet context={{ look, theme }} />
      </main>

      {/* Tweaks panel */}
      <div className={`fw-tweaks ${tweaksOpen ? "open" : ""}`}>
        <h4>Aesthetic</h4>
        <div className="group">
          <div className="row" style={{ flexDirection: "column", gap: 4 }}>
            {[
              { id: "atrium" as Look, label: "Atrium", sub: "editorial · warm" },
              { id: "telegraph" as Look, label: "Telegraph", sub: "mono · command-deck" },
              { id: "meridian" as Look, label: "Meridian", sub: "pro · color + motion" },
            ].map((o) => (
              <button
                key={o.id}
                onClick={() => setLook(o.id)}
                className={`opt ${look === o.id ? "active" : ""}`}
                style={{ textAlign: "left", padding: "10px 12px" }}
              >
                <div style={{ fontWeight: 500 }}>{o.label}</div>
                <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{o.sub}</div>
              </button>
            ))}
          </div>
        </div>
        <h4>Theme</h4>
        <div className="group">
          <div className="row">
            <button
              className={`opt ${theme === "light" ? "active" : ""}`}
              onClick={() => setTheme("light")}
            >
              Light
            </button>
            <button
              className={`opt ${theme === "dark" ? "active" : ""}`}
              onClick={() => setTheme("dark")}
            >
              Dark
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
