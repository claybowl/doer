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

// ─── Model provider presets (local backend only) ───────────────────────────
const PROVIDER_PRESETS: Record<
  string,
  { label: string; prefix: string; placeholder: string; hint: string }
> = {
  ollama: {
    label: "Ollama",
    prefix: "ollama",
    placeholder: "llama3.2:latest",
    hint: "Any model you've pulled locally. Make sure `ollama serve` is running.",
  },
  ollama_cloud: {
    label: "Ollama Cloud",
    prefix: "ollama-cloud",
    placeholder: "gpt-oss:120b",
    hint: "e.g. gpt-oss:120b, qwen3-coder:480b, gemma4:31b",
  },
  other: {
    label: "Other",
    prefix: "",
    placeholder: "provider/model-name",
    hint: "Full handle, e.g. anthropic/claude-sonnet-4-6 or kimi-k2.5",
  },
};

function splitModelHandle(raw: string | undefined): { provider: string; modelName: string } {
  const value = raw ?? "";
  for (const [id, meta] of Object.entries(PROVIDER_PRESETS)) {
    if (meta.prefix && value.startsWith(meta.prefix + "/")) {
      return { provider: id, modelName: value.slice(meta.prefix.length + 1) };
    }
  }
  return { provider: "other", modelName: value };
}

function composeModelHandle(provider: string, modelName: string): string | undefined {
  const trimmed = modelName.trim();
  if (!trimmed) return undefined;
  const prefix = PROVIDER_PRESETS[provider]?.prefix;
  return prefix ? `${prefix}/${trimmed}` : trimmed;
}

// ─── Backend toggle (Constellation / Local) ────────────────────────────────
function BackendToggle({
  value,
  onChange,
}: {
  value: "api" | "local";
  onChange: (backend: "api" | "local") => void;
}) {
  const opts: { id: "api" | "local"; label: string; sub: string }[] = [
    { id: "api", label: "Constellation", sub: "Letta Cloud" },
    { id: "local", label: "Local", sub: "Embedded, e.g. Ollama" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {opts.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={
              "flex flex-col items-start rounded-md border px-3 py-2 text-left transition-colors " +
              (active
                ? "border-primary bg-primary/10"
                : "border-border hover:bg-accent/40")
            }
          >
            <span className="text-sm font-medium">{o.label}</span>
            <span className="text-xs text-muted-foreground">{o.sub}</span>
          </button>
        );
      })}
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

  // Default to Constellation (api) — matches the server default in execute.ts
  // and keeps every pre-existing letta_cli agent (backend unset) unchanged.
  const backend = (getField("backend", "api") || "api") as "api" | "local";

  return (
    <div className="space-y-4">
      <Field label="Backend" hint="Constellation talks to your Letta Cloud account. Local runs a fully embedded backend — no Letta credentials, works with Ollama.">
        <BackendToggle value={backend} onChange={(b) => setField("backend", b)} />
      </Field>

      <Field
        label="Agent ID"
        hint={
          backend === "local"
            ? "Must already exist on the local backend — create it with: letta --backend local agents create"
            : "Letta agent ID — format: agent-xxxxxxxx-xxxx-..."
        }
      >
        <DraftInput
          value={getField("agentId", "")}
          onCommit={(v) => setField("agentId", v)}
          immediate
          className={inputClass}
          placeholder={
            backend === "local"
              ? "agent-local-403c0073-96a8-4964-a0e0-5524b5363631"
              : "agent-2402fdcd-8623-4482-9998-590a1c13ce21"
          }
        />
      </Field>

      {backend === "api" ? (
        <>
          <Field label="API Key" hint="Letta API key (stored encrypted).">
            <SecretInput
              value={getField("apiKey", "")}
              onCommit={(v) => setField("apiKey", v)}
              placeholder="sk-let-…"
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
        </>
      ) : (
        <>
          <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            No Letta credentials needed for local mode.
          </div>

          {(() => {
            const { provider, modelName } = splitModelHandle(getField("model", ""));
            const meta = PROVIDER_PRESETS[provider] ?? PROVIDER_PRESETS.other;
            const setModel = (nextProvider: string, nextModelName: string) =>
              setField("model", composeModelHandle(nextProvider, nextModelName));
            return (
              <>
                <Field label="Provider" hint="Sets the model handle prefix passed to the letta CLI on every run.">
                  <select
                    value={provider}
                    onChange={(e) => setModel(e.target.value, modelName)}
                    className={inputClass + " cursor-pointer"}
                  >
                    <option value="ollama">Ollama — local</option>
                    <option value="ollama_cloud">Ollama Cloud</option>
                    <option value="other">Other</option>
                  </select>
                </Field>

                <Field label="Model" hint={meta.hint}>
                  <DraftInput
                    value={modelName}
                    onCommit={(v) => setModel(provider, v)}
                    immediate
                    className={inputClass}
                    placeholder={meta.placeholder}
                  />
                </Field>
              </>
            );
          })()}
        </>
      )}

      <Field label="Letta CLI binary path" hint="Path to the letta binary. Leave blank to resolve 'letta' from PATH.">
        <DraftInput
          value={getField("command", "")}
          onCommit={(v) => setField("command", v || undefined)}
          immediate
          className={inputClass}
          placeholder="letta"
        />
      </Field>
    </div>
  );
}
