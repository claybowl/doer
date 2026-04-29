import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { NavLink, useParams } from "@/lib/router";
import { executionWorkspacesApi } from "@/api/execution-workspaces";
import { queryKeys } from "@/lib/queryKeys";
import { useCompany } from "@/context/CompanyContext";
import type { ExecutionWorkspace } from "@doerai/shared";
import { ErrorState, LoadingState } from "./utils";

/* ============================================================
   FernwehExecutionWorkspaceDetail — read-only detail view for
   a single execution workspace.
   Route: /:companyPrefix/execution-workspaces/:workspaceId
============================================================ */

function statusColor(status: string): string {
  if (status === "active") return "var(--accent)";
  if (status === "closed" || status === "error") return "var(--danger)";
  return "var(--ink-dim)";
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "9px 0", borderBottom: "1px solid var(--line-soft)" }}>
      <span
        className="fw-uc"
        style={{ width: 140, flexShrink: 0, color: "var(--ink-faint)", fontSize: 10, paddingTop: 2 }}
      >
        {label}
      </span>
      <span style={{ fontSize: 13, color: "var(--ink)", wordBreak: "break-all" }}>{children}</span>
    </div>
  );
}

function Chip({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 500,
        background: `color-mix(in oklab, ${color} 12%, var(--bg-raised))`,
        color,
        border: `1px solid color-mix(in oklab, ${color} 28%, transparent)`,
      }}
    >
      {label}
    </span>
  );
}

export function FernwehExecutionWorkspaceDetail() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { selectedCompany } = useCompany();
  const prefix = selectedCompany?.issuePrefix ?? "";

  const query = useQuery<ExecutionWorkspace>({
    queryKey: queryKeys.executionWorkspaces.detail(workspaceId!),
    queryFn: () => executionWorkspacesApi.get(workspaceId!),
    enabled: !!workspaceId,
  });

  if (query.isLoading && !query.data) return <LoadingState label="Loading workspace…" />;
  if (query.error && !query.data) {
    return (
      <div style={{ padding: 32 }}>
        <ErrorState error={query.error} hint={`Workspace id: ${workspaceId ?? "—"}`} />
      </div>
    );
  }

  const ws = query.data;
  if (!ws) return null;

  const cleanupText = ws.cleanupEligibleAt
    ? `${new Date(ws.cleanupEligibleAt).toLocaleString()}${ws.cleanupReason ? " · " + ws.cleanupReason : ""}`
    : "Not scheduled";

  return (
    <div style={{ padding: 32, maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Back link */}
      <div>
        <NavLink
          to={`/${prefix}/execution-workspaces`}
          style={{ fontSize: 12, color: "var(--ink-faint)", textDecoration: "none" }}
        >
          <span className="fw-uc">← All workspaces</span>
        </NavLink>
      </div>

      {/* Header card */}
      <div className="fw-card" style={{ padding: 20 }}>
        <h1
          className="fw-display"
          style={{ margin: "0 0 10px", fontSize: 20, fontWeight: 600, color: "var(--ink)" }}
        >
          {ws.name}
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Chip label={ws.status} color={statusColor(ws.status)} />
          {ws.mode && <Chip label={ws.mode} color="var(--ink-dim)" />}
          {ws.providerType && <Chip label={ws.providerType} color="var(--ink-dim)" />}
        </div>
      </div>

      {/* Details card */}
      <div className="fw-card" style={{ padding: "0 20px" }}>
        <Row label="Project">
          {ws.projectId ? (
            <NavLink
              to={`/${prefix}/projects/${ws.projectId}`}
              style={{ color: "var(--accent)", textDecoration: "none" }}
            >
              <span className="fw-mono" style={{ fontSize: 12 }}>{ws.projectId}</span>
            </NavLink>
          ) : "—"}
        </Row>

        <Row label="Source issue">
          {ws.sourceIssueId ? (
            <NavLink
              to={`/${prefix}/work?issue=${ws.sourceIssueId}`}
              style={{ color: "var(--accent)", textDecoration: "none" }}
            >
              <span className="fw-mono" style={{ fontSize: 12 }}>{ws.sourceIssueId}</span>
            </NavLink>
          ) : "—"}
        </Row>

        <Row label="Branch">
          {ws.branchName ? <span className="fw-mono" style={{ fontSize: 12 }}>{ws.branchName}</span> : "—"}
        </Row>

        <Row label="Base ref">
          {ws.baseRef ? <span className="fw-mono" style={{ fontSize: 12 }}>{ws.baseRef}</span> : "—"}
        </Row>

        <Row label="Working dir">
          {ws.cwd ? <span className="fw-mono" style={{ fontSize: 12 }}>{ws.cwd}</span> : "—"}
        </Row>

        <Row label="Provider ref">
          {ws.providerRef ? <span className="fw-mono" style={{ fontSize: 12 }}>{ws.providerRef}</span> : "—"}
        </Row>

        <Row label="Repo URL">
          {ws.repoUrl ? (
            /^https?:\/\//.test(ws.repoUrl) ? (
              <a
                href={ws.repoUrl}
                target="_blank"
                rel="noreferrer"
                style={{ color: "var(--accent)", textDecoration: "none", fontSize: 12, fontFamily: "var(--fw-font-mono)" }}
              >
                {ws.repoUrl} ↗
              </a>
            ) : (
              <span className="fw-mono" style={{ fontSize: 12 }}>{ws.repoUrl}</span>
            )
          ) : "—"}
        </Row>

        <Row label="Opened">
          {ws.openedAt ? new Date(ws.openedAt).toLocaleString() : "—"}
        </Row>

        <Row label="Last used">
          {ws.lastUsedAt ? new Date(ws.lastUsedAt).toLocaleString() : "—"}
        </Row>

        <div style={{ borderBottom: "none" }}>
          <Row label="Cleanup">
            <span style={{ color: ws.cleanupEligibleAt ? "var(--ink)" : "var(--ink-faint)" }}>
              {cleanupText}
            </span>
          </Row>
        </div>
      </div>
    </div>
  );
}
