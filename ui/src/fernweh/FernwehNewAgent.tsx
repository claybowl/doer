import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { NavLink, useParams, useNavigate } from "@/lib/router";
import { agentsApi } from "@/api/agents";
import { useCompany } from "@/context/CompanyContext";
import { queryKeys } from "@/lib/queryKeys";
import { AGENT_ADAPTER_TYPES, AGENT_ROLES } from "@doerai/shared";
import type { AgentAdapterType, AgentRole } from "@doerai/shared";
import { Icon, I, ErrorState } from "./utils";

/* ============================================================
   FernwehNewAgent — minimum-viable hire flow.
   Collects name / title / role / adapter / monthly budget.
   For adapter-specific config (model, sandbox, bypass flags, etc.)
   the form points to classic /:prefix/agents/new which has the
   full AgentConfigForm with per-adapter defaults.
============================================================ */

interface FormState {
  name: string;
  title: string;
  role: AgentRole;
  adapterType: AgentAdapterType;
  budgetDollars: string;
  description: string;
  model: string;
}

const INITIAL: FormState = {
  name: "",
  title: "",
  role: "general",
  adapterType: "agent_file",
  budgetDollars: "100",
  description: "",
  model: "",
};

// Plain-English helper for adapter labels.
const ADAPTER_LABEL: Record<AgentAdapterType, string> = {
  process: "Process (local subprocess)",
  http: "HTTP (external webhook)",
  claude_local: "Claude (local CLI)",
  codex_local: "Codex (local CLI)",
  opencode_local: "OpenCode (local CLI)",
  pi_local: "Pi (local CLI)",
  cursor: "Cursor CLI",
  openclaw_gateway: "OpenClaw Gateway",
  hermes_local: "Hermes (local CLI)",
  letta_cloud: "Letta Cloud",
  letta_code: "letta_code",
  letta_cli: "Letta CLI",
  agent_file: "Agent File (.af)",
  gemini_local: "Gemini CLI",
  a2a: "A2A (remote agent)",
};

