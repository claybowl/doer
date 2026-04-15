import { useState } from "react";
import type { IssueAttachment } from "@paperclipai/shared";
import { MarkdownBody } from "./MarkdownBody";
import { cn } from "../lib/utils";

interface AttachmentPreviewProps {
  attachment: IssueAttachment;
  className?: string;
}

function isImageType(contentType: string) {
  return contentType.startsWith("image/");
}

function isPdfType(contentType: string) {
  return contentType === "application/pdf";
}

function isMarkdownType(contentType: string, filename: string | null) {
  if (contentType === "text/markdown") return true;
  if (!filename) return false;
  return filename.endsWith(".md") || filename.endsWith(".markdown");
}

function isTextType(contentType: string) {
  return (
    contentType.startsWith("text/") ||
    contentType === "application/json"
  );
}

function languageFromFilename(filename: string | null, contentType: string): string {
  if (!filename) {
    if (contentType === "application/json") return "json";
    return "text";
  }
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript",
    js: "javascript", jsx: "javascript",
    py: "python",
    json: "json",
    md: "markdown", markdown: "markdown",
    sh: "bash",
    css: "css",
    html: "html",
    yaml: "yaml", yml: "yaml",
    csv: "csv",
    sql: "sql",
    rs: "rust",
    go: "go",
  };
  return map[ext] ?? "text";
}

function TextPreview({ url, contentType, filename }: { url: string; contentType: string; filename: string | null }) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const load = async () => {
    if (text !== null || loading) return;
    setLoading(true);
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const txt = await resp.text();
      setText(txt);
      setExpanded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  if (!expanded && text === null) {
    return (
      <button
        type="button"
        className="mt-2 text-xs text-muted-foreground hover:text-foreground underline"
        onClick={load}
      >
        {loading ? "Loading…" : error ? `Error: ${error}` : "Preview"}
      </button>
    );
  }

  if (isMarkdownType(contentType, filename) && text !== null) {
    return (
      <div className="mt-2 border border-border rounded p-3 max-h-80 overflow-y-auto bg-background text-sm">
        <MarkdownBody>{text}</MarkdownBody>
      </div>
    );
  }

  const lang = languageFromFilename(filename, contentType);
  return (
    <div className="mt-2 relative">
      <pre className={cn(
        "text-[11px] leading-relaxed max-h-72 overflow-auto rounded border border-border bg-accent/20 p-3 whitespace-pre-wrap break-all",
      )}>
        <code data-language={lang}>{text}</code>
      </pre>
      <span className="absolute top-1.5 right-2 text-[10px] text-muted-foreground opacity-60 select-none">{lang}</span>
    </div>
  );
}

export function AttachmentPreview({ attachment, className }: AttachmentPreviewProps) {
  const { contentType, originalFilename, contentPath } = attachment;

  if (isImageType(contentType)) {
    return (
      <a href={contentPath} target="_blank" rel="noreferrer" className={className}>
        <img
          src={contentPath}
          alt={originalFilename ?? "attachment"}
          className="mt-2 max-h-56 rounded border border-border object-contain bg-accent/10"
          loading="lazy"
        />
      </a>
    );
  }

  if (isPdfType(contentType)) {
    return (
      <div className={cn("mt-2", className)}>
        <iframe
          src={contentPath}
          title={originalFilename ?? "PDF"}
          className="w-full rounded border border-border bg-white"
          style={{ height: "420px" }}
        />
      </div>
    );
  }

  if (isMarkdownType(contentType, originalFilename) || isTextType(contentType)) {
    return (
      <div className={className}>
        <TextPreview url={contentPath} contentType={contentType} filename={originalFilename} />
      </div>
    );
  }

  return null;
}
