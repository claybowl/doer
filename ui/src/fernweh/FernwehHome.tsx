import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { NavLink, useParams } from "@/lib/router";
import { useCompany } from "@/context/CompanyContext";
import { dashboardApi } from "@/api/dashboard";
import { queryKeys } from "@/lib/queryKeys";
import { Icon, I, formatCents } from "./utils";

/* ============================================================
   Fernweh Home — welcome / learning hub.
   Parity port of ui/src/pages/CompanyHome.tsx, re-skinned in
   Fernweh tokens. Stats strip wires to dashboardApi.summary;
   blog + docs are mock content for V1 (same as classic).
============================================================ */

type TabId = "blog" | "docs";

const TABS: Array<{ id: TabId; label: string; icon: string }> = [
  { id: "blog", label: "Blog & Updates", icon: I.stack },
  { id: "docs", label: "Documentation", icon: I.issues },
];

// [Prototype Placeholder] — mirrors classic CompanyHome mock content.
const BLOG_POSTS = [
  {
    id: "1",
    title: "Welcome to Doer — Your AI Agent Command Center",
    excerpt:
      "Get started with your first agent and learn how Doer orchestrates your automation workforce.",
    author: "Doer Team",
    date: "Apr 1, 2026",
    readTime: "4 min read",
    featured: true,
    tag: "Getting Started",
  },
  {
    id: "2",
    title: "How to Build Your First Routine",
    excerpt:
      "Routines let you schedule agent workflows. Here's how to create one in under 5 minutes.",
    author: "Doer Team",
    date: "Mar 28, 2026",
    readTime: "3 min read",
    featured: false,
    tag: "Tutorial",
  },
  {
    id: "3",
    title: "Agent Memory: What Your Agents Remember",
    excerpt:
      "Understand how Doer agents maintain context across sessions and what that means for your workflows.",
    author: "Doer Team",
    date: "Mar 25, 2026",
    readTime: "5 min read",
    featured: false,
    tag: "Deep Dive",
  },
  {
    id: "4",
    title: "Integrating External Tools with MCP Servers",
    excerpt:
      "Connect your agents to GitHub, Slack, Notion, and 50+ other tools through the MCP ecosystem.",
    author: "Doer Team",
    date: "Mar 20, 2026",
    readTime: "6 min read",
    featured: false,
    tag: "Integration",
  },
  {
    id: "5",
    title: "Security Best Practices for AI Agents",
    excerpt:
      "Keep your automation workforce secure with these essential practices and configurations.",
    author: "Doer Team",
    date: "Mar 15, 2026",
    readTime: "7 min read",
    featured: false,
    tag: "Security",
  },
];

const DOCS_SECTIONS = [
  {
    title: "Getting Started",
    items: [
      { label: "Quick Start Guide", href: "#" },
      { label: "Creating Your First Agent", href: "#" },
      { label: "Understanding Workspaces", href: "#" },
      { label: "Core Concepts", href: "#" },
    ],
  },
  {
    title: "Agents & Skills",
    items: [
      { label: "Agent Types Reference", href: "#" },
      { label: "Building Custom Skills", href: "#" },
      { label: "Memory Management", href: "#" },
      { label: "Agent Communication", href: "#" },
    ],
  },
  {
    title: "Workflows",
    items: [
      { label: "Routines & Scheduling", href: "#" },
      { label: "Triggers & Events", href: "#" },
      { label: "Conditional Logic", href: "#" },
      { label: "Error Handling", href: "#" },
    ],
  },
  {
    title: "Integrations",
    items: [
      { label: "MCP Server Setup", href: "#" },
      { label: "Slack Integration", href: "#" },
      { label: "GitHub Actions", href: "#" },
      { label: "API Webhooks", href: "#" },
    ],
  },
  {
    title: "Administration",
    items: [
      { label: "Team Management", href: "#" },
      { label: "Permissions & Roles", href: "#" },
      { label: "Audit Logs", href: "#" },
      { label: "Billing & Plans", href: "#" },
    ],
  },
];

