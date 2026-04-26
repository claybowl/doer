import * as React from "react";
import { useNavigate } from "@/lib/router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/api/auth";
import { queryKeys } from "@/lib/queryKeys";
import { useTheme } from "@/context/ThemeContext";
import { usePanel } from "@/context/PanelContext";
import { useToast } from "@/context/ToastContext";
import { Avatar, Icon, I, LoadingState } from "./utils";

/* ============================================================
   FernwehPreferences — user-controllable settings.

   Scope (v1, surgical):
   - Account: identity from session, sign out.
   - Appearance: theme toggle (classic UI), pointer to Tweaks for
     Fernweh look/theme (FernwehShell owns that local state — no
     duplication).
   - Behavior: properties panel default visibility.
   - Local data: clear caches that have gone weird.
   - About: app marker + Fernweh preview note + repo link.

   No backend changes. No /api/users/me endpoint required. Everything
   here either reads a session or pokes localStorage / a context.
============================================================ */

const LOCAL_KEYS_TO_RESET: Array<{ key: string; label: string; description: string }> = [
  {
    key: "doer:recent-assignees",
    label: "Recent assignees",
    description: "List of agents you've assigned issues to most recently. Cleared on next assignment.",
  },
  {
    key: "doer:panel-visible",
    label: "Properties panel visibility",
    description: "Whether the right-hand properties panel defaults to open or closed.",
  },
  {
    key: "doer:inbox:last-tab",
    label: "Inbox last tab",
    description: "Which inbox tab Fernweh restores when you open Inbox.",
  },
  // Theme + Fernweh look/theme are intentionally NOT in this list — clearing
  // them silently would surprise the user. Toggle them in Appearance instead.
];

export function FernwehPreferences() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { theme, toggleTheme } = useTheme();
  const { panelVisible, setPanelVisible } = usePanel();
  const { pushToast } = useToast();

  const sessionQuery = useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: () => authApi.getSession(),
  });

  const [signingOut, setSigningOut] = React.useState(false);
  const [resetting, setResetting] = React.useState<string | null>(null);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await authApi.signOut();
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.session });
      navigate("/auth");
    } catch (err) {
      pushToast({
        title: "Sign out failed",
        body: err instanceof Error ? err.message : "Doer could not end the session.",
        tone: "error",
      });
      setSigningOut(false);
    }
  }

  function clearLocalKey(key: string, label: string) {
    setResetting(key);
    try {
      localStorage.removeItem(key);
      // Also clear keys that share the prefix (e.g. project-tab keys are
      // namespaced per-project, so we want a wildcard sweep for those).
      if (key === "doer:panel-visible") {
        // panel-visible is single-key; nothing to sweep.
      }
      pushToast({
        title: `Cleared ${label}`,
        body: "Reload the page to take effect.",
        tone: "success",
      });
    } catch (err) {
      pushToast({
        title: `Could not clear ${label}`,
        body: err instanceof Error ? err.message : "localStorage write failed.",
        tone: "error",
      });
    } finally {
      setResetting(null);
    }
  }

  function clearProjectTabMemory() {
    setResetting("project-tabs");
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("doer:project-tab:")) keys.push(k);
      }
      keys.forEach((k) => localStorage.removeItem(k));
      pushToast({
        title: "Cleared project tab memory",
        body: `${keys.length} entr${keys.length === 1 ? "y" : "ies"} removed. Reload to take effect.`,
        tone: "success",
      });
    } catch (err) {
      pushToast({
        title: "Could not clear project tab memory",
        body: err instanceof Error ? err.message : "localStorage write failed.",
        tone: "error",
      });
    } finally {
      setResetting(null);
    }
  }

  const session = sessionQuery.data;
  const userName = session?.user.name ?? "(unnamed)";
  const userEmail = session?.user.email ?? "(no email on file)";

  return (
    <div style={{ padding: "28px 32px", maxWidth: 760, display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Page header */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <h1 className="fw-display" style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>
          Preferences
        </h1>
        <p style={{ fontSize: 13, color: "var(--ink-faint)", margin: 0 }}>
          Personal settings for this Doer instance. Company-level and instance-level config live elsewhere.
        </p>
      </div>

      {/* ── Account ─────────────────────────────────────────── */}
      <Section title="Account" icon={I.heart}>
        {sessionQuery.isLoading ? (
          <LoadingState label="Loading session…" />
        ) : session ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0" }}>
            <Avatar name={userName} size={40} />
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.3, flex: 1 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{userName}</span>
              <span className="fw-mono" style={{ fontSize: 11, color: "var(--ink-dim)" }}>
                {userEmail}
              </span>
            </div>
            <FwButton
              tone="danger"
              onClick={handleSignOut}
              disabled={signingOut}
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </FwButton>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: "var(--ink-dim)" }}>
            No active session. <a href="/auth" style={{ color: "var(--accent)" }}>Sign in</a>.
          </p>
        )}
      </Section>

      {/* ── Appearance ──────────────────────────────────────── */}
      <Section title="Appearance" icon={I.sliders}>
        <Row
          label="Classic UI theme"
          description="Light or dark for the non-Fernweh boards (board view, classic dashboard)."
        >
          <FwButton onClick={toggleTheme}>
            {theme === "dark" ? "Switch to light" : "Switch to dark"}
          </FwButton>
        </Row>
        <Row
          label="Fernweh look & theme"
          description="Aesthetic — Atrium / Telegraph / Meridian + light/dark — lives in the Tweaks button at the bottom of your sidebar."
        >
          <span className="fw-mono" style={{ fontSize: 11, color: "var(--ink-dim)" }}>
            ← sidebar · Tweaks
          </span>
        </Row>
      </Section>

      {/* ── Behavior ────────────────────────────────────────── */}
      <Section title="Behavior" icon={I.bolt}>
        <Row
          label="Properties panel"
          description="Right-hand panel that shows context for the currently-selected item. Defaults to your last setting."
        >
          <FwButton onClick={() => setPanelVisible(!panelVisible)}>
            {panelVisible ? "Hide by default" : "Show by default"}
          </FwButton>
        </Row>
      </Section>

      {/* ── Local data ──────────────────────────────────────── */}
      <Section title="Local data" icon={I.brain}>
        <p style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 0, marginBottom: 12 }}>
          Cached preferences stored in this browser. Clear if something feels weird.
        </p>
        {LOCAL_KEYS_TO_RESET.map((entry) => (
          <Row
            key={entry.key}
            label={entry.label}
            description={entry.description}
            mono={entry.key}
          >
            <FwButton
              tone="ghost"
              onClick={() => clearLocalKey(entry.key, entry.label)}
              disabled={resetting === entry.key}
            >
              Clear
            </FwButton>
          </Row>
        ))}
        <Row
          label="Project tab memory"
          description="Per-project tab Fernweh restores when reopening a project. Wildcard sweep across all projects."
          mono="doer:project-tab:*"
        >
          <FwButton
            tone="ghost"
            onClick={clearProjectTabMemory}
            disabled={resetting === "project-tabs"}
          >
            Clear all
          </FwButton>
        </Row>
      </Section>

      {/* ── About ───────────────────────────────────────────── */}
      <Section title="About" icon={I.stack}>
        <Row
          label="Doer"
          description="Open-source orchestration for AI-agent companies."
        >
          <a
            href="https://github.com/claybowl/Doer"
            target="_blank"
            rel="noreferrer"
            className="fw-mono"
            style={{ fontSize: 11, color: "var(--accent)", textDecoration: "none" }}
          >
            github.com/claybowl/Doer ↗
          </a>
        </Row>
        <Row
          label="Fernweh"
          description="In-product UI preview. Active development; expect movement."
        >
          <span
            className="fw-uc"
            style={{
              padding: "2px 8px",
              borderRadius: 4,
              border: "1px solid var(--line)",
              fontSize: 10,
              color: "var(--ink-dim)",
            }}
          >
            preview
          </span>
        </Row>
      </Section>
    </div>
  );
}

