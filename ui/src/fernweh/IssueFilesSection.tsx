import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { NavLink } from "@/lib/router";
import { deliverablesApi } from "@/api/deliverables";
import { queryKeys } from "@/lib/queryKeys";
import type { Deliverable } from "@doerai/shared";
import { Icon, I, formatRelative } from "./utils";

/* ============================================================
   IssueFilesSection — per-issue file explorer. Lists every
   deliverable captured against an issue (write_output, manual
   upload, or the adapter's output auto-capture sweep) and renders
   an inline, type-aware preview so the user never has to leave
   the issue to see what was produced.

   Preview support: md (rendered), html/pdf (sandboxed iframe),
   png/jpg (image), csv/json (text, truncated). Binary office
   formats get a download card. Mounted in FernwehIssueDetail in
   place of the old read-only Outputs list.
============================================================ */

const TEXT_PREVIEW_KINDS = new Set(["csv", "json"]);
const IFRAME_KINDS = new Set(["html", "pdf"]);
const IMAGE_KINDS = new Set(["png", "jpg"]);
const TEXT_TRUNCATE_AT = 200_000;

const MD_PREVIEW_STYLES = `
  .fw-file-md { font-size: 13px; line-height: 1.65; color: var(--ink); }
  .fw-file-md h1, .fw-file-md h2, .fw-file-md h3, .fw-file-md h4 { margin: 14px 0 6px; font-weight: 600; line-height: 1.3; }
  .fw-file-md h1 { font-size: 17px; } .fw-file-md h2 { font-size: 15px; } .fw-file-md h3 { font-size: 13.5px; }
  .fw-file-md p { margin: 0 0 10px; }
  .fw-file-md ul, .fw-file-md ol { margin: 0 0 10px; padding-left: 20px; }
  .fw-file-md code { font-family: var(--fw-font-mono); font-size: 11.5px; background: var(--bg-sunken); padding: 1px 4px; border-radius: 4px; }
  .fw-file-md pre { background: var(--bg-sunken); padding: 10px 12px; border-radius: 8px; overflow-x: auto; margin: 0 0 10px; }
  .fw-file-md pre code { background: none; padding: 0; }
  .fw-file-md table { border-collapse: collapse; width: 100%; margin: 0 0 10px; }
  .fw-file-md th, .fw-file-md td { border: 1px solid var(--line); padding: 4px 8px; font-size: 12px; text-align: left; }
  .fw-file-md blockquote { border-left: 2px solid var(--line); margin: 0 0 10px; padding: 2px 12px; color: var(--ink-dim); }
  .fw-file-md img { max-width: 100%; border-radius: 6px; }
  .fw-file-md a { color: var(--accent); }
`;

function formatBytesShort(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export interface IssueFilesSectionProps {
  companyId: string;
  prefix: string;
  issueId: string;
  limit?: number;
}

export function IssueFilesSection({ companyId, prefix, issueId, limit = 50 }: IssueFilesSectionProps) {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const filters = React.useMemo(() => ({ issueId, limit }), [issueId, limit]);
  const filesQuery = useQuery({
    queryKey: queryKeys.deliverables.list(companyId, filters),
    queryFn: () => deliverablesApi.list(companyId, filters),
    enabled: !!companyId && !!issueId,
    refetchInterval: 30_000,
  });

  const rows = filesQuery.data ?? [];
  const selected = rows.find((r) => r.id === selectedId) ?? null;

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <style>{MD_PREVIEW_STYLES}</style>
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
            Files{rows.length > 0 ? ` · ${rows.length}` : ""}
          </span>
          <span style={{ fontSize: 10.5, color: "var(--ink-faint)" }}>
            every file captured against this issue
          </span>
        </div>
        {rows.length > 0 ? (
          <NavLink
            to={`/${prefix}/outputs?issueId=${issueId}`}
            style={{ fontSize: 11, color: "var(--accent)", textDecoration: "none" }}
          >
            View all
          </NavLink>
        ) : null}
      </header>

      <div className="fw-card" style={{ padding: rows.length === 0 ? 14 : 8 }}>
        {filesQuery.isLoading && rows.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>Loading files…</div>
        ) : rows.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>
            No files captured for this issue yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {rows.map((d) => (
              <FileRow
                key={d.id}
                d={d}
                selected={d.id === selectedId}
                onToggle={() => setSelectedId((cur) => (cur === d.id ? null : d.id))}
              />
            ))}
          </div>
        )}
      </div>

      {selected ? (
        <FilePreview d={selected} prefix={prefix} onClose={() => setSelectedId(null)} />
      ) : null}
    </section>
  );
}

// ---------- File row ----------

