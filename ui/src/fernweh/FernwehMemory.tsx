import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { NavLink, useParams } from "@/lib/router";
import { useCompany } from "@/context/CompanyContext";
import { memfsApi } from "@/api/memfs";
import { queryKeys } from "@/lib/queryKeys";
import {
  Icon,
  I,
  formatRelative,
  EmptyState,
  LoadingState,
  ErrorState,
  Field,
} from "./utils";
import type { MemfsFileEntry, MemfsRootDTO } from "@doerai/shared";

/* ------------------------------------------------------------------
   Helpers
------------------------------------------------------------------ */

const PREVIEW_MAX_BYTES = 512 * 1024; // 512 KB — larger than that gets a "too big" nudge
const BINARY_EXTS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "tiff", "heic",
  "pdf", "zip", "gz", "tar", "tgz", "bz2", "7z", "rar",
  "mp3", "mp4", "mov", "avi", "wav", "ogg", "m4a", "webm",
  "exe", "bin", "so", "dll", "dylib", "wasm", "class",
  "ttf", "otf", "woff", "woff2",
  "sqlite", "db",
]);

function fileExt(path: string): string {
  const slash = path.lastIndexOf("/");
  const name = slash >= 0 ? path.slice(slash + 1) : path;
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return "";
  return name.slice(dot + 1).toLowerCase();
}

function isProbablyBinary(path: string): boolean {
  return BINARY_EXTS.has(fileExt(path));
}

function baseName(path: string): string {
  const slash = path.lastIndexOf("/");
  return slash >= 0 ? path.slice(slash + 1) : path;
}

