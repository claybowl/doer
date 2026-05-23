// packages/plugins/council/src/ui/CouncilPage.tsx
import { useEffect, useState } from "react";
import {
  usePluginData,
  usePluginAction,
  type PluginPageProps,
} from "@doerai/plugin-sdk/ui";
import type {
  CouncilSession,
  SessionStatus,
  InvocationMode,
  ResolutionMode,
} from "@doerai/shared";
import { DATA_KEYS, ACTION_KEYS } from "../constants.js";

// ── Constants ─────────────────────────────────────────────────────────────────

const SESSION_TYPES = [
  {
    id: "full_council",
    label: "Full Council",
    icon: "🏛️",
    description:
      "All participants address a shared brief. Orchestrator synthesises and creates issues.",
    invocationModes: ["parallel", "sequential"] as InvocationMode[],
  },
  {
    id: "interview",
    label: "1:1 Interview",
    icon: "🎙️",
    description:
      "Orchestrator interviews a single agent (or you) with structured questions.",
    invocationModes: ["sequential"] as InvocationMode[],
  },
  {
    id: "bidding",
    label: "Bidding Session",
    icon: "🎯",
    description:
      "Blank issues are created first; agents claim them by submitting bids. Orchestrator resolves conflicts.",
    invocationModes: ["parallel"] as InvocationMode[],
  },
] as const;

const STATUS_META: Record<
  SessionStatus,
  { label: string; dot: string; pulse: boolean; textColor: string; bg: string }
> = {
  running: {
    label: "Running",
    dot: "#22d3ee",
    pulse: true,
    textColor: "#22d3ee",
    bg: "rgba(34,211,238,0.08)",
  },
  pending: {
    label: "Pending",
    dot: "#f59e0b",
    pulse: false,
    textColor: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
  },
  completed: {
    label: "Done",
    dot: "#22c55e",
    pulse: false,
    textColor: "#22c55e",
    bg: "rgba(34,197,94,0.08)",
  },
  completed_with_errors: {
    label: "Partial",
    dot: "#f97316",
    pulse: false,
    textColor: "#f97316",
    bg: "rgba(249,115,22,0.08)",
  },
  failed: {
    label: "Failed",
    dot: "#f87171",
    pulse: false,
    textColor: "#f87171",
    bg: "rgba(248,113,113,0.08)",
  },
};

const AGENT_COLORS = [
  "#7c8df0",
  "#22d3ee",
  "#a78bfa",
  "#34d399",
  "#f472b6",
  "#fb923c",
];

function agentColor(id: string | undefined): string {
  if (!id) return AGENT_COLORS[0];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffff;
  return AGENT_COLORS[Math.abs(h) % AGENT_COLORS.length];
}

function typeById(id: string) {
  return SESSION_TYPES.find((t) => t.id === id);
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso.slice(0, 16).replace("T", " ");
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusDot({ status, size = 8 }: { status: SessionStatus; size?: number }) {
  const m = STATUS_META[status] ?? STATUS_META.pending;
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: m.dot,
        flexShrink: 0,
        animation: m.pulse ? "council-pulse 1.8s ease-out infinite" : "none",
      }}
    />
  );
}

function ParticipantChip({ agentId, agentName, role }: { agentId: string; agentName: string; role: string }) {
  const color = agentColor(agentId);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 20,
        border: `1px solid ${color}44`,
        background: `${color}11`,
        color,
        fontSize: 11,
        fontWeight: 500,
      }}
    >
      {role === "orchestrator" && <span style={{ opacity: 0.7 }}>⬡ </span>}
      {agentName}
    </span>
  );
}

function TypeTag({ typeId }: { typeId: string }) {
  const t = typeById(typeId);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        color: "var(--ink-dim, #8080a0)",
        fontWeight: 500,
      }}
    >
      {t?.icon ?? "⚙️"} {t?.label ?? typeId.replace(/_/g, " ")}
    </span>
  );
}

