import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NavLink, useParams, useNavigate } from "@/lib/router";
import { agentsApi } from "@/api/agents";
import { heartbeatsApi } from "@/api/heartbeats";
import { issuesApi } from "@/api/issues";
import { budgetsApi } from "@/api/budgets";
import { useCompany } from "@/context/CompanyContext";
import { useDialog } from "@/context/DialogContext";
import { useToast } from "@/context/ToastContext";
import type { ToastTone } from "@/context/ToastContext";
import { queryKeys } from "@/lib/queryKeys";
import type {
  AgentDetail,
  AgentSkillSnapshot,
  AgentInstructionsBundle,
  AgentInstructionsFileDetail,
  HeartbeatRun,
  Issue,
} from "@doerai/shared";
import { AGENT_ROLES, AGENT_STATUSES } from "@doerai/shared";
import {
  Avatar,
  ErrorState,
  HeartbeatRibbon,
  Icon,
  I,
  LoadingState,
  StatusChip,
  StatusDot,
  formatCents,
  formatRelative,
  type FwStatus,
  type HeartbeatAmp,
} from "./utils";
import { OutputsSection } from "./OutputsSection";
import { BudgetPolicyCard } from "@/components/BudgetPolicyCard";
import { AgentConfigForm } from "@/components/AgentConfigForm";
import { MemfsBindingsPanel } from "@/components/memfs/MemfsBindingsPanel";

/* ============================================================
   FernwehAgentDetail — full-parity agent detail page.
   Route: /:companyPrefix/agents/:agentId
          /:companyPrefix/agents/:agentId/:tab

   Tabs: overview | instructions | skills | configuration | memory | runs | budget
============================================================ */

type AgentTab = "overview" | "instructions" | "skills" | "configuration" | "memory" | "runs" | "budget";

const ALL_TABS: { id: AgentTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "instructions", label: "Instructions" },
  { id: "skills", label: "Skills" },
  { id: "configuration", label: "Configuration" },
  { id: "memory", label: "Memory" },
  { id: "runs", label: "Runs" },
  { id: "budget", label: "Budget" },
];

function parseTab(raw: string | undefined): AgentTab {
  if (raw === "instructions" || raw === "skills" || raw === "configuration" ||
      raw === "memory" || raw === "runs" || raw === "budget") return raw;
  return "overview";
}

/* ── Shared sub-components ──────────────────────────────── */

function Section({
  title,
  hint,
  right,
  children,
}: {
  title: string;
  hint?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <h2 className="fw-display" style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{title}</h2>
          {hint ? <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>{hint}</span> : null}
        </div>
        {right}
      </header>
      {children}
    </section>
  );
}

function BudgetBar({ spent, budget }: { spent: number; budget: number }) {
  const pct = budget > 0 ? Math.min(100, Math.max(0, (spent / budget) * 100)) : 0;
  const over = budget > 0 && spent > budget;
  const near = pct >= 80 && !over;
  const color = over ? "var(--danger)" : near ? "var(--warn)" : "var(--accent)";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 180 }}>
      <div style={{ height: 6, borderRadius: 3, background: "var(--bg-sunken)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, transition: "width .3s ease" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--ink-dim)" }}>
        <span>{formatCents(spent)} spent</span>
        <span>{formatCents(budget)} budget</span>
      </div>
    </div>
  );
}

/* ── Tab bar ─────────────────────────────────────────────── */

function TabBar({
  active,
  prefix,
  agentId,
  runsCount,
}: {
  active: AgentTab;
  prefix: string;
  agentId: string;
  runsCount: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 0,
        borderBottom: "1px solid var(--line)",
        marginBottom: 4,
      }}
    >
      {ALL_TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <NavLink
            key={tab.id}
            to={`/${prefix}/agents/${agentId}/${tab.id}`}
            style={{
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? "var(--accent)" : "var(--ink-dim)",
              textDecoration: "none",
              borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            {tab.label}
            {tab.id === "runs" && runsCount > 0 && (
              <span
                style={{
                  fontSize: 10,
                  background: "var(--bg-sunken)",
                  color: "var(--ink-faint)",
                  borderRadius: 8,
                  padding: "1px 5px",
                }}
              >
                {runsCount}
              </span>
            )}
          </NavLink>
        );
      })}
    </div>
  );
}

/* ── Instructions tab ────────────────────────────────────── */

const LOCAL_ADAPTER_TYPES = new Set([
  "claude_local", "codex_local", "opencode_local", "pi_local",
  "hermes_local", "cursor", "gemini_local",
]);

function InstructionsTab({ agent, companyId }: { agent: AgentDetail; companyId: string }) {
  const qc = useQueryClient();
  const { pushToast } = useToast();
  const isLetta = agent.adapterType === "letta_cloud";
  const isLocal = LOCAL_ADAPTER_TYPES.has(agent.adapterType);

  // ── letta: heartbeat prompt ──
  if (isLetta) {
    return <LettaHeartbeatEditor agent={agent} companyId={companyId} />;
  }

  // ── non-local non-letta ──
  if (!isLocal) {
    return (
      <div className="fw-card" style={{ padding: 20, color: "var(--ink-faint)", fontSize: 13 }}>
        Instructions bundles are only available for local adapters.{" "}
        <NavLink
          to={`/${companyId}/agents/${agent.id}/instructions`}
          style={{ color: "var(--accent)" }}
        >
          View in classic →
        </NavLink>
      </div>
    );
  }

  // ── local adapters: file list + editor ──
  return <LocalInstructionsEditor agent={agent} companyId={companyId} qc={qc} pushToast={pushToast} />;
}

