import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "@/context/CompanyContext";
import { useDialog } from "@/context/DialogContext";
import { companiesApi } from "@/api/companies";
import { queryKeys } from "@/lib/queryKeys";
import { formatCents, relativeTime } from "@/lib/utils";
import { Icon, I } from "./utils";

export function FernwehCompanies() {
  const { companies, selectedCompanyId, setSelectedCompanyId, loading, error } = useCompany();
  const { openOnboarding } = useDialog();
  const queryClient = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: queryKeys.companies.stats,
    queryFn: () => companiesApi.stats(),
  });

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);

  const editMutation = useMutation({
    mutationFn: ({ id, newName }: { id: string; newName: string }) =>
      companiesApi.update(id, { name: newName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => companiesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.stats });
      setConfirmDeleteId(null);
    },
  });

  function saveEdit() {
    if (!editingId || !editName.trim()) return;
    editMutation.mutate({ id: editingId, newName: editName.trim() });
  }

  return (
    <div style={{ padding: "32px 40px", maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 className="fw-display" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>
            Companies
          </h1>
          <p style={{ color: "var(--ink-dim)", fontSize: 13, margin: "4px 0 0" }}>
            {companies.length} company{companies.length !== 1 ? "ies" : ""}
          </p>
        </div>
        <button
          onClick={() => openOnboarding()}
          className="fw-card"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 8, border: "1px solid var(--accent)",
            color: "var(--accent)", fontSize: 13, fontWeight: 500, cursor: "pointer",
            background: "var(--bg-raised)",
          }}
        >
          <Icon d={I.plus} size={14} />
          New Company
        </button>
      </div>

      {/* Loading / Error */}
      {loading && <p style={{ color: "var(--ink-dim)", fontSize: 13 }}>Loading companies...</p>}
      {error && <p style={{ color: "var(--danger)", fontSize: 13 }}>{error.message}</p>}

      {/* Company cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {companies.map((company) => {
          const selected = company.id === selectedCompanyId;
          const isEditing = editingId === company.id;
          const isConfirmingDelete = confirmDeleteId === company.id;
          const companyStats = stats?.[company.id];
          const agentCount = companyStats?.agentCount ?? 0;
          const issueCount = companyStats?.issueCount ?? 0;
          const budgetPct =
            company.budgetMonthlyCents > 0
              ? Math.round((company.spentMonthlyCents / company.budgetMonthlyCents) * 100)
              : 0;

          return (
            <div
              key={company.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedCompanyId(company.id)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedCompanyId(company.id); } }}
              className="fw-card"
              style={{
                padding: "20px 24px", borderRadius: 10, cursor: "pointer",
                border: selected ? "1px solid var(--accent)" : "1px solid var(--line)",
                background: selected ? "var(--bg-raised)" : "var(--bg-sunken)",
                transition: "all .15s var(--fw-ease)",
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {isEditing ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={(e) => e.stopPropagation()}>
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") { setEditingId(null); setEditName(""); } }}
                        autoFocus
                        style={{
                          padding: "6px 10px", borderRadius: 6, border: "1px solid var(--line)",
                          background: "var(--bg)", color: "var(--ink)", fontSize: 14, width: 200,
                        }}
                      />
                      <button onClick={saveEdit} disabled={editMutation.isPending}
                        style={{ border: "none", background: "none", color: "var(--pulse)", cursor: "pointer", padding: 4 }}>
                        <Icon d={I.check} size={16} />
                      </button>
                      <button onClick={() => { setEditingId(null); setEditName(""); }}
                        style={{ border: "none", background: "none", color: "var(--ink-dim)", cursor: "pointer", padding: 4 }}>
                        <Icon d={I.x} size={16} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 16, fontWeight: 600 }}>{company.name}</span>
                      <span style={{
                        fontSize: 10, padding: "2px 8px", borderRadius: 999, fontWeight: 500,
                        background: company.status === "active" ? "var(--pulse-soft)" :
                          company.status === "paused" ? "var(--warn-soft)" : "var(--ink-faint)",
                        color: company.status === "active" ? "var(--pulse)" :
                          company.status === "paused" ? "var(--warn)" : "var(--ink-dim)",
                      }}>
                        {company.status}
                      </span>
                    </div>
                  )}
                  {company.description && !isEditing && (
                    <p style={{ color: "var(--ink-dim)", fontSize: 13, margin: "6px 0 0" }}>{company.description}</p>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 4 }} onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => { setEditingId(company.id); setEditName(company.name); }}
                    style={{ border: "none", background: "none", color: "var(--ink-faint)", cursor: "pointer", padding: 4 }}
                    title="Rename"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(company.id)}
                    style={{ border: "none", background: "none", color: "var(--ink-faint)", cursor: "pointer", padding: 4 }}
                    title="Delete"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Stats row */}
              <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 16, fontSize: 13, color: "var(--ink-dim)", flexWrap: "wrap" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Icon d={I.agents} size={14} /> {agentCount} {agentCount === 1 ? "agent" : "agents"}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Icon d={I.issues} size={14} /> {issueCount} {issueCount === 1 ? "issue" : "issues"}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Icon d={I.dollar} size={14} />
                  {formatCents(company.spentMonthlyCents)}
                  {company.budgetMonthlyCents > 0 ? <> / {formatCents(company.budgetMonthlyCents)} ({budgetPct}%)</> : " Unlimited"}
                </span>
                <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
                  <Icon d={I.clock} size={14} /> {relativeTime(company.createdAt)}
                </span>
              </div>

              {/* Delete confirmation */}
              {isConfirmingDelete && (
                <div style={{
                  marginTop: 16, padding: "12px 16px", borderRadius: 8,
                  border: "1px solid var(--danger)", background: "var(--danger-soft)",
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                }} onClick={(e) => e.stopPropagation()}>
                  <span style={{ fontSize: 13, color: "var(--danger)", fontWeight: 500 }}>
                    Delete this company and all its data? This cannot be undone.
                  </span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setConfirmDeleteId(null)} disabled={deleteMutation.isPending}
                      style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)", fontSize: 13, cursor: "pointer" }}>
                      Cancel
                    </button>
                    <button onClick={() => deleteMutation.mutate(company.id)} disabled={deleteMutation.isPending}
                      style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: "var(--danger)", color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 500 }}>
                      {deleteMutation.isPending ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
