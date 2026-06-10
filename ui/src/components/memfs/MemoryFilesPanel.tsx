import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MemfsBindingDTO, MemfsFileEntry } from "@doerai/shared";
import { memfsApi } from "../../api/memfs";
import { queryKeys } from "../../lib/queryKeys";
import { Button } from "@/components/ui/button";
import { FileText, History as HistoryIcon, Save } from "lucide-react";
import { HintIcon } from "../agent-config-primitives";
import { cn } from "../../lib/utils";

type ResolvedBinding = MemfsBindingDTO & { rootPath?: string; rootKind?: string };

const PREVIEW_LIMIT_BYTES = 512 * 1024;

const BINARY_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "ico", "pdf", "zip", "gz", "tar",
  "mp3", "mp4", "mov", "wasm", "exe", "sqlite", "db", "woff", "woff2",
]);

function looksBinary(p: string): boolean {
  const ext = p.split(".").pop()?.toLowerCase() ?? "";
  return BINARY_EXTENSIONS.has(ext);
}

function relTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/** Minimal unified-diff renderer: green additions, red deletions, dim hunks. */
function DiffView({ diff }: { diff: string }) {
  return (
    <pre className="max-h-96 overflow-auto rounded-md border border-border bg-muted/20 p-3 font-mono text-[11px] leading-relaxed">
      {diff.split("\n").map((line, i) => (
        <div
          key={i}
          className={cn(
            line.startsWith("+") && !line.startsWith("+++")
              ? "text-green-700 dark:text-green-400"
              : line.startsWith("-") && !line.startsWith("---")
                ? "text-red-700 dark:text-red-400"
                : line.startsWith("@@")
                  ? "text-muted-foreground"
                  : undefined,
          )}
        >
          {line || " "}
        </div>
      ))}
    </pre>
  );
}

/**
 * Browse, edit, and review the history of an agent's memory files.
 * The "watch the agent learn" surface — capture-the-magic Phase 1.3/1.4.
 */
