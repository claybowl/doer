import type { AdapterConfigFieldsProps } from "../types";
import {
  Field,
  ToggleField,
  DraftInput,
  help,
} from "../../components/agent-config-primitives";
import { ChoosePathButton } from "../../components/PathInstructionsModal";

const inputClass =
  "w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/40";

export function AgentFileConfigFields({
  isCreate,
  values,
  set,
  config,
  eff,
  mark,
}: AdapterConfigFieldsProps) {
  return (
    <>
      {/* .af file path — required */}
      <Field
        label="Agent file (.af)"
        hint="Absolute path to the .af export from Letta Cloud or the letta export command. Memory blocks are extracted from this file on hire."
      >
        <div className="flex items-center gap-2">
          <DraftInput
            value={
              isCreate
                ? values!.afPath ?? ""
                : eff("adapterConfig", "afPath", String(config.afPath ?? ""))
            }
            onCommit={(v) =>
              isCreate
                ? set!({ afPath: v })
                : mark("adapterConfig", "afPath", v || undefined)
            }
            immediate
            className={inputClass}
            placeholder="/absolute/path/to/agent.af"
          />
          <ChoosePathButton />
        </div>
      </Field>

      {/* Model — optional, overrides model from .af */}
      <Field
        label="Model"
        hint='OpenCode model in provider/model format, e.g. "anthropic/claude-sonnet-4-5". Overrides the model stored in the .af file.'
      >
        <DraftInput
          value={
            isCreate
              ? values!.model ?? ""
              : eff("adapterConfig", "model", String(config.model ?? ""))
          }
          onCommit={(v) =>
            isCreate
              ? set!({ model: v })
              : mark("adapterConfig", "model", v || undefined)
          }
          immediate
          className={inputClass}
          placeholder="anthropic/claude-sonnet-4-5"
        />
      </Field>

      {/* Heartbeat prompt — optional */}
      <Field
        label="Heartbeat prompt"
        hint="Message sent to the agent on each timer-triggered wake. Supports {{agent.id}}, {{agent.name}}, {{run.id}}. Leave blank for the default."
      >
        <DraftInput
          value={
            isCreate
              ? values!.heartbeatPrompt ?? ""
              : eff("adapterConfig", "heartbeatPrompt", String(config.heartbeatPrompt ?? ""))
          }
          onCommit={(v) =>
            isCreate
              ? set!({ heartbeatPrompt: v })
              : mark("adapterConfig", "heartbeatPrompt", v || undefined)
          }
          immediate
          className={inputClass}
          placeholder="Check your queue and continue your work."
        />
      </Field>

      {/* Skip permissions */}
      <ToggleField
        label="Skip permissions"
        hint={help.dangerouslySkipPermissions}
        checked={
          isCreate
            ? values!.dangerouslySkipPermissions !== false
            : eff(
                "adapterConfig",
                "dangerouslySkipPermissions",
                config.dangerouslySkipPermissions !== false,
              )
        }
        onChange={(v) =>
          isCreate
            ? set!({ dangerouslySkipPermissions: v })
            : mark("adapterConfig", "dangerouslySkipPermissions", v)
        }
      />

      {/* Memory dir — read-only, shown after hire */}
      {!isCreate && config.memoryDir && (
        <Field
          label="Memory directory"
          hint="Extracted memory blocks live here. Create a memfs root pointing to this path to see and edit blocks in the Fernweh UI."
        >
          <div className={`${inputClass} select-all text-muted-foreground cursor-default`}>
            {String(config.memoryDir)}
          </div>
        </Field>
      )}

      {/* Memory block labels — read-only, shown after hire */}
      {!isCreate && Array.isArray(config.memoryBlockLabels) && config.memoryBlockLabels.length > 0 && (
        <Field
          label="Memory blocks"
          hint="Blocks extracted from the .af file. Each block is a .txt file in the memory directory."
        >
          <div className="flex flex-wrap gap-1.5">
            {(config.memoryBlockLabels as string[]).map((label) => (
              <span
                key={label}
                className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-muted-foreground"
              >
                {label}.txt
              </span>
            ))}
          </div>
        </Field>
      )}
    </>
  );
}
