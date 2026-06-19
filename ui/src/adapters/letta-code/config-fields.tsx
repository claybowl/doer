import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { AdapterConfigFieldsProps, CreateConfigValues } from "../types";
import { Field, DraftInput } from "../../components/agent-config-primitives";

// ─── Shared input style ───────────────────────────────────────────────────────
const inputClass =
  "w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/40";

// ─── Provider presets (mirrors the server-side OPENAI_COMPAT_PRESETS) ─────────
const PROVIDER_META: Record<
  string,
  { baseUrl: string; envKey: string | null; modelPlaceholder: string; modelHint: string }
> = {
  anthropic:    { baseUrl: "https://api.anthropic.com",          envKey: "ANTHROPIC_API_KEY", modelPlaceholder: "claude-sonnet-4-6",        modelHint: "e.g. claude-sonnet-4-6, claude-haiku-4-5" },
  groq:         { baseUrl: "https://api.groq.com/openai/v1",      envKey: "GROQ_API_KEY",      modelPlaceholder: "llama-3.3-70b-versatile",  modelHint: "e.g. llama-3.3-70b-versatile, openai/gpt-oss-120b" },
  ollama:       { baseUrl: "http://localhost:11434/v1",          envKey: null,                modelPlaceholder: "llama3.2",                 modelHint: "Any model you've pulled, e.g. llama3.2, qwen2.5" },
  ollama_cloud: { baseUrl: "https://ollama.com/v1",              envKey: "OLLAMA_API_KEY",    modelPlaceholder: "gpt-oss:120b",             modelHint: "e.g. gpt-oss:120b, qwen3-coder:480b" },
  nvidia:       { baseUrl: "https://integrate.api.nvidia.com/v1", envKey: "NVIDIA_API_KEY",   modelPlaceholder: "meta/llama-3.3-70b-instruct", modelHint: "e.g. meta/llama-3.3-70b-instruct" },
  opencode_zen: { baseUrl: "https://opencode.ai/zen/v1",         envKey: "OPENCODE_API_KEY",  modelPlaceholder: "grok-code",                modelHint: "e.g. grok-code, qwen3-coder" },
  openai:       { baseUrl: "https://api.openai.com/v1",          envKey: "OPENAI_API_KEY",    modelPlaceholder: "gpt-4o",                   modelHint: "e.g. gpt-4o, gpt-4o-mini" },
};

// ─── Secret field (API key) ───────────────────────────────────────────────────
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

// ─── Mode toggle (Online / Offline) ─────────────────────────────────────────────
function ModeToggle({
  value,
  onChange,
}: {
  value: "online" | "offline";
  onChange: (mode: "online" | "offline") => void;
}) {
  const opts: { id: "online" | "offline"; label: string; sub: string }[] = [
    { id: "online", label: "Online", sub: "Letta server" },
    { id: "offline", label: "Offline", sub: "Local .md files" },
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

// ─── Main config fields component ─────────────────────────────────────────────
export function LettaCodeConfigFields({
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

  // Default to offline — it's the zero-dependency mode.
  const mode = (getField("mode", "offline") || "offline") as "online" | "offline";

  return (
    <div className="space-y-4">
      {/* ── Mode ──────────────────────────────────────────────────────────── */}
      <Field label="Mode" hint="Online connects to a Letta server. Offline runs in-process from local .md memory files.">
        <ModeToggle value={mode} onChange={(m) => setField("mode", m)} />
      </Field>

      {mode === "online" ? (
        <>
          {/* ── Online fields ─────────────────────────────────────────────── */}
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
        </>
      ) : (
        <>
          {/* ── Offline fields ────────────────────────────────────────────── */}
          <Field
            label="Memory directory"
            hint="Absolute path to a folder of .md memory blocks. Leave blank to use the attached memory binding (Memory tab)."
          >
            <DraftInput
              value={getField("memoryDir", "")}
              onCommit={(v) => setField("memoryDir", v || undefined)}
              immediate
              className={inputClass}
              placeholder="/Users/you/.letta/agents/agent-…/memory  (or leave blank)"
            />
          </Field>

          {(() => {
            const provider = getField("provider", "anthropic") || "anthropic";
            const meta = PROVIDER_META[provider] ?? PROVIDER_META.anthropic;
            return (
              <>
                <Field label="Provider" hint="Which LLM backend to call directly. Groq, NVIDIA, Ollama and OpenCode Zen are free or near-free.">
                  <select
                    value={provider}
                    onChange={(e) => setField("provider", e.target.value)}
                    className={inputClass + " cursor-pointer"}
                  >
                    <option value="anthropic">Anthropic (paid)</option>
                    <option value="groq">Groq (free tier)</option>
                    <option value="ollama">Ollama — local (free)</option>
                    <option value="ollama_cloud">Ollama Cloud (free daily)</option>
                    <option value="nvidia">NVIDIA NIM (free tier)</option>
                    <option value="opencode_zen">OpenCode Zen (free models)</option>
                    <option value="openai">OpenAI (paid)</option>
                  </select>
                </Field>

                <Field label="Model" hint={meta.modelHint}>
                  <DraftInput
                    value={getField("model", "")}
                    onCommit={(v) => setField("model", v || undefined)}
                    immediate
                    className={inputClass}
                    placeholder={meta.modelPlaceholder}
                  />
                </Field>

                <Field label="Base URL" hint={`Override the endpoint. Blank uses the preset: ${meta.baseUrl}`}>
                  <DraftInput
                    value={getField("baseUrl", "")}
                    onCommit={(v) => setField("baseUrl", v || undefined)}
                    immediate
                    className={inputClass}
                    placeholder={meta.baseUrl}
                  />
                </Field>

                {meta.envKey ? (
                  <Field label="API Key" hint={`Optional override. Falls back to ${meta.envKey} in the environment.`}>
                    <SecretInput
                      value={getField("apiKey", "")}
                      onCommit={(v) => setField("apiKey", v || undefined)}
                      placeholder={`${meta.envKey} (optional)`}
                    />
                  </Field>
                ) : (
                  <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                    Local Ollama needs no API key — just make sure <code>ollama serve</code> is running on this machine.
                  </div>
                )}
              </>
            );
          })()}
        </>
      )}

      {/* Heartbeat prompt is edited in the Instructions tab (shared with letta_cloud). */}
    </div>
  );
}
