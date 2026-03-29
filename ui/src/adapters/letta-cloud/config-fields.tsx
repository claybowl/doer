import { useState, useEffect, useCallback } from "react";
import { Eye, EyeOff, Plus, Trash2, Lock } from "lucide-react";
import type { AdapterConfigFieldsProps } from "../types";
import { Field, DraftInput } from "../../components/agent-config-primitives";
import type { LettaMemoryBlock, LettaTool } from "@paperclipai/adapter-letta-cloud";

// ─── Shared input style ───────────────────────────────────────────────────────
const inputClass =
  "w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/40";

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

// ─── Memory block editor ──────────────────────────────────────────────────────
function MemoryBlockEditor({
  block,
  paperId,
  onSave,
}: {
  block: LettaMemoryBlock;
  paperId: string;
  onSave: (label: string, value: string) => Promise<void>;
}) {
  const [value, setValue] = useState(block.value);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // sync if parent block changes
  useEffect(() => { setValue(block.value); }, [block.value]);

  const handleBlur = useCallback(async () => {
    if (value === block.value) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(block.label, value);
    } catch {
      setSaveError("Save failed — check connection");
      setValue(block.value);
    } finally {
      setSaving(false);
    }
  }, [value, block.value, block.label, onSave]);

  const charCount = value.length;
  const atLimit = block.limit != null && charCount >= block.limit;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        {block.readOnly && <Lock className="h-3 w-3 text-muted-foreground/50" />}
        <span className="text-xs font-medium font-mono text-muted-foreground">{block.label}</span>
        {block.description && (
          <span className="text-xs text-muted-foreground/60">— {block.description}</span>
        )}
      </div>
      <textarea
        className={
          inputClass +
          " min-h-[80px] resize-y leading-relaxed" +
          (block.readOnly ? " opacity-60 cursor-not-allowed" : "")
        }
        value={value}
        onChange={(e) => !block.readOnly && setValue(e.target.value)}
        onBlur={handleBlur}
        disabled={block.readOnly}
        placeholder={block.readOnly ? "[read-only]" : "Edit memory content…"}
        maxLength={block.limit ?? undefined}
      />
      <div className="flex items-center justify-between">
        {saveError ? (
          <p className="text-xs text-destructive">{saveError}</p>
        ) : saving ? (
          <p className="text-xs text-muted-foreground">Saving…</p>
        ) : (
          <span />
        )}
        {block.limit != null && (
          <p className={`text-xs ${atLimit ? "text-destructive" : "text-muted-foreground/60"}`}>
            {charCount} / {block.limit}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Tool manager ─────────────────────────────────────────────────────────────
function ToolManager({
  tools,
  paperId,
  onAttach,
  onDetach,
}: {
  tools: LettaTool[];
  paperId: string;
  onAttach: (toolId: string) => Promise<void>;
  onDetach: (toolId: string) => Promise<void>;
}) {
  const [attachId, setAttachId] = useState("");
  const [working, setWorking] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const handleAttach = async () => {
    if (!attachId.trim()) return;
    setWorking("attach");
    setErr(null);
    try {
      await onAttach(attachId.trim());
      setAttachId("");
    } catch {
      setErr("Failed to attach tool");
    } finally {
      setWorking(null);
    }
  };

  const handleDetach = async (id: string) => {
    setWorking(id);
    setErr(null);
    try {
      await onDetach(id);
    } catch {
      setErr(`Failed to detach ${id}`);
    } finally {
      setWorking(null);
    }
  };

  return (
    <div className="space-y-2">
      {tools.length === 0 ? (
        <p className="text-xs text-muted-foreground">No tools attached</p>
      ) : (
        <div className="divide-y divide-border">
          {tools.map((tool) => (
            <div key={tool.id} className="flex items-start justify-between py-2">
              <div className="space-y-0.5 min-w-0">
                <p className="text-xs font-medium truncate">{tool.name}</p>
                {tool.description && (
                  <p className="text-xs text-muted-foreground/70 leading-relaxed">{tool.description}</p>
                )}
                <div className="flex gap-1.5 flex-wrap">
                  {tool.toolType && (
                    <span className="text-[10px] bg-accent/50 rounded px-1.5 py-0.5">{tool.toolType}</span>
                  )}
                  {tool.defaultRequiresApproval && (
                    <span className="text-[10px] bg-yellow-500/10 text-yellow-600 rounded px-1.5 py-0.5">approval required</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDetach(tool.id)}
                disabled={working === tool.id}
                className="ml-3 shrink-0 text-muted-foreground/50 hover:text-destructive transition-colors"
                title="Detach tool"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Attach by ID */}
      <div className="flex gap-2 pt-1">
        <input
          className={inputClass + " flex-1 text-xs"}
          placeholder="Tool ID to attach…"
          value={attachId}
          onChange={(e) => setAttachId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAttach()}
        />
        <button
          onClick={handleAttach}
          disabled={!attachId.trim() || working === "attach"}
          className="shrink-0 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-accent/50 transition-colors disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-accent/30 transition-colors"
      >
        {title}
        <span className="text-muted-foreground text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="px-4 pb-4 space-y-4">{children}</div>}
    </div>
  );
}

// ─── Main config fields component ─────────────────────────────────────────────
export function LettaCloudConfigFields({
  mode,
  isCreate,
  values,
  set,
  config,
  eff,
  mark,
  agent,
}: AdapterConfigFieldsProps & { agent?: { id: string } }) {
  const [blocks, setBlocks] = useState<LettaMemoryBlock[]>([]);
  const [tools, setTools] = useState<LettaTool[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const agentId = isCreate
    ? ((values as Record<string, unknown>)?.agentId as string ?? "")
    : (eff("adapterConfig", "agentId", String(config?.agentId ?? "")) as string);

  const apiKey = isCreate
    ? ((values as Record<string, unknown>)?.apiKey as string ?? "")
    : (eff("adapterConfig", "apiKey", String(config?.apiKey ?? "")) as string);

  const baseUrl = isCreate
    ? ((values as Record<string, unknown>)?.baseUrl as string ?? "")
    : (eff("adapterConfig", "baseUrl", String(config?.baseUrl ?? "")) as string);

  // Load snapshot when we have agentId + apiKey (edit mode only)
  useEffect(() => {
    if (isCreate || !agentId || !apiKey || !agent?.id) return;
    setLoading(true);
    setLoadError(null);
    fetch(`/api/agents/${agent.id}/letta`)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then((data: { blocks: LettaMemoryBlock[]; tools: LettaTool[] }) => {
        setBlocks(data.blocks ?? []);
        setTools(data.tools ?? []);
      })
      .catch((e: Error) => setLoadError(`Could not load Letta data: ${e.message}`))
      .finally(() => setLoading(false));
  }, [isCreate, agentId, apiKey, agent?.id]);

  const handleSaveBlock = useCallback(async (label: string, value: string) => {
    if (!agent?.id) throw new Error("No agent ID");
    const r = await fetch(`/api/agents/${agent.id}/letta/memory`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockLabel: label, value }),
    });
    if (!r.ok) throw new Error(`${r.status}`);
    setBlocks((prev) => prev.map((b) => (b.label === label ? { ...b, value } : b)));
  }, [agent?.id]);

  const handleAttachTool = useCallback(async (toolId: string) => {
    if (!agent?.id) throw new Error("No agent ID");
    const r = await fetch(`/api/agents/${agent.id}/letta/tools/attach`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toolId }),
    });
    if (!r.ok) throw new Error(`${r.status}`);
    // Refresh tools list
    const data = await r.json() as { tool: LettaTool };
    setTools((prev) => [...prev, data.tool]);
  }, [agent?.id]);

  const handleDetachTool = useCallback(async (toolId: string) => {
    if (!agent?.id) throw new Error("No agent ID");
    const r = await fetch(`/api/agents/${agent.id}/letta/tools/detach`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toolId }),
    });
    if (!r.ok) throw new Error(`${r.status}`);
    setTools((prev) => prev.filter((t) => t.id !== toolId));
  }, [agent?.id]);

  const setField = (field: string, v: unknown) =>
    isCreate
      ? set?.({ [field]: v } as Partial<typeof values>)
      : mark("adapterConfig", field, v);

  const getField = (field: string, fallback: string) =>
    isCreate
      ? (((values as Record<string, unknown>)?.[field] as string) ?? fallback)
      : (eff("adapterConfig", field, fallback) as string);

  return (
    <>
      {/* ── Connection ──────────────────────────────────────────────────── */}
      <Section title="Letta Connection" defaultOpen>
        <Field label="Agent ID" hint="Letta agent ID — format: agent-xxxxxxxx-xxxx-...">
          <DraftInput
            value={agentId}
            onCommit={(v) => setField("agentId", v)}
            immediate
            className={inputClass}
            placeholder="agent-d436abf8-6057-44a6-8019-5f5dc0b22763"
          />
        </Field>

        <Field label="API Key" hint="Your Letta Cloud API key (stored encrypted)">
          <SecretInput
            value={apiKey}
            onCommit={(v) => setField("apiKey", v)}
            placeholder="sk-letta-..."
          />
        </Field>

        <Field label="Base URL" hint="Leave blank for Letta Cloud. Set for self-hosted instances.">
          <DraftInput
            value={baseUrl}
            onCommit={(v) => setField("baseUrl", v || undefined)}
            immediate
            className={inputClass}
            placeholder="https://api.letta.com"
          />
        </Field>
      </Section>

      {/* ── Memory Blocks (edit mode only) ──────────────────────────────── */}
      {!isCreate && (
        <Section title="Memory Blocks" defaultOpen>
          {loading && <p className="text-xs text-muted-foreground">Loading blocks…</p>}
          {loadError && <p className="text-xs text-destructive">{loadError}</p>}
          {!loading && blocks.length === 0 && !loadError && (
            <p className="text-xs text-muted-foreground">No memory blocks attached</p>
          )}
          {blocks.map((block) => (
            <MemoryBlockEditor
              key={block.id}
              block={block}
              paperId={agent?.id ?? ""}
              onSave={handleSaveBlock}
            />
          ))}
        </Section>
      )}

      {/* ── Tools (edit mode only) ──────────────────────────────────────── */}
      {!isCreate && (
        <Section title="Tools">
          {loading && <p className="text-xs text-muted-foreground">Loading tools…</p>}
          {!loading && (
            <ToolManager
              tools={tools}
              paperId={agent?.id ?? ""}
              onAttach={handleAttachTool}
              onDetach={handleDetachTool}
            />
          )}
        </Section>
      )}

      {/* ── Model Settings ──────────────────────────────────────────────── */}
      <Section title="Model Settings">
        <Field label="Model" hint="LLM handle, e.g. anthropic/claude-sonnet-4-5 or openai/gpt-4o">
          <DraftInput
            value={getField("model", "")}
            onCommit={(v) => setField("model", v)}
            immediate
            className={inputClass}
            placeholder="anthropic/claude-sonnet-4-5"
          />
        </Field>

        <Field label="Temperature" hint="Sampling temperature 0.0–1.0">
          <DraftInput
            value={String(getField("temperature", "0.7"))}
            onCommit={(v) => setField("temperature", parseFloat(v) || 0.7)}
            immediate
            className={inputClass}
            placeholder="0.7"
          />
        </Field>

        <Field label="Max Tokens">
          <DraftInput
            value={String(getField("maxTokens", "4096"))}
            onCommit={(v) => setField("maxTokens", parseInt(v, 10) || 4096)}
            immediate
            className={inputClass}
            placeholder="4096"
          />
        </Field>
      </Section>
    </>
  );
}
