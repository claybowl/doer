import * as React from "react";
import { useEffect, useMemo, useCallback } from "react";
import { useLocation, useSearchParams } from "@/lib/router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { issuesApi } from "@/api/issues";
import { agentsApi } from "@/api/agents";
import { projectsApi } from "@/api/projects";
import { heartbeatsApi } from "@/api/heartbeats";
import { useCompany } from "@/context/CompanyContext";
import { queryKeys } from "@/lib/queryKeys";
import { createIssueDetailLocationState } from "@/lib/issueDetailBreadcrumb";
import { CircleDot } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { IssuesList } from "@/components/IssuesList";

export function FernwehIssues() {
  const { selectedCompanyId } = useCompany();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const initialSearch = searchParams.get("q") ?? "";
  const participantAgentId = searchParams.get("participantAgentId") ?? undefined;

  const handleSearchChange = useCallback((search: string) => {
    const trimmedSearch = search.trim();
    const currentSearch = new URLSearchParams(window.location.search).get("q") ?? "";
    if (currentSearch === trimmedSearch) return;
    const url = new URL(window.location.href);
    if (trimmedSearch) {
      url.searchParams.set("q", trimmedSearch);
    } else {
      url.searchParams.delete("q");
    }
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const { data: agents } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: projects } = useQuery({
    queryKey: queryKeys.projects.list(selectedCompanyId!),
    queryFn: () => projectsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: liveRuns } = useQuery({
    queryKey: queryKeys.liveRuns(selectedCompanyId!),
    queryFn: () => heartbeatsApi.liveRunsForCompany(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: 5000,
  });

  const liveIssueIds = useMemo(() => {
    const ids = new Set<string>();
    for (const run of liveRuns ?? []) {
      if (run.issueId) ids.add(run.issueId);
    }
    return ids;
  }, [liveRuns]);

  const issueLinkState = useMemo(
    () => createIssueDetailLocationState("Issues", `${location.pathname}${location.search}${location.hash}`),
    [location.pathname, location.search, location.hash],
  );

  const { data: issues, isLoading, error } = useQuery({
    queryKey: [...queryKeys.issues.list(selectedCompanyId!), "participant-agent", participantAgentId ?? "__all__"],
    queryFn: () => issuesApi.list(selectedCompanyId!, { participantAgentId }),
    enabled: !!selectedCompanyId,
  });

  const updateIssue = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      issuesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.list(selectedCompanyId!) });
    },
  });

  if (!selectedCompanyId) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--ink-dim)" }}>
        <EmptyState icon={CircleDot} message="Select a company to view issues." />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* IssuesList provides its own header, count, and "New Issue" CTA — don't double-render.
          Padding wrapper keeps the toolbar's right-aligned controls (New Issue / Filter / Sort / Group)
          off the column edge so they don't clip inside Fernweh's grid. */}
      <div style={{ flex: 1, overflow: "auto", padding: "20px 32px" }}>
        <IssuesList
          issues={issues ?? []}
          isLoading={isLoading}
          error={error as Error | null}
          agents={agents}
          projects={projects}
          liveIssueIds={liveIssueIds}
          viewStateKey="doer:fernweh-issues-view"
          issueLinkState={issueLinkState}
          initialAssignees={searchParams.get("assignee") ? [searchParams.get("assignee")!] : undefined}
          initialSearch={initialSearch}
          onSearchChange={handleSearchChange}
          onUpdateIssue={(id, data) => updateIssue.mutate({ id, data })}
          searchFilters={participantAgentId ? { participantAgentId } : undefined}
        />
      </div>
    </div>
  );
}
