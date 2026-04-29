import * as React from "react";
import { Link } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import { companiesApi } from "@/api/companies";
import { companySkillsApi } from "@/api/companySkills";
import { useCompany } from "@/context/CompanyContext";
import { queryKeys } from "@/lib/queryKeys";
import { Icon, I, ErrorState } from "./utils";

/* ============================================================
   FernwehCompanySettings — per-company config hub.

   Four categories (the task #39 spec): branding, skills,
   export, import.

   Mirrors the FernwehInstanceSettings hub-and-spokes design:
   each card surfaces a live stat and links to the canonical
   classic editing page. The deep editing UIs already exist
   and are stable — porting them to native Fernweh would
   duplicate state without adding function.
============================================================ */

export function FernwehCompanySettings() {
  const { selectedCompany, selectedCompanyId } = useCompany();

  const companyQuery = useQuery({
    queryKey: queryKeys.companies.detail(selectedCompanyId ?? ""),
    queryFn: () => companiesApi.get(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const skillsQuery = useQuery({
    queryKey: queryKeys.companySkills.list(selectedCompanyId ?? ""),
    queryFn: () => companySkillsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const company = companyQuery.data ?? selectedCompany;
  const prefix = company?.issuePrefix ?? "";

  // Branding stats — count which fields are customized vs default.
  const brandingStats = React.useMemo(() => {
    if (!company) return { configured: 0, fields: 4 };
    // Best-effort guess at "what's customized" — if Company shape
    // exposes branding fields, count the truthy ones. Fall back to
    // a generic "configured" if we can't introspect.
    const branded = company as unknown as Record<string, unknown>;
    const candidates = ["brandColor", "brandLogoUrl", "tagline", "displayName"];
    const configured = candidates.filter((k) => {
      const v = branded[k];
      return typeof v === "string" && v.trim().length > 0;
    }).length;
    return { configured, fields: candidates.length };
  }, [company]);

  const skillsStats = React.useMemo(() => {
    const all = skillsQuery.data ?? [];
    // "Active" = attached to at least one agent. CompanySkillListItem
    // doesn't carry a status field; attachedAgentCount is the right
    // proxy for "this skill is actually doing something."
    const active = all.filter((s) => (s.attachedAgentCount ?? 0) > 0).length;
    return { total: all.length, active };
  }, [skillsQuery.data]);

  if (!selectedCompanyId) {
    return (
      <div style={{ padding: "28px 32px", maxWidth: 760 }}>
        <p style={{ fontSize: 13, color: "var(--ink-dim)" }}>
          Select a company first to configure its settings.
        </p>
      </div>
    );
  }

  const categories: CategoryDef[] = [
    {
      id: "branding",
      title: "Branding",
      icon: I.heart,
      description:
        "Display name, logo, brand color, and tagline. Used in invites, exported board pages, and Fernweh chrome.",
      stat: companyQuery.isLoading
        ? "Loading…"
        : companyQuery.error
          ? "—"
          : brandingStats.configured === 0
            ? "Defaults — nothing customized"
            : `${brandingStats.configured} of ${brandingStats.fields} fields customized`,
      href: `/${prefix}/company/branding`,
    },
    {
      id: "skills",
      title: "Skills",
      icon: I.brain,
      description:
        "Reusable agent skills scoped to this company. Author, version, scan from project sources, and roll out to agents.",
      stat: skillsQuery.isLoading
        ? "Loading…"
        : skillsQuery.error
          ? "—"
          : `${skillsStats.active} attached to agents · ${skillsStats.total} total`,
      href: `/${prefix}/company/skills`,
    },
    {
      id: "webhooks",
      title: "Webhooks",
      icon: I.bolt,
      description:
        "Outbound HTTP webhooks for events like agent heartbeats, issue state changes, and approvals. Manage endpoints, rotate secrets, and inspect delivery logs.",
      stat: "Manage endpoints",
      href: `/${prefix}/company/webhooks`,
    },
    {
      id: "export",
      title: "Export",
      icon: I.arrow,
      description:
        "Package this company — agents, skills, projects, goals, routines, memory bindings — into a portable bundle. Ship to other Doer instances.",
      stat: "Generate a package",
      href: `/${prefix}/company/export`,
    },
    {
      id: "import",
      title: "Import",
      icon: I.stack,
      description:
        "Restore a company package into this instance. Preview the contents, resolve conflicts, and choose new vs existing target.",
      stat: "Restore from a package",
      href: `/${prefix}/company/import`,
    },
  ];

  return (
    <div style={{ padding: "28px 32px", maxWidth: 920, display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <h1 className="fw-display" style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>
          Company Settings
        </h1>
        <p style={{ fontSize: 13, color: "var(--ink-faint)", margin: 0 }}>
          Per-company configuration for{" "}
          <strong style={{ color: "var(--ink)" }}>{company?.name ?? "this company"}</strong>.
          Instance-wide defaults live under Instance Settings.
        </p>
      </div>

      {/* Grid */}
      {companyQuery.error && skillsQuery.error ? (
        <ErrorState
          error={companyQuery.error}
          hint="Could not reach the Doer API for company settings."
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 14,
          }}
        >
          {categories.map((c) => (
            <CategoryCard key={c.id} category={c} />
          ))}
        </div>
      )}

      {/* Footer */}
      <p style={{ fontSize: 11, color: "var(--ink-faint)", margin: 0, lineHeight: 1.5 }}>
        Export and Import open in the classic Doer UI. Branding, Skills, and Webhooks are fully native to Fernweh.
      </p>
    </div>
  );
}

// ── Category card ─────────────────────────────────────────────

interface CategoryDef {
  id: string;
  title: string;
  icon: string;
  description: string;
  stat: string;
  href: string;
}

function CategoryCard({ category }: { category: CategoryDef }) {
  return (
    <Link
      to={category.href}
      className="fw-card"
      style={{
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        textDecoration: "none",
        color: "var(--ink)",
        transition: "transform .15s var(--fw-ease), border-color .15s var(--fw-ease)",
      }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--ink-faint)" }}>
        <Icon d={category.icon} size={14} />
        <span className="fw-uc" style={{ fontSize: 11, letterSpacing: "0.08em" }}>
          {category.title}
        </span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--ink-dim)" }}>
          Configure →
        </span>
      </header>

      <p style={{ fontSize: 12, color: "var(--ink-dim)", margin: 0, lineHeight: 1.5 }}>
        {category.description}
      </p>

      <div
        className="fw-mono"
        style={{
          fontSize: 11,
          color: "var(--ink-faint)",
          marginTop: "auto",
          paddingTop: 6,
          borderTop: "1px solid var(--line)",
        }}
      >
        {category.stat}
      </div>
    </Link>
  );
}
