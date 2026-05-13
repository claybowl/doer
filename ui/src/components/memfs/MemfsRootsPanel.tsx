import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MEMFS_ROOT_KINDS,
  type MemfsRootDTO,
  type MemfsRootKind,
} from "@doerai/shared";
import { memfsApi } from "../../api/memfs";
import { queryKeys } from "../../lib/queryKeys";
import { Button } from "@/components/ui/button";
import { HardDrive, Trash2 } from "lucide-react";
import { Field, HintIcon } from "../agent-config-primitives";

interface MemfsRootsPanelProps {
  companyId: string;
}

export function MemfsRootsPanel({ companyId }: MemfsRootsPanelProps) {
  const queryClient = useQueryClient();
  const rootsQuery = useQuery({
    queryKey: queryKeys.memfs.roots(companyId),
    queryFn: () => memfsApi.listRoots(companyId),
  });

  const [rootPath, setRootPath] = useState("~/.letta");
  const [label, setLabel] = useState("letta");
  const [kind, setKind] = useState<MemfsRootKind>("local-fs");
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      memfsApi.createRoot(companyId, {
        kind,
        rootPath: rootPath.trim(),
        label: label.trim() || "letta",
      }),
    onSuccess: () => {
      setRootPath("~/.letta");
      setLabel("letta");
      setKind("local-fs");
      setFormError(null);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.memfs.roots(companyId),
      });
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : "Failed to create root");
    },
  });

  const removeMutation = useMutation({
    mutationFn: (rootId: string) => memfsApi.removeRoot(companyId, rootId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.memfs.roots(companyId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.memfs.bindingsForCompany(companyId),
      });
    },
  });

  const canSubmit =
    rootPath.trim().length > 0 && !createMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Memory Roots
        </div>
        <HintIcon text="Declare filesystem or hosted roots that your agents can mount as memory. Local-fs roots expose a directory on disk (e.g. ~/.letta) that bindings reference by pathPrefix." />
      </div>

      <div className="space-y-3 rounded-md border border-border px-4 py-4">
        {/* Existing roots list */}
        {rootsQuery.isLoading && (
          <div className="text-xs text-muted-foreground">Loading roots…</div>
        )}
        {rootsQuery.isError && (
          <div className="text-xs text-destructive">
            Failed to load roots:{" "}
            {rootsQuery.error instanceof Error
              ? rootsQuery.error.message
              : "unknown error"}
          </div>
        )}
        {rootsQuery.data && rootsQuery.data.length === 0 && (
          <div className="text-xs text-muted-foreground">
            No memory roots yet. Declare one below.
          </div>
        )}
        {rootsQuery.data && rootsQuery.data.length > 0 && (
          <ul className="divide-y divide-border">
            {rootsQuery.data.map((root: MemfsRootDTO) => (
              <li
                key={root.id}
                className="flex items-center justify-between gap-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <HardDrive className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <span>{root.label}</span>
                      <span className="rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                        {root.kind}
                      </span>
                    </div>
                    <div className="truncate font-mono text-xs text-muted-foreground">
                      {root.rootPath}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const ok = window.confirm(
                      `Remove memory root "${root.label}" (${root.rootPath})?\n\nThis cannot be undone. Existing bindings that reference it will fail to mount.`,
                    );
                    if (ok) removeMutation.mutate(root.id);
                  }}
                  disabled={removeMutation.isPending}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        {/* Create form */}
        <div className="space-y-3 border-t border-border pt-3">
          <div className="text-xs font-medium text-muted-foreground">
            Add a new root
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field
              label="Label"
              hint="Short name for this root; shown in binding dropdowns."
            >
              <input
                className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm outline-none"
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="letta"
              />
            </Field>
            <Field
              label="Kind"
              hint="Local filesystem is the only fully-wired V1 strategy. Others are declarative placeholders."
            >
              <select
                className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm outline-none"
                value={kind}
                onChange={(e) => setKind(e.target.value as MemfsRootKind)}
              >
                {MEMFS_ROOT_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field
            label="Root path"
            hint="Absolute filesystem path for local-fs, or the URI for mcp/git-hosted. Bindings address files under this root via their pathPrefix."
          >
            <input
              className="w-full rounded-md border border-border bg-transparent px-2.5 py-1.5 font-mono text-xs outline-none"
              type="text"
              value={rootPath}
              onChange={(e) => setRootPath(e.target.value)}
              placeholder="~/.letta"
            />
          </Field>
          {formError && (
            <div className="text-xs text-destructive">{formError}</div>
          )}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => createMutation.mutate()}
              disabled={!canSubmit}
            >
              {createMutation.isPending ? "Adding…" : "Add root"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
