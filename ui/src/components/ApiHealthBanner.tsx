import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { healthApi } from "@/api/health";

/**
 * Tiny red banner that surfaces "backend is unreachable" without making the
 * user open DevTools. Polls /api/health every 10s; renders only when the
 * query is in error state AND hasn't recovered yet.
 *
 * Dismiss is session-local (sessionStorage) — we don't want a permanent
 * dismiss because the whole point is to make outages loud.
 *
 * Kept intentionally minimal so it composes with any route and never
 * interferes with Fernweh's token scope.
 */

const SESSION_DISMISS_KEY = "doer.apiBanner.dismissedAt";
const DISMISS_WINDOW_MS = 60_000; // re-show if still down after 1 min

function readDismissedAt(): number | null {
  try {
    const raw = sessionStorage.getItem(SESSION_DISMISS_KEY);
    if (!raw) return null;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function writeDismissedAt(t: number) {
  try {
    sessionStorage.setItem(SESSION_DISMISS_KEY, String(t));
  } catch {
    /* ignore */
  }
}

function clearDismissed() {
  try {
    sessionStorage.removeItem(SESSION_DISMISS_KEY);
  } catch {
    /* ignore */
  }
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function ApiHealthBanner() {
  const [now, setNow] = React.useState(() => Date.now());
  const [dismissedAt, setDismissedAt] = React.useState<number | null>(() => readDismissedAt());

  // Tick every 5s so the "last checked Xs ago" stays live and the dismiss
  // window re-evaluates without waiting for a query refetch.
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 5_000);
    return () => window.clearInterval(id);
  }, []);

  const query = useQuery({
    queryKey: ["health-banner"],
    queryFn: () => healthApi.get(),
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
    retry: false,
    // Don't gate on window focus — we want background health signal too.
    refetchOnWindowFocus: true,
  });

  // When the API comes back, clear the dismiss state so the next outage is
  // visible again without a reload.
  React.useEffect(() => {
    if (!query.isError && dismissedAt !== null) {
      clearDismissed();
      setDismissedAt(null);
    }
  }, [query.isError, dismissedAt]);

  if (!query.isError) return null;

  const silenced =
    dismissedAt !== null && now - dismissedAt < DISMISS_WINDOW_MS;
  if (silenced) return null;

  const error = query.error instanceof Error ? query.error : null;
  const lastTried = query.dataUpdatedAt
    ? formatTime(new Date(query.dataUpdatedAt))
    : query.errorUpdatedAt
    ? formatTime(new Date(query.errorUpdatedAt))
    : "—";

  const handleDismiss = () => {
    const t = Date.now();
    writeDismissedAt(t);
    setDismissedAt(t);
  };

  return (
    <div
      role="alert"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 14px",
        background: "#ef4444",
        color: "#ffffff",
        fontSize: 12.5,
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
        boxShadow: "0 1px 0 rgba(0,0,0,0.1)",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          flex: 1,
          minWidth: 0,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: "#ffffff",
            display: "inline-block",
            animation: "doer-api-banner-pulse 1.4s ease-in-out infinite",
          }}
        />
        <strong style={{ fontWeight: 600 }}>Backend unreachable</strong>
        <span style={{ opacity: 0.9, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          · <code style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>GET /api/health</code>
          {error ? ` — ${error.message}` : ""}
        </span>
        <span style={{ opacity: 0.75, whiteSpace: "nowrap" }}>
          · last checked {lastTried}
        </span>
      </span>
      <button
        onClick={() => query.refetch()}
        style={{
          padding: "4px 10px",
          borderRadius: 6,
          border: "1px solid rgba(255,255,255,0.45)",
          background: "rgba(255,255,255,0.12)",
          color: "#ffffff",
          fontSize: 11.5,
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        Retry now
      </button>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        title="Silence for 1 minute"
        style={{
          padding: "4px 8px",
          borderRadius: 6,
          border: "1px solid rgba(255,255,255,0.35)",
          background: "transparent",
          color: "#ffffff",
          fontSize: 11.5,
          cursor: "pointer",
        }}
      >
        Dismiss
      </button>
      <style>{`
        @keyframes doer-api-banner-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(0.88); }
        }
      `}</style>
    </div>
  );
}
