// packages/plugins/council/src/ui/CouncilPage.tsx
import { useEffect, useState } from "react";
import {
  usePluginData,
  usePluginAction,
  type PluginPageProps,
} from "@doerai/plugin-sdk/ui";
import type { CouncilSession } from "@doerai/shared";
import { DATA_KEYS, ACTION_KEYS } from "../constants.js";

const STATUS_COLOR: Record<string, string> = {
  pending: "var(--ink-dim)",
  running: "var(--pulse, #22d3ee)",
  completed: "var(--accent)",
  failed: "var(--danger, #ef4444)",
  completed_with_errors: "var(--warn, #f59e0b)",
};

function SessionRow({
  session,
  onSelect,
}: {
  session: CouncilSession;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      onClick={() => onSelect(session.id)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 14px",
        borderBottom: "1px solid var(--border)",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 14, color: "var(--foreground)" }}>
          {session.sessionTypeId.replace(/_/g, " ")}
        </span>
        <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
          {session.createdAt.slice(0, 16).replace("T", " ")} · {session.triggeredBy}
        </span>
      </div>
      <span
        style={{
          color: STATUS_COLOR[session.status] ?? "var(--muted-foreground)",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {session.status}
      </span>
    </div>
  );
}

export function CouncilPage({ context }: PluginPageProps) {
  const companyId = context.companyId;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const { data: sessions, loading } = usePluginData<CouncilSession[]>(
    DATA_KEYS.sessions,
    { companyId },
  );
  const trigger = usePluginAction(ACTION_KEYS.trigger);

  async function handleTrigger() {
    if (!companyId || isPending) return;
    setIsPending(true);
    try {
      await trigger({ companyId, sessionTypeId: "full_council", triggeredBy: "manual" });
    } finally {
      setIsPending(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 24, color: "var(--muted-foreground)" }}>Loading sessions…</div>
    );
  }

  const sessionList = sessions ?? [];

  if (selectedId) {
    return (
      <CouncilSessionDetailInline
        sessionId={selectedId}
        companyId={companyId ?? ""}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)" }}>
          Council Sessions
        </span>
        <button
          onClick={handleTrigger}
          disabled={isPending || !companyId}
          style={{
            cursor: isPending ? "not-allowed" : "pointer",
            padding: "6px 14px",
            fontSize: 13,
            opacity: isPending ? 0.6 : 1,
            background: "var(--primary)",
            color: "var(--primary-foreground)",
            border: "none",
            borderRadius: "var(--radius)",
          }}
        >
          {isPending ? "Starting…" : "Start Session"}
        </button>
      </div>

      {sessionList.length === 0 ? (
        <div
          style={{
            padding: 32,
            textAlign: "center",
            color: "var(--muted-foreground)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
          }}
        >
          No sessions yet. Start one above.
        </div>
      ) : (
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            overflow: "hidden",
          }}
        >
          {sessionList.map((s) => (
            <SessionRow key={s.id} session={s} onSelect={setSelectedId} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Inline session detail ───────────────────────────────────────────────────

function CouncilSessionDetailInline({
  sessionId,
  companyId,
  onBack,
}: {
  sessionId: string;
  companyId: string;
  onBack: () => void;
}) {
  const { data: session, loading, refresh } = usePluginData<CouncilSession>(
    DATA_KEYS.session,
    { sessionId, companyId },
  );

  // Poll every 2s while session is pending or running
  useEffect(() => {
    const isActive =
      !session ||
      session.status === "pending" ||
      session.status === "running";

    if (!isActive) return;

    const interval = setInterval(() => refresh(), 2000);
    return () => clearInterval(interval);
  }, [session?.status, refresh]);

  if (loading || !session) {
    return <div style={{ padding: 24, color: "var(--muted-foreground)" }}>Loading…</div>;
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px" }}>
      <button
        onClick={onBack}
        style={{
          background: "none",
          border: "none",
          color: "var(--muted-foreground)",
          fontSize: 13,
          cursor: "pointer",
          marginBottom: 16,
        }}
      >
        ← Sessions
      </button>

      {/* Header */}
      <div
        style={{
          padding: 16,
          marginBottom: 16,
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
        }}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <span
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--muted-foreground)",
            }}
          >
            {session.sessionTypeId.replace(/_/g, " ")}
          </span>
          <span
            style={{
              color: STATUS_COLOR[session.status] ?? "var(--muted-foreground)",
              fontSize: 11,
              textTransform: "uppercase",
            }}
          >
            {session.status}
          </span>
        </div>
        <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
          {session.createdAt.slice(0, 16).replace("T", " ")} · triggered by{" "}
          {session.triggeredBy}
        </div>
      </div>

      {/* Transcript */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--muted-foreground)",
            marginBottom: 8,
          }}
        >
          Transcript ({session.transcript.length} addresses)
        </div>
        {session.transcript.map((addr, i) => (
          <div
            key={i}
            style={{
              padding: 14,
              marginBottom: 8,
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 13 }}>{addr.agentName}</span>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--muted-foreground)",
                  textTransform: "uppercase",
                }}
              >
                {addr.role}
              </span>
            </div>
            <pre
              style={{
                fontSize: 12,
                color: "var(--muted-foreground)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                margin: 0,
                fontFamily: "inherit",
              }}
            >
              {addr.content.slice(0, 800)}
              {addr.content.length > 800 ? "…" : ""}
            </pre>
            {addr.issueProposals.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 12, color: "var(--muted-foreground)" }}>
                {addr.issueProposals.length} proposal
                {addr.issueProposals.length !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Decision + Issues */}
      {session.decision && (
        <div>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--muted-foreground)",
              marginBottom: 8,
            }}
          >
            Decision
          </div>
          <div
            style={{
              padding: 14,
              marginBottom: 12,
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
            }}
          >
            <p style={{ fontSize: 13, color: "var(--foreground)", margin: 0 }}>
              {session.decision.summary}
            </p>
          </div>
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--muted-foreground)",
              marginBottom: 8,
            }}
          >
            Issues Created ({session.issuesCreated.length})
          </div>
          {session.decision.issueProposals.map((p, i) => (
            <div
              key={i}
              style={{
                padding: "10px 14px",
                marginBottom: 6,
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 13, color: "var(--foreground)" }}>{p.title}</span>
              {p.priority && (
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--muted-foreground)",
                    textTransform: "uppercase",
                  }}
                >
                  {p.priority}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
