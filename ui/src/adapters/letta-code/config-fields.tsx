import type { AdapterConfigFieldsProps, CreateConfigValues } from "../types";
import { DraftInput, Field } from "../../components/agent-config-primitives";

const controlClass =
  "w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm font-mono outline-none placeholder:text-muted-foreground/40 focus-visible:ring-ring focus-visible:ring-[3px]";

const SKILL_SOURCES = ["bundled", "global", "agent", "project"] as const;

export function LettaCodeConfigFields({
  isCreate,
  values,
  set,
  config,
  eff,
  mark,
}: AdapterConfigFieldsProps) {
  const setField = (field: string, value: unknown) => {
    if (isCreate) set?.({ [field]: value } as unknown as Partial<CreateConfigValues>);
    else mark("adapterConfig", field, value);
  };
  const getValue = <T,>(field: string, fallback: T): T => isCreate
    ? (((values as unknown as Record<string, unknown>)?.[field] as T) ?? fallback)
    : eff("adapterConfig", field, (config[field] as T) ?? fallback);
  const getString = (field: string, fallback = "") => String(getValue(field, fallback) ?? fallback);
  const getBoolean = (field: string, fallback: boolean) => getValue(field, fallback) === true;
  const getList = (field: string, fallback: string[]) => {
    const value = getValue<unknown>(field, fallback);
    if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === "string");
    if (typeof value === "string") return value.split(/[\n,]/).map((entry) => entry.trim()).filter(Boolean);
    return fallback;
  };

  const backend = getString("backend", "local") === "cloud_attached" ? "cloud_attached" : "local";
  const permissionMode = getString("permissionMode", "standard");
  const skillSources = getList("skillSources", [...SKILL_SOURCES]);
  const dreamingTrigger = getString("dreamingTrigger", "off");

  return (
    <div className="space-y-4">
      <Field label="Backend" hint="Local is canonical. Cloud-attached keeps compatibility with an existing Constellation agent while tools still run on this Doer machine.">
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Letta backend">
          {([
            ["local", "Local Canonical", "Doer memory & local tools"],
            ["cloud_attached", "Cloud Attached", "Existing Constellation ID"],
          ] as const).map(([id, label, detail]) => (
            <button
              key={id}
              type="button"
              aria-pressed={backend === id}
              onClick={() => setField("backend", id)}
              className={`rounded-md border px-3 py-2 text-left focus-visible:ring-ring focus-visible:ring-[3px] ${
                backend === id ? "border-primary bg-primary/10" : "border-border hover:bg-accent/50"
              }`}
            >
              <span className="block text-sm font-medium">{label}</span>
              <span className="block text-xs text-muted-foreground">{detail}</span>
            </button>
          ))}
        </div>
      </Field>

      <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        Shell, filesystem, and Doer tools execute on this machine. Model choice does not reduce those permissions. Agent memory uses the binding configured in the Memory tab.
      </div>

      <Field
        label="Letta Agent ID"
        hint={backend === "local" ? "Leave blank to create a new canonical agent-local ID on first run." : "Required: the existing Constellation agent ID."}
      >
        <DraftInput
          name="lettaAgentId"
          aria-label="Letta Agent ID"
          autoComplete="off"
          spellCheck={false}
          value={getString("lettaAgentId")}
          onCommit={(value) => setField("lettaAgentId", value || undefined)}
          immediate
          className={controlClass}
          placeholder={backend === "local" ? "Created automatically…" : "agent-xxxxxxxx-xxxx-…"}
        />
      </Field>

      <Field label="Model Handle" hint="Any model available through Letta, including ChatGPT subscription, Ollama, Ollama Cloud, or BYOK providers.">
        <DraftInput
          name="lettaModel"
          aria-label="Letta model handle"
          autoComplete="off"
          spellCheck={false}
          value={getString("model")}
          onCommit={(value) => setField("model", value || undefined)}
          immediate
          className={controlClass}
          placeholder="openai-codex/gpt-5…"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Reasoning" hint="Reasoning tier supported by the selected model.">
          <select
            name="lettaReasoningEffort"
            aria-label="Letta reasoning effort"
            value={getString("reasoningEffort")}
            onChange={(event) => setField("reasoningEffort", event.target.value || undefined)}
            className={controlClass}
          >
            <option value="">Model default</option>
            {[
              "none", "minimal", "low", "medium", "high", "xhigh",
            ].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </Field>
        <Field label="Tool Permissions" hint="Controls approval prompts for tools running locally on the Doer machine.">
          <select
            name="lettaPermissionMode"
            aria-label="Letta tool permission mode"
            value={permissionMode}
            onChange={(event) => setField("permissionMode", event.target.value)}
            className={controlClass}
          >
            <option value="standard">Standard</option>
            <option value="acceptEdits">Accept Edits</option>
            <option value="unrestricted">Unrestricted</option>
          </select>
        </Field>
      </div>

      <Field label="Allowed Tools" hint="Optional allowlist of Letta Code tool names, comma-separated. Blank means Letta defaults.">
        <DraftInput
          name="lettaAllowedTools"
          aria-label="Allowed Letta tools"
          autoComplete="off"
          spellCheck={false}
          value={getList("allowedTools", []).join(", ")}
          onCommit={(value) => setField("allowedTools", value.split(",").map((item) => item.trim()).filter(Boolean))}
          className={controlClass}
          placeholder="Bash, Read, Write, Edit…"
        />
      </Field>

      <Field label="Disallowed Tools" hint="Optional denylist applied after the allowlist.">
        <DraftInput
          name="lettaDisallowedTools"
          aria-label="Disallowed Letta tools"
          autoComplete="off"
          spellCheck={false}
          value={getList("disallowedTools", []).join(", ")}
          onCommit={(value) => setField("disallowedTools", value.split(",").map((item) => item.trim()).filter(Boolean))}
          className={controlClass}
          placeholder="Tool names…"
        />
      </Field>

      <Field label="Skill Sources" hint="Choose which Letta Code skill locations are available. Agent/project skills can include mod-provided customization.">
        <div className="grid grid-cols-2 gap-2">
          {SKILL_SOURCES.map((source) => (
            <label key={source} className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-2.5 py-2 text-xs hover:bg-accent/50">
              <input
                type="checkbox"
                name={`lettaSkillSource-${source}`}
                checked={skillSources.includes(source)}
                onChange={(event) => setField(
                  "skillSources",
                  event.target.checked
                    ? [...skillSources, source]
                    : skillSources.filter((item) => item !== source),
                )}
              />
              <span className="capitalize">{source}</span>
            </label>
          ))}
        </div>
      </Field>

      <div className="space-y-2 rounded-md border border-border px-3 py-2">
        {[
          ["modsEnabled", "Enable Letta Code Mods", "Loads installed mods; execution never installs or removes them."],
          ["systemInfoReminder", "System Info Reminder", "Includes local device, Git, and workspace context on the first turn."],
        ].map(([field, label, detail]) => (
          <label key={field} className="flex cursor-pointer items-start gap-2 text-xs">
            <input
              type="checkbox"
              name={field}
              checked={getBoolean(field, field === "modsEnabled")}
              onChange={(event) => setField(field, event.target.checked)}
              className="mt-0.5"
            />
            <span><span className="font-medium text-foreground">{label}</span><span className="block text-muted-foreground">{detail}</span></span>
          </label>
        ))}
      </div>

      <Field label="Dreaming" hint="Optional Letta memory-reflection behavior.">
        <select
          name="lettaDreamingTrigger"
          aria-label="Letta dreaming trigger"
          value={dreamingTrigger}
          onChange={(event) => setField("dreamingTrigger", event.target.value)}
          className={controlClass}
        >
          <option value="off">Off</option>
          <option value="step-count">Step Count</option>
          <option value="compaction-event">Compaction Event</option>
        </select>
      </Field>

      {dreamingTrigger !== "off" && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Dreaming Behavior" hint="Show a reminder or launch reflection automatically.">
            <select
              name="lettaDreamingBehavior"
              aria-label="Letta dreaming behavior"
              value={getString("dreamingBehavior", "reminder")}
              onChange={(event) => setField("dreamingBehavior", event.target.value)}
              className={controlClass}
            >
              <option value="reminder">Reminder</option>
              <option value="auto-launch">Auto Launch</option>
            </select>
          </Field>
          {dreamingTrigger === "step-count" && (
            <Field label="Step Count" hint="Positive number of steps between reflection prompts.">
              <DraftInput
                type="number"
                inputMode="numeric"
                min={1}
                name="lettaDreamingStepCount"
                aria-label="Letta dreaming step count"
                autoComplete="off"
                value={getString("dreamingStepCount", "10")}
                onCommit={(value) => setField("dreamingStepCount", Number(value) || 10)}
                immediate
                className={controlClass}
              />
            </Field>
          )}
        </div>
      )}

      {backend === "cloud_attached" && (
        <div className="space-y-3 rounded-md border border-border p-3">
          <div>
            <p className="text-sm font-medium">Cloud Compatibility</p>
            <p className="text-xs text-muted-foreground">Optional when this machine is already authenticated through <code>letta /connect</code>.</p>
          </div>
          <Field label="API Key" hint="Explicit Constellation credential. Prefer the Letta CLI login when possible.">
            <DraftInput
              type="password"
              name="lettaApiKey"
              aria-label="Letta API key"
              autoComplete="off"
              spellCheck={false}
              value={getString("apiKey")}
              onCommit={(value) => setField("apiKey", value || undefined)}
              immediate
              className={controlClass}
              placeholder="Optional API key…"
            />
          </Field>
          <Field label="API Base URL" hint="Leave blank for https://api.letta.com.">
            <DraftInput
              type="url"
              name="lettaApiBaseUrl"
              aria-label="Letta API base URL"
              autoComplete="off"
              spellCheck={false}
              value={getString("apiBaseUrl")}
              onCommit={(value) => setField("apiBaseUrl", value || undefined)}
              immediate
              className={controlClass}
              placeholder="https://api.letta.com…"
            />
          </Field>
        </div>
      )}
    </div>
  );
}