function FileRow({ d, selected, onToggle }: { d: Deliverable; selected: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto auto",
        gap: 10,
        alignItems: "center",
        padding: "7px 10px",
        borderRadius: 6,
        background: selected ? "var(--accent-soft)" : "var(--bg-raised)",
        border: `1px solid ${selected ? "var(--accent)" : "var(--line)"}`,
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        transition: "all .12s var(--fw-ease)",
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 5,
          background: "var(--bg-sunken)",
          border: "1px solid var(--line)",
          color: "var(--accent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon d={I.stack} size={10} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
        <span
          style={{
            fontSize: 12.5,
            fontWeight: 500,
            color: "var(--ink)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {d.title}
        </span>
        <span
          className="fw-mono"
          style={{
            fontSize: 10.5,
            color: "var(--ink-faint)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {d.filename} · {formatBytesShort(d.sizeBytes)}
        </span>
      </div>
      <span
        className="fw-chip"
        style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.4, color: "var(--ink-faint)" }}
      >
        {d.kind}
      </span>
      <span style={{ fontSize: 10.5, color: "var(--ink-faint)", whiteSpace: "nowrap" }}>
        {formatRelative(d.producedAt)}
      </span>
    </button>
  );
}

// ---------- Preview pane ----------

function FilePreview({ d, prefix, onClose }: { d: Deliverable; prefix: string; onClose: () => void }) {
  const downloadUrl = deliverablesApi.downloadUrl(d.id);
  const previewUrl = deliverablesApi.previewUrl(d.id);
  return (
    <div
      className="fw-card"
      style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}
    >
      {/* Preview header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          borderBottom: "1px solid var(--line-soft)",
          background: "var(--bg-sunken)",
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "var(--ink)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
            minWidth: 0,
          }}
        >
          {d.title}
        </span>
        <NavLink
          to={`/${prefix}/outputs?output=${d.id}`}
          style={{ fontSize: 11, color: "var(--accent)", textDecoration: "none", flexShrink: 0 }}
        >
          Open in Outputs
        </NavLink>
        <a
          href={downloadUrl}
          download={d.filename}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: 11,
            color: "var(--ink-dim)",
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          <Icon d={I.arrow} size={10} />
          Download
        </a>
        <button
          onClick={onClose}
          aria-label="Close preview"
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            border: "1px solid var(--line)",
            background: "var(--bg-raised)",
            color: "var(--ink-dim)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <Icon d={I.x} size={10} />
        </button>
      </div>

      {/* Preview body */}
      <div style={{ padding: 12 }}>
        <PreviewBody d={d} downloadUrl={downloadUrl} previewUrl={previewUrl} />
      </div>
    </div>
  );
}

function PreviewBody({ d, downloadUrl, previewUrl }: { d: Deliverable; downloadUrl: string; previewUrl: string }) {
  if (d.kind === "md") return <TextPreview url={downloadUrl} mode="md" />;
  if (TEXT_PREVIEW_KINDS.has(d.kind)) return <TextPreview url={downloadUrl} mode="pre" />;
  if (IFRAME_KINDS.has(d.kind)) {
    return (
      <iframe
        src={previewUrl}
        title={d.title}
        sandbox=""
        style={{
          width: "100%",
          height: 420,
          border: "1px solid var(--line)",
          borderRadius: 8,
          background: "var(--bg-raised)",
        }}
      />
    );
  }
  if (IMAGE_KINDS.has(d.kind)) {
    return (
      <img
        src={previewUrl}
        alt={d.title}
        style={{ maxWidth: "100%", borderRadius: 8, border: "1px solid var(--line)" }}
      />
    );
  }
  // docx / xlsx / pptx / other — no inline renderer; offer the download.
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 8,
        background: "var(--bg-sunken)",
        border: "1px solid var(--line)",
      }}
    >
      <Icon d={I.stack} size={14} style={{ color: "var(--accent)" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0, flex: 1 }}>
        <span style={{ fontSize: 12, color: "var(--ink)" }}>{d.filename}</span>
        <span style={{ fontSize: 10.5, color: "var(--ink-faint)" }}>
          {d.kind.toUpperCase()} · {formatBytesShort(d.sizeBytes)} — no inline preview for this type
        </span>
      </div>
      <a
        href={downloadUrl}
        download={d.filename}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "6px 12px",
          borderRadius: 7,
          border: "1px solid var(--accent)",
          background: "var(--accent)",
          color: "var(--bg)",
          fontSize: 11.5,
          fontWeight: 500,
          textDecoration: "none",
          flexShrink: 0,
        }}
      >
        <Icon d={I.arrow} size={10} />
        Download
      </a>
    </div>
  );
}

function TextPreview({ url, mode }: { url: string; mode: "md" | "pre" }) {
  const [text, setText] = React.useState<string | null>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setText(null);
    setFailed(false);
    fetch(url)
      .then((r) => (r.ok ? r.text() : Promise.reject(r.statusText)))
      .then((body) => {
        if (cancelled) return;
        setText(body.length > TEXT_TRUNCATE_AT ? `${body.slice(0, TEXT_TRUNCATE_AT)}\n\n… (truncated)` : body);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (failed) {
    return <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>Could not load file content.</div>;
  }
  if (text === null) {
    return <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>Loading preview…</div>;
  }
  if (mode === "md") {
    return (
      <div className="fw-file-md">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
      </div>
    );
  }
  return (
    <pre
      className="fw-mono"
      style={{
        margin: 0,
        padding: "10px 12px",
        borderRadius: 8,
        background: "var(--bg-sunken)",
        border: "1px solid var(--line)",
        fontSize: 11,
        lineHeight: 1.5,
        color: "var(--ink-dim)",
        overflowX: "auto",
        maxHeight: 420,
        overflowY: "auto",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {text}
    </pre>
  );
}