function parentDir(path: string): string {
  const slash = path.lastIndexOf("/");
  return slash >= 0 ? path.slice(0, slash) : "";
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

type GroupedFiles = Array<{ dir: string; files: MemfsFileEntry[] }>;

function groupByDir(entries: MemfsFileEntry[]): GroupedFiles {
  const byDir = new Map<string, MemfsFileEntry[]>();
  for (const e of entries) {
    if (e.isDirectory) continue;
    const dir = parentDir(e.path);
    const list = byDir.get(dir);
    if (list) list.push(e);
    else byDir.set(dir, [e]);
  }
  const out: GroupedFiles = [];
  for (const [dir, files] of byDir) {
    files.sort((a, b) => a.path.localeCompare(b.path));
    out.push({ dir, files });
  }
  out.sort((a, b) => a.dir.localeCompare(b.dir));
  return out;
}

/* ------------------------------------------------------------------
   Root chip
------------------------------------------------------------------ */
function RootChip({
  root,
  active,
  onClick,
  fileCount,
}: {
  root: MemfsRootDTO;
  active: boolean;
  onClick: () => void;
  fileCount: number | null;
}) {
  return (
    <button
      onClick={onClick}
      className="fw-card"
      style={{
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        cursor: "pointer",
        borderColor: active ? "var(--accent)" : "var(--line)",
        background: active ? "var(--bg-raised)" : "var(--bg)",
        transition: "all .15s var(--fw-ease)",
        minWidth: 180,
        textAlign: "left",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "var(--bg-sunken)",
          border: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: active ? "var(--accent)" : "var(--ink-dim)",
        }}
      >
        <Icon d={I.brain} size={16} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>
          {root.label}
        </span>
        <span
          className="fw-mono"
          style={{
            fontSize: 10,
            color: "var(--ink-faint)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={root.rootPath}
        >
          {root.rootPath}
        </span>
      </div>
      {fileCount !== null ? (
        <span className="fw-chip" style={{ fontSize: 10 }}>
          {fileCount}
        </span>
      ) : null}
    </button>
  );
}

/* ------------------------------------------------------------------
   File list row
------------------------------------------------------------------ */
function FileRow({
  entry,
  selected,
  onClick,
}: {
  entry: MemfsFileEntry;
  selected: boolean;
  onClick: () => void;
}) {
  const ext = fileExt(entry.path);
  const binary = isProbablyBinary(entry.path);
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        width: "100%",
        textAlign: "left",
        cursor: "pointer",
        borderRadius: 6,
        border: "1px solid transparent",
        background: selected ? "var(--bg-raised)" : "transparent",
        borderColor: selected ? "var(--line)" : "transparent",
        color: selected ? "var(--ink)" : "var(--ink-dim)",
        fontSize: 12,
        transition: "all .1s var(--fw-ease)",
      }}
    >
      <span
        className="fw-mono"
        style={{
          fontSize: 9,
          padding: "2px 6px",
          borderRadius: 4,
          background: binary ? "color-mix(in oklab, var(--warn) 16%, var(--bg-sunken))" : "var(--bg-sunken)",
          color: binary ? "var(--warn)" : "var(--ink-faint)",
          border: "1px solid var(--line)",
          minWidth: 36,
          textAlign: "center",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {ext || "—"}
      </span>
      <span
        style={{
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
        }}
        title={entry.path}
      >
        {baseName(entry.path)}
      </span>
      <span className="fw-mono" style={{ fontSize: 10, color: "var(--ink-faint)" }}>
        {formatBytes(entry.size)}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------
   File viewer
------------------------------------------------------------------ */
function FileViewer({
  companyId,
  rootId,
  entry,
}: {
  companyId: string;
  rootId: string;
  entry: MemfsFileEntry;
}) {
  const binary = isProbablyBinary(entry.path);
  const tooLarge = entry.size > PREVIEW_MAX_BYTES;

  const query = useQuery({
    queryKey: queryKeys.memfs.rootFileText(companyId, rootId, entry.path),
    queryFn: () => memfsApi.getFileText(companyId, rootId, entry.path),
    enabled: !binary && !tooLarge,
    staleTime: 30_000,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, height: "100%", overflow: "hidden" }}>
      {/* Meta strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 14,
          padding: "12px 16px",
          border: "1px solid var(--line)",
          borderRadius: 10,
          background: "var(--bg-sunken)",
        }}
      >
        <Field label="Path">
          <code
            className="fw-mono"
            style={{
              fontSize: 11,
              color: "var(--ink)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              display: "block",
            }}
            title={entry.path}
          >
            {entry.path}
          </code>
        </Field>
        <Field label="Size">
          <span style={{ fontSize: 12, color: "var(--ink)" }}>{formatBytes(entry.size)}</span>
        </Field>
        <Field label="Modified">
          <span style={{ fontSize: 12, color: "var(--ink)" }}>{formatRelative(entry.modifiedAt)}</span>
        </Field>
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          border: "1px solid var(--line)",
          borderRadius: 10,
          background: "var(--bg-sunken)",
        }}
      >
        {binary ? (
          <div style={{ padding: 28 }}>
            <EmptyState
              title="Binary file"
              subtitle="Preview isn't available for this file type yet. Open in classic UI to inspect or download."
            />
          </div>
        ) : tooLarge ? (
          <div style={{ padding: 28 }}>
            <EmptyState
              title="File too large to preview"
              subtitle={`${formatBytes(entry.size)} exceeds the ${formatBytes(PREVIEW_MAX_BYTES)} preview limit.`}
            />
          </div>
        ) : query.isLoading ? (
          <LoadingState label="Loading file…" />
        ) : query.isError ? (
          <div style={{ padding: 16 }}>
            <ErrorState error={query.error} />
          </div>
        ) : query.data ? (
          <pre
            className="fw-mono"
            style={{
              margin: 0,
              padding: 16,
              fontSize: 12,
              lineHeight: 1.55,
              color: "var(--ink)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {query.data.text || <span style={{ color: "var(--ink-faint)" }}>(empty file)</span>}
          </pre>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Page
------------------------------------------------------------------ */
export function FernwehMemory() {
  const { selectedCompany } = useCompany();
  const { companyPrefix } = useParams<{ companyPrefix: string }>();
  const companyId = selectedCompany?.id;
  const prefix = companyPrefix ?? selectedCompany?.issuePrefix ?? "";

  const rootsQuery = useQuery({
    queryKey: companyId ? queryKeys.memfs.roots(companyId) : ["memfs", "roots", "none"],
    queryFn: () => memfsApi.listRoots(companyId!),
    enabled: !!companyId,
    refetchInterval: 60_000,
  });

  const [selectedRootId, setSelectedRootId] = React.useState<string | null>(null);
  const [selectedPath, setSelectedPath] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState("");

  // Auto-select the first root once roots arrive.
  React.useEffect(() => {
    if (!selectedRootId && rootsQuery.data && rootsQuery.data.length > 0) {
      setSelectedRootId(rootsQuery.data[0]?.id ?? null);
    }
  }, [rootsQuery.data, selectedRootId]);

  const filesQuery = useQuery({
    queryKey: companyId && selectedRootId
      ? queryKeys.memfs.rootFiles(companyId, selectedRootId)
      : ["memfs", "files", "none"],
    queryFn: () =>
      memfsApi.listFiles(companyId!, selectedRootId!, { recursive: true }),
    enabled: !!companyId && !!selectedRootId,
    refetchInterval: 30_000,
  });

  const roots = rootsQuery.data ?? [];
  const files = filesQuery.data ?? [];

  // When switching roots, drop stale file selection.
  React.useEffect(() => {
    setSelectedPath(null);
    setFilter("");
  }, [selectedRootId]);

  const filtered = React.useMemo(() => {
    if (!filter.trim()) return files;
    const q = filter.trim().toLowerCase();
    return files.filter((f) => f.path.toLowerCase().includes(q));
  }, [files, filter]);

  const grouped = React.useMemo(() => groupByDir(filtered), [filtered]);
  const fileCount = files.filter((f) => !f.isDirectory).length;

  const selectedEntry = selectedPath ? files.find((f) => f.path === selectedPath) ?? null : null;

  if (!selectedCompany) {
    return (
      <div style={{ padding: 40, color: "var(--ink-dim)" }}>
        <p>Select a company to browse its memory.</p>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "32px 36px 60px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
        maxWidth: 1400,
        margin: "0 auto",
        height: "100%",
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
            Memory
          </span>
          <h1
            className="fw-display"
            style={{ fontSize: 28, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}
          >
            {selectedCompany.name}
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="fw-chip">
            {roots.length} {roots.length === 1 ? "root" : "roots"}
          </span>
          {selectedRootId ? (
            <span className="fw-chip">
              {fileCount} {fileCount === 1 ? "file" : "files"}
            </span>
          ) : null}
        </div>
      </header>

      {/* Roots strip */}
      <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <header
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <h2
            className="fw-display"
            style={{ margin: 0, fontSize: 15, fontWeight: 600 }}
          >
            Roots
          </h2>
          <NavLink
            to={`/${prefix}/admin/memfs`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              color: "var(--ink-faint)",
            }}
          >
            <Icon d={I.arrow} size={11} />
            <span>Manage in classic UI</span>
          </NavLink>
        </header>
        {rootsQuery.isLoading ? (
          <div className="fw-card" style={{ padding: 20 }}>
            <LoadingState label="Loading roots…" />
          </div>
        ) : rootsQuery.isError ? (
          <ErrorState error={rootsQuery.error} />
        ) : roots.length === 0 ? (
          <EmptyState
            icon={I.brain}
            title="No memory roots yet"
            subtitle="Mount a filesystem root (e.g. your ~/.letta folder) in the classic admin UI, then agents can read from it here."
            action={
              <NavLink
                to={`/${prefix}/admin/memfs`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  fontSize: 12,
                  color: "var(--ink)",
                  background: "var(--bg-raised)",
                  border: "1px solid var(--line)",
                  borderRadius: 6,
                }}
              >
                <Icon d={I.plus} size={12} />
                <span>Add a root</span>
              </NavLink>
            }
          />
        ) : (
          <div
            style={{
              display: "flex",
              gap: 10,
              overflowX: "auto",
              paddingBottom: 4,
            }}
          >
            {roots.map((r) => (
              <RootChip
                key={r.id}
                root={r}
                active={r.id === selectedRootId}
                onClick={() => setSelectedRootId(r.id)}
                fileCount={r.id === selectedRootId ? fileCount : null}
              />
            ))}
          </div>
        )}
      </section>

      {/* Split: file list + viewer */}
      {selectedRootId ? (
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(260px, 340px) 1fr",
            gap: 18,
            flex: 1,
            minHeight: 0,
          }}
        >
          {/* File list */}
          <div
            className="fw-card"
            style={{
              padding: 0,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "10px 12px",
                borderBottom: "1px solid var(--line)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
                Files
              </span>
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter by path…"
                className="fw-mono"
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  fontSize: 11,
                  border: "1px solid var(--line)",
                  borderRadius: 6,
                  background: "var(--bg)",
                  color: "var(--ink)",
                  outline: "none",
                }}
              />
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: 8 }}>
              {filesQuery.isLoading ? (
                <LoadingState label="Loading files…" />
              ) : filesQuery.isError ? (
                <ErrorState error={filesQuery.error} />
              ) : fileCount === 0 ? (
                <EmptyState
                  title="Empty root"
                  subtitle="This root exists but contains no files visible to Doer."
                />
              ) : grouped.length === 0 ? (
                <EmptyState title="No matches" subtitle="Try a different filter." />
              ) : (
                grouped.map((g) => (
                  <div key={g.dir || "(root)"} style={{ marginBottom: 10 }}>
                    <div
                      className="fw-uc"
                      style={{
                        padding: "4px 8px",
                        color: "var(--ink-faint)",
                        fontSize: 10,
                        letterSpacing: "0.06em",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={g.dir || "(root)"}
                    >
                      {g.dir || "· root"}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      {g.files.map((f) => (
                        <FileRow
                          key={f.path}
                          entry={f}
                          selected={f.path === selectedPath}
                          onClick={() => setSelectedPath(f.path)}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Viewer */}
          <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
            {selectedEntry ? (
              <FileViewer
                companyId={companyId!}
                rootId={selectedRootId}
                entry={selectedEntry}
              />
            ) : (
              <div
                className="fw-card"
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 40,
                }}
              >
                <EmptyState
                  icon={I.brain}
                  title="Pick a file"
                  subtitle="Select a file from the list to preview its contents."
                />
              </div>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
