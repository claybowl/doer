import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TeamImportResult, TeamSummary } from "@doerai/shared";
import { useNavigate } from "@/lib/router";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Users } from "lucide-react";
import { teamsApi } from "../api/teams";
import { useCompany } from "../context/CompanyContext";
import { cn } from "../lib/utils";

/**
 * Hire a Team — import a starter team manifest in one click.
 * Preconfigured agents, wired reportsTo chain, memory unpacked into the
 * org's visible root, shared blocks seeded. Heartbeats start disabled.
 */
export function HireTeam() {
  const { selectedCompanyId } = useCompany();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [result, setResult] = useState<TeamImportResult | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const teamsQuery = useQuery({
    queryKey: ["teams", selectedCompanyId],
    queryFn: () => teamsApi.list(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
  });

  const importMutation = useMutation({
    mutationFn: (teamId: string) => teamsApi.import(selectedCompanyId!, teamId),
    onMutate: (teamId) => {
      setImportingId(teamId);
      setError(null);
    },
    onSuccess: (res) => {
      setResult(res);
      void queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Team import failed");
    },
    onSettled: () => setImportingId(null),
  });

  if (!selectedCompanyId) return null;

  if (result) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-8">
        <div className="space-y-2 text-center">
          <Check className="mx-auto h-8 w-8 text-green-600 dark:text-green-400" />
          <h1 className="text-lg font-semibold">Team hired</h1>
          <p className="text-sm text-muted-foreground">
            {result.agents.length} agents joined with their memory unpacked and the
            reporting chain wired. Heartbeats are <strong>off</strong> — enable them
            per agent when you&apos;re ready.
          </p>
        </div>
        <div className="space-y-2 rounded-md border border-border p-4">
          {result.agents.map((a) => (
            <div key={a.agentId} className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium">{a.name}</span>
              <span className="truncate font-mono text-xs text-muted-foreground">
                memory: {a.memoryPathPrefix || "(none)"}
              </span>
            </div>
          ))}
        </div>
        {result.warnings.concat(result.agents.flatMap((a) => a.warnings)).length > 0 && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
            {result.warnings.concat(result.agents.flatMap((a) => a.warnings)).map((w, i) => (
              <div key={i}>{w}</div>
            ))}
          </div>
        )}
        <div className="flex justify-center gap-2">
          <Button onClick={() => navigate("/agents/all")}>
            Meet the team <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" onClick={() => setResult(null)}>
            Hire another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-4">
      <div>
        <h1 className="text-lg font-semibold">Hire a Team</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Preconfigured agent teams with personas, memory, and a working
          delegation chain. Add a goal for the lead — the team does the rest.
        </p>
      </div>

      {teamsQuery.isLoading && (
        <p className="text-sm text-muted-foreground">Loading teams…</p>
      )}
      {teamsQuery.isError && (
        <p className="text-sm text-destructive">
          {teamsQuery.error instanceof Error ? teamsQuery.error.message : "Failed to load teams"}
        </p>
      )}
      {teamsQuery.data && teamsQuery.data.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No team manifests found. Add one under <code>teams/&lt;id&gt;/team.json</code>.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {(teamsQuery.data ?? []).map((team: TeamSummary) => (
          <div
            key={team.id}
            className={cn(
              "flex flex-col gap-3 rounded-lg border border-border p-4",
              !team.ready && "opacity-75",
            )}
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">{team.name}</h2>
              <span className="ml-auto rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                {team.agentCount} agents
              </span>
            </div>
            {team.description && (
              <p className="text-xs text-muted-foreground">{team.description}</p>
            )}
            <div className="flex flex-wrap gap-1">
              {team.agentNames.map((name) => (
                <span
                  key={name}
                  className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  {name}
                </span>
              ))}
            </div>
            {!team.ready && (
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                Not ready — missing: {team.missingFiles.join(", ")}
              </p>
            )}
            <div className="mt-auto">
              <Button
                size="sm"
                disabled={!team.ready || importingId !== null}
                onClick={() => importMutation.mutate(team.id)}
              >
                {importingId === team.id ? "Hiring…" : "Hire this team"}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