export function FernwehNewAgent() {
  const { companyPrefix } = useParams<{ companyPrefix: string }>();
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const companyId = selectedCompany?.id;
  const prefix = companyPrefix ?? selectedCompany?.issuePrefix ?? "";

  const [form, setForm] = React.useState<FormState>(INITIAL);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const createMutation = useMutation({
    mutationFn: () => {
      if (!companyId) throw new Error("No company selected");
      const budgetCents = Math.round(parseFloat(form.budgetDollars || "0") * 100);
      return agentsApi.create(companyId, {
        name: form.name.trim(),
        title: form.title.trim() || null,
        role: form.role,
        adapterType: form.adapterType,
        budgetMonthlyCents: Number.isFinite(budgetCents) ? budgetCents : 0,
        capabilities: form.description.trim() || null,
        adapterConfig: form.adapterType === "opencode_local" && form.model ? { model: form.model.trim() } : undefined,
        // Always send a well-formed heartbeat block. Omitting runtimeConfig entirely
        // persisted `{}`, which left the agent with no scheduler config and it never
        // ran. Defaults to disabled so a fresh hire cannot burn budget idle — the
        // same posture as team-import and the New agent form.
        runtimeConfig: {
          heartbeat: {
            enabled: false,
            intervalSec: 3600,
            wakeOnDemand: true,
            cooldownSec: 10,
            maxConcurrentRuns: 1,
          },
        },
      });
    },
    onSuccess: (agent) => {
      if (companyId) {
        qc.invalidateQueries({ queryKey: queryKeys.agents.list(companyId) });
      }
      navigate(`/${prefix}/agents/${agent.id}`);
    },
  });

  const canSubmit =
    !!companyId &&
    form.name.trim().length > 0 &&
    Number.isFinite(parseFloat(form.budgetDollars)) &&
    (form.adapterType !== "opencode_local" || form.model.trim().length > 0) &&
    !createMutation.isPending;

  if (!companyId) {
    return (
      <div style={{ padding: 24, color: "var(--ink-dim)" }}>
        Select a company to hire an agent.
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "32px 36px 60px",
        display: "flex",
        flexDirection: "column",
        gap: 24,
        maxWidth: 720,
        margin: "0 auto",
      }}
    >
      {/* Back link */}
      <div>
        <NavLink
          to={`/${prefix}/agents`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: "var(--ink-faint)",
            textDecoration: "none",
          }}
        >
          <Icon d={I.arrow} size={11} style={{ transform: "rotate(180deg)" }} />
          <span>All agents</span>
        </NavLink>
      </div>

      {/* Header */}
      <header style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
          New agent · quick hire
        </span>
        <h1 className="fw-display" style={{ fontSize: 24, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>
          Bring a specialist aboard
        </h1>
        <p style={{ fontSize: 13, color: "var(--ink-dim)", margin: 0, maxWidth: 560, lineHeight: 1.5 }}>
          This is the quick form. For adapter-specific config (model, sandbox, MCP, skills),
          use{" "}
          <NavLink
            to={`/${prefix}/agents/new`}
            style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}
          >
            the classic new-agent flow
          </NavLink>{" "}
          which exposes the full AgentConfigForm.
        </p>
      </header>

      {/* Error */}
      {createMutation.error ? <ErrorState error={createMutation.error} /> : null}

      {/* Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) createMutation.mutate();
        }}
        className="fw-card"
        style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}
      >
        <FormField label="Name" required>
          <input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Alex the Architect"
            required
            style={fieldStyle}
          />
        </FormField>

        <FormField label="Title / subrole" hint="optional">
          <input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. Senior backend engineer"
            style={fieldStyle}
          />
        </FormField>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <FormField label="Role">
            <select
              value={form.role}
              onChange={(e) => set("role", e.target.value as AgentRole)}
              style={{ ...fieldStyle, textTransform: "capitalize", cursor: "pointer" }}
            >
              {AGENT_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Adapter">
            <select
              value={form.adapterType}
              onChange={(e) => set("adapterType", e.target.value as AgentAdapterType)}
              style={{ ...fieldStyle, cursor: "pointer" }}
            >
              {AGENT_ADAPTER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ADAPTER_LABEL[t] ?? t}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        {form.adapterType === "opencode_local" && (
          <FormField label="Model" required hint='provider/model format — e.g. "anthropic/claude-sonnet-4-5"'>
            <input
              value={form.model}
              onChange={(e) => set("model", e.target.value)}
              placeholder="anthropic/claude-sonnet-4-5"
              required
              style={fieldStyle}
            />
          </FormField>
        )}

        <FormField label="Monthly budget ($)" hint="drives the auto-pause threshold">
          <input
            type="number"
            min={0}
            step={1}
            value={form.budgetDollars}
            onChange={(e) => set("budgetDollars", e.target.value)}
            style={{ ...fieldStyle, fontFamily: "var(--fw-font-mono)" }}
          />
        </FormField>

        <FormField label="Capabilities / description" hint="optional — free text">
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="What should this agent be great at? e.g. 'Writes Postgres migrations, reviews schema changes, knows Drizzle well.'"
            rows={4}
            style={{ ...fieldStyle, resize: "vertical", minHeight: 100 }}
          />
        </FormField>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 10,
            paddingTop: 8,
            borderTop: "1px solid var(--line-soft)",
          }}
        >
          <NavLink
            to={`/${prefix}/agents`}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid var(--line)",
              background: "transparent",
              color: "var(--ink-dim)",
              fontSize: 12,
              textDecoration: "none",
            }}
          >
            Cancel
          </NavLink>
          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid var(--accent)",
              background: "var(--accent)",
              color: "var(--bg)",
              fontSize: 12,
              fontWeight: 500,
              cursor: canSubmit ? "pointer" : "not-allowed",
              opacity: canSubmit ? 1 : 0.5,
            }}
          >
            {createMutation.isPending ? "Hiring…" : "Hire agent"}
          </button>
        </div>
      </form>

      <footer style={{ fontSize: 11, color: "var(--ink-faint)", display: "flex", gap: 8, alignItems: "center" }}>
        <Icon d={I.user_plus} size={11} />
        <span>Agents created here spin up with the adapter's defaults. Tune adapter-specific options in classic afterward.</span>
      </footer>
    </div>
  );
}

// ---------- field primitives ----------

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid var(--line)",
  background: "var(--bg-raised)",
  color: "var(--ink)",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
};

function FormField({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span
        style={{
          fontSize: 11,
          color: "var(--ink-faint)",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          display: "flex",
          gap: 6,
          alignItems: "baseline",
        }}
      >
        <span>{label}</span>
        {required ? <span style={{ color: "var(--accent)" }}>*</span> : null}
        {hint ? (
          <span style={{ textTransform: "none", letterSpacing: 0, color: "var(--ink-faint)", fontSize: 10.5 }}>
            · {hint}
          </span>
        ) : null}
      </span>
      {children}
    </label>
  );
}
