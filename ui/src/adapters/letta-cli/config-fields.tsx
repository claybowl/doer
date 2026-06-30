import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { AdapterConfigFieldsProps, CreateConfigValues } from "../types";
import { Field, DraftInput } from "../../components/agent-config-primitives";

const inputClass =
  "w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/40";

function SecretInput({
  value,
  onCommit,
  placeholder,
}: {
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
      >
        {visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
      </button>
      <DraftInput
        value={value}
        onCommit={onCommit}
        immediate
        type={visible ? "text" : "password"}
        className={inputClass + " pl-8"}
        placeholder={placeholder}
      />
    </div>
  );
}

export function LettaCliConfigFields({
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
      : (eff("adapterConfig", field, (config[field] as string) ?? fallback) as string);

  return (
    <div className="space-y-4">
      <Field label="Agent ID" hint="Letta agent ID — format: agent-xxxxxxxx-xxxx-...">
        <DraftInput
          value={getField("agentId", "")}
          onCommit={(v) => setField("agentId", v)}
          immediate
          className={inputClass}
          placeholder="agent-2402fdcd-8623-4482-9998-590a1c13ce21"
        />
      </Field>

      <Field label="API Key" hint="Letta API key (stored encrypted). Use 'local' for a no-auth local server.">
        <SecretInput
          value={getField("apiKey", "")}
          onCommit={(v) => setField("apiKey", v)}
          placeholder="sk-letta-… (or 'local')"
        />
      </Field>

      <Field label="Base URL" hint="Leave blank for Letta Cloud. Set for self-hosted, e.g. http://localhost:8283">
        <DraftInput
          value={getField("baseUrl", "")}
          onCommit={(v) => setField("baseUrl", v || undefined)}
          immediate
          className={inputClass}
          placeholder="https://api.letta.com"
        />
      </Field>
    </div>
  );
}
