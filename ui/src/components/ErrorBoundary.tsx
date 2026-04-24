import * as React from "react";

/**
 * Top-level error boundary.
 *
 * Why this exists: Fernweh + classic share a single SPA. Without a boundary,
 * any render-throw anywhere in the tree unmounts the root and paints a
 * white screen, which is indistinguishable from a dead backend. This
 * component surfaces the actual error message + a reset button so we can
 * tell "the code crashed" from "the server is down" without opening DevTools.
 *
 * Scope: wraps <Routes> in App.tsx. Route transitions do not auto-reset
 * (React has no way to know the new route is a retry); we expose a reset
 * button and also listen for pathname changes via a sibling effect.
 */

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional render override; if provided, replaces the default panel. */
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      error:
        error instanceof Error
          ? error
          : new Error(typeof error === "string" ? error : "Unknown render error"),
    };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    // Keep the console signal strong — dev tools should still show the full
    // error + component stack even though we're swallowing the unmount.
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback(error, this.reset);
    }

    return <DefaultErrorPanel error={error} onReset={this.reset} />;
  }
}

function DefaultErrorPanel({ error, onReset }: { error: Error; onReset: () => void }) {
  return (
    <div
      role="alert"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "var(--background, #0b0d10)",
        color: "var(--foreground, #e8e8ec)",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 680,
          width: "100%",
          border: "1px solid rgba(239,68,68,0.35)",
          background:
            "color-mix(in oklab, #ef4444 8%, var(--background, #0b0d10))",
          borderRadius: 12,
          padding: "20px 22px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "#ef4444",
            fontWeight: 600,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: "#ef4444",
              display: "inline-block",
            }}
          />
          Render error
        </div>
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
          Something crashed while rendering this page.
        </h1>
        <p
          style={{
            fontSize: 13,
            margin: 0,
            opacity: 0.8,
            lineHeight: 1.5,
          }}
        >
          This is a frontend error, not a server outage. If the API is also
          down you'll see a red banner at the top of the app. The full stack
          trace is in DevTools → Console.
        </p>
        <pre
          style={{
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, 'JetBrains Mono', monospace",
            fontSize: 12,
            margin: 0,
            padding: "12px 14px",
            background: "rgba(0,0,0,0.35)",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.06)",
            overflow: "auto",
            maxHeight: 220,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {error.name}: {error.message}
          {error.stack ? `\n\n${error.stack}` : ""}
        </pre>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={onReset}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.06)",
              color: "inherit",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "transparent",
              color: "inherit",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Reload page
          </button>
          <button
            onClick={() => {
              // Help Clay during dev: copy the full error to clipboard so he
              // can paste it back to me without retyping.
              const payload = `${error.name}: ${error.message}\n\n${error.stack ?? ""}`;
              navigator.clipboard?.writeText(payload).catch(() => {});
            }}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "transparent",
              color: "inherit",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Copy error
          </button>
        </div>
      </div>
    </div>
  );
}