function LettaHeartbeatEditor({ agent, companyId }: { agent: AgentDetail; companyId: string }) {
  const qc = useQueryClient();
  const { pushToast } = useToast();
  const existing = ((agent.adapterConfig ?? {}) as Record<string, unknown>).heartbeatPrompt;
  const saved = typeof existing === "string" ? existing : "";
  const [draft, setDraft] = React.useState(saved);
  const isDirty = draft !== saved;

  React.useEffect(() => { setDraft(saved); }, [saved]);

  const saveMutation = useMutation({
    mutationFn: (prompt: string) =>
      agentsApi.update(
        agent.id,
        { adapterConfig: { ...((agent.adapterConfig ?? {}) as Record<string, unknown>), heartbeatPrompt: prompt } },
        companyId,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.agents.detail(agent.id) });
      pushToast({ title: "Saved", body: "Heartbeat prompt updated.", tone: "success" });
    },
    onError: (err) => {
      pushToast({ title: "Save failed", body: err instanceof Error ? err.message : "Unknown error", tone: "error" });
    },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 720 }}>
      <div className="fw-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Heartbeat Prompt</div>
          <div style={{ fontSize: 12, color: "var(--ink-faint)", marginBottom: 10 }}>
            Message sent each time this Letta agent runs. Supports{" "}
            <code className="fw-mono">{"{{agentName}}"}</code>,{" "}
            <code className="fw-mono">{"{{runId}}"}</code>,{" "}
            <code className="fw-mono">{"{{context}}"}</code>.
            Blank defaults to <code className="fw-mono">"Hello"</code>.
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`You are ${agent.name}. Check your task queue and take action on the most urgent item.\n\nContext: {{context}}`}
            spellCheck={false}
            style={{
              width: "100%",
              minHeight: 240,
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid var(--line)",
              background: "var(--bg-sunken)",
              color: "var(--ink)",
              fontSize: 13,
              fontFamily: "var(--fw-font-mono)",
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
        {isDirty && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => saveMutation.mutate(draft)}
              disabled={saveMutation.isPending}
              style={{
                padding: "7px 16px", borderRadius: 8,
                background: "var(--accent)", color: "var(--bg)",
                border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}
            >
              {saveMutation.isPending ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => setDraft(saved)}
              disabled={saveMutation.isPending}
              style={{
                padding: "7px 16px", borderRadius: 8,
                background: "transparent", color: "var(--ink-dim)",
                border: "1px solid var(--line)", fontSize: 12, cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function LocalInstructionsEditor({
  agent,
  companyId,
  qc,
  pushToast,
}: {
  agent: AgentDetail;
  companyId: string;
  qc: ReturnType<typeof useQueryClient>;
  pushToast: (t: { title: string; body: string; tone: ToastTone }) => void;
}) {
  const [selectedFile, setSelectedFile] = React.useState("AGENTS.md");
  const [fileDraft, setFileDraft] = React.useState<string | null>(null);

  const bundleQuery = useQuery<AgentInstructionsBundle>({
    queryKey: queryKeys.agents.instructionsBundle(agent.id),
    queryFn: () => agentsApi.instructionsBundle(agent.id, companyId),
    enabled: !!companyId,
  });

  const bundle = bundleQuery.data ?? null;

  const fileExists = bundle?.files.some((f) => f.path === selectedFile) ?? false;

  const fileQuery = useQuery<AgentInstructionsFileDetail>({
    queryKey: queryKeys.agents.instructionsFile(agent.id, selectedFile),
    queryFn: () => agentsApi.instructionsFile(agent.id, selectedFile, companyId),
    enabled: !!companyId && fileExists,
  });

  const fileDetail = fileQuery.data ?? null;
  const savedContent = fileDetail?.content ?? "";
  const currentDraft = fileDraft ?? savedContent;
  const isDirty = fileDraft !== null && fileDraft !== savedContent;

  React.useEffect(() => {
    setFileDraft(null);
  }, [selectedFile, agent.id]);

  const saveMutation = useMutation({
    mutationFn: (content: string) =>
      agentsApi.saveInstructionsFile(agent.id, { path: selectedFile, content }, companyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.agents.instructionsBundle(agent.id) });
      qc.invalidateQueries({ queryKey: queryKeys.agents.instructionsFile(agent.id, selectedFile) });
      setFileDraft(null);
      pushToast({ title: "Saved", body: `${selectedFile} updated.`, tone: "success" });
    },
    onError: (err) => {
      pushToast({ title: "Save failed", body: err instanceof Error ? err.message : "Unknown error", tone: "error" });
    },
  });

  if (bundleQuery.isLoading) {
    return <LoadingState label="Loading instructions…" />;
  }

  if (bundleQuery.error) {
    return <ErrorState error={bundleQuery.error} />;
  }

  const files = bundle?.files ?? [];

  return (
    <div style={{ display: "flex", gap: 16, minHeight: 480 }}>
      {/* File list */}
      <div
        className="fw-card"
        style={{ width: 200, flexShrink: 0, padding: 8, display: "flex", flexDirection: "column", gap: 2, alignSelf: "flex-start" }}
      >
        <div className="fw-uc" style={{ padding: "4px 8px", color: "var(--ink-faint)", fontSize: 10, marginBottom: 4 }}>
          Files
        </div>
        {files.length === 0 ? (
          <div style={{ padding: "8px", fontSize: 12, color: "var(--ink-faint)" }}>No files yet</div>
        ) : (
          files.map((f) => (
            <button
              key={f.path}
              onClick={() => setSelectedFile(f.path)}
              style={{
                padding: "6px 8px",
                textAlign: "left",
                borderRadius: 6,
                border: "none",
                background: selectedFile === f.path ? "var(--bg-sunken)" : "transparent",
                color: selectedFile === f.path ? "var(--accent)" : "var(--ink-dim)",
                fontSize: 12,
                fontFamily: "var(--fw-font-mono)",
                cursor: "pointer",
                fontWeight: f.isEntryFile ? 600 : 400,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {f.path}
              {f.isEntryFile ? " ●" : ""}
            </button>
          ))
        )}
        {/* Bundle root info */}
        {bundle && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--line-soft)", fontSize: 10, color: "var(--ink-faint)", padding: "8px 8px 0" }}>
            <div>Root: <span className="fw-mono">{bundle.managedRootPath || "—"}</span></div>
            <div>Mode: <span className="fw-mono">{bundle.mode ?? "managed"}</span></div>
          </div>
        )}
      </div>

      {/* Editor */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
        {!fileExists ? (
          <div className="fw-card" style={{ padding: 20, color: "var(--ink-faint)", fontSize: 13, flex: 1 }}>
            File <span className="fw-mono">{selectedFile}</span> not found in bundle.
          </div>
        ) : fileQuery.isLoading ? (
          <div className="fw-card" style={{ padding: 20, flex: 1 }}>
            <LoadingState label="Loading file…" />
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="fw-mono" style={{ fontSize: 12, color: "var(--ink-faint)" }}>{selectedFile}</span>
              {isDirty && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => saveMutation.mutate(currentDraft)}
                    disabled={saveMutation.isPending || !(fileDetail?.editable ?? false)}
                    style={{
                      padding: "5px 14px", borderRadius: 6,
                      background: "var(--accent)", color: "var(--bg)",
                      border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    {saveMutation.isPending ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={() => setFileDraft(null)}
                    disabled={saveMutation.isPending}
                    style={{
                      padding: "5px 14px", borderRadius: 6,
                      background: "transparent", color: "var(--ink-dim)",
                      border: "1px solid var(--line)", fontSize: 12, cursor: "pointer",
                    }}
                  >
                    Discard
                  </button>
                </div>
              )}
            </div>
            <textarea
              value={currentDraft}
              onChange={(e) => setFileDraft(e.target.value)}
              readOnly={!(fileDetail?.editable ?? false)}
              spellCheck={false}
              style={{
                flex: 1,
                minHeight: 400,
                padding: "12px 14px",
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: fileDetail?.editable ? "var(--bg-sunken)" : "var(--bg-raised)",
                color: "var(--ink)",
                fontSize: 12,
                fontFamily: "var(--fw-font-mono)",
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            {!(fileDetail?.editable ?? false) && (
              <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                This file is read-only (external bundle or virtual).
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Skills tab ──────────────────────────────────────────── */

function SkillsTab({ agent, companyId }: { agent: AgentDetail; companyId: string }) {
  const qc = useQueryClient();
  const { pushToast } = useToast();
  const [localDesired, setLocalDesired] = React.useState<string[] | null>(null);
  const hasHydrated = React.useRef(false);

  const skillsQuery = useQuery<AgentSkillSnapshot>({
    queryKey: queryKeys.agents.skills(agent.id),
    queryFn: () => agentsApi.skills(agent.id, companyId),
    enabled: !!companyId,
  });

  const snapshot = skillsQuery.data ?? null;

  // Hydrate local state once
  React.useEffect(() => {
    if (snapshot && !hasHydrated.current) {
      hasHydrated.current = true;
      setLocalDesired(snapshot.desiredSkills);
    }
  }, [snapshot]);

  React.useEffect(() => {
    hasHydrated.current = false;
    setLocalDesired(null);
  }, [agent.id]);

  const syncMutation = useMutation({
    mutationFn: (desired: string[]) => agentsApi.syncSkills(agent.id, desired, companyId),
    onSuccess: (newSnapshot) => {
      qc.setQueryData(queryKeys.agents.skills(agent.id), newSnapshot);
      setLocalDesired(newSnapshot.desiredSkills);
      pushToast({ title: "Skills saved", body: "Agent skills updated.", tone: "success" });
    },
    onError: (err) => {
      pushToast({ title: "Save failed", body: err instanceof Error ? err.message : "Unknown error", tone: "error" });
    },
  });

  if (skillsQuery.isLoading) return <LoadingState label="Loading skills…" />;
  if (skillsQuery.error) return <ErrorState error={skillsQuery.error} />;
  if (!snapshot) return null;

  if (!snapshot.supported) {
    return (
      <div className="fw-card" style={{ padding: 20, color: "var(--ink-faint)", fontSize: 13 }}>
        Skill sync is not supported for this adapter type ({agent.adapterType}).
      </div>
    );
  }

  const desired = localDesired ?? snapshot.desiredSkills;
  const isDirty = localDesired !== null &&
    JSON.stringify([...localDesired].sort()) !== JSON.stringify([...snapshot.desiredSkills].sort());

  const toggle = (key: string, enabled: boolean) => {
    setLocalDesired((prev) => {
      const base = prev ?? snapshot.desiredSkills;
      return enabled ? [...base, key] : base.filter((k) => k !== key);
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 720 }}>
      {snapshot.warnings.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {snapshot.warnings.map((w, i) => (
            <div
              key={i}
              style={{
                padding: "8px 12px", borderRadius: 8,
                background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)",
                fontSize: 12, color: "var(--warn)",
              }}
            >
              {w}
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "4px 0",
        }}
      >
        <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>
          {snapshot.mode === "persistent" ? "Changes persist across runs." : "Changes apply to next run only (ephemeral mode)."}
        </div>
        {isDirty && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => syncMutation.mutate(desired)}
              disabled={syncMutation.isPending}
              style={{
                padding: "6px 14px", borderRadius: 8,
                background: "var(--accent)", color: "var(--bg)",
                border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}
            >
              {syncMutation.isPending ? "Saving…" : "Save changes"}
            </button>
            <button
              onClick={() => setLocalDesired(snapshot.desiredSkills)}
              style={{
                padding: "6px 14px", borderRadius: 8,
                background: "transparent", color: "var(--ink-dim)",
                border: "1px solid var(--line)", fontSize: 12, cursor: "pointer",
              }}
            >
              Discard
            </button>
          </div>
        )}
      </div>

      <div className="fw-card" style={{ padding: 0, overflow: "hidden" }}>
        {snapshot.entries.length === 0 ? (
          <div style={{ padding: 20, color: "var(--ink-faint)", fontSize: 13 }}>
            No skills available for this agent.
          </div>
        ) : (
          snapshot.entries.map((entry, idx) => {
            const isEnabled = desired.includes(entry.key);
            const isReadOnly = entry.readOnly || entry.required;
            return (
              <div
                key={entry.key}
                style={{
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  borderBottom: idx < snapshot.entries.length - 1 ? "1px solid var(--line-soft)" : "none",
                  opacity: isReadOnly && !isEnabled ? 0.5 : 1,
                }}
              >
                {/* Toggle */}
                <label style={{ display: "flex", alignItems: "center", gap: 0, cursor: isReadOnly ? "default" : "pointer", marginTop: 2 }}>
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    disabled={!!isReadOnly}
                    onChange={(e) => toggle(entry.key, e.target.checked)}
                    style={{ accentColor: "var(--accent)", width: 14, height: 14, cursor: isReadOnly ? "default" : "pointer" }}
                  />
                </label>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span className="fw-mono" style={{ fontSize: 12, fontWeight: 500, color: "var(--ink)" }}>
                      {entry.runtimeName ?? entry.key}
                    </span>
                    <span className="fw-mono" style={{ fontSize: 10, color: "var(--ink-faint)" }}>
                      {entry.key}
                    </span>
                    {entry.required && (
                      <span
                        style={{
                          fontSize: 10, padding: "1px 6px", borderRadius: 4,
                          background: "var(--bg-sunken)", color: "var(--ink-faint)",
                        }}
                      >
                        required
                      </span>
                    )}
                    {entry.state === "missing" && (
                      <span
                        style={{
                          fontSize: 10, padding: "1px 6px", borderRadius: 4,
                          background: "rgba(239,68,68,0.1)", color: "var(--danger)",
                        }}
                      >
                        missing
                      </span>
                    )}
                    {entry.state === "stale" && (
                      <span
                        style={{
                          fontSize: 10, padding: "1px 6px", borderRadius: 4,
                          background: "rgba(245,158,11,0.1)", color: "var(--warn)",
                        }}
                      >
                        stale
                      </span>
                    )}
                  </div>
                  {entry.detail && (
                    <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 3 }}>
                      {entry.detail}
                    </div>
                  )}
                  {(entry.locationLabel || entry.originLabel) && (
                    <div style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 2 }}>
                      {[entry.locationLabel, entry.originLabel].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ── Configuration tab ───────────────────────────────────── */

function ConfigurationTab({
  agent,
  companyId,
}: {
  agent: AgentDetail;
  companyId: string;
}) {
  const qc = useQueryClient();
  const { pushToast } = useToast();

  const adapterModelsQuery = useQuery({
    queryKey: queryKeys.agents.adapterModels(companyId, agent.adapterType),
    queryFn: () => agentsApi.adapterModels(companyId, agent.adapterType),
    enabled: !!companyId,
  });

  const updateMutation = useMutation({
    mutationFn: (patch: Record<string, unknown>) => agentsApi.update(agent.id, patch, companyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.agents.detail(agent.id) });
      qc.invalidateQueries({ queryKey: queryKeys.agents.list(companyId) });
      pushToast({ title: "Saved", body: "Agent configuration updated.", tone: "success" });
    },
    onError: (err) => {
      pushToast({ title: "Save failed", body: err instanceof Error ? err.message : "Unknown error", tone: "error" });
    },
  });

  return (
    <div style={{ maxWidth: 800 }}>
      <AgentConfigForm
        mode="edit"
        agent={agent}
        onSave={(patch) => updateMutation.mutate(patch)}
        isSaving={updateMutation.isPending}
        adapterModels={adapterModelsQuery.data}
        hideInlineSave={false}
        hidePromptTemplate
        hideInstructionsFile
        sectionLayout="cards"
      />
    </div>
  );
}

/* ── Memory tab ──────────────────────────────────────────── */

function MemoryTab({ agentId, companyId }: { agentId: string; companyId: string }) {
  return (
    <div style={{ maxWidth: 720 }}>
      <MemfsBindingsPanel companyId={companyId} agentId={agentId} />
    </div>
  );
}

/* ── Runs tab ────────────────────────────────────────────── */

const RUN_STATUS_COLORS: Record<string, string> = {
  succeeded: "var(--accent)",
  failed: "var(--danger)",
  running: "var(--pulse)",
  queued: "var(--warn)",
  timed_out: "var(--warn)",
  cancelled: "var(--ink-faint)",
};

const SOURCE_LABELS: Record<string, string> = {
  timer: "timer",
  assignment: "task",
  on_demand: "manual",
  webhook: "webhook",
  routine: "routine",
};

function RunsTab({
  runs,
  prefix,
  agentId,
  companyId,
}: {
  runs: HeartbeatRun[];
  prefix: string;
  agentId: string;
  companyId: string;
}) {
  const sorted = [...runs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  if (sorted.length === 0) {
    return (
      <div className="fw-card" style={{ padding: 20, color: "var(--ink-faint)", fontSize: 13 }}>
        No runs yet.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>
        Showing {sorted.length} most recent runs.{" "}
        <NavLink
          to={`/${prefix}/agents/${agentId}/runs`}
          style={{ color: "var(--accent)", textDecoration: "none" }}
        >
          Full transcripts in classic ↗
        </NavLink>
      </div>
      <div className="fw-card" style={{ padding: 0, overflow: "hidden" }}>
        {sorted.map((run, idx) => {
          const isLive = run.status === "running" || run.status === "queued";
          const dotColor = RUN_STATUS_COLORS[run.status] ?? "var(--ink-faint)";
          const durationMs =
            run.startedAt && run.finishedAt
              ? new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()
              : null;
          const durationSec = durationMs !== null ? Math.round(durationMs / 1000) : null;

          return (
            <NavLink
              key={run.id}
              to={`/${prefix}/agents/${agentId}/runs/${run.id}`}
              style={{
                padding: "11px 16px",
                display: "grid",
                gridTemplateColumns: "8px 1fr auto auto",
                gap: 12,
                alignItems: "center",
                borderBottom: idx < sorted.length - 1 ? "1px solid var(--line-soft)" : "none",
                fontSize: 12,
                textDecoration: "none",
                color: "var(--ink)",
              }}
            >
              {/* Status dot */}
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: dotColor,
                  flexShrink: 0,
                  animation: isLive ? "fw-pulse 1.4s ease-in-out infinite" : "none",
                }}
              />
              {/* Main info */}
              <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span className="fw-mono" style={{ color: "var(--ink-faint)", fontSize: 10 }}>
                    {run.id.slice(0, 8)}
                  </span>
                  <span
                    style={{
                      fontSize: 10, padding: "1px 6px", borderRadius: 4,
                      background: "var(--bg-sunken)", color: "var(--ink-dim)",
                    }}
                  >
                    {SOURCE_LABELS[run.invocationSource] ?? run.invocationSource}
                  </span>
                  {run.triggerDetail && (
                    <span style={{ fontSize: 11, color: "var(--ink-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
                      {run.triggerDetail}
                    </span>
                  )}
                </div>
                {durationSec !== null && (
                  <div style={{ fontSize: 10, color: "var(--ink-faint)" }}>
                    {durationSec}s
                    {run.usageJson?.total_tokens ? ` · ${Number(run.usageJson.total_tokens).toLocaleString()} tokens` : ""}
                    {run.usageJson?.cost_cents ? ` · ${formatCents(Number(run.usageJson.cost_cents))}` : ""}
                  </div>
                )}
              </div>
              {/* Status */}
              <span className="fw-mono" style={{ fontSize: 11, color: dotColor }}>
                {run.status}
              </span>
              {/* Time */}
              <span className="fw-mono" style={{ fontSize: 10, color: "var(--ink-faint)" }}>
                {run.startedAt ? formatRelative(run.startedAt) : "queued"}
              </span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}

/* ── Budget tab ──────────────────────────────────────────── */

function BudgetTab({
  agent,
  companyId,
}: {
  agent: AgentDetail;
  companyId: string;
}) {
  const qc = useQueryClient();
  const { pushToast } = useToast();

  const overviewQuery = useQuery({
    queryKey: ["budgets", "overview", companyId],
    queryFn: () => budgetsApi.overview(companyId),
    enabled: !!companyId,
  });

  const agentPolicy = overviewQuery.data?.policies.find(
    (p) => p.scopeType === "agent" && p.scopeId === agent.id,
  );

  // Fallback summary built from agent fields when no policy record exists yet
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  const summary = agentPolicy ?? {
    policyId: "",
    companyId,
    scopeType: "agent" as const,
    scopeId: agent.id,
    scopeName: agent.name,
    metric: "billed_cents" as const,
    windowKind: "calendar_month_utc" as const,
    amount: agent.budgetMonthlyCents,
    observedAmount: agent.spentMonthlyCents,
    remainingAmount: Math.max(0, agent.budgetMonthlyCents - agent.spentMonthlyCents),
    utilizationPercent:
      agent.budgetMonthlyCents > 0
        ? (agent.spentMonthlyCents / agent.budgetMonthlyCents) * 100
        : 0,
    warnPercent: 80,
    hardStopEnabled: false,
    notifyEnabled: false,
    isActive: true,
    status: "ok" as const,
    paused: false,
    pauseReason: null,
    windowStart: monthStart,
    windowEnd: monthEnd,
  };

  const saveMutation = useMutation({
    mutationFn: (amountCents: number) =>
      budgetsApi.upsertPolicy(companyId, {
        scopeType: "agent",
        scopeId: agent.id,
        metric: "billed_cents",
        windowKind: "calendar_month_utc",
        amount: amountCents,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budgets", "overview", companyId] });
      qc.invalidateQueries({ queryKey: queryKeys.agents.detail(agent.id) });
      pushToast({ title: "Budget saved", body: "Agent budget policy updated.", tone: "success" });
    },
    onError: (err) => {
      pushToast({ title: "Save failed", body: err instanceof Error ? err.message : "Unknown error", tone: "error" });
    },
  });

  if (overviewQuery.isLoading) return <LoadingState label="Loading budget…" />;

  return (
    <div style={{ maxWidth: 560 }}>
      <BudgetPolicyCard
        summary={summary}
        isSaving={saveMutation.isPending}
        onSave={(amountCents) => saveMutation.mutate(amountCents)}
        variant="plain"
      />
    </div>
  );
}

/* ── Overview tab ────────────────────────────────────────── */

function OverviewTab({
  agent,
  companyId,
  prefix,
  runs,
  runsLoading,
  issues,
  issuesLoading,
  updateMutation,
}: {
  agent: AgentDetail;
  companyId: string;
  prefix: string;
  runs: HeartbeatRun[];
  runsLoading: boolean;
  issues: Issue[];
  issuesLoading: boolean;
  updateMutation: { mutate: (data: Record<string, unknown>) => void; isPending: boolean };
}) {
  return (
    <>
      {/* Grid: budget + properties */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Section title="Budget" hint="this month">
          <div className="fw-card" style={{ padding: 16 }}>
            <BudgetBar spent={agent.spentMonthlyCents} budget={agent.budgetMonthlyCents} />
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line-soft)" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>Monthly budget ($)</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={agent.budgetMonthlyCents / 100}
                  onBlur={(e) => {
                    const cents = Math.round(parseFloat(e.target.value) * 100);
                    if (!Number.isFinite(cents) || cents < 0 || cents === agent.budgetMonthlyCents) return;
                    updateMutation.mutate({ budgetMonthlyCents: cents });
                  }}
                  style={{
                    padding: "6px 10px", borderRadius: 6,
                    border: "1px solid var(--line)", background: "var(--bg-raised)",
                    color: "var(--ink)", fontSize: 13, fontFamily: "var(--fw-font-mono)",
                  }}
                />
              </label>
            </div>
          </div>
        </Section>

        <Section title="Properties">
          <div className="fw-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>Role</span>
              <select
                value={agent.role}
                onChange={(e) => updateMutation.mutate({ role: e.target.value })}
                style={{
                  padding: "6px 10px", borderRadius: 6,
                  border: "1px solid var(--line)", background: "var(--bg-raised)",
                  color: "var(--ink)", fontSize: 13, textTransform: "capitalize",
                }}
              >
                {AGENT_ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>Status</span>
              <select
                value={agent.status}
                disabled
                style={{
                  padding: "6px 10px", borderRadius: 6,
                  border: "1px solid var(--line)", background: "var(--bg-sunken)",
                  color: "var(--ink-dim)", fontSize: 13, textTransform: "capitalize",
                  cursor: "not-allowed",
                }}
              >
                {AGENT_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <span style={{ fontSize: 10, color: "var(--ink-faint)" }}>
                Use Pause / Resume / Terminate above to change status.
              </span>
            </label>
          </div>
        </Section>
      </div>

      {/* Recent runs */}
      <Section title="Recent runs" hint={`${runs.length}`}>
        {runsLoading && runs.length === 0 ? (
          <LoadingState label="Loading runs…" />
        ) : runs.length === 0 ? (
          <div className="fw-card" style={{ padding: 20, color: "var(--ink-faint)", fontSize: 12 }}>No runs yet.</div>
        ) : (
          <div className="fw-card" style={{ padding: 0, overflow: "hidden" }}>
            {runs.slice(0, 8).map((run, idx) => (
              <NavLink
                key={run.id}
                to={`/${prefix}/agents/${agent.id}/runs`}
                style={{
                  padding: "10px 14px",
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto auto",
                  gap: 12,
                  alignItems: "center",
                  borderBottom: idx < Math.min(8, runs.length) - 1 ? "1px solid var(--line-soft)" : "none",
                  fontSize: 12,
                  textDecoration: "none",
                  color: "var(--ink)",
                }}
              >
                <StatusDot
                  status={
                    run.startedAt != null && run.finishedAt == null
                      ? "running"
                      : run.status === "failed" || run.status === "timed_out" || run.status === "cancelled"
                      ? "error"
                      : "idle"
                  }
                />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {run.invocationSource} · {run.triggerDetail ?? "—"}
                </span>
                <span className="fw-mono" style={{ color: "var(--ink-dim)" }}>{run.status}</span>
                <span className="fw-mono" style={{ color: "var(--ink-faint)" }}>
                  {run.startedAt ? formatRelative(run.startedAt) : "queued"}
                </span>
              </NavLink>
            ))}
          </div>
        )}
      </Section>

      {/* Assigned issues */}
      <Section
        title="Assigned issues"
        hint={`${issues.length}`}
        right={
          <NavLink to={`/${prefix}/work`} style={{ fontSize: 11, color: "var(--accent)", textDecoration: "none" }}>
            Open board
          </NavLink>
        }
      >
        {issuesLoading && issues.length === 0 ? (
          <LoadingState label="Loading issues…" />
        ) : issues.length === 0 ? (
          <div className="fw-card" style={{ padding: 20, color: "var(--ink-faint)", fontSize: 12 }}>No issues assigned.</div>
        ) : (
          <div className="fw-card" style={{ padding: 0, overflow: "hidden" }}>
            {issues.slice(0, 10).map((issue, idx) => (
              <NavLink
                key={issue.id}
                to={`/${prefix}/work?issue=${issue.id}`}
                style={{
                  padding: "10px 14px",
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto auto",
                  gap: 12,
                  alignItems: "center",
                  borderBottom: idx < Math.min(10, issues.length) - 1 ? "1px solid var(--line-soft)" : "none",
                  fontSize: 12.5,
                  textDecoration: "none",
                  color: "var(--ink)",
                }}
              >
                <span className="fw-mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                  {issue.identifier ?? issue.id.slice(0, 6)}
                </span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {issue.title ?? "Untitled"}
                </span>
                <StatusChip status={issue.status ?? "idle"} />
                <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                  {formatRelative(issue.updatedAt)}
                </span>
              </NavLink>
            ))}
          </div>
        )}
      </Section>

      {/* Outputs */}
      <OutputsSection
        companyId={companyId}
        prefix={prefix}
        filter={{ agentId: agent.id }}
        title="Outputs"
        hint="files this agent has produced"
        limit={8}
      />
    </>
  );
}

/* ── Main export ─────────────────────────────────────────── */

function pulseStatus(agent: AgentDetail): FwStatus {
  if (agent.status === "running" || agent.status === "active") return "running";
  if (agent.status === "paused" || agent.status === "terminated" || agent.status === "pending_approval")
    return "paused";
  if (agent.status === "error") return "error";
  return "idle";
}

export function FernwehAgentDetail() {
  const { companyPrefix, agentId, tab: urlTab } = useParams<{
    companyPrefix: string;
    agentId: string;
    tab?: string;
  }>();
  const { selectedCompany } = useCompany();
  const { openNewIssue } = useDialog();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const companyId = selectedCompany?.id;
  const prefix = companyPrefix ?? selectedCompany?.issuePrefix ?? "";
  const activeTab = parseTab(urlTab);

  const agentQuery = useQuery<AgentDetail>({
    queryKey: queryKeys.agents.detail(agentId!),
    queryFn: () => agentsApi.get(agentId!, companyId) as Promise<AgentDetail>,
    enabled: !!agentId,
    refetchInterval: 20_000,
  });

  const runsQuery = useQuery<HeartbeatRun[]>({
    queryKey: ["heartbeats", "agent", agentId ?? "none"],
    queryFn: () => heartbeatsApi.list(companyId!, agentId, 30),
    enabled: !!(companyId && agentId),
    refetchInterval: 10_000,
  });

  const issuesQuery = useQuery<Issue[]>({
    queryKey: ["issues", "agent", agentId ?? "none"],
    queryFn: () => issuesApi.list(companyId!, { assigneeAgentId: agentId }) as Promise<Issue[]>,
    enabled: !!(companyId && agentId),
  });

  const agent = agentQuery.data ?? null;
  const runs = runsQuery.data ?? [];
  const issues = issuesQuery.data ?? [];

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => agentsApi.update(agentId!, data, companyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.agents.detail(agentId!) });
      if (companyId) qc.invalidateQueries({ queryKey: queryKeys.agents.list(companyId) });
    },
  });

  const invokeMutation = useMutation({
    mutationFn: () => agentsApi.invoke(agentId!, companyId),
    onSuccess: (run) => {
      qc.invalidateQueries({ queryKey: ["heartbeats", "agent", agentId ?? "none"] });
      navigate(`/${prefix}/agents/${agentId}/runs/${run.id}`);
    },
  });

  const pauseMutation = useMutation({
    mutationFn: () => agentsApi.pause(agentId!, companyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.agents.detail(agentId!) });
      if (companyId) qc.invalidateQueries({ queryKey: queryKeys.agents.list(companyId) });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: () => agentsApi.resume(agentId!, companyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.agents.detail(agentId!) });
      if (companyId) qc.invalidateQueries({ queryKey: queryKeys.agents.list(companyId) });
    },
  });

  const terminateMutation = useMutation({
    mutationFn: () => agentsApi.terminate(agentId!, companyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.agents.detail(agentId!) });
      if (companyId) qc.invalidateQueries({ queryKey: queryKeys.agents.list(companyId) });
    },
  });

  // ── name / title inline edit ──
  const [nameDraft, setNameDraft] = React.useState("");
  const [titleDraft, setTitleDraft] = React.useState("");
  const [dirty, setDirty] = React.useState({ name: false, title: false });

  React.useEffect(() => {
    if (agent) {
      setNameDraft(agent.name);
      setTitleDraft(agent.title ?? "");
      setDirty({ name: false, title: false });
    }
  }, [agent?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── loading / error guards ──
  if (agentQuery.isLoading && !agent) return <LoadingState label="Loading agent…" />;
  if (agentQuery.error && !agent) {
    return (
      <div style={{ padding: 32 }}>
        <ErrorState error={agentQuery.error} hint={`Agent id: ${agentId ?? "—"}`} />
      </div>
    );
  }
  if (!agent) return null;

  const status = pulseStatus(agent);
  const canPause = agent.status === "active" || agent.status === "running" || agent.status === "idle";
  const canResume = agent.status === "paused";
  const canTerminate = agent.status !== "terminated";
  const isPendingApproval = agent.status === "pending_approval";

  const beats: HeartbeatAmp[] = Array.from({ length: 32 }, (_, i) => {
    const run = runs[Math.floor(i / 4)];
    if (!run) return "idle";
    if (run.status === "queued") return "work";
    if (run.status === "succeeded") return "output";
    return "tick";
  });

  const btnBase: React.CSSProperties = {
    padding: "7px 12px", borderRadius: 8, fontSize: 12, cursor: "pointer", fontWeight: 500,
  };

  return (
    <div
      style={{
        padding: "28px 36px 60px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
        maxWidth: 1100,
        margin: "0 auto",
      }}
    >
      {/* Back link */}
      <div>
        <NavLink
          to={`/${prefix}/agents`}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink-faint)", textDecoration: "none" }}
        >
          <Icon d={I.arrow} size={11} style={{ transform: "rotate(180deg)" }} />
          <span>All agents</span>
        </NavLink>
      </div>

      {/* Header card */}
      <header
        className="fw-card"
        style={{
          padding: 20,
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          alignItems: "center",
          gap: 18,
        }}
      >
        <Avatar name={agent.name} size={56} />
        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
          <input
            value={nameDraft}
            onChange={(e) => { setNameDraft(e.target.value); setDirty((d) => ({ ...d, name: true })); }}
            onBlur={() => {
              if (dirty.name && nameDraft.trim() && nameDraft !== agent.name) {
                updateMutation.mutate({ name: nameDraft.trim() });
                setDirty((d) => ({ ...d, name: false }));
              }
            }}
            style={{
              background: "transparent", border: "none", outline: "none",
              fontSize: 22, fontWeight: 600, color: "var(--ink)",
              fontFamily: "var(--font-display-active)", width: "100%",
            }}
          />
          <input
            value={titleDraft}
            onChange={(e) => { setTitleDraft(e.target.value); setDirty((d) => ({ ...d, title: true })); }}
            onBlur={() => {
              if (dirty.title && titleDraft !== (agent.title ?? "")) {
                updateMutation.mutate({ title: titleDraft.trim() || null });
                setDirty((d) => ({ ...d, title: false }));
              }
            }}
            placeholder="Add a title / subrole…"
            style={{
              background: "transparent", border: "none", outline: "none",
              fontSize: 13, color: "var(--ink-dim)", fontFamily: "inherit", width: "100%",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
            <StatusChip status={status} />
            <span className="fw-chip" style={{ textTransform: "capitalize" }}>{agent.role}</span>
            <span className="fw-chip" style={{ color: "var(--ink-faint)" }}>{agent.adapterType.replace(/_/g, " ")}</span>
            {agent.lastHeartbeatAt ? (
              <span className="fw-mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                Last heartbeat {formatRelative(agent.lastHeartbeatAt)}
              </span>
            ) : null}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {/* Assign Task */}
          <button
            onClick={() => openNewIssue({ assigneeAgentId: agent.id })}
            style={{
              ...btnBase,
              border: "1px solid var(--line)",
              background: "var(--bg-raised)",
              color: "var(--ink-dim)",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Icon d={I.plus} size={11} />
            Assign Task
          </button>

          {/* Run Heartbeat */}
          <button
            onClick={() => invokeMutation.mutate()}
            disabled={invokeMutation.isPending || isPendingApproval}
            style={{
              ...btnBase,
              border: "1px solid var(--accent)",
              background: "var(--accent)",
              color: "var(--bg)",
              display: "flex",
              alignItems: "center",
              gap: 5,
              opacity: (invokeMutation.isPending || isPendingApproval) ? 0.6 : 1,
            }}
          >
            <Icon d={I.bolt} size={11} />
            {invokeMutation.isPending ? "Running…" : "Run Heartbeat"}
          </button>

          {canResume && (
            <button
              onClick={() => resumeMutation.mutate()}
              disabled={resumeMutation.isPending}
              style={{ ...btnBase, border: "1px solid var(--accent)", background: "transparent", color: "var(--accent)" }}
            >
              Resume
            </button>
          )}
          {canPause && (
            <button
              onClick={() => pauseMutation.mutate()}
              disabled={pauseMutation.isPending}
              style={{ ...btnBase, border: "1px solid var(--line)", background: "var(--bg-raised)", color: "var(--ink-dim)" }}
            >
              Pause
            </button>
          )}
          {canTerminate && (
            <button
              onClick={() => {
                if (confirm(`Terminate ${agent.name}? This cannot be undone.`)) terminateMutation.mutate();
              }}
              disabled={terminateMutation.isPending}
              style={{ ...btnBase, border: "1px solid var(--line)", background: "transparent", color: "var(--danger)" }}
            >
              Terminate
            </button>
          )}
        </div>
      </header>

      {/* Heartbeat ribbon */}
      <div className="fw-card" style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>Activity</span>
          <HeartbeatRibbon beats={beats} width={300} height={28} />
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11, color: "var(--ink-faint)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <StatusDot status="running" />
            <span>{runs.filter((r) => r.startedAt != null && r.finishedAt == null).length} in flight</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <StatusDot status="idle" />
            <span>{runs.length} loaded</span>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <TabBar active={activeTab} prefix={prefix} agentId={agentId!} runsCount={runs.length} />

      {/* Tab content */}
      {activeTab === "overview" && companyId && (
        <OverviewTab
          agent={agent}
          companyId={companyId}
          prefix={prefix}
          runs={runs}
          runsLoading={runsQuery.isLoading}
          issues={issues}
          issuesLoading={issuesQuery.isLoading}
          updateMutation={updateMutation}
        />
      )}

      {activeTab === "instructions" && companyId && (
        <InstructionsTab agent={agent} companyId={companyId} />
      )}

      {activeTab === "skills" && companyId && (
        <SkillsTab agent={agent} companyId={companyId} />
      )}

      {activeTab === "configuration" && companyId && (
        <ConfigurationTab agent={agent} companyId={companyId} />
      )}

      {activeTab === "memory" && companyId && agentId && (
        <MemoryTab agentId={agentId} companyId={companyId} />
      )}

      {activeTab === "runs" && companyId && agentId && (
        <RunsTab runs={runs} prefix={prefix} agentId={agentId} companyId={companyId} />
      )}

      {activeTab === "budget" && companyId && (
        <BudgetTab agent={agent} companyId={companyId} />
      )}

      {/* Footer */}
      <footer
        style={{
          paddingTop: 12,
          borderTop: "1px solid var(--line-soft)",
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          fontSize: 11,
          color: "var(--ink-faint)",
        }}
      >
        <span>Created {formatRelative(agent.createdAt)}</span>
        <span>·</span>
        <span>Updated {formatRelative(agent.updatedAt)}</span>
        <span>·</span>
        <span className="fw-mono">{agent.id.slice(0, 8)}</span>
        {agent.reportsTo ? (
          <>
            <span>·</span>
            <span>Reports to {agent.reportsTo.slice(0, 8)}</span>
          </>
        ) : null}
      </footer>
    </div>
  );
}