export function MemoryFilesPanel({
  companyId,
  agentId,
}: {
  companyId: string;
  agentId: string;
}) {
  const queryClient = useQueryClient();

  const bindingsQuery = useQuery({
    queryKey: queryKeys.memfs.bindingsForAgent(companyId, agentId),
    queryFn: () => memfsApi.listBindingsForAgent(companyId, agentId),
  });
  const bindings = (bindingsQuery.data ?? []) as ResolvedBinding[];

  const [bindingId, setBindingId] = useState<string>("");
  useEffect(() => {
    if (!bindingId && bindings.length > 0) setBindingId(bindings[0]!.id);
  }, [bindingId, bindings]);
  const binding = useMemo(
    () => bindings.find((b) => b.id === bindingId) ?? null,
    [bindings, bindingId],
  );

  const filesQuery = useQuery({
    queryKey: ["memfs", "files", companyId, binding?.rootId, binding?.pathPrefix],
    queryFn: () =>
      memfsApi.listFiles(companyId, binding!.rootId, {
        prefix: binding!.pathPrefix,
        recursive: true,
      }),
    enabled: Boolean(binding),
  });
  const files = (filesQuery.data ?? []).filter((f: MemfsFileEntry) => !f.isDirectory);

  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [draft, setDraft] = useState<string>("");
  const [loadedText, setLoadedText] = useState<string>("");
  const [editorError, setEditorError] = useState<string | null>(null);

  const fileQuery = useQuery({
    queryKey: ["memfs", "file-text", companyId, binding?.rootId, selectedPath],
    queryFn: () => memfsApi.getFileText(companyId, binding!.rootId, selectedPath!),
    enabled: Boolean(binding && selectedPath),
  });
  useEffect(() => {
    if (fileQuery.data) {
      setLoadedText(fileQuery.data.text);
      setDraft(fileQuery.data.text);
      setEditorError(null);
    }
  }, [fileQuery.data]);

  const dirty = draft !== loadedText;

  const saveMutation = useMutation({
    mutationFn: () =>
      memfsApi.writeFile(companyId, binding!.rootId, {
        path: selectedPath!,
        content: draft,
        commitMessage: `memory: update ${selectedPath} (via Doer UI)`,
      }),
    onSuccess: () => {
      setLoadedText(draft);
      setEditorError(null);
      void queryClient.invalidateQueries({
        queryKey: ["memfs", "files", companyId, binding?.rootId, binding?.pathPrefix],
      });
      void queryClient.invalidateQueries({
        queryKey: ["memfs", "history", companyId, binding?.rootId, binding?.pathPrefix],
      });
    },
    onError: (err) => {
      setEditorError(err instanceof Error ? err.message : "Failed to save file");
    },
  });

  // ---- History ----
  const historyQuery = useQuery({
    queryKey: ["memfs", "history", companyId, binding?.rootId, binding?.pathPrefix],
    queryFn: () =>
      memfsApi.listHistory(companyId, binding!.rootId, {
        path: binding!.pathPrefix || undefined,
        limit: 30,
      }),
    enabled: Boolean(binding && binding.rootKind !== "git-hosted"),
  });
  const [diffSha, setDiffSha] = useState<string | null>(null);
  const diffQuery = useQuery({
    queryKey: ["memfs", "diff", companyId, binding?.rootId, diffSha],
    queryFn: () =>
      memfsApi.getCommitDiff(companyId, binding!.rootId, diffSha!, {
        path: binding!.pathPrefix || undefined,
      }),
    enabled: Boolean(binding && diffSha),
  });

  if (bindingsQuery.isLoading) {
    return <div className="text-xs text-muted-foreground">Loading memory…</div>;
  }
  if (!binding) return null;

  const selectedIsBinary = selectedPath ? looksBinary(selectedPath) : false;
  const selectedEntry = files.find((f) => f.path === selectedPath) ?? null;
  const tooLarge = (selectedEntry?.size ?? 0) > PREVIEW_LIMIT_BYTES;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">Memory Files</h2>
          <HintIcon text="The agent's working memory on disk. Edit identity and context files here; every save is committed so History shows what changed — including what the agent itself learned between runs." />
        </div>
        {bindings.length > 1 && (
          <select
            className="mt-2 rounded-md border border-border bg-transparent px-2 py-1 text-xs outline-none"
            value={bindingId}
            onChange={(e) => {
              setBindingId(e.target.value);
              setSelectedPath(null);
            }}
          >
            {bindings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label ?? b.pathPrefix}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* File list */}
        <div className="space-y-1 rounded-md border border-border p-2 lg:max-h-[28rem] lg:overflow-auto">
          {filesQuery.isLoading && (
            <div className="px-2 py-1 text-xs text-muted-foreground">Loading files…</div>
          )}
          {!filesQuery.isLoading && files.length === 0 && (
            <div className="px-2 py-1 text-xs text-muted-foreground">
              No files yet. The agent's first run (or a save here) will create them.
            </div>
          )}
          {files.map((f) => {
            const rel = binding.pathPrefix && f.path.startsWith(`${binding.pathPrefix}/`)
              ? f.path.slice(binding.pathPrefix.length + 1)
              : f.path;
            return (
              <button
                key={f.path}
                type="button"
                onClick={() => setSelectedPath(f.path)}
                className={cn(
                  "flex w-full items-center gap-1.5 rounded px-2 py-1 text-left font-mono text-xs hover:bg-accent/50",
                  selectedPath === f.path && "bg-accent/60",
                )}
              >
                <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="truncate">{rel}</span>
              </button>
            );
          })}
        </div>

        {/* Editor */}
        <div className="space-y-2 lg:col-span-2">
          {!selectedPath && (
            <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
              Select a file to view or edit.
            </div>
          )}
          {selectedPath && (selectedIsBinary || tooLarge) && (
            <div className="flex h-40 items-center justify-center rounded-md border border-border text-xs text-muted-foreground">
              {selectedIsBinary ? "Binary file — no preview." : "File too large to edit here."}
            </div>
          )}
          {selectedPath && !selectedIsBinary && !tooLarge && (
            <>
              <div className="flex items-center justify-between gap-2">
                <div className="truncate font-mono text-xs text-muted-foreground">
                  {selectedPath}
                </div>
                <Button
                  size="sm"
                  onClick={() => saveMutation.mutate()}
                  disabled={!dirty || saveMutation.isPending}
                >
                  <Save className="mr-1 h-3.5 w-3.5" />
                  {saveMutation.isPending ? "Saving…" : dirty ? "Save" : "Saved"}
                </Button>
              </div>
              <textarea
                className="h-80 w-full resize-y rounded-md border border-border bg-transparent p-3 font-mono text-xs leading-relaxed outline-none"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                spellCheck={false}
              />
              {editorError && <div className="text-xs text-destructive">{editorError}</div>}
            </>
          )}
        </div>
      </div>

      {/* History */}
      <div className="space-y-2 rounded-md border border-border px-4 py-4">
        <div className="flex items-center gap-2">
          <HistoryIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            History — what changed
          </div>
        </div>
        {historyQuery.isLoading && (
          <div className="text-xs text-muted-foreground">Loading history…</div>
        )}
        {historyQuery.data && historyQuery.data.length === 0 && (
          <div className="text-xs text-muted-foreground">
            No commits yet. Saves here and agent runs will start the record.
          </div>
        )}
        {(historyQuery.data ?? []).map((c) => (
          <div key={c.sha} className="space-y-2">
            <button
              type="button"
              className={cn(
                "flex w-full items-baseline justify-between gap-3 rounded px-2 py-1 text-left hover:bg-accent/50",
                diffSha === c.sha && "bg-accent/60",
              )}
              onClick={() => setDiffSha(diffSha === c.sha ? null : c.sha)}
            >
              <span className="min-w-0 truncate text-xs">{c.message}</span>
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                {c.sha.slice(0, 7)} · {c.filesChanged} file{c.filesChanged === 1 ? "" : "s"} ·{" "}
                {relTime(c.committedAt)}
              </span>
            </button>
            {diffSha === c.sha && diffQuery.data && <DiffView diff={diffQuery.data} />}
            {diffSha === c.sha && diffQuery.isLoading && (
              <div className="px-2 text-xs text-muted-foreground">Loading diff…</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