// ── Session Card ──────────────────────────────────────────────────────────────

function SessionCard({
  session,
  onClick,
}: {
  session: CouncilSession;
  onClick: () => void;
}) {
  const m = STATUS_META[session.status] ?? STATUS_META.pending;
  const participants = deriveParticipants(session);
  const issueCount = session.issuesCreated?.length ?? 0;
  const lastEntry = session.transcript
    ?.filter((e) => e.status === "completed" && e.content)
    .slice(-1)[0];

  return (
    <>
      <style>{`
        @keyframes council-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(34,211,238,0.5); }
          70%  { box-shadow: 0 0 0 6px rgba(34,211,238,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,211,238,0); }
        }
        @keyframes council-slide-up {
          from { opacity:0; transform:translateY(12px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes council-spin {
          to { transform: rotate(360deg); }
        }
        .council-card { transition: border-color 0.15s, box-shadow 0.15s; }
        .council-card:hover { border-color: var(--accent, #7c8df0) !important; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
      `}</style>
      <div
        className="council-card"
        onClick={onClick}
        style={{
          background: "var(--bg-raised, #1c1c2e)",
          border: "1px solid var(--line, #2a2a3e)",
          borderRadius: 10,
          padding: 16,
          cursor: "pointer",
          animation: "council-slide-up 0.2s ease-out both",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 10,
          }}
        >
          <TypeTag typeId={session.sessionTypeId} />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <StatusDot status={session.status} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: m.textColor,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {m.label}
            </span>
          </div>
        </div>

        {/* Session ID */}
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 10,
            color: "var(--ink-faint, #5a5a7a)",
            marginBottom: 8,
          }}
        >
          {session.id.slice(0, 20)}
        </div>

        {/* Participants */}
        {participants.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
            {participants.map((p) => (
              <ParticipantChip
                key={p.agentId}
                agentId={p.agentId}
                agentName={p.agentName}
                role={p.role}
              />
            ))}
          </div>
        )}

        {/* Meta row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: session.error || lastEntry ? 10 : 0,
          }}
        >
          <span style={{ fontSize: 11, color: "var(--ink-faint, #5a5a7a)" }}>
            {fmtDate(session.createdAt)} · {session.invocationMode} · via{" "}
            {session.triggeredBy}
          </span>
          {session.status === "failed" ? (
            <span style={{ fontSize: 11, color: "#f87171" }}>no issues</span>
          ) : (
            <span
              style={{
                fontSize: 11,
                color: issueCount > 0 ? "#22c55e" : "var(--ink-faint, #5a5a7a)",
              }}
            >
              {issueCount > 0 ? `${issueCount} issues` : "—"}
            </span>
          )}
        </div>

        {/* Error or transcript tail */}
        {session.error ? (
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 11,
              color: "#f87171",
              background: "rgba(248,113,113,0.08)",
              border: "1px solid rgba(248,113,113,0.2)",
              borderRadius: 6,
              padding: "7px 10px",
            }}
          >
            ✕ {session.error}
          </div>
        ) : lastEntry ? (
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 11,
              color: "var(--ink-dim, #6a6a8a)",
              background: "var(--bg-sunken, #12121f)",
              borderRadius: 6,
              padding: "7px 10px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            › {lastEntry.agentName}: {lastEntry.content}
          </div>
        ) : null}
      </div>
    </>
  );
}

// ── Session Detail Modal ──────────────────────────────────────────────────────

