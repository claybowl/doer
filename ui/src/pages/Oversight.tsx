import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, RefreshCw } from "lucide-react";
import { oversightApi } from "../api/oversight";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { EmptyState } from "../components/EmptyState";
import { PageSkeleton } from "../components/PageSkeleton";
import { Button } from "@/components/ui/button";
import type { OversightAgent } from "@doerai/shared";

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    active: "Active",
    idle: "Idle",
    paused: "Paused",
    error: "Error",
  };
  return map[status] ?? status;
}

function goalStatusLabel(status: string): string {
  const map: Record<string, string> = {
    active: "active",
    in_progress: "in progress",
    planned: "planned",
    completed: "completed",
    cancelled: "cancelled",
  };
  return map[status] ?? status;
}

function AgentWikiEntry({ agent }: { agent: OversightAgent }) {
  const hasGoals = agent.activeGoals.length > 0;
  const hasActivity = agent.recentActivity.length > 0;
  const budgetPct =
    agent.budgetMonthlyCents > 0
      ? Math.round((agent.spentMonthlyCents / agent.budgetMonthlyCents) * 100)
      : null;

  return (
    <section
      id={`agent-${agent.id}`}
      className="py-6 border-b border-border last:border-b-0"
    >
      {/* Header */}
      <div className="flex items-baseline gap-3 mb-3">
        <h2 className="text-base font-semibold text-foreground">{agent.name}</h2>
        {agent.title && (
          <span className="text-xs text-muted-foreground">{agent.title}</span>
        )}
        <span
          className={[
            "ml-auto text-xs font-medium px-2 py-0.5 rounded-full",
            agent.status === "active"
              ? "bg-green-500/15 text-green-700 dark:text-green-400"
              : agent.status === "paused"
                ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400"
                : agent.status === "error"
                  ? "bg-red-500/15 text-red-700 dark:text-red-400"
                  : "bg-muted text-muted-foreground",
          ].join(" ")}
        >
          {statusLabel(agent.status)}
        </span>
      </div>

      {/* Currently working on */}
      {hasGoals && (
        <div className="mb-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
            Currently working on
          </p>
          <ul className="space-y-1">
            {agent.activeGoals.map((g) => (
              <li key={g.id} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 text-muted-foreground">·</span>
                <span>
                  {g.title}
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    ({goalStatusLabel(g.status)})
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* This week */}
      {hasActivity && (
        <div className="mb-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
            This week
          </p>
          <ul className="space-y-1">
            {agent.recentActivity.slice(0, 8).map((a) => (
              <li key={a.id} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 text-muted-foreground">·</span>
                <span>
                  <span className="font-medium">{a.action}</span>
                  {a.entityType && (
                    <span className="text-muted-foreground"> on {a.entityType}</span>
                  )}
                </span>
              </li>
            ))}
            {agent.recentActivity.length > 8 && (
              <li className="text-xs text-muted-foreground pl-4">
                +{agent.recentActivity.length - 8} more events
              </li>
            )}
          </ul>
        </div>
      )}

      {!hasGoals && !hasActivity && (
        <p className="text-sm text-muted-foreground">
          No recorded activity in the last 7 days.
        </p>
      )}

      {/* Cost signal */}
      {agent.budgetMonthlyCents > 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          {formatCents(agent.spentMonthlyCents)} spent this month
          {budgetPct !== null && ` (${budgetPct}% of ${formatCents(agent.budgetMonthlyCents)} budget)`}
        </p>
      )}
    </section>
  );
}

export function Oversight() {
  const { selectedCompanyId, selectedCompany } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    setBreadcrumbs([{ label: "Oversight" }]);
  }, [setBreadcrumbs]);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: queryKeys.oversight(selectedCompanyId!),
    queryFn: () => oversightApi.get(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    staleTime: 60_000,
  });

  if (!selectedCompanyId) {
    return <EmptyState icon={Eye} message="Select a company to view oversight." />;
  }

  if (isLoading) {
    return <PageSkeleton variant="list" />;
  }

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            {selectedCompany?.name ?? "Company"} — Agent Oversight
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            7-day rolling window
            {data?.generatedAt && (
              <> · as of {new Date(data.generatedAt).toLocaleTimeString()}</>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-1.5"
        >
          <RefreshCw className={["h-3.5 w-3.5", isFetching ? "animate-spin" : ""].join(" ")} />
          Refresh
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive">{(error as Error).message}</p>
      )}

      {data && data.agents.length === 0 && (
        <EmptyState icon={Eye} message="No agents found for this company." />
      )}

      {data && data.agents.length > 0 && (
        <div className="border border-border rounded-md px-6 divide-y divide-border">
          {data.agents.map((agent) => (
            <AgentWikiEntry key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
}
