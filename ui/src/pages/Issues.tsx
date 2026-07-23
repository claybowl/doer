import { useEffect, useMemo, useCallback } from "react";
import { useLocation, useSearchParams } from "@/lib/router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { issuesApi } from "../api/issues";
import { agentsApi } from "../api/agents";
import { projectsApi } from "../api/projects";
import { heartbeatsApi } from "../api/heartbeats";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { createIssueDetailLocationState } from "../lib/issueDetailBreadcrumb";
import { EmptyState } from "../components/EmptyState";
import { IssuesList } from "../components/IssuesList";
import { CircleDot } from "lucide-react";

export function Issues() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
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

    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState(window.history.state, "", nextUrl);
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
    () =>
      createIssueDetailLocationState(
        "Issues",
        `${location.pathname}${location.search}${location.hash}`,
      ),
    [location.pathname, location.search, location.hash],
  );

  useEffect(() => {
    setBreadcrumbs([{ label: "Issues" }]);
  }, [setBreadcrumbs]);

  const { data: issues, isLoading, error } = useQuery({
    queryKey: [...queryKeys.issues.list(selectedCompanyId!), "participant-agent", participantAgentId ?? "__all__"],
    queryFn: () => issuesApi.list(selectedCompanyId!, { participantAgentId }),
    enabled: !!selectedCompanyId,
  });

  const { data: diagnostics, error: diagnosticsError } = useQuery({
    queryKey: queryKeys.issues.diagnostics(selectedCompanyId!),
    queryFn: () => issuesApi.diagnostics(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: 30_000,
  });

  const updateIssue = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      issuesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.issues.list(selectedCompanyId!) });
    },
  });

  if (!selectedCompanyId) {
    return <EmptyState icon={CircleDot} message="Select a company to view issues." />;
  }

  return (
    <div className="space-y-3">
      <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 border px-3 py-2 text-xs ${
        diagnosticsError ? "border-destructive/30 bg-destructive/5 text-destructive" :
        diagnostics?.total === 0 ? "border-amber-500/30 bg-amber-500/5 text-amber-800 dark:text-amber-200" :
        "border-border bg-muted/20 text-muted-foreground"
      }`}>
        <span className="font-medium">Queue health</span>
        {diagnosticsError ? <span>Diagnostics unavailable — queue state cannot be confirmed.</span> : diagnostics ? (
          <>
            <span>{diagnostics.total} total issues</span>
            <span>last successful read {new Date(diagnostics.lastSuccessfulReadAt).toLocaleTimeString()}</span>
            {diagnostics.total === 0 && <span className="font-medium">No work found; the queue read is healthy.</span>}
          </>
        ) : <span>Checking…</span>}
      </div>
      <IssuesList
        issues={issues ?? []}
        isLoading={isLoading}
        error={error as Error | null}
        agents={agents}
        projects={projects}
        liveIssueIds={liveIssueIds}
        viewStateKey="doer:issues-view"
        issueLinkState={issueLinkState}
        initialAssignees={searchParams.get("assignee") ? [searchParams.get("assignee")!] : undefined}
        initialSearch={initialSearch}
        onSearchChange={handleSearchChange}
        onUpdateIssue={(id, data) => updateIssue.mutate({ id, data })}
        searchFilters={participantAgentId ? { participantAgentId } : undefined}
      />
    </div>
  );
}