function SessionDetailModal({
  session,
  onClose,
}: {
  session: CouncilSession;
  onClose: () => void;
}) {
  const m = STATUS_META[session.status] ?? STATUS_META.pending;
  const type = typeById(session.sessionTypeId);
  const participants = deriveParticipants(session);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-raised, #1c1c2e)",
          border: "1px solid var(--line, #2a2a3e)",
          borderRadius: 14,
          width: "100%",
          maxWidth: 680,
          maxHeight: "85vh",
          overflowY: "auto",
          animation: "council-slide-up 0.18s ease-out",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid var(--line, #2a2a3e)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 6,
              }}
            >
              <span style={{ fontSize: 18 }}>{type?.icon ?? "⚙️"}</span>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--ink, #e8e8f0)",
                }}
              >
                {type?.label ?? session.sessionTypeId}
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "2px 8px",
                  borderRadius: 20,
                  background: m.bg,
                  fontSize: 11,
                  fontWeight: 600,
                  color: m.textColor,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                <StatusDot status={session.status} size={6} />
                {m.label}
              </span>
            </div>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 10,
                color: "var(--ink-faint, #5a5a7a)",
              }}
            >
              {session.id} · {fmtDate(session.createdAt)} ·{" "}
              {session.invocationMode} · {session.resolutionMode} · via{" "}
              {session.triggeredBy}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--ink-faint, #5a5a7a)",
              fontSize: 18,
              cursor: "pointer",
              padding: 4,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {/* Participants */}
          {participants.length > 0 && (
            <div>
              <SectionLabel>Participants</SectionLabel>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {participants.map((p) => (
                  <ParticipantChip
                    key={p.agentId}
                    agentId={p.agentId}
                    agentName={p.agentName}
                    role={p.role}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Transcript */}
          <div>
            <SectionLabel>
              Transcript ({session.transcript.length} addresses)
            </SectionLabel>
            {session.transcript.length === 0 ? (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--ink-faint, #5a5a7a)",
                }}
              >
                No transcript entries yet.
              </div>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 8 }}
              >
                {session.transcript.map((entry, i) => {
                  const color = agentColor(entry.agentId);
                  return (
                    <div
                      key={i}
                      style={{
                        background: "var(--bg-sunken, #12121f)",
                        borderRadius: 8,
                        border: `1px solid ${
                          entry.status === "failed"
                            ? "rgba(248,113,113,0.3)"
                            : "var(--line-soft, #2a2a3e)"
                        }`,
                        padding: "10px 12px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: entry.content ? 6 : 0,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: color,
                              display: "inline-block",
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color,
                            }}
                          >
                            {entry.agentName}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              color: "var(--ink-faint, #5a5a7a)",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            {entry.role}
                          </span>
                        </div>
                        {entry.status === "failed" && (
                          <span
                            style={{ fontSize: 11, color: "#f87171" }}
                          >
                            ✕ {entry.error ?? "failed"}
                          </span>
                        )}
                      </div>
                      {entry.content && (
                        <div
                          style={{
                            fontFamily: "monospace",
                            fontSize: 11,
                            color: "var(--ink-dim, #c0c0d8)",
                            lineHeight: 1.6,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {entry.content.slice(0, 1000)}
                          {entry.content.length > 1000 ? "…" : ""}
                        </div>
                      )}
                      {entry.issueProposals.length > 0 && (
                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 11,
                            color: "var(--ink-faint, #5a5a7a)",
                          }}
                        >
                          {entry.issueProposals.length} proposal
                          {entry.issueProposals.length !== 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Decision */}
          {session.decision && (
            <div>
              <SectionLabel>Decision</SectionLabel>
              <div
                style={{
                  background: "rgba(34,197,94,0.06)",
                  border: "1px solid rgba(34,197,94,0.2)",
                  borderRadius: 8,
                  padding: "12px 14px",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--ink, #e8e8f0)",
                    lineHeight: 1.6,
                  }}
                >
                  {session.decision.summary}
                </div>
              </div>
            </div>
          )}

          {/* Issues created */}
          {session.issuesCreated?.length > 0 && (
            <div>
              <SectionLabel>
                Issues Created ({session.issuesCreated.length})
              </SectionLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {session.issuesCreated.map((id) => (
                  <span
                    key={id}
                    style={{
                      fontFamily: "monospace",
                      fontSize: 11,
                      padding: "3px 8px",
                      borderRadius: 5,
                      background: "var(--bg-sunken, #1a1a2e)",
                      border: "1px solid var(--line, #3a3a5a)",
                      color: "var(--accent, #7c8df0)",
                    }}
                  >
                    {id}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Error block */}
          {session.error && (
            <div
              style={{
                background: "rgba(248,113,113,0.06)",
                border: "1px solid rgba(248,113,113,0.2)",
                borderRadius: 8,
                padding: "12px 14px",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "#f87171",
                  fontFamily: "monospace",
                }}
              >
                ✕ {session.error}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Start Session Modal ───────────────────────────────────────────────────────

interface AgentItem {
  agentId: string;
  agentName: string;
  role: "orchestrator" | "member";
  included: boolean;
}

function StartSessionModal({
  companyId,
  onClose,
  onStart,
}: {
  companyId: string;
  onClose: () => void;
  onStart: (params: {
    sessionTypeId: string;
    invocationMode: InvocationMode;
    resolutionMode: ResolutionMode;
    guestPrompt?: string;
  }) => Promise<void>;
}) {
  const [step, setStep] = useState<"type" | "config">("type");
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [invocationMode, setInvocationMode] = useState<InvocationMode>("parallel");
  const [resolutionMode, setResolutionMode] = useState<ResolutionMode>("orchestrator");
  const [guestPrompt, setGuestPrompt] = useState("");
  const [isPending, setIsPending] = useState(false);

  const { data: agentsRaw, loading: agentsLoading, error: agentsError } = usePluginData<AgentItem[]>(DATA_KEYS.agents, {
    companyId,
  });
  const [participants, setParticipants] = useState<AgentItem[]>([]);

  useEffect(() => {
    if (agentsRaw) {
      setParticipants(agentsRaw.map((a) => ({ ...a, included: true })));
    }
  }, [agentsRaw]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const selectedType = SESSION_TYPES.find((t) => t.id === selectedTypeId);

  function selectType(id: string) {
    setSelectedTypeId(id);
    const t = SESSION_TYPES.find((t) => t.id === id);
    if (t) setInvocationMode(t.invocationModes[0]);
  }

  async function handleStart() {
    if (!selectedTypeId || isPending) return;
    setIsPending(true);
    try {
      await onStart({
        sessionTypeId: selectedTypeId,
        invocationMode,
        resolutionMode,
        guestPrompt: guestPrompt.trim() || undefined,
      });
      onClose();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-raised, #1c1c2e)",
          border: "1px solid var(--line, #2a2a3e)",
          borderRadius: 14,
          width: "100%",
          maxWidth: 520,
          animation: "council-slide-up 0.18s ease-out",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid var(--line, #2a2a3e)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontWeight: 600,
                fontSize: 15,
                color: "var(--ink, #e8e8f0)",
                marginBottom: 2,
              }}
            >
              Start Council Session
            </div>
            <div
              style={{ fontSize: 11, color: "var(--ink-faint, #5a5a7a)" }}
            >
              {step === "type"
                ? "Step 1 of 2 — Choose session type"
                : "Step 2 of 2 — Configure session"}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--ink-faint, #5a5a7a)",
              fontSize: 18,
              cursor: "pointer",
              padding: 4,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: "20px 24px" }}>
          {/* Step 1: Type picker */}
          {step === "type" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {SESSION_TYPES.map((t) => {
                const selected = selectedTypeId === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => selectType(t.id)}
                    style={{
                      padding: "14px 16px",
                      borderRadius: 10,
                      cursor: "pointer",
                      border: `1px solid ${
                        selected
                          ? "var(--accent, #7c8df0)"
                          : "var(--line, #2a2a3e)"
                      }`,
                      background: selected
                        ? "var(--accent-soft, rgba(124,141,240,0.08))"
                        : "var(--bg-sunken, #12121f)",
                      transition: "all 0.15s",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ fontSize: 18 }}>{t.icon}</span>
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: 13,
                          color: "var(--ink, #e8e8f0)",
                        }}
                      >
                        {t.label}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          color: "var(--ink-faint, #5a5a7a)",
                          marginLeft: "auto",
                          fontFamily: "monospace",
                        }}
                      >
                        {t.invocationModes.join(" | ")}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--ink-dim, #8080a0)",
                        lineHeight: 1.5,
                      }}
                    >
                      {t.description}
                    </div>
                  </div>
                );
              })}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: 4,
                }}
              >
                <button
                  disabled={!selectedTypeId}
                  onClick={() => setStep("config")}
                  style={{
                    padding: "8px 20px",
                    borderRadius: 8,
                    border: "none",
                    background: selectedTypeId
                      ? "var(--accent, #7c8df0)"
                      : "var(--line, #2a2a3e)",
                    color: selectedTypeId
                      ? "#fff"
                      : "var(--ink-faint, #5a5a7a)",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: selectedTypeId ? "pointer" : "not-allowed",
                    transition: "background 0.15s",
                  }}
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Config */}
          {step === "config" && selectedType && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: 18 }}
            >
              {/* Invocation mode */}
              <div>
                <SectionLabel>Invocation Mode</SectionLabel>
                <div style={{ display: "flex", gap: 8 }}>
                  {selectedType.invocationModes.map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setInvocationMode(mode)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 7,
                        border: `1px solid ${
                          invocationMode === mode
                            ? "var(--accent, #7c8df0)"
                            : "var(--line, #2a2a3e)"
                        }`,
                        background:
                          invocationMode === mode
                            ? "var(--accent-soft, rgba(124,141,240,0.08))"
                            : "var(--bg-sunken, #12121f)",
                        color:
                          invocationMode === mode
                            ? "var(--accent, #7c8df0)"
                            : "var(--ink-dim, #6a6a8a)",
                        fontWeight: 500,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      {mode === "parallel" ? "⚡ Parallel" : "→ Sequential"}
                    </button>
                  ))}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--ink-faint, #5a5a7a)",
                    marginTop: 5,
                  }}
                >
                  {invocationMode === "parallel"
                    ? "All agents are briefed simultaneously."
                    : "Agents respond one at a time, each seeing previous responses."}
                </div>
              </div>

              {/* Resolution mode */}
              <div>
                <SectionLabel>Resolution Mode</SectionLabel>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {(
                    [
                      { id: "orchestrator" as const, label: "⬡ Orchestrator decides" },
                      { id: "user_approval" as const, label: "👤 Requires your approval" },
                      { id: "auto" as const, label: "⚙️ Auto (all accepted)" },
                    ] as const
                  ).map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setResolutionMode(r.id)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 7,
                        border: `1px solid ${
                          resolutionMode === r.id
                            ? "var(--accent, #7c8df0)"
                            : "var(--line, #2a2a3e)"
                        }`,
                        background:
                          resolutionMode === r.id
                            ? "var(--accent-soft, rgba(124,141,240,0.08))"
                            : "var(--bg-sunken, #12121f)",
                        color:
                          resolutionMode === r.id
                            ? "var(--accent, #7c8df0)"
                            : "var(--ink-dim, #6a6a8a)",
                        fontWeight: 500,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Participants */}
              <div>
                <SectionLabel>Participants</SectionLabel>
                {agentsLoading ? (
                  <div style={{ fontSize: 12, color: "var(--ink-faint, #5a5a7a)" }}>Loading agents…</div>
                ) : agentsError ? (
                  <div style={{ fontSize: 12, color: "#f87171" }}>
                    Failed to load agents: {String(agentsError)}
                  </div>
                ) : participants.length === 0 ? (
                  <div style={{ fontSize: 12, color: "var(--ink-faint, #5a5a7a)" }}>
                    No agents found for this company.
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    {participants.map((p) => {
                      const color = agentColor(p.agentId);
                      return (
                        <div
                          key={p.agentId}
                          onClick={() =>
                            setParticipants((prev) =>
                              prev.map((x) =>
                                x.agentId === p.agentId
                                  ? { ...x, included: !x.included }
                                  : x,
                              ),
                            )
                          }
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "8px 12px",
                            borderRadius: 8,
                            border: `1px solid ${
                              p.included ? color + "44" : "var(--line, #2a2a3e)"
                            }`,
                            background: p.included
                              ? color + "11"
                              : "var(--bg-sunken, #12121f)",
                            cursor: "pointer",
                            transition: "all 0.15s",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: p.included ? color : "var(--line, #3a3a5a)",
                                flexShrink: 0,
                              }}
                            />
                            <span
                              style={{
                                fontWeight: 500,
                                color: p.included
                                  ? color
                                  : "var(--ink-faint, #5a5a7a)",
                                fontSize: 13,
                              }}
                            >
                              {p.agentName}
                            </span>
                            <span
                              style={{
                                fontSize: 10,
                                color: "var(--ink-faint, #5a5a7a)",
                              }}
                            >
                              {p.role === "orchestrator"
                                ? "⬡ orchestrator"
                                : "member"}
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: 11,
                              color: p.included
                                ? "#22c55e"
                                : "var(--ink-faint, #5a5a7a)",
                            }}
                          >
                            {p.included ? "✓" : "—"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Guest specialist */}
              <div>
                <SectionLabel>Guest Specialist (optional)</SectionLabel>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--ink-faint, #5a5a7a)",
                    marginBottom: 7,
                  }}
                >
                  Spin up an ephemeral one-shot agent for this session only.
                </div>
                <textarea
                  value={guestPrompt}
                  onChange={(e) => setGuestPrompt(e.target.value)}
                  placeholder="e.g. You are a security auditor reviewing the Doer API surface…"
                  rows={3}
                  style={{
                    width: "100%",
                    background: "var(--bg-sunken, #12121f)",
                    border: "1px solid var(--line, #2a2a3e)",
                    borderRadius: 8,
                    padding: "8px 10px",
                    color: "var(--ink-dim, #c0c0d8)",
                    fontSize: 12,
                    fontFamily: "monospace",
                    resize: "none",
                    outline: "none",
                  }}
                />
              </div>

              {/* Actions */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  justifyContent: "flex-end",
                  paddingTop: 4,
                }}
              >
                <button
                  onClick={() => setStep("type")}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "1px solid var(--line, #2a2a3e)",
                    background: "none",
                    color: "var(--ink-dim, #8080a0)",
                    fontWeight: 500,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  ← Back
                </button>
                <button
                  onClick={handleStart}
                  disabled={isPending}
                  style={{
                    padding: "8px 20px",
                    borderRadius: 8,
                    border: "none",
                    background: isPending
                      ? "var(--line, #2a2a3e)"
                      : "var(--accent, #7c8df0)",
                    color: isPending ? "var(--ink-faint, #5a5a7a)" : "#fff",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: isPending ? "not-allowed" : "pointer",
                  }}
                >
                  {isPending ? "Starting…" : "🚀 Start Session"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        color: "var(--ink-faint, #5a5a7a)",
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

function deriveParticipants(session: CouncilSession) {
  const seen = new Set<string>();
  const out: { agentId: string; agentName: string; role: string }[] = [];
  for (const entry of session.transcript) {
    if (!seen.has(entry.agentId)) {
      seen.add(entry.agentId);
      out.push({
        agentId: entry.agentId,
        agentName: entry.agentName,
        role: entry.role,
      });
    }
  }
  return out;
}

// ── Filter pills ──────────────────────────────────────────────────────────────

type FilterKey = "all" | SessionStatus;

const FILTERS: { id: FilterKey; label: string }[] = [
  { id: "all", label: "All" },
  { id: "running", label: "Running" },
  { id: "pending", label: "Pending" },
  { id: "completed", label: "Done" },
  { id: "completed_with_errors", label: "Partial" },
  { id: "failed", label: "Failed" },
];

// ── Main Page ─────────────────────────────────────────────────────────────────

export function CouncilPage({ context }: PluginPageProps) {
  const companyId = context.companyId as string | null;

  const { data: sessions, loading, refresh } = usePluginData<CouncilSession[]>(
    DATA_KEYS.sessions,
    { companyId },
  );
  const trigger = usePluginAction(ACTION_KEYS.trigger);

  const [filter, setFilter] = useState<FilterKey>("all");
  const [selectedSession, setSelectedSession] = useState<CouncilSession | null>(null);
  const [showStart, setShowStart] = useState(false);

  // Poll every 3s while any session is active
  useEffect(() => {
    const hasActive = (sessions ?? []).some(
      (s) => s.status === "running" || s.status === "pending",
    );
    if (!hasActive) return;
    const id = setInterval(() => void refresh(), 3000);
    return () => clearInterval(id);
  }, [sessions, refresh]);

  async function handleStart(params: {
    sessionTypeId: string;
    invocationMode: InvocationMode;
    resolutionMode: ResolutionMode;
    guestPrompt?: string;
  }) {
    await trigger({
      companyId,
      ...params,
      triggeredBy: "manual",
    });
    void refresh();
  }

  const sessionList = sessions ?? [];
  const filtered =
    filter === "all"
      ? sessionList
      : sessionList.filter((s) => s.status === filter);

  // Counts for filter pills
  const counts: Partial<Record<FilterKey, number>> = { all: sessionList.length };
  for (const s of sessionList) {
    counts[s.status] = (counts[s.status] ?? 0) + 1;
  }

  return (
    <div
      style={{
        maxWidth: 780,
        margin: "0 auto",
        padding: "28px 24px",
        fontFamily: "inherit",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "var(--ink, #e8e8f0)",
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          Council Sessions
        </h1>
        <button
          onClick={() => setShowStart(true)}
          disabled={!companyId}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            background: "var(--accent, #7c8df0)",
            color: "#fff",
            fontWeight: 600,
            fontSize: 13,
            cursor: companyId ? "pointer" : "not-allowed",
            opacity: companyId ? 1 : 0.5,
          }}
        >
          + Start Session
        </button>
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        {FILTERS.map((f) => {
          const count = counts[f.id];
          if (f.id !== "all" && !count) return null;
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                padding: "4px 12px",
                borderRadius: 20,
                border: `1px solid ${
                  active ? "var(--accent, #7c8df0)" : "var(--line, #2a2a3e)"
                }`,
                background: active
                  ? "var(--accent-soft, rgba(124,141,240,0.1))"
                  : "transparent",
                color: active
                  ? "var(--accent, #7c8df0)"
                  : "var(--ink-dim, #8080a0)",
                fontSize: 12,
                fontWeight: active ? 600 : 400,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {f.label}
              {count != null && (
                <span
                  style={{
                    marginLeft: 5,
                    fontSize: 10,
                    opacity: 0.7,
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[100, 120, 90].map((h, i) => (
            <div
              key={i}
              style={{
                height: h,
                borderRadius: 10,
                background: "var(--bg-raised, #1c1c2e)",
                border: "1px solid var(--line, #2a2a3e)",
                opacity: 0.6,
              }}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            padding: 48,
            textAlign: "center",
            color: "var(--ink-faint, #5a5a7a)",
            border: "1px solid var(--line, #2a2a3e)",
            borderRadius: 10,
            fontSize: 14,
          }}
        >
          {filter === "all"
            ? "No sessions yet. Hit + Start Session to convene the council."
            : `No ${filter.replace(/_/g, " ")} sessions.`}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              onClick={() => setSelectedSession(s)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {selectedSession && (
        <SessionDetailModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
      {showStart && companyId && (
        <StartSessionModal
          companyId={companyId}
          onClose={() => setShowStart(false)}
          onStart={handleStart}
        />
      )}
    </div>
  );
}
