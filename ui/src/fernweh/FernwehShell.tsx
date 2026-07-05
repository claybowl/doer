import * as React from "react";
import { NavLink, Outlet, useLocation, useNavigate, useParams } from "@/lib/router";
import { useCompany } from "@/context/CompanyContext";
import { useDialog } from "@/context/DialogContext";
import { ToastViewport } from "@/components/ToastViewport";
import { NewIssueDialog } from "@/components/NewIssueDialog";
import { NewProjectDialog } from "@/components/NewProjectDialog";
import { NewGoalDialog } from "@/components/NewGoalDialog";
import { NewRoutineDialog } from "@/components/NewRoutineDialog";
import { NewAgentDialog } from "@/components/NewAgentDialog";
import { NotFoundPage } from "@/pages/NotFound";
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

type NavSection = {
  id: string;
  label: string;
  items: NavItemDef[];
  defaultOpen?: boolean;
};

function buildNav(prefix: string): NavSection[] {
  return [
    {
      id: "core",
      label: "Core",
      defaultOpen: true,
      items: [
        { to: `/${prefix}`, label: "HQ", icon: I.bolt },
        { to: `/${prefix}/home`, label: "Home", icon: I.home },
        { to: `/${prefix}/inbox`, label: "Inbox", icon: I.stack },
        { to: `/${prefix}/org`, label: "Org Chart", icon: I.org },
      ],
    },
    {
      id: "workforce",
      label: "Workforce",
      defaultOpen: true,
      items: [
        { to: `/${prefix}/agents`, label: "Agents", icon: I.agents },
        { to: `/${prefix}/goals`, label: "Goals", icon: I.heart },
        { to: `/${prefix}/projects`, label: "Projects", icon: I.sliders },
        { to: `/${prefix}/routines`, label: "Routines", icon: I.clock },
      ],
    },
    {
      id: "work",
      label: "Work",
      defaultOpen: true,
      items: [
        { to: `/${prefix}/work`, label: "Work", icon: I.issues },
        { to: `/${prefix}/issues`, label: "Issues", icon: I.stack },
        { to: `/${prefix}/activity`, label: "Activity", icon: I.activity },
        { to: `/${prefix}/memory`, label: "Memory", icon: I.brain },
        { to: `/${prefix}/outputs`, label: "Outputs", icon: I.check },
        { to: `/${prefix}/approvals`, label: "Approvals", icon: I.shield },
        { to: `/${prefix}/costs`, label: "Costs", icon: I.dollar },
      ],
    },
    {
      id: "company",
      label: "Company",
      defaultOpen: false,
      items: [
        { to: `/${prefix}/companies`, label: "Companies", icon: I.org },
        { to: `/${prefix}/company/skills`, label: "Skills", icon: I.brain },
        { to: `/${prefix}/company/webhooks`, label: "Webhooks", icon: I.bolt },
        { to: `/${prefix}/company/export`, label: "Export", icon: I.arrow },
        { to: `/${prefix}/company/import`, label: "Import", icon: I.arrow },
      ],
    },
    {
      id: "tools",
      label: "Tools",
      defaultOpen: true,
      items: [
        { to: `/${prefix}/council`, label: "Council", icon: I.agents },
        { to: `/${prefix}/wiki`, label: "Wiki & Graph", icon: I.brain },
        { to: `/${prefix}/benchmark`, label: "Schrute Bench", icon: I.shield },
        { to: `/${prefix}/design-guide`, label: "Design Guide", icon: I.sliders },
      ],
    },
  ];
}

function DoerGearMark({ size = 38 }: { size?: number }) {
  return (
    <img
      src="/brands/doer-logo.jpg"
      width={size}
      height={size}
      alt="Doer"
      style={{
        borderRadius: 8,
        flexShrink: 0,
        objectFit: "cover",
        display: "block",
      }}
    />
  );
}

