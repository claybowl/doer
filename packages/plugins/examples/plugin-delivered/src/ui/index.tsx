import { useMemo, useState, type CSSProperties } from "react";
import {
  usePluginData,
  type PluginPageProps,
  type PluginSidebarProps,
} from "@doerai/plugin-sdk/ui";
import {
  DATA_KEYS,
  DEFAULT_WINDOW_DAYS,
  PAGE_ROUTE,
  WINDOW_OPTIONS,
} from "../constants.js";

// ---------------------------------------------------------------------------
// Types — mirror the worker response shape (kept local to avoid a runtime
// import of worker.ts into the UI bundle).
// ---------------------------------------------------------------------------

type CompletionAgent = {
  id: string;
  name: string;
  title: string | null;
  icon: string | null;
  role: string;
  status: string;
};

type CompletionGoal = {
  id: string;
  title: string;
  level: string;
};

type CompletionIssueRef = {
  id: string;
  identifier: string;
  title: string;
};

type Completion = {
  id: string;
  artifactType: "issue";
  title: string;
  summary: string | null;
  url: string | null;
  agent: CompletionAgent | null;
  issue: CompletionIssueRef;
  goal: CompletionGoal | null;
  completedAt: string | null;
  isPrimary: boolean;
};

type CompletionsResponse = {
  completions: Completion[];
  agents: CompletionAgent[];
  windowDays: number;
  generatedAt: string;
};

// ---------------------------------------------------------------------------
// Styling helpers — inline CSSProperties + host CSS custom properties. No
// Tailwind, no shadcn, no host kit imports. Keeps the plugin portable.
// ---------------------------------------------------------------------------

const layoutStack: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "20px",
};

const rowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "8px",
};

const buttonStyle: CSSProperties = {
  appearance: "none",
  border: "1px solid var(--border)",
  borderRadius: "999px",
  background: "transparent",
  color: "inherit",
  padding: "6px 12px",
  fontSize: "12px",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const activeButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: "var(--foreground)",
  color: "var(--background)",
  borderColor: "var(--foreground)",
};

const heroCardStyle: CSSProperties = {
  position: "relative",
  borderRadius: "18px",
  padding: "28px",
  border: "1px solid var(--border)",
  background:
    "linear-gradient(135deg, color-mix(in srgb, var(--accent-color, var(--foreground)) 22%, transparent) 0%, color-mix(in srgb, var(--accent-color, var(--foreground)) 6%, transparent) 100%)",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  minHeight: "220px",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: "16px",
};

const cardStyle: CSSProperties = {
  position: "relative",
  border: "1px solid var(--border)",
  borderRadius: "14px",
  padding: "16px",
  background: "var(--card, transparent)",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  minHeight: "160px",
  overflow: "hidden",
};

const mutedTextStyle: CSSProperties = {
  fontSize: "12px",
  color: "color-mix(in srgb, var(--foreground) 65%, transparent)",
};

const chipStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "2px 8px",
  borderRadius: "999px",
  fontSize: "11px",
  border: "1px solid color-mix(in srgb, var(--border) 80%, transparent)",
  background: "color-mix(in srgb, var(--foreground) 4%, transparent)",
};

const accentDotStyle = (color: string): CSSProperties => ({
  display: "inline-block",
  width: "8px",
  height: "8px",
  borderRadius: "999px",
  background: color,
  flexShrink: 0,
});

const accentBarStyle = (color: string): CSSProperties => ({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  height: "3px",
  background: color,
});

// ---------------------------------------------------------------------------
// Derived helpers
// ---------------------------------------------------------------------------

/**
 * Deterministic accent color per agent. Uses a simple string hash so the same
 * agent always gets the same hue — makes the grid scannable at a glance.
 */
