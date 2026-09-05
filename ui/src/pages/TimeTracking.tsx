import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { timeTrackingApi } from "../api/time-tracking";
import { useCompany } from "../context/CompanyContext";
import { cn } from "../lib/utils";
import { Clock, TrendingUp, Users, FolderKanban, ListTodo, Calendar } from "lucide-react";

/** Format milliseconds into "2h 34m" or "34m" or "45s" */
function formatDuration(ms: number): string {
  if (!ms || ms < 1000) return "0s";
  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${secs}s`;
}

type Tab = "summary" | "agents" | "projects" | "issues" | "timesheet";

export function TimeTracking() {
  const { selectedCompany: company } = useCompany();
  const companyId = company?.id;
  const [tab, setTab] = useState<Tab>("summary");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const dateParams = { from: from || undefined, to: to || undefined };

  const { data: summary } = useQuery({
    queryKey: ["time-summary", companyId, dateParams],
    queryFn: () => timeTrackingApi.summary(companyId!, dateParams.from, dateParams.to),
    enabled: !!companyId,
  });

  const { data: byAgent } = useQuery({
    queryKey: ["time-by-agent", companyId, dateParams],
    queryFn: () => timeTrackingApi.byAgent(companyId!, dateParams.from, dateParams.to),
    enabled: !!companyId && tab === "agents",
  });

  const { data: byProject } = useQuery({
    queryKey: ["time-by-project", companyId, dateParams],
    queryFn: () => timeTrackingApi.byProject(companyId!, dateParams.from, dateParams.to),
    enabled: !!companyId && tab === "projects",
  });

  const { data: byIssue } = useQuery({
    queryKey: ["time-by-issue", companyId, dateParams],
    queryFn: () => timeTrackingApi.byIssue(companyId!, dateParams.from, dateParams.to),
    enabled: !!companyId && tab === "issues",
  });

  const { data: timesheet } = useQuery({
    queryKey: ["weekly-timesheet", companyId],
    queryFn: () => timeTrackingApi.weeklyTimesheet(companyId!),
    enabled: !!companyId && tab === "timesheet",
  });

  if (!companyId) return null;

  const tabs: { id: Tab; label: string; icon: typeof Clock }[] = [
    { id: "summary", label: "Summary", icon: Clock },
    { id: "agents", label: "By Agent", icon: Users },
    { id: "projects", label: "By Project", icon: FolderKanban },
    { id: "issues", label: "By Task", icon: ListTodo },
    { id: "timesheet", label: "Timesheet", icon: Calendar },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Time Tracking</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track and analyze time spent on tasks by agents and humans
          </p>
        </div>
      </div>

      {/* Date range filter */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">From:</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">To:</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        {(from || to) && (
          <button
            onClick={() => { setFrom(""); setTo(""); }}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Clear
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Summary tab */}
      {tab === "summary" && summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Time" value={formatDuration(summary.totalMs)} icon={Clock} />
          <StatCard label="Agent Time" value={formatDuration(summary.agentMs)} icon={TrendingUp} />
          <StatCard label="Human Time" value={formatDuration(summary.humanMs)} icon={Users} />
          <StatCard label="Billable Time" value={formatDuration(summary.billableMs)} icon={Clock} />
          <StatCard label="Non-Billable" value={formatDuration(summary.nonBillableMs)} icon={Clock} />
          <StatCard label="Total Entries" value={String(summary.entryCount)} icon={ListTodo} />
          <StatCard label="Running Timers" value={String(summary.runningCount)} icon={Clock} />
        </div>
      )}

      {/* By Agent tab */}
      {tab === "agents" && byAgent && (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Agent</th>
                <th className="text-left px-4 py-2 font-medium">Role</th>
                <th className="text-right px-4 py-2 font-medium">Total Time</th>
                <th className="text-right px-4 py-2 font-medium">Tasks</th>
                <th className="text-right px-4 py-2 font-medium">Entries</th>
                <th className="text-right px-4 py-2 font-medium">Avg/Task</th>
                <th className="text-right px-4 py-2 font-medium">Billable</th>
              </tr>
            </thead>
            <tbody>
              {byAgent.map((row) => (
                <tr key={row.agentId} className="border-t border-border/50">
                  <td className="px-4 py-2">{row.agentName ?? "Unknown"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{row.agentRole ?? "—"}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">{formatDuration(row.totalMs)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{row.taskCount}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{row.entryCount}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">{formatDuration(row.avgPerTaskMs)}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">{formatDuration(row.billableMs)}</td>
                </tr>
              ))}
              {byAgent.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No time entries found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* By Project tab */}
      {tab === "projects" && byProject && (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Project</th>
                <th className="text-right px-4 py-2 font-medium">Total Time</th>
                <th className="text-right px-4 py-2 font-medium">Tasks</th>
                <th className="text-right px-4 py-2 font-medium">Entries</th>
                <th className="text-right px-4 py-2 font-medium">Billable</th>
              </tr>
            </thead>
            <tbody>
              {byProject.map((row) => (
                <tr key={row.projectId ?? "none"} className="border-t border-border/50">
                  <td className="px-4 py-2">{row.projectName ?? "No Project"}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">{formatDuration(row.totalMs)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{row.taskCount}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{row.entryCount}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">{formatDuration(row.billableMs)}</td>
                </tr>
              ))}
              {byProject.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No time entries found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* By Issue tab */}
      {tab === "issues" && byIssue && (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Task</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-right px-4 py-2 font-medium">Total</th>
                <th className="text-right px-4 py-2 font-medium">Agent</th>
                <th className="text-right px-4 py-2 font-medium">Human</th>
                <th className="text-right px-4 py-2 font-medium">Est.</th>
                <th className="text-right px-4 py-2 font-medium">Variance</th>
              </tr>
            </thead>
            <tbody>
              {byIssue.map((row) => (
                <tr key={row.issueId} className="border-t border-border/50">
                  <td className="px-4 py-2 truncate max-w-xs">
                    {row.issueIdentifier && <span className="text-muted-foreground mr-1">{row.issueIdentifier}</span>}
                    {row.issueTitle}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{row.issueStatus}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">{formatDuration(row.totalMs)}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">{formatDuration(row.agentMs)}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">{formatDuration(row.humanMs)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {row.estimatedMinutes ? `${row.estimatedMinutes}m` : "—"}
                  </td>
                  <td className={cn(
                    "px-4 py-2 text-right font-mono tabular-nums",
                    row.varianceMs === null ? "text-muted-foreground" :
                    row.varianceMs > 0 ? "text-red-500" : "text-green-500",
                  )}>
                    {row.varianceMs === null ? "—" : formatDuration(Math.abs(row.varianceMs))}
                    {row.varianceMs !== null && row.varianceMs > 0 ? " over" : ""}
                    {row.varianceMs !== null && row.varianceMs < 0 ? " under" : ""}
                  </td>
                </tr>
              ))}
              {byIssue.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No time entries found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Timesheet tab */}
      {tab === "timesheet" && timesheet && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Week Total" value={formatDuration(timesheet.totalMs)} icon={Clock} />
            <StatCard label="Billable" value={formatDuration(timesheet.billableMs)} icon={Clock} />
            <StatCard label="Entries" value={String(timesheet.rows.length)} icon={ListTodo} />
          </div>

          {/* Daily totals bar */}
          <div className="flex gap-1">
            {Object.entries(timesheet.dailyTotals).sort().map(([date, ms]) => (
              <div key={date} className="flex-1 text-center">
                <div className="h-16 bg-muted/30 rounded-md flex items-end overflow-hidden">
                  <div
                    className="w-full bg-primary/40 rounded-md"
                    style={{ height: `${Math.min(100, (ms / (8 * 3600 * 1000)) * 100)}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(date).toLocaleDateString("en-US", { weekday: "short" })}
                </div>
                <div className="text-xs font-mono tabular-nums">{formatDuration(ms)}</div>
              </div>
            ))}
          </div>

          {/* Entry rows */}
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Date</th>
                  <th className="text-left px-4 py-2 font-medium">Task</th>
                  <th className="text-left px-4 py-2 font-medium">Project</th>
                  <th className="text-left px-4 py-2 font-medium">Description</th>
                  <th className="text-right px-4 py-2 font-medium">Duration</th>
                  <th className="text-center px-4 py-2 font-medium">Billable</th>
                </tr>
              </thead>
              <tbody>
                {timesheet.rows.map((row, i) => (
                  <tr key={i} className="border-t border-border/50">
                    <td className="px-4 py-2 text-muted-foreground">{row.date}</td>
                    <td className="px-4 py-2 truncate max-w-xs">
                      {row.issueIdentifier && <span className="text-muted-foreground mr-1">{row.issueIdentifier}</span>}
                      {row.issueTitle}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{row.projectName ?? "—"}</td>
                    <td className="px-4 py-2 text-muted-foreground truncate max-w-xs">{row.description ?? "—"}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums">{formatDuration(row.totalMs)}</td>
                    <td className="px-4 py-2 text-center">
                      {row.billable ? "✓" : "—"}
                    </td>
                  </tr>
                ))}
                {timesheet.rows.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No timesheet entries for this week</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Clock }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-xl font-bold tabular-nums">{value}</div>
    </div>
  );
}
