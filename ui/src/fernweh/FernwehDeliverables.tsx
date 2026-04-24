import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NavLink, useParams, useSearchParams } from "@/lib/router";
import { deliverablesApi, shareTokensApi, portalApi } from "@/api/deliverables";
import { projectsApi } from "@/api/projects";
import { agentsApi } from "@/api/agents";
import { useCompany } from "@/context/CompanyContext";
import { queryKeys } from "@/lib/queryKeys";
import type {
  Agent,
  Deliverable,
  DeliverableKind,
  DeliverableShareToken,
  Project,
} from "@doerai/shared";
import { DELIVERABLE_KINDS } from "@doerai/shared";
import {
  Avatar,
  Drawer,
  EmptyState,
  ErrorState,
  Icon,
  I,
  LoadingState,
  formatRelative,
} from "./utils";

/* ============================================================
   FernwehDeliverables — in-Fernweh UI for agent outputs.

   User-facing term is "Outputs" (what your agents produced —
   .docx, .xlsx, .pdf, etc.). The DB entity is still named
   `deliverables` internally; label stays in UI copy only.

   Day 4 of doc/plans/2026-04-23-deliverables-track-a.md, with
   post-Day-4 rename sweep after Clay clarified that "client" in
   his original mandate meant Doer users (who install Doer), not
   their external customers.

   Read + mutate surface: list outputs grouped by project, filter
   by kind / published / agent, click a row for drawer with
   download + publish toggle + share-link mint + soft-delete. No
   upload UI in v1 — agents produce outputs via the deliverable
   skill. A Fernweh-side uploader is v1.1 polish.
============================================================ */

// ---------- kind icon map ----------

const KIND_ICON: Record<DeliverableKind | "_default", string> = {
  docx: I.stack,
  xlsx: I.stack,
  pdf: I.stack,
  pptx: I.stack,
  md: I.stack,
  png: I.heart,
  jpg: I.heart,
  csv: I.stack,
  html: I.stack,
  json: I.stack,
  other: I.stack,
  _default: I.stack,
};

const KIND_LABEL: Record<DeliverableKind | "_default", string> = {
  docx: "Word",
  xlsx: "Excel",
  pdf: "PDF",
  pptx: "PowerPoint",
  md: "Markdown",
  png: "Image",
  jpg: "Image",
  csv: "CSV",
  html: "HTML",
  json: "JSON",
  other: "File",
  _default: "File",
};

function kindLabel(kind: string): string {
  const k = kind as DeliverableKind;
  return KIND_LABEL[k] ?? KIND_LABEL._default;
}

function kindIcon(kind: string): string {
  const k = kind as DeliverableKind;
  return KIND_ICON[k] ?? KIND_ICON._default;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ---------- chips ----------

function VisibilityChip({ visible }: { visible: boolean }) {
  return (
    <span
      className="fw-chip"
      style={{
        color: visible ? "var(--pulse)" : "var(--ink-faint)",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: visible ? "var(--pulse)" : "var(--ink-faint)",
        }}
      />
      {visible ? "Published" : "Draft"}
    </span>
  );
}

function KindChip({ kind }: { kind: string }) {
  return (
    <span className="fw-chip" style={{ textTransform: "uppercase", fontSize: 10.5, letterSpacing: 0.4 }}>
      {kindLabel(kind)}
    </span>
  );
}

// ---------- row ----------

function DeliverableRow({
  deliverable,
  producer,
  project,
  active,
  onSelect,
}: {
  deliverable: Deliverable;
  producer: Agent | null;
  project: Project | null;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className="fw-card"
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto auto auto",
        gap: 12,
        alignItems: "center",
        padding: "12px 14px",
        textAlign: "left",
        cursor: "pointer",
        border: `1px solid ${active ? "var(--accent)" : "var(--line)"}`,
        background: active
          ? "color-mix(in oklab, var(--accent) 8%, var(--bg-raised))"
          : "var(--bg-raised)",
        width: "100%",
        transition: "all .12s var(--fw-ease)",
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: "var(--bg-sunken)",
          border: "1px solid var(--line)",
          color: "var(--accent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon d={kindIcon(deliverable.kind)} size={14} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {deliverable.title}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--ink-faint)", flexWrap: "wrap" }}>
          <span className="fw-mono">{deliverable.filename}</span>
          <span>·</span>
          <span>{formatBytes(deliverable.sizeBytes)}</span>
          {project ? (
            <>
              <span>·</span>
              <span>{project.name}</span>
            </>
          ) : null}
        </div>
      </div>
      <KindChip kind={deliverable.kind} />
      {producer ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <Avatar name={producer.name} size={18} />
          <span style={{ fontSize: 11, color: "var(--ink-dim)" }}>{producer.name.split(" ")[0]}</span>
        </div>
      ) : (
        <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>—</span>
      )}
      <VisibilityChip visible={deliverable.clientVisible} />
    </button>
  );
}

