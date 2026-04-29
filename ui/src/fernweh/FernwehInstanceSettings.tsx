import * as React from "react";
import { Link } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import { heartbeatsApi } from "@/api/heartbeats";
import { pluginsApi } from "@/api/plugins";
import { adaptersApi } from "@/api/adapters";
import { instanceSettingsApi } from "@/api/instanceSettings";
import { queryKeys } from "@/lib/queryKeys";
import { Icon, I, ErrorState } from "./utils";

/* ============================================================
   FernwehInstanceSettings — instance-level config hub.

   Five categories (the task #38 spec): heartbeats, plugins,
   adapters, experimental, general.

   Design: hub-and-spokes.
   - This page is a Fernweh-native landing surface. Each
     category is a card with live stats + a "Configure" link.
   - The DEEP editing UIs (InstanceSettings, PluginManager,
     AdapterManager, InstanceGeneralSettings,
     InstanceExperimentalSettings) already exist in classic
     UI and are kept as canonical. Reskinning them in Fernweh
     would duplicate state without adding function.
   - Future iterations can port individual category pages to
     native Fernweh as usage demands.

   Mirrors the FernwehPreferences pattern: native Fernweh
   landing, surfaces existing capability.
============================================================ */

export function FernwehInstanceSettings() {
  const heartbeatsQuery = useQuery({
    queryKey: queryKeys.instance.schedulerHeartbeats,
    queryFn: () => heartbeatsApi.listInstanceSchedulerAgents(),
  });

  const pluginsQuery = useQuery({
    queryKey: queryKeys.plugins.all,
    queryFn: () => pluginsApi.list(),
  });

  const adaptersQuery = useQuery({
    queryKey: queryKeys.adapters.all,
    queryFn: () => adaptersApi.list(),
  });

  const generalQuery = useQuery({
    queryKey: queryKeys.instance.generalSettings,
    queryFn: () => instanceSettingsApi.getGeneral(),
  });

  const experimentalQuery = useQuery({
    queryKey: queryKeys.instance.experimentalSettings,
    queryFn: () => instanceSettingsApi.getExperimental(),
  });

  const heartbeatStats = React.useMemo(() => {
    const all = heartbeatsQuery.data ?? [];
    const active = all.filter((a) => a.schedulerActive).length;
    const enabled = all.filter((a) => a.heartbeatEnabled).length;
    return { total: all.length, active, enabled };
  }, [heartbeatsQuery.data]);

  const pluginStats = React.useMemo(() => {
    const all = pluginsQuery.data ?? [];
    const ready = all.filter((p: { status?: string }) => p.status === "ready").length;
    return { total: all.length, ready };
  }, [pluginsQuery.data]);

  const adapterStats = React.useMemo(() => {
    const all = adaptersQuery.data ?? [];
    return { total: all.length };
  }, [adaptersQuery.data]);

  const experimentalStats = React.useMemo(() => {
    const data = experimentalQuery.data;
    if (!data || typeof data !== "object") return { enabled: 0, total: 0 };
    // InstanceExperimentalSettings is a typed record; coerce through
    // unknown to safely iterate its boolean feature flags without
    // having to know the exact shape here.
    const entries = Object.entries(data as unknown as Record<string, unknown>);
    const flags = entries.filter(([, v]) => typeof v === "boolean");
    const enabled = flags.filter(([, v]) => v === true).length;
    return { enabled, total: flags.length };
  }, [experimentalQuery.data]);

  const generalReady = !generalQuery.isLoading && !generalQuery.error;

  const categories: CategoryDef[] = [
    {
      id: "heartbeats",
      title: "Heartbeats",
      icon: I.clock,
      description:
        "Scheduler-driven wakes for every agent across every company. Toggle individual agents or pause everything in one click.",
      stat: heartbeatsQuery.isLoading
        ? "Loading…"
        : heartbeatsQuery.error
          ? "—"
          : `${heartbeatStats.active} active · ${heartbeatStats.enabled} enabled · ${heartbeatStats.total} total`,
      href: "/instance/settings/heartbeats",
    },
    {
      id: "plugins",
      title: "Plugins",
      icon: I.stack,
      description:
        "Installable extensions that add tools, skills, or UI surfaces to Doer. Configure secrets, capabilities, and per-plugin settings.",
      stat: pluginsQuery.isLoading
        ? "Loading…"
        : pluginsQuery.error
          ? "—"
          : `${pluginStats.ready} ready · ${pluginStats.total} installed`,
      href: "/instance/settings/plugins",
    },
    {
      id: "adapters",
      title: "Adapters",
      icon: I.bolt,
      description:
        "Agent runtimes Doer can speak to. Per-adapter environment, model defaults, and runtime diagnostics.",
      stat: adaptersQuery.isLoading
        ? "Loading…"
        : adaptersQuery.error
          ? "—"
          : `${adapterStats.total} registered`,
      href: "/instance/settings/adapters",
    },
    {
      id: "experimental",
      title: "Experimental",
      icon: I.sliders,
      description:
        "Feature flags for in-development surfaces. Things that work but aren't load-bearing yet — opt in at your own discretion.",
      stat: experimentalQuery.isLoading
        ? "Loading…"
        : experimentalQuery.error
          ? "—"
          : experimentalStats.total === 0
            ? "No flags defined"
            : `${experimentalStats.enabled} of ${experimentalStats.total} flags on`,
      href: "/instance/settings/experimental",
    },
    {
      id: "general",
      title: "General",
      icon: I.shield,
      description:
        "Display name, default timezone, allowed hostnames, and other instance-wide defaults.",
      stat: generalQuery.isLoading
        ? "Loading…"
        : generalReady
          ? "Configured"
          : "—",
      href: "/instance/settings/general",
    },
  ];

  return (
    <div style={{ padding: "28px 32px", maxWidth: 920, display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <h1 className="fw-display" style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>
          Instance Settings
        </h1>
        <p style={{ fontSize: 13, color: "var(--ink-faint)", margin: 0 }}>
          Doer-instance-wide configuration. For per-company config, see Company Settings. For personal preferences, see your sidebar Preferences link.
        </p>
      </div>

      {/* Loading / error states for the whole hub */}
      {heartbeatsQuery.error && pluginsQuery.error && adaptersQuery.error ? (
        <ErrorState
          error={heartbeatsQuery.error}
          hint="Could not reach the Doer API for instance settings."
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

      {/* Footer note explaining the hub-and-spokes pattern */}
      <p style={{ fontSize: 11, color: "var(--ink-faint)", margin: 0, lineHeight: 1.5 }}>
        Editing surfaces open in the classic Doer UI. Fernweh-native editing for
        these categories will land in a future polish pass — the existing pages
        are stable, and porting them now would add churn without function.
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