function StatCard({
  label,
  value,
  sub,
  icon,
  pulse,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon: string;
  pulse?: boolean;
}) {
  return (
    <div
      className="fw-card"
      style={{
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--ink-faint)" }}>
        <Icon d={icon} size={12} />
        <span className="fw-uc">{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <span
          className="fw-display"
          style={{
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            fontVariantNumeric: "tabular-nums",
            color: pulse ? "var(--accent)" : "var(--ink)",
          }}
        >
          {value}
        </span>
        {sub ? (
          <span style={{ fontSize: 11, color: "var(--ink-dim)", whiteSpace: "nowrap" }}>{sub}</span>
        ) : null}
      </div>
    </div>
  );
}

function TagChip({ tag }: { tag: string }) {
  return (
    <span
      className="fw-chip"
      style={{
        fontSize: 10,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--accent)",
        borderColor: "var(--line-soft)",
        background: "color-mix(in oklab, var(--accent) 8%, var(--bg-raised))",
      }}
    >
      {tag}
    </span>
  );
}

export function FernwehHome() {
  const { companyPrefix } = useParams<{ companyPrefix: string }>();
  const { selectedCompany } = useCompany();
  const [activeTab, setActiveTab] = React.useState<TabId>("blog");

  const companyId = selectedCompany?.id;
  const summaryQuery = useQuery({
    queryKey: companyId ? queryKeys.dashboard(companyId) : ["dashboard", "none"],
    queryFn: () => dashboardApi.summary(companyId!),
    enabled: !!companyId,
    refetchInterval: 60_000,
  });

  const summary = summaryQuery.data;
  const prefix = companyPrefix ?? selectedCompany?.issuePrefix ?? "";
  const hqHref = `/${prefix}/fernweh`;
  const newAgentHref = `/${prefix}/agents/new`;
  const featured = BLOG_POSTS.find((p) => p.featured);
  const rest = BLOG_POSTS.filter((p) => !p.featured);

  return (
    <div
      style={{
        padding: "32px 36px 60px",
        display: "flex",
        flexDirection: "column",
        gap: 28,
        maxWidth: 1200,
        margin: "0 auto",
      }}
    >
      {/* Hero */}
      <section
        style={{
          position: "relative",
          borderRadius: 16,
          border: "1px solid var(--line)",
          background:
            "linear-gradient(135deg, var(--bg-raised) 0%, var(--bg) 60%, color-mix(in oklab, var(--accent) 6%, var(--bg)) 100%)",
          padding: "40px 36px 44px",
          overflow: "hidden",
        }}
      >
        {/* Ambient grid — subtle */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.04,
            pointerEvents: "none",
            backgroundImage:
              "linear-gradient(var(--ink) 1px, transparent 1px), linear-gradient(90deg, var(--ink) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* Accent orbs */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: -80,
            right: -80,
            width: 260,
            height: 260,
            borderRadius: 999,
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--accent) 35%, transparent) 0%, transparent 70%)",
            filter: "blur(40px)",
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            bottom: -80,
            left: -60,
            width: 200,
            height: 200,
            borderRadius: 999,
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--pulse) 25%, transparent) 0%, transparent 70%)",
            filter: "blur(40px)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "var(--accent)",
                color: "var(--bg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon d={I.bolt} size={16} stroke={1.8} />
            </div>
            <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
              Welcome · {selectedCompany?.name ?? "—"}
            </span>
          </div>

          <h1
            className="fw-display"
            style={{
              fontSize: 36,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              margin: 0,
              maxWidth: 640,
            }}
          >
            Your AI agent workforce,
            <br />
            <span style={{ color: "var(--accent)" }}>organized and running.</span>
          </h1>
          <p style={{ fontSize: 15, color: "var(--ink-dim)", maxWidth: 560, margin: 0 }}>
            Deploy agents, automate workflows, and scale your operations — all from one
            command center.
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              flexWrap: "wrap",
              paddingTop: 4,
            }}
          >
            <NavLink
              to={hqHref}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 14px",
                borderRadius: 8,
                background: "var(--accent)",
                color: "var(--bg)",
                fontSize: 13,
                fontWeight: 500,
                border: "1px solid var(--accent)",
              }}
            >
              <Icon d={I.home} size={13} />
              <span>Open HQ</span>
            </NavLink>
            <NavLink
              to={newAgentHref}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 14px",
                borderRadius: 8,
                background: "var(--bg-raised)",
                color: "var(--ink)",
                fontSize: 13,
                fontWeight: 500,
                border: "1px solid var(--line)",
              }}
            >
              <Icon d={I.plus} size={13} />
              <span>New Agent</span>
            </NavLink>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                color: "var(--accent)",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: "var(--pulse)",
                  animation: "fw-pulse 1.6s var(--fw-ease) infinite",
                }}
              />
              <span>All systems operational</span>
            </span>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
        }}
      >
        <StatCard
          icon={I.agents}
          label="Active Agents"
          value={summary ? summary.agents.active : "—"}
          sub={summary ? `${summary.agents.running} running` : undefined}
          pulse={summary ? summary.agents.running > 0 : false}
        />
        <StatCard
          icon={I.check}
          label="Tasks Completed"
          value={summary ? summary.tasks.done : "—"}
          sub={summary ? `${summary.tasks.open} open` : undefined}
        />
        <StatCard
          icon={I.dollar}
          label="Spend (mo)"
          value={summary ? formatCents(summary.costs.monthSpendCents) : "—"}
          sub={
            summary ? `${summary.costs.monthUtilizationPercent}% of budget` : undefined
          }
        />
        <StatCard
          icon={I.activity}
          label="Uptime"
          value="—"
          sub="coming soon"
        />
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          padding: 4,
          borderRadius: 10,
          background: "var(--bg-sunken)",
          border: "1px solid var(--line-soft)",
          width: "fit-content",
        }}
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 14px",
                borderRadius: 7,
                fontSize: 13,
                fontWeight: 500,
                color: active ? "var(--ink)" : "var(--ink-dim)",
                background: active ? "var(--bg-raised)" : "transparent",
                border: active ? "1px solid var(--line)" : "1px solid transparent",
                cursor: "pointer",
                transition: "all .15s var(--fw-ease)",
              }}
            >
              <Icon d={tab.icon} size={13} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "blog" ? (
        <section style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {featured ? (
            <article
              className="fw-card"
              style={{
                padding: 24,
                display: "flex",
                flexDirection: "column",
                gap: 14,
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <TagChip tag={featured.tag} />
                <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>{featured.date}</span>
              </div>
              <h2
                className="fw-display"
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                  margin: 0,
                  color: "var(--ink)",
                }}
              >
                {featured.title}
              </h2>
              <p style={{ fontSize: 14, color: "var(--ink-dim)", margin: 0, lineHeight: 1.5 }}>
                {featured.excerpt}
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingTop: 6,
                  borderTop: "1px solid var(--line-soft)",
                }}
              >
                <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>
                  By {featured.author}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--accent)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  Read more <Icon d={I.arrow} size={11} />
                </span>
              </div>
            </article>
          ) : null}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 12,
            }}
          >
            {rest.map((post) => (
              <article
                key={post.id}
                className="fw-card"
                style={{
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <TagChip tag={post.tag} />
                  <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                    {post.readTime}
                  </span>
                </div>
                <h3
                  className="fw-display"
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    margin: 0,
                    color: "var(--ink)",
                    lineHeight: 1.3,
                  }}
                >
                  {post.title}
                </h3>
                <p
                  style={{
                    fontSize: 12.5,
                    color: "var(--ink-dim)",
                    margin: 0,
                    lineHeight: 1.45,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {post.excerpt}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "220px 1fr",
            gap: 24,
          }}
        >
          {/* Docs sidebar */}
          <aside style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {DOCS_SECTIONS.map((section) => (
              <div key={section.title} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <h4
                  className="fw-uc"
                  style={{
                    fontSize: 11,
                    color: "var(--ink)",
                    margin: 0,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                  }}
                >
                  {section.title}
                </h4>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                  {section.items.map((item) => (
                    <li key={item.label}>
                      <a
                        href={item.href}
                        style={{
                          display: "block",
                          padding: "4px 0",
                          fontSize: 12.5,
                          color: "var(--ink-dim)",
                          textDecoration: "none",
                        }}
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </aside>

          {/* Docs content */}
          <article
            className="fw-card"
            style={{
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <h3
              className="fw-display"
              style={{ fontSize: 18, fontWeight: 600, margin: 0, color: "var(--ink)" }}
            >
              Quick Start Guide
            </h3>
            <p style={{ fontSize: 13.5, color: "var(--ink-dim)", margin: 0, lineHeight: 1.55 }}>
              Welcome to Doer! This guide will walk you through setting up your first agent
              in under 5 minutes.
            </p>

            <h4
              style={{
                fontSize: 13,
                fontWeight: 600,
                margin: 0,
                marginTop: 6,
                color: "var(--ink)",
              }}
            >
              Step 1 · Create Your First Agent
            </h4>
            <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: 0, lineHeight: 1.5 }}>
              Click the <strong style={{ color: "var(--ink)" }}>"New Agent"</strong> button in
              the sidebar to start. Give your agent a name and select its primary role.
            </p>

            <h4
              style={{
                fontSize: 13,
                fontWeight: 600,
                margin: 0,
                marginTop: 6,
                color: "var(--ink)",
              }}
            >
              Step 2 · Connect Tools
            </h4>
            <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: 0, lineHeight: 1.5 }}>
              Navigate to Skills to browse and install MCP tools. Popular options include
              Slack, GitHub, and Notion integrations.
            </p>

            <h4
              style={{
                fontSize: 13,
                fontWeight: 600,
                margin: 0,
                marginTop: 6,
                color: "var(--ink)",
              }}
            >
              Step 3 · Create a Routine
            </h4>
            <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: 0, lineHeight: 1.5 }}>
              Routines let you schedule agent tasks. Go to{" "}
              <strong style={{ color: "var(--ink)" }}>Routines</strong> and click "New Routine"
              to set up automated workflows.
            </p>

            <div
              style={{
                marginTop: 10,
                padding: "12px 14px",
                borderRadius: 10,
                background: "color-mix(in oklab, var(--accent) 8%, var(--bg-raised))",
                border: "1px solid color-mix(in oklab, var(--accent) 30%, var(--line))",
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              <Icon d={I.bolt} size={14} style={{ color: "var(--accent)", marginTop: 2 }} />
              <span style={{ fontSize: 12.5, color: "var(--ink)", lineHeight: 1.45 }}>
                <strong style={{ color: "var(--accent)" }}>Pro tip: </strong>
                Start with simple, focused agents before building complex multi-agent
                workflows.
              </span>
            </div>
          </article>
        </section>
      )}

      {/* Footer */}
      <footer
        style={{
          paddingTop: 12,
          borderTop: "1px solid var(--line-soft)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "var(--ink-faint)",
          fontSize: 11,
        }}
      >
        <Icon d={I.heart} size={11} />
        <span>Welcome to Doer · V1 content is a preview; real blog & docs coming soon.</span>
      </footer>
    </div>
  );
}