// ---------- drawer ----------

function DeliverableDrawer({
  deliverableId,
  companyId,
  allAgents,
  allProjects,
  onClose,
}: {
  deliverableId: string | null;
  companyId: string;
  allAgents: Agent[];
  allProjects: Project[];
  onClose: () => void;
}) {
  const qc = useQueryClient();

  const detailQuery = useQuery<Deliverable>({
    queryKey: deliverableId
      ? queryKeys.deliverables.detail(deliverableId)
      : ["deliverables", "detail", "none"],
    queryFn: () => deliverablesApi.get(deliverableId!),
    enabled: !!deliverableId,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof deliverablesApi.update>[1]) =>
      deliverablesApi.update(deliverableId!, data),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.deliverables.detail(deliverableId!), updated);
      qc.invalidateQueries({ queryKey: ["deliverables", companyId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deliverablesApi.remove(deliverableId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deliverables"] });
      onClose();
    },
  });

  const [shareLinkUrl, setShareLinkUrl] = React.useState<string | null>(null);

  const mintShareToken = useMutation({
    mutationFn: async () => {
      if (!deliverableId) throw new Error("No deliverable");
      const token = await shareTokensApi.create(companyId, {
        label: `Deliverable share · ${new Date().toISOString().slice(0, 10)}`,
        scope: { deliverableIds: [deliverableId] },
      });
      return portalApi.portalUrl(token.token);
    },
    onSuccess: (url) => {
      setShareLinkUrl(url);
      qc.invalidateQueries({ queryKey: queryKeys.shareTokens.list(companyId) });
    },
  });

  React.useEffect(() => {
    setShareLinkUrl(null);
  }, [deliverableId]);

  if (!deliverableId) return null;
  const d = detailQuery.data ?? null;

  const producer = d?.producedByAgentId
    ? allAgents.find((a) => a.id === d.producedByAgentId) ?? null
    : null;
  const project = d?.projectId
    ? allProjects.find((p) => p.id === d.projectId) ?? null
    : null;

  return (
    <Drawer
      open={!!deliverableId}
      onClose={onClose}
      eyebrow={d ? `Output · ${kindLabel(d.kind)}` : "Output"}
      title={d?.title ?? "Loading…"}
      width={560}
      footer={
        d ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <button
              onClick={() => {
                if (confirm(`Delete "${d.title}"? The file stays in storage and can be restored.`)) {
                  deleteMutation.mutate();
                }
              }}
              disabled={deleteMutation.isPending || !!d.deletedAt}
              style={{
                padding: "7px 12px",
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: "transparent",
                color: "var(--danger)",
                fontSize: 12,
                cursor: "pointer",
                opacity: d.deletedAt ? 0.5 : 1,
              }}
            >
              {d.deletedAt ? "Deleted" : "Delete"}
            </button>
            <a
              href={deliverablesApi.downloadUrl(d.id)}
              download={d.filename}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                borderRadius: 8,
                border: "1px solid var(--accent)",
                background: "var(--accent)",
                color: "var(--bg)",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                textDecoration: "none",
              }}
            >
              <Icon d={I.arrow} size={11} />
              Download
            </a>
          </div>
        ) : null
      }
    >
      {detailQuery.isLoading && !d ? <LoadingState label="Loading output…" /> : null}
      {detailQuery.error && !d ? <ErrorState error={detailQuery.error} /> : null}

      {d ? (
        <>
          {/* Visibility toggle */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              padding: "12px 14px",
              borderRadius: 10,
              background: "var(--bg-sunken)",
              border: "1px solid var(--line)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
                Status
              </span>
              <span style={{ fontSize: 12, color: "var(--ink)" }}>
                {d.clientVisible
                  ? "Published — you can mint share links and send this file outside Doer."
                  : "Draft — only visible inside Doer. Publish to enable sharing."}
              </span>
              {d.promotedAt ? (
                <span style={{ fontSize: 10.5, color: "var(--ink-faint)" }}>
                  First published {formatRelative(d.promotedAt)}
                </span>
              ) : null}
            </div>
            <button
              onClick={() =>
                updateMutation.mutate({ clientVisible: !d.clientVisible })
              }
              disabled={updateMutation.isPending}
              style={{
                padding: "7px 12px",
                borderRadius: 8,
                border: `1px solid ${d.clientVisible ? "var(--accent)" : "var(--line)"}`,
                background: d.clientVisible ? "var(--accent)" : "var(--bg-raised)",
                color: d.clientVisible ? "var(--bg)" : "var(--ink)",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              {d.clientVisible ? "Mark draft" : "Publish"}
            </button>
          </div>

          {/* Description */}
          {d.description ? (
            <div style={{ fontSize: 13, color: "var(--ink-dim)", lineHeight: 1.5 }}>
              {d.description}
            </div>
          ) : null}

          {/* Metadata grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <InfoBlock label="Filename" value={<span className="fw-mono">{d.filename}</span>} />
            <InfoBlock label="Kind" value={<KindChip kind={d.kind} />} />
            <InfoBlock label="Size" value={<span className="fw-mono">{formatBytes(d.sizeBytes)}</span>} />
            <InfoBlock label="Checksum" value={<span className="fw-mono" style={{ fontSize: 10.5 }}>{d.checksumSha256.slice(0, 12)}…</span>} />
            <InfoBlock label="Produced" value={formatRelative(d.producedAt)} />
            <InfoBlock
              label="Producer"
              value={producer ? producer.name : d.producedByAgentId ? d.producedByAgentId.slice(0, 8) : "—"}
            />
          </div>

          {/* Linked entities */}
          {project ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>Project</span>
              <div
                className="fw-card"
                style={{
                  padding: "8px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "var(--bg-raised)",
                }}
              >
                <Icon d={I.issues} size={12} style={{ color: "var(--ink-faint)" }} />
                <span style={{ fontSize: 12.5, flex: 1 }}>{project.name}</span>
                <span style={{ fontSize: 11, color: "var(--ink-faint)", textTransform: "capitalize" }}>
                  {project.status}
                </span>
              </div>
            </div>
          ) : null}

          {d.issueId ? (
            <InfoBlock label="Linked issue" value={<span className="fw-mono">{d.issueId.slice(0, 8)}</span>} />
          ) : null}

          {/* Share link */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
              Share link
            </span>
            {d.clientVisible ? (
              shareLinkUrl ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: "color-mix(in oklab, var(--accent) 8%, var(--bg-raised))",
                    border: "1px solid var(--accent)",
                  }}
                >
                  <span style={{ fontSize: 11, color: "var(--ink)" }}>
                    Link minted. Anyone with this URL can download the file:
                  </span>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      value={shareLinkUrl}
                      readOnly
                      onFocus={(e) => e.currentTarget.select()}
                      style={{
                        flex: 1,
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: "1px solid var(--line)",
                        background: "var(--bg)",
                        color: "var(--ink)",
                        fontSize: 11.5,
                        fontFamily: "var(--fw-font-mono)",
                      }}
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(shareLinkUrl).catch(() => {});
                      }}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: "1px solid var(--line)",
                        background: "var(--bg-raised)",
                        color: "var(--ink-dim)",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => mintShareToken.mutate()}
                  disabled={mintShareToken.isPending}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--line)",
                    background: "var(--bg-raised)",
                    color: "var(--ink)",
                    fontSize: 12,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  {mintShareToken.isPending
                    ? "Minting link…"
                    : "Mint share link (scoped to this file)"}
                </button>
              )
            ) : (
              <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>
                Publish first, then you can mint a share link for this file.
              </div>
            )}
          </div>

          {/* Soft-deleted banner */}
          {d.deletedAt ? (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                background: "color-mix(in oklab, var(--danger) 10%, var(--bg-raised))",
                border: "1px solid var(--danger)",
                fontSize: 12,
                color: "var(--ink)",
              }}
            >
              Deleted {formatRelative(d.deletedAt)}. The file remains in
              storage and can be restored via API.
            </div>
          ) : null}

          {/* Metadata JSON (if present) */}
          {d.metadata && Object.keys(d.metadata).length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
                Metadata
              </span>
              <pre
                style={{
                  fontFamily: "var(--fw-font-mono)",
                  fontSize: 11,
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "var(--bg-sunken)",
                  border: "1px solid var(--line)",
                  color: "var(--ink-dim)",
                  overflow: "auto",
                  margin: 0,
                  maxHeight: 180,
                }}
              >
                {JSON.stringify(d.metadata, null, 2)}
              </pre>
            </div>
          ) : null}
        </>
      ) : null}
    </Drawer>
  );
}