export function FernwehShell() {
  const { companyPrefix } = useParams<{ companyPrefix: string }>();
  const { selectedCompany, companies, setSelectedCompanyId } = useCompany();
  const { openOnboarding } = useDialog();
  const location = useLocation();
  const navigate = useNavigate();

  const [look, setLook] = React.useState<Look>(loadLook);
  const [theme, setTheme] = React.useState<Theme>(loadTheme);
  const [tweaksOpen, setTweaksOpen] = React.useState(false);
  const [companySwitcherOpen, setCompanySwitcherOpen] = React.useState(false);
  const companySwitcherRef = React.useRef<HTMLDivElement>(null);

  // Collapsible nav sections
  const [collapsedSections, setCollapsedSections] = React.useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("doer.fernweh.collapsedSections");
      if (stored) return new Set(JSON.parse(stored));
    } catch {}
    return new Set<string>();
  });

  const toggleSection = (id: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try { localStorage.setItem("doer.fernweh.collapsedSections", JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  React.useEffect(() => {
    if (!companySwitcherOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (companySwitcherRef.current && !companySwitcherRef.current.contains(e.target as Node)) {
        setCompanySwitcherOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [companySwitcherOpen]);

  React.useEffect(() => {
    try { localStorage.setItem(LOOK_KEY, look); } catch {}
  }, [look]);

  React.useEffect(() => {
    try { localStorage.setItem(THEME_KEY, theme); } catch {}
  }, [theme]);

  const prefix = companyPrefix ?? selectedCompany?.issuePrefix ?? companies[0]?.issuePrefix ?? "";
  const navSections = buildNav(prefix);

  // URL prefix is canonical — `selectedCompany` is only a fallback for routes without a prefix.
  // Without this precedence, navigating to /LAW/... while CompanyContext holds DEM silently
  // routes all API calls (skill create, etc.) to the wrong company. See FernwehShell bug fix.
  //
  // An archived company must never win this match: CompanyContext's own auto-select effect
  // excludes archived companies and bounces `selectedCompanyId` away from them, while this
  // effect used to bounce it right back (URL still says the archived prefix) — an infinite
  // render loop that looked like two pages flickering on top of each other.
  const matchedByPrefix = companies.find((c) => c.issuePrefix === prefix);
  const isArchivedPrefix = matchedByPrefix?.status === "archived";
  const company = !isArchivedPrefix
    ? (matchedByPrefix ?? selectedCompany ?? companies[0] ?? null)
    : (companies.find((c) => c.status !== "archived") ?? null);

  // Keep CompanyContext in sync with the URL so downstream useCompany() consumers stay consistent.
  React.useEffect(() => {
    if (isArchivedPrefix) return;
    if (company && company.id !== selectedCompany?.id) {
      setSelectedCompanyId(company.id);
    }
  }, [isArchivedPrefix, company, selectedCompany?.id, setSelectedCompanyId]);

  if (isArchivedPrefix) {
    return <NotFoundPage scope="invalid_company_prefix" requestedPrefix={prefix} />;
  }

  const fallbackBg = theme === "dark" ? "#121418" : "#fafafa";
  const fallbackInk = theme === "dark" ? "#e8e8ec" : "#1b1c20";
  const fallbackSunken = theme === "dark" ? "#0e1014" : "#f1f1f2";
  const fallbackLine = theme === "dark" ? "#2a2d33" : "#e4e4e7";

  return (
    <>
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
          padding: "20px 14px 14px",
          gap: 0,
          overflow: "hidden",
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0, padding: "0 2px", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <DoerGearMark size={38} />
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
              <span
                className="fw-display"
                style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}
              >
                Doer
              </span>
              <span
                className="fw-uc"
                style={{ color: "var(--ink-faint)", fontSize: 9, letterSpacing: "0.1em" }}
              >
                {`Version ${__APP_VERSION__}`}
              </span>
            </div>
          </div>
        </div>

        {/* Company switcher (compact, always visible) */}
        <div ref={companySwitcherRef} style={{ position: "relative", marginBottom: 12 }}>
          <button
            onClick={() => setCompanySwitcherOpen((o) => !o)}
            className="fw-card"
            style={{
              width: "100%",
              padding: "8px 10px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              background: companySwitcherOpen ? "var(--bg-raised)" : undefined,
              textAlign: "left",
              border: companySwitcherOpen ? "1px solid var(--accent)" : "1px solid var(--line-soft)",
              borderRadius: 8,
            }}
          >
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
              <span className="fw-uc" style={{ color: "var(--ink-faint)", fontSize: 8 }}>Company</span>
              <span style={{ fontWeight: 500, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {company?.name ?? "—"}
              </span>
              <span className="fw-mono" style={{ fontSize: 10, color: "var(--ink-dim)" }}>
                {company?.issuePrefix ?? ""}
              </span>
            </div>
            <svg
              width="10" height="10" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"
              style={{
                color: "var(--ink-faint)",
                flexShrink: 0,
                transform: companySwitcherOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform .15s var(--fw-ease)",
              }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {companySwitcherOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                right: 0,
                zIndex: 100,
                background: "var(--bg-raised)",
                border: "1px solid var(--line)",
                borderRadius: 10,
                boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                overflow: "hidden",
                animation: "fw-fade-in .12s var(--fw-ease)",
              }}
            >
              {companies.length > 0 && (
                <div style={{ padding: "4px 4px 2px" }}>
                  <div className="fw-uc" style={{ color: "var(--ink-faint)", padding: "4px 8px 4px", fontSize: 8 }}>
                    Switch to
                  </div>
                  {companies.map((c) => {
                    const active = c.id === company?.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedCompanyId(c.id);
                          navigate(`/${c.issuePrefix}`);
                          setCompanySwitcherOpen(false);
                        }}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "6px 8px",
                          borderRadius: 7,
                          fontSize: 12,
                          fontWeight: active ? 600 : 400,
                          color: active ? "var(--accent)" : "var(--ink)",
                          background: active ? "var(--accent-soft)" : "transparent",
                          cursor: "pointer",
                          border: "none",
                          textAlign: "left",
                        }}
                      >
                        <div
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 6,
                            background: active ? "var(--accent)" : "var(--bg-sunken)",
                            color: active ? "var(--bg)" : "var(--ink-dim)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 9,
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {c.issuePrefix.slice(0, 2)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {c.name}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              <div style={{ borderTop: companies.length > 0 ? "1px solid var(--line-soft)" : "none", padding: "2px 4px 4px" }}>
                <button
                  onClick={() => {
                    setCompanySwitcherOpen(false);
                    openOnboarding({});
                  }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 8px",
                    borderRadius: 7,
                    fontSize: 12,
                    color: "var(--accent)",
                    background: "transparent",
                    cursor: "pointer",
                    border: "none",
                    textAlign: "left",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  New company
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Scrollable nav */}
        <nav style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
          gap: 4,
          paddingRight: 2,
        }}>
          {navSections.map((section) => {
            const isCollapsed = collapsedSections.has(section.id);
            return (
              <div key={section.id} style={{ marginBottom: 4 }}>
                {/* Section header */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="fw-uc"
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "4px 6px 4px 10px",
                    border: "none",
                    background: "transparent",
                    color: "var(--ink-faint)",
                    fontSize: 8,
                    letterSpacing: "0.08em",
                    cursor: "pointer",
                    textAlign: "left",
                    borderRadius: 4,
                  }}
                >
                  <svg
                    width="8" height="8" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth={2} strokeLinecap="round"
                    style={{
                      transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                      transition: "transform .12s var(--fw-ease)",
                      flexShrink: 0,
                    }}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                  {section.label}
                </button>

                {/* Section items */}
                {!isCollapsed && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    {section.items.map((item) => {
                      const active = location.pathname === item.to ||
                        (item.to !== `/${prefix}` && location.pathname.startsWith(item.to));
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          end={item.to === `/${prefix}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "6px 8px",
                            borderRadius: 7,
                            fontSize: 12,
                            color: active ? "var(--ink)" : "var(--ink-dim)",
                            background: active ? "var(--bg-raised)" : "transparent",
                            border: active ? "1px solid var(--line)" : "1px solid transparent",
                            transition: "all .15s var(--fw-ease)",
                            textDecoration: "none",
                          }}
                        >
                          <Icon d={item.icon} size={13} />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer controls */}
        <div style={{
          borderTop: "1px solid var(--line-soft)",
          paddingTop: 10,
          marginTop: 8,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}>
          <button
            onClick={() => setTweaksOpen((o) => !o)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 8px",
              borderRadius: 7,
              border: "1px solid var(--line-soft)",
              color: "var(--ink-dim)",
              fontSize: 11,
              background: "var(--bg-raised)",
              cursor: "pointer",
            }}
          >
            <Icon d={I.sliders} size={11} />
            <span>Tweaks</span>
          </button>
          <NavLink
            to={`/${prefix}/company`}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 8px",
              borderRadius: 7,
              border: "1px solid var(--line-soft)",
              color: isActive ? "var(--ink)" : "var(--ink-dim)",
              fontSize: 11,
              background: isActive ? "var(--bg-raised)" : "transparent",
              textDecoration: "none",
            })}
          >
            <Icon d={I.heart} size={11} />
            <span>Company</span>
          </NavLink>
          <NavLink
            to={`/${prefix}/instance`}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 8px",
              borderRadius: 7,
              border: "1px solid var(--line-soft)",
              color: isActive ? "var(--ink)" : "var(--ink-dim)",
              fontSize: 11,
              background: isActive ? "var(--bg-raised)" : "transparent",
              textDecoration: "none",
            })}
          >
            <Icon d={I.shield} size={11} />
            <span>Instance</span>
          </NavLink>
          <NavLink
            to={`/${prefix}/preferences`}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 8px",
              borderRadius: 7,
              border: "1px solid var(--line-soft)",
              color: isActive ? "var(--ink)" : "var(--ink-dim)",
              fontSize: 11,
              background: isActive ? "var(--bg-raised)" : "transparent",
              textDecoration: "none",
            })}
          >
            <Icon d={I.sliders} size={11} />
            <span>Preferences</span>
          </NavLink>
          <NavLink
            to={`/${prefix}/classic`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 8px",
              borderRadius: 7,
              border: "1px solid var(--line-soft)",
              color: "var(--ink-faint)",
              fontSize: 10,
              background: "transparent",
              textDecoration: "none",
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
              <path d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Classic UI</span>
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

      {/* Toast notifications — must live here since Fernweh doesn't use Layout */}
      <ToastViewport />

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
    <NewIssueDialog />
    <NewProjectDialog />
    <NewGoalDialog />
    <NewRoutineDialog />
    <NewAgentDialog />
    </>
  );
}
