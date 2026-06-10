import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MEMFS_PERMISSIONS, MEMFS_STRATEGY_SKILL } from "@doerai/shared";
import type { MemfsPermission, MemfsStrategy } from "@doerai/shared";
import { BookOpen } from "lucide-react";
import { memfsApi } from "../api/memfs";
import { cn } from "../lib/utils";

const selectClass =
  "w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono";

const strategyLabels: Record<string, string> = {
  "fs-mount": "Folder mounted into workspace (fs-mount)",
  "native-letta": "Letta Cloud native (Letta owns reads/writes)",
  "system-prompt-inject": "Injected into system prompt",
  "mcp-server": "Served over MCP",
  "tool-callable": "Tool-callable",
  none: "No memory",
};

function skillNote(strategy: string): string | null {
  const skill = MEMFS_STRATEGY_SKILL[strategy as MemfsStrategy];
  if (!skill) return null;
  return `Attaches the ${skill} skill so the agent knows how to use this memory.`;
}

/**
 * Memory section for the agent configuration form (edit mode).
 * Where = root + path prefix (org-scoped, set in company memory settings).
 * How = strategy, filtered to the adapter's declared capability.
 * Protocol = the auto-attached teaching skill (informational note).
 */
export function AgentMemorySection({
  companyId,
  agentId,
  adapterType,
  cards,
}: {
  companyId: string;
  agentId: string;
  adapterType: string;
  cards: boolean;
}) {
  const queryClient = useQueryClient();
  const bindingsKey = ["memfs", "agent-bindings", companyId, agentId];

  const capabilityQuery = useQuery({
    queryKey: ["memfs", "adapter-capability", companyId, adapterType],
    queryFn: () => memfsApi.getAdapterCapability(companyId, adapterType),
    staleTime: 5 * 60 * 1000,
  });
  const bindingsQuery = useQuery({
    queryKey: bindingsKey,
    queryFn: () => memfsApi.listBindingsForAgent(companyId, agentId),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: bindingsKey });
  };

  const updateBinding = useMutation({
    mutationFn: ({
      bindingId,
      patch,
    }: {
      bindingId: string;
      patch: { strategy?: MemfsStrategy; permission?: MemfsPermission };
    }) => memfsApi.updateBinding(companyId, bindingId, patch),
    onSettled: invalidate,
  });

  const createDefault = useMutation({
    mutationFn: () => memfsApi.ensureDefaultAgentBinding(companyId, agentId),
    onSettled: invalidate,
  });

  const capability = capabilityQuery.data;
  const bindings = bindingsQuery.data ?? [];

  // Adapters that declare no memory support get no section at all.
  const supportsMemory =
    capability != null && capability.supported.some((s) => s !== "none");
  if (capabilityQuery.isLoading || !supportsMemory) return null;

  const strategyOptions = capability.supported.filter((s) => s !== "none");

  return (
    <div className={cn(!cards && "border-b border-border")}>
      {cards ? (
        <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
          <BookOpen className="h-3 w-3" /> Memory
        </h3>
      ) : (
        <div className="px-4 py-2 text-xs font-medium text-muted-foreground flex items-center gap-2">
          <BookOpen className="h-3 w-3" /> Memory
        </div>
      )}
      <div className={cn(cards ? "border border-border rounded-lg p-4 space-y-3" : "px-4 pb-3 space-y-3")}>
        {bindings.length === 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              No memory bound to this agent yet.
            </p>
            <button
              type="button"
              className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent/50 disabled:opacity-50"
              disabled={createDefault.isPending}
              onClick={() => createDefault.mutate()}
            >
              {createDefault.isPending ? "Creating…" : "Create default memory"}
            </button>
            <p className="text-xs text-muted-foreground">
              Creates a visible memory folder under your org&apos;s memory
              location and mounts it as <code>memory</code>.
              {skillNote(capability.default) ? ` ${skillNote(capability.default)}` : ""}
            </p>
            {createDefault.isError && (
              <p className="text-xs text-red-600 dark:text-red-400">
                {(createDefault.error as Error)?.message ?? "Failed to create default memory."}
              </p>
            )}
          </div>
        ) : (
          bindings.map((binding) => {
            const resolved = binding as typeof binding & {
              rootPath?: string;
              rootLabel?: string;
            };
            const note = skillNote(binding.strategy);
            return (
              <div key={binding.id} className="space-y-2">
                <div className="text-xs font-mono text-muted-foreground break-all">
                  {resolved.rootPath ?? resolved.rootLabel ?? binding.rootId}
                  {binding.pathPrefix ? `/${binding.pathPrefix}` : ""}
                  {binding.mountAs ? (
                    <span className="text-muted-foreground/60"> → mounted as {binding.mountAs}</span>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs text-muted-foreground space-y-1 block">
                    <span>How</span>
                    <select
                      className={selectClass}
                      value={binding.strategy}
                      onChange={(e) =>
                        updateBinding.mutate({
                          bindingId: binding.id,
                          patch: { strategy: e.target.value as MemfsStrategy },
                        })
                      }
                    >
                      {strategyOptions.map((s) => (
                        <option key={s} value={s}>
                          {strategyLabels[s] ?? s}
                        </option>
                      ))}
                      {!strategyOptions.includes(binding.strategy) && (
                        <option value={binding.strategy}>
                          {strategyLabels[binding.strategy] ?? binding.strategy}
                        </option>
                      )}
                    </select>
                  </label>
                  <label className="text-xs text-muted-foreground space-y-1 block">
                    <span>Access</span>
                    <select
                      className={selectClass}
                      value={binding.permission}
                      onChange={(e) =>
                        updateBinding.mutate({
                          bindingId: binding.id,
                          patch: { permission: e.target.value as MemfsPermission },
                        })
                      }
                    >
                      {MEMFS_PERMISSIONS.map((p) => (
                        <option key={p} value={p}>
                          {p === "read-write" ? "Read & write" : "Read only"}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {note && <p className="text-xs text-muted-foreground">{note}</p>}
              </div>
            );
          })
        )}
        <p className="text-[11px] text-muted-foreground/70">
          The org&apos;s memory location is set in Company Settings → Memory.
        </p>
      </div>
    </div>
  );
}
