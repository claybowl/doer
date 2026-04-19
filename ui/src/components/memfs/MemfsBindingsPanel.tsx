import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MEMFS_PERMISSIONS,
  MEMFS_STRATEGIES,
  type MemfsBindingDTO,
  type MemfsPermission,
  type MemfsRootDTO,
  type MemfsStrategy,
} from "@doerai/shared";
import { memfsApi } from "../../api/memfs";
import { queryKeys } from "../../lib/queryKeys";
import { Button } from "@/components/ui/button";
import { Link2, Trash2 } from "lucide-react";
import { Field, HintIcon } from "../agent-config-primitives";

interface MemfsBindingsPanelProps {
  companyId: string;
  agentId: string;
}

export function MemfsBindingsPanel({ companyId, agentId }: MemfsBindingsPanelProps) {
  const queryClient = useQueryClient();

  const rootsQuery = useQuery({
    queryKey: queryKeys.memfs.roots(companyId),
    queryFn: () => memfsApi.listRoots(companyId),
  });

  const bindingsQuery = useQuery({
    queryKey: queryKeys.memfs.bindingsForAgent(companyId, agentId),
    queryFn: () => memfsApi.listBindingsForAgent(companyId, agentId),
  });

  const [rootId, setRootId] = useState<string>("");
  const [pathPrefix, setPathPrefix] = useState("");
  const [strategy, setStrategy] = useState<MemfsStrategy>("fs-mount");
  const [permission, setPermission] = useState<MemfsPermission>("read");
  const [mountAs, setMountAs] = useState("");
  const [label, setLabel] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const rootById = useMemo(() => {
    const map = new Map<string, MemfsRootDTO>();
    for (const r of rootsQuery.data ?? []) map.set(r.id, r);
    return map;
  }, [rootsQuery.data]);

  // Default rootId to the first available root once the query resolves.
  useEffect(() => {
    if (!rootId && rootsQuery.data && rootsQuery.data.length > 0) {
      setRootId(rootsQuery.data[0]!.id);
    }
  }, [rootId, rootsQuery.data]);

  const createMutation = useMutation({
    mutationFn: () =>
      memfsApi.createBinding(companyId, {
        agentId,
        rootId,
        pathPrefix: pathPrefix.trim(),
        strategy,
        permission,
        mountAs: mountAs.trim() || null,
        label: label.trim() || null,
      }),
    onSuccess: () => {
      setPathPrefix("");
      setMountAs("");
      setLabel("");
      setFormError(null);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.memfs.bindingsForAgent(companyId, agentId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.memfs.bindingsForCompany(companyId),
      });
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : "Failed to create binding");
    },
  });

  const removeMutation = useMutation({
    mutationFn: (bindingId: string) =>
      memfsApi.removeBinding(companyId, bindingId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.memfs.bindingsForAgent(companyId, agentId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.memfs.bindingsForCompany(companyId),
      });
    },
  });

  const rootsLoaded = rootsQuery.data !== undefined;
  const hasRoots = (rootsQuery.data?.length ?? 0) > 0;
  const canSubmit =
    hasRoots &&
    rootId.length > 0 &&
    pathPrefix.trim().length > 0 &&
    !createMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">Memory</h2>
          <HintIcon text="Bindings tell this agent which paths inside a company-declared memory root to mount into each run workspace. V1 fs-mount strategy symlinks the path into the run cwd at `.memory/<label>` (or `binding.mountAs`)." />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Attach memory roots to this agent. Bindings take effect on the next
          run — no restart required.
        </p>
      </div>

      {/* Existing bindings */}
      <div className="space-y-3 rounded-md border border-border px-4 py-4">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Active bindings
        </div>
        {bindingsQuery.isLoading && (
          <div className="text-xs text-muted-foreground">Loading bindings…</div>
        )}
        {bindingsQuery.isError && (
          <div className="text-xs text-destructive">
            Failed to load bindings:{" "}
            {bindingsQuery.error instanceof Error
              ? bindingsQuery.error.message
              : "unknown error"}
          </div>
        )}
        {bindingsQuery.data && bindingsQuery.data.length === 0 && (
          <div className="text-xs text-muted-foreground">
            No bindings yet. Add one below.
          </div>
        )}
        {bindingsQuery.data && bindingsQuery.data.length > 0 && (
          <ul className="divide-y divide-border">
            {bindingsQuery.data.map((b: MemfsBindingDTO) => {
              const root = rootById.get(b.rootId);
              const mountLabel = b.mountAs ?? `.memory/${b.label ?? root?.label ?? ""}`;
              return (
                <li
                  key={b.id}
                  className="flex items-start justify-between gap-3 py-2"
                >
                  <div className="flex min-w-0 items-start gap-2">
                    <Link2 className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                        <span>{b.label ?? root?.label ?? "(unnamed)"}</span>
                        <span className="rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                          {b.strategy}
                        </span>
                        <span className="rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                          {b.permission}
                        </span>
                      </div>
                      <div className="truncate font-mono text-xs text-muted-foreground">
                        {root ? (
                          <>
                            {root.rootPath}
                            <span className="text-foreground/60">/</span>
                            {b.pathPrefix}
                          </>
                        ) : (
                          <>
                            <span className="text-destructive">(root missing)</span>{" "}
                            {b.pathPrefix}
                          </>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        mounts as{" "}
                        <span className="font-mono text-foreground/80">
                          {mountLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const ok = window.confirm(
                        `Remove binding for "${b.label ?? b.pathPrefix}"?`,
                      );
                      if (ok) removeMutation.mutate(b.id);
                    }}
                    disabled={removeMutation.isPending}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Create form */}
      <div className="space-y-3 rounded-md border border-border px-4 py-4">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Add a binding
        </div>
        {rootsLoaded && !hasRoots && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            No memory roots declared for this company yet. Declare one in{" "}
            <span className="font-medium">Company Settings → Memory Roots</span>{" "}
            first.
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Root" hint="Company-level declaration providing the base path.">
            <select
              className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm outline-none disabled:opacity-50"
              value={rootId}
              onChange={(e) => setRootId(e.target.value)}
              disabled={!hasRoots}
            >
              {(rootsQuery.data ?? []).map((root) => (
                <option key={root.id} value={root.id}>
                  {root.label} — {root.rootPath}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Strategy" hint="V1 supports fs-mount (symlink into run cwd) and native-letta (adapter-side).">
            <select
              className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm outline-none"
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as MemfsStrategy)}
            >
              {MEMFS_STRATEGIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field
          label="Path prefix"
          hint="Relative path under the root that this agent should see. No '..' or '.' segments."
        >
          <input
            className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 font-mono text-xs outline-none"
            type="text"
            value={pathPrefix}
            onChange={(e) => setPathPrefix(e.target.value)}
            placeholder="agents/<letta-agent-id>/memory"
            disabled={!hasRoots}
          />
        </Field>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Label" hint="Shown in UI and used for .memory/<label> mount path.">
            <input
              className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm outline-none"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="(optional)"
              disabled={!hasRoots}
            />
          </Field>
          <Field label="Mount as" hint="Override the mount path inside the run cwd. Defaults to .memory/<label>.">
            <input
              className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 font-mono text-xs outline-none"
              type="text"
              value={mountAs}
              onChange={(e) => setMountAs(e.target.value)}
              placeholder=".letta-memory"
              disabled={!hasRoots}
            />
          </Field>
          <Field label="Permission" hint="V1 enforces read-only. read-write is reserved.">
            <select
              className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm outline-none"
              value={permission}
              onChange={(e) => setPermission(e.target.value as MemfsPermission)}
              disabled={!hasRoots}
            >
              {MEMFS_PERMISSIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {formError && <div className="text-xs text-destructive">{formError}</div>}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => createMutation.mutate()}
            disabled={!canSubmit}
          >
            {createMutation.isPending ? "Binding…" : "Add binding"}
          </Button>
        </div>
      </div>
    </div>
  );
}