function InfoBlock({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>{label}</span>
      <span style={{ fontSize: 12.5, color: "var(--ink)" }}>{value}</span>
    </div>
  );
}

// ---------- main ----------

type KindFilter = DeliverableKind | "all";
type VisibilityFilter = "all" | "visible" | "private";

export function FernwehDeliverables() {
  const { companyPrefix } = useParams<{ companyPrefix: string }>();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id;
  const prefix = companyPrefix ?? selectedCompany?.issuePrefix ?? "";

  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("output");

  const [kindFilter, setKindFilter] = React.useState<KindFilter>("all");
  const [visibilityFilter, setVisibilityFilter] =
    React.useState<VisibilityFilter>("all");

  const setSelected = React.useCallback(
    (id: string | null) => {
      const next = new URLSearchParams(searchParams);
      if (id) next.set("output", id);
      else next.delete("output");
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const deliverablesQuery = useQuery({
    queryKey: queryKeys.deliverables.list(companyId!, {
      kind: kindFilter !== "all" ? kindFilter : undefined,
      clientVisible:
        visibilityFilter === "visible"
          ? true
          : visibilityFilter === "private"
          ? false
          : undefined,
    }),
    queryFn: () =>
      deliverablesApi.list(companyId!, {
        kind: kindFilter !== "all" ? kindFilter : undefined,
        clientVisible:
          visibilityFilter === "visible"
            ? true
            : visibilityFilter === "private"
            ? false
            : undefined,
      }),
    enabled: !!companyId,
    refetchInterval: 30_000,
  });

  const agentsQuery = useQuery({
    queryKey: queryKeys.agents.list(companyId!),
    queryFn: () => agentsApi.list(companyId!),
    enabled: !!companyId,
  });

  const projectsQuery = useQuery({
    queryKey: queryKeys.projects.list(companyId!),
    queryFn: () => projectsApi.list(companyId!),
    enabled: !!companyId,
  });

  const all = deliverablesQuery.data ?? [];
  const agents = agentsQuery.data ?? [];
  const projects = projectsQuery.data ?? [];

  const agentById = React.useMemo(() => {
    const m = new Map<string, Agent>();
    for (const a of agents) m.set(a.id, a);
    return m;
  }, [agents]);

  // Group by project → unassigned bucket first, then each project
  const grouped = React.useMemo(() => {
    const map = new Map<string | null, Deliverable[]>();
    for (const d of all) {
      const key = d.projectId;
      const arr = map.get(key) ?? [];
      arr.push(d);
      map.set(key, arr);
    }
    // Sort groups: null (unassigned) first, then project name alphabetical
    const entries = [...map.entries()];
    entries.sort(([a], [b]) => {
      if (a === null && b === null) return 0;
      if (a === null) return -1;
      if (b === null) return 1;
      const an = projects.find((p) => p.id === a)?.name ?? "";
      const bn = projects.find((p) => p.id === b)?.name ?? "";
      return an.localeCompare(bn);
    });
    return entries;
  }, [all, projects]);

  const counts = React.useMemo(() => {
    return {
      total: all.length,
      visible: all.filter((d) => d.clientVisible).length,
      private: all.filter((d) => !d.clientVisible).length,
    };
  }, [all]);

  if (!companyId) {
    return (
      <div style={{ padding: 24, color: "var(--ink-dim)" }}>
        Select a company to view deliverables.
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
        maxWidth: 1200,
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
            Outputs · {counts.total} total · {counts.visible} published
          </span>
          <h1 className="fw-display" style={{ fontSize: 24, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>
            Agent outputs
          </h1>
          <p style={{ fontSize: 12.5, color: "var(--ink-dim)", margin: 0, maxWidth: 560 }}>
            Real files your agents produced — .docx, .xlsx, .pdf, and more.
            Every output is downloadable. Publish the ones you want to share
            via link; drafts stay inside Doer.
          </p>
        </div>
      </header>

      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>Status</span>
          {(["all", "visible", "private"] as VisibilityFilter[]).map((v) => (
            <FilterPill
              key={v}
              active={visibilityFilter === v}
              label={
                v === "all"
                  ? "All"
                  : v === "visible"
                  ? "Published"
                  : "Draft"
              }
              count={
                v === "all" ? counts.total : v === "visible" ? counts.visible : counts.private
              }
              onClick={() => setVisibilityFilter(v)}
            />
          ))}
        </div>
        <div style={{ width: 1, height: 18, background: "var(--line)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>Kind</span>
          <FilterPill
            active={kindFilter === "all"}
            label="All"
            onClick={() => setKindFilter("all")}
          />
          {DELIVERABLE_KINDS.map((k) => (
            <FilterPill
              key={k}
              active={kindFilter === k}
              label={kindLabel(k)}
              onClick={() => setKindFilter(k)}
            />
          ))}
        </div>
      </div>

      {/* List */}
      {deliverablesQuery.isLoading ? (
        <LoadingState label="Loading outputs…" />
      ) : deliverablesQuery.error ? (
        <ErrorState error={deliverablesQuery.error} />
      ) : all.length === 0 ? (
        <EmptyState
          icon={I.stack}
          title="No outputs yet"
          subtitle="When your agents produce a .docx, .xlsx, .pdf, or .pptx, it'll land here. Every agent already has the deliverable skill installed — just assign an issue that calls for a real file."
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {grouped.map(([projectId, items]) => {
            const project = projectId ? projects.find((p) => p.id === projectId) ?? null : null;
            const label = project ? project.name : "Unassigned";
            return (
              <section key={projectId ?? "unassigned"} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <header style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <h2 className="fw-display" style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>
                    {label}
                  </h2>
                  <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
                    {items.length} file{items.length === 1 ? "" : "s"}
                  </span>
                </header>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {items.map((d) => (
                    <DeliverableRow
                      key={d.id}
                      deliverable={d}
                      producer={d.producedByAgentId ? agentById.get(d.producedByAgentId) ?? null : null}
                      project={project}
                      active={selectedId === d.id}
                      onSelect={() => setSelected(d.id)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <footer
        style={{
          paddingTop: 8,
          borderTop: "1px solid var(--line-soft)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "var(--ink-faint)",
          fontSize: 11,
        }}
      >
        <Icon d={I.stack} size={11} />
        <span>
          Grouped by project · ?output=:id deep-links · agents produce
          outputs automatically via the deliverable skill.
        </span>
      </footer>

      <DeliverableDrawer
        deliverableId={selectedId}
        companyId={companyId}
        allAgents={agents}
        allProjects={projects}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

function FilterPill({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px",
        borderRadius: 999,
        border: `1px solid ${active ? "var(--accent)" : "var(--line)"}`,
        background: active ? "color-mix(in oklab, var(--accent) 10%, transparent)" : "transparent",
        color: active ? "var(--accent)" : "var(--ink-dim)",
        fontSize: 11.5,
        cursor: "pointer",
        transition: "all .12s var(--fw-ease)",
      }}
    >
      <span>{label}</span>
      {count !== undefined ? (
        <span
          style={{
            padding: "0 5px",
            borderRadius: 4,
            background: active ? "var(--accent)" : "var(--bg-sunken)",
            color: active ? "var(--bg)" : "var(--ink-faint)",
            fontSize: 10,
            fontWeight: 500,
          }}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}