function agentAccentColor(agentId: string | null | undefined): string {
  if (!agentId) return "#6b7280"; // slate fallback
  let hash = 0;
  for (let i = 0; i < agentId.length; i += 1) {
    hash = (hash * 31 + agentId.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 55%)`;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diffMs = Date.now() - then;
  const seconds = Math.max(1, Math.round(diffMs / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.round(months / 12);
  return `${years}y ago`;
}

function hostPath(companyPrefix: string | null | undefined, suffix: string): string {
  return companyPrefix ? `/${companyPrefix}${suffix}` : suffix;
}

function pluginPagePath(companyPrefix: string | null | undefined): string {
  return hostPath(companyPrefix, `/${PAGE_ROUTE}`);
}

// ---------------------------------------------------------------------------
// Page component — the main /delivered surface.
// ---------------------------------------------------------------------------

export function DeliveredPage({ context }: PluginPageProps) {
  const [windowDays, setWindowDays] = useState<number>(DEFAULT_WINDOW_DAYS);
  const [agentFilter, setAgentFilter] = useState<string | null>(null);

  const params = useMemo(
    () => ({
      companyId: context.companyId ?? "",
      windowDays,
      agentId: agentFilter ?? "",
    }),
    [context.companyId, windowDays, agentFilter],
  );

  const { data, loading, error, refresh } = usePluginData<CompletionsResponse>(
    DATA_KEYS.completions,
    params,
  );

  if (!context.companyId) {
    return (
      <div style={{ ...layoutStack, padding: "24px" }}>
        <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 700 }}>Delivered</h1>
        <p style={mutedTextStyle}>
          Select a company from the sidebar to see shipped work.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ ...layoutStack, padding: "24px" }}>
        <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 700 }}>Delivered</h1>
        <div
          style={{
            ...cardStyle,
            borderColor: "color-mix(in srgb, #dc2626 60%, var(--border))",
            background: "color-mix(in srgb, #dc2626 10%, transparent)",
          }}
        >
          <strong>Couldn't load completions</strong>
          <code style={{ fontSize: "12px" }}>{error.message}</code>
          <button style={buttonStyle} onClick={() => refresh()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const completions = data?.completions ?? [];
  const agents = data?.agents ?? [];
  const hero = completions[0] ?? null;
  const rest = completions.slice(1);

  return (
    <div style={{ ...layoutStack, padding: "24px" }}>
      <header style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "baseline" }}>
        <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 700 }}>Delivered</h1>
        <span style={mutedTextStyle}>
          Shipped work in the last {windowDays} day{windowDays === 1 ? "" : "s"} ·{" "}
          {completions.length} completion{completions.length === 1 ? "" : "s"}
        </span>
        <div style={{ marginLeft: "auto" }}>
          <button style={buttonStyle} onClick={() => refresh()} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      <section style={rowStyle}>
        <span style={{ ...mutedTextStyle, marginRight: "4px" }}>Window</span>
        {WINDOW_OPTIONS.map((days) => (
          <button
            key={days}
            style={days === windowDays ? activeButtonStyle : buttonStyle}
            onClick={() => setWindowDays(days)}
          >
            {days}d
          </button>
        ))}
      </section>

      {agents.length > 0 && (
        <section style={rowStyle}>
          <span style={{ ...mutedTextStyle, marginRight: "4px" }}>Agent</span>
          <button
            style={agentFilter === null ? activeButtonStyle : buttonStyle}
            onClick={() => setAgentFilter(null)}
          >
            All
          </button>
          {agents.map((agent) => {
            const selected = agentFilter === agent.id;
            return (
              <button
                key={agent.id}
                style={selected ? activeButtonStyle : buttonStyle}
                onClick={() => setAgentFilter(selected ? null : agent.id)}
              >
                <span style={accentDotStyle(agentAccentColor(agent.id))} />
                <span style={{ marginLeft: "6px" }}>{agent.name}</span>
              </button>
            );
          })}
        </section>
      )}

      {loading && completions.length === 0 && (
        <div style={{ ...cardStyle, alignItems: "center", justifyContent: "center" }}>
          <span style={mutedTextStyle}>Loading…</span>
        </div>
      )}

      {!loading && completions.length === 0 && (
        <div
          style={{
            ...cardStyle,
            alignItems: "center",
            justifyContent: "center",
            minHeight: "180px",
            textAlign: "center",
          }}
        >
          <strong>No completions in this window.</strong>
          <span style={mutedTextStyle}>
            Widen the window or pick a different agent to see shipped work.
          </span>
        </div>
      )}

      {hero && <HeroCard completion={hero} companyPrefix={context.companyPrefix} />}

      {rest.length > 0 && (
        <section style={gridStyle}>
          {rest.map((completion) => (
            <CompletionCard
              key={completion.id}
              completion={completion}
              companyPrefix={context.companyPrefix}
            />
          ))}
        </section>
      )}

      <footer style={{ ...mutedTextStyle, marginTop: "8px" }}>
        {data?.generatedAt && <>Generated {timeAgo(data.generatedAt)}</>}
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

function HeroCard({
  completion,
  companyPrefix,
}: {
  completion: Completion;
  companyPrefix: string | null;
}) {
  const accent = agentAccentColor(completion.agent?.id ?? null);
  const style: CSSProperties = {
    ...heroCardStyle,
    // `--accent-color` picked up by the gradient in `heroCardStyle`.
    ...(accent ? ({ ["--accent-color"]: accent } as CSSProperties) : {}),
  };
  return (
    <article style={style}>
      <div style={accentBarStyle(accent)} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
        <span style={chipStyle}>
          <span style={accentDotStyle(accent)} />
          {completion.agent?.name ?? "Unassigned"}
          {completion.agent?.title ? ` · ${completion.agent.title}` : ""}
        </span>
        {completion.goal && <span style={chipStyle}>Goal · {completion.goal.title}</span>}
        <span style={chipStyle}>{completion.issue.identifier}</span>
        <span style={{ ...chipStyle, marginLeft: "auto" }}>
          {timeAgo(completion.completedAt)}
        </span>
      </div>
      <h2 style={{ margin: 0, fontSize: "26px", fontWeight: 700, lineHeight: 1.2 }}>
        {completion.title}
      </h2>
      {completion.summary && (
        <p
          style={{
            margin: 0,
            fontSize: "14px",
            lineHeight: 1.5,
            color: "color-mix(in srgb, var(--foreground) 85%, transparent)",
            display: "-webkit-box",
            WebkitLineClamp: 4,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {completion.summary}
        </p>
      )}
      <div style={{ marginTop: "auto", display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <a
          href={hostPath(companyPrefix, `/issues/${completion.issue.identifier}`)}
          style={{ ...activeButtonStyle, textDecoration: "none" }}
        >
          Open issue
        </a>
        {completion.agent && (
          <a
            href={hostPath(companyPrefix, `/agents/${completion.agent.id}`)}
            style={{ ...buttonStyle, textDecoration: "none" }}
          >
            Agent profile
          </a>
        )}
      </div>
    </article>
  );
}

function CompletionCard({
  completion,
  companyPrefix,
}: {
  completion: Completion;
  companyPrefix: string | null;
}) {
  const accent = agentAccentColor(completion.agent?.id ?? null);
  return (
    <article style={cardStyle}>
      <div style={accentBarStyle(accent)} />
      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
        <span style={chipStyle}>
          <span style={accentDotStyle(accent)} />
          {completion.agent?.name ?? "Unassigned"}
        </span>
        <span style={{ ...chipStyle, marginLeft: "auto" }}>
          {timeAgo(completion.completedAt)}
        </span>
      </div>
      <a
        href={hostPath(companyPrefix, `/issues/${completion.issue.identifier}`)}
        style={{
          color: "inherit",
          textDecoration: "none",
          fontSize: "15px",
          fontWeight: 600,
          lineHeight: 1.35,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {completion.title}
      </a>
      {completion.summary && (
        <p
          style={{
            margin: 0,
            ...mutedTextStyle,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {completion.summary}
        </p>
      )}
      <div style={{ marginTop: "auto", ...rowStyle, gap: "6px" }}>
        <span style={{ ...mutedTextStyle, fontSize: "11px" }}>
          {completion.issue.identifier}
        </span>
        {completion.goal && (
          <span style={{ ...mutedTextStyle, fontSize: "11px" }}>· {completion.goal.title}</span>
        )}
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Sidebar link — renders in the `sidebar` slot Plugin slot outlet.
// ---------------------------------------------------------------------------

export function DeliveredSidebarLink({ context }: PluginSidebarProps) {
  const href = pluginPagePath(context.companyPrefix);
  const isActive =
    typeof window !== "undefined" && window.location.pathname === href;
  return (
    <a
      href={href}
      aria-current={isActive ? "page" : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "8px 12px",
        fontSize: "13px",
        fontWeight: 500,
        textDecoration: "none",
        color: isActive ? "var(--foreground)" : "color-mix(in srgb, var(--foreground) 82%, transparent)",
        background: isActive
          ? "color-mix(in srgb, var(--foreground) 8%, transparent)"
          : "transparent",
        borderRadius: "6px",
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20 7L9 18l-5-5" />
        <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8" />
      </svg>
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
        Delivered
      </span>
    </a>
  );
}
