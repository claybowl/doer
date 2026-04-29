import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { NavLink } from "@/lib/router";
import { deliverablesApi } from "@/api/deliverables";
import { queryKeys } from "@/lib/queryKeys";
import type { Deliverable, DeliverableKind } from "@doerai/shared";
import { Icon, I, formatRelative } from "./utils";

/* ============================================================
   OutputsSection — shared compact component that renders agent
   outputs wherever users naturally look for them: inside
   AgentDetail, the Work drawer (per-issue), the Projects drawer
   (per-project), and on the HQ dashboard (recent-all).

   Each caller passes ONE filter (agentId | issueId | projectId |
   none). The component queries with that filter, handles loading
   / error / empty states, renders a tight 2-line row per output,
   and deep-links to /:prefix/outputs?output=:id so the
   full detail drawer opens in the canonical place.
============================================================ */

const KIND_LABEL_SHORT: Record<DeliverableKind | "_default", string> = {
  docx: "docx",
  xlsx: "xlsx",
  pdf: "pdf",
  pptx: "pptx",
  md: "md",
  png: "png",
  jpg: "jpg",
  csv: "csv",
  html: "html",
  json: "json",
  other: "file",
  _default: "file",
};

function shortKind(kind: string): string {
  return KIND_LABEL_SHORT[kind as DeliverableKind] ?? KIND_LABEL_SHORT._default;
}

function formatBytesShort(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export interface OutputsSectionProps {
  companyId: string;
  prefix: string;
  /** Filter: exactly one of these should be set (or none for recent-all) */
  filter?: {
    agentId?: string;
    issueId?: string;
    projectId?: string;
  };
  /** Max rows to show before "View all" replaces the tail. Default 5. */
  limit?: number;
  /** Override the "View all" link target. Defaults to the filtered Outputs page. */
  viewAllHref?: string;
  /** Optional section title override. Defaults to "Outputs". */
  title?: string;
  /** Optional hint line under the title. */
  hint?: string;
  /** When true, renders without a card wrapper (for embedding in drawers). */
  flush?: boolean;
}

export function OutputsSection({
  companyId,
  prefix,
  filter,
  limit = 5,
  viewAllHref,
  title = "Outputs",
  hint,
  flush,
}: OutputsSectionProps) {
  const queryFilters = React.useMemo(() => {
    const f: {
      agentId?: string;
      issueId?: string;
      projectId?: string;
      limit: number;
    } = { limit };
    if (filter?.agentId) f.agentId = filter.agentId;
    if (filter?.issueId) f.issueId = filter.issueId;
    if (filter?.projectId) f.projectId = filter.projectId;
    return f;
  }, [filter?.agentId, filter?.issueId, filter?.projectId, limit]);

  const outputsQuery = useQuery({
    queryKey: queryKeys.deliverables.list(companyId, queryFilters),
    queryFn: () => deliverablesApi.list(companyId, queryFilters),
    enabled: !!companyId,
    refetchInterval: 30_000,
  });

  const rows = outputsQuery.data ?? [];

  // Build the "View all" link target. Filtered callers get a pre-filtered
  // Outputs page via the same filter knobs the canonical screen exposes.
  const defaultViewAll = React.useMemo(() => {
    const base = `/${prefix}/outputs`;
    const params: string[] = [];
    if (filter?.agentId) params.push(`agentId=${filter.agentId}`);
    if (filter?.issueId) params.push(`issueId=${filter.issueId}`);
    if (filter?.projectId) params.push(`projectId=${filter.projectId}`);
    return params.length > 0 ? `${base}?${params.join("&")}` : base;
  }, [filter?.agentId, filter?.issueId, filter?.projectId, prefix]);

  const body = (
    <>
      {outputsQuery.isLoading && rows.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>
          Loading outputs…
        </div>
      ) : rows.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>
          {filter?.agentId
            ? "This agent hasn't produced any outputs yet."
            : filter?.issueId
            ? "Nothing attached to this issue yet."
            : filter?.projectId
            ? "No outputs linked to this project yet."
            : "No outputs yet. Assign an issue that calls for a real file."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {rows.map((d) => (
            <OutputRow key={d.id} d={d} prefix={prefix} />
          ))}
        </div>
      )}
    </>
  );

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
            {title}
            {rows.length > 0 ? ` · ${rows.length}` : ""}
          </span>
          {hint ? (
            <span style={{ fontSize: 10.5, color: "var(--ink-faint)" }}>{hint}</span>
          ) : null}
        </div>
        {rows.length >= limit ? (
          <NavLink
            to={viewAllHref ?? defaultViewAll}
            style={{ fontSize: 11, color: "var(--accent)", textDecoration: "none" }}
          >
            View all
          </NavLink>
        ) : null}
      </header>
      {flush ? (
        body
      ) : (
        <div className="fw-card" style={{ padding: rows.length === 0 ? 14 : 8 }}>
          {body}
        </div>
      )}
    </section>
  );
}

function OutputRow({ d, prefix }: { d: Deliverable; prefix: string }) {
  return (
    <NavLink
      to={`/${prefix}/outputs?output=${d.id}`}
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto auto",
        gap: 10,
        alignItems: "center",
        padding: "7px 10px",
        borderRadius: 6,
        background: "var(--bg-raised)",
        border: "1px solid var(--line)",
        textDecoration: "none",
        color: "var(--ink)",
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
        style={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: 0.4,
          color: d.clientVisible ? "var(--pulse)" : "var(--ink-faint)",
        }}
      >
        {d.clientVisible ? "Pub" : "Draft"}
      </span>
      <span style={{ fontSize: 10.5, color: "var(--ink-faint)", whiteSpace: "nowrap" }}>
        {shortKind(d.kind)} · {formatRelative(d.producedAt)}
      </span>
    </NavLink>
  );
}