// ── Section primitives (local, page-only) ─────────────────────

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <section className="fw-card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--ink-faint)" }}>
        <Icon d={icon} size={13} />
        <span className="fw-uc" style={{ fontSize: 11, letterSpacing: "0.08em" }}>
          {title}
        </span>
      </header>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {children}
      </div>
    </section>
  );
}

function Row({
  label,
  description,
  mono,
  children,
}: {
  label: string;
  description?: string;
  mono?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 16,
        padding: "10px 0",
        borderBottom: "1px solid var(--line)",
      }}
    >
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
        {description && (
          <span style={{ fontSize: 12, color: "var(--ink-dim)" }}>{description}</span>
        )}
        {mono && (
          <span
            className="fw-mono"
            style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 2 }}
          >
            {mono}
          </span>
        )}
      </div>
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>{children}</div>
    </div>
  );
}

function FwButton({
  children,
  onClick,
  disabled,
  tone = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "ghost" | "danger";
}) {
  const styles: React.CSSProperties = {
    padding: "6px 12px",
    borderRadius: 6,
    fontSize: 12,
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all .15s var(--fw-ease)",
    opacity: disabled ? 0.6 : 1,
    whiteSpace: "nowrap",
  };
  if (tone === "danger") {
    Object.assign(styles, {
      background: "transparent",
      border: "1px solid var(--line)",
      color: "var(--ink)",
    });
  } else if (tone === "ghost") {
    Object.assign(styles, {
      background: "transparent",
      border: "1px solid transparent",
      color: "var(--ink-dim)",
    });
  } else {
    Object.assign(styles, {
      background: "var(--bg-raised)",
      border: "1px solid var(--line)",
      color: "var(--ink)",
    });
  }
  return (
    <button onClick={onClick} disabled={disabled} style={styles}>
      {children}
    </button>
  );
}
