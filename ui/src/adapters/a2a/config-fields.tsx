import { Field, DraftInput } from "../../components/agent-config-primitives";
import type { AdapterConfigFieldsProps } from "../types";

// ─── Shared input style ───────────────────────────────────────────────────────
const inputClass =
  "w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/40";

export function A2aConfigFields({
  mode,
  isCreate,
  values,
  set,
  config,
  eff,
  mark,
}: AdapterConfigFieldsProps) {
  const setField = (field: string, v: unknown) =>
    isCreate
      ? set?.({ [field]: v } as unknown as Partial<CreateConfigValues>)
      : mark("adapterConfig", field, v);

  const getField = (field: string, fallback: string) =>
    isCreate
      ? (((values as unknown as Record<string, unknown>)?.[field] as string) ?? fallback)
      : (eff("adapterConfig", field, fallback) as string);

  return (
    <>
      <Field
        label="Endpoint URL"
        hint="Base URL of the remote A2A agent (e.g. https://agent.example.com/a2a). Doer auto-discovers the Agent Card at /.well-known/agent-card.json."
      >
        <DraftInput
          value={getField("endpointUrl", "")}
          onCommit={(v) => setField("endpointUrl", v)}
          immediate
          className={inputClass}
          placeholder="https://agent.example.com/a2a"
        />
      </Field>

      <Field
        label="Agent Card URL"
        hint="Optional: override the auto-discovered Agent Card URL."
      >
        <DraftInput
          value={getField("agentCardUrl", "")}
          onCommit={(v) => setField("agentCardUrl", v || undefined)}
          immediate
          className={inputClass}
          placeholder="Leave blank for auto-discovery"
        />
      </Field>

      <Field
        label="Auth Token"
        hint="Bearer token for A2A authentication (stored encrypted)."
      >
        <SecretField
          value={getField("authToken", "")}
          onCommit={(v) => setField("authToken", v)}
          placeholder="Bearer token (optional)"
        />
      </Field>

      <Field
        label="Skill ID"
        hint="Optional: invoke a specific skill on the remote agent (matches an Agent Card skill ID)."
      >
        <DraftInput
          value={getField("skillId", "")}
          onCommit={(v) => setField("skillId", v || undefined)}
          immediate
          className={inputClass}
          placeholder="Leave blank for default"
        />
      </Field>

      <Field label="Timeout (seconds)" hint="Seconds before Doer cancels the A2A task. Default: 300">
        <DraftInput
          value={String(getField("timeoutSec", "300"))}
          onCommit={(v) => setField("timeoutSec", parseInt(v, 10) || 300)}
          immediate
          className={inputClass}
          placeholder="300"
        />
      </Field>
    </>
  );
}
