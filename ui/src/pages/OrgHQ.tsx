import { useEffect } from "react";
import { Link } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "../api/dashboard";
import { activityApi } from "../api/activity";
import { goalsApi } from "../api/goals";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import {
  Building2,
  Zap,
  Clock,
  Users,
  ArrowRight,
  Target,
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Loader2,
} from "lucide-react";
import { cn } from "../lib/utils";
import { GoalTree } from "../components/GoalTree";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    "issue.created": "created issue",
    "issue.updated": "updated issue",
    "issue.status_changed": "moved issue",
    "goal.created": "created goal",
    "goal.updated": "updated goal",
    "agent.hired": "hired agent",
    "agent.terminated": "terminated agent",
    "run.started": "started run",
    "run.completed": "completed run",
  };
  return map[action] ?? action;
}

export function OrgHQ() {
  const { selectedCompanyId, selectedCompany } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    setBreadcrumbs([{ label: "HQ" }]);
  }, [setBreadcrumbs]);

  const { data: summary } = useQuery({
    queryKey: ["dashboard", "summary", selectedCompanyId],
    queryFn: () => dashboardApi.summary(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: 30_000,
  });

  const { data: activity } = useQuery({
    queryKey: ["activity", selectedCompanyId, "hq"],
    queryFn: () => activityApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: 30_000,
  });

  const { data: activeGoals } = useQuery({
    queryKey: queryKeys.goals.list(selectedCompanyId!, { status: "active" }),
    queryFn: () => goalsApi.list(selectedCompanyId!, { status: "active" }),
    enabled: !!selectedCompanyId,
    refetchInterval: 60_000,
  });

  const recentActivity = (activity ?? []).slice(0, 12);

  const agentRunning = summary?.agents.running ?? 0;
  const agentError = summary?.agents.error ?? 0;
  const tasksInProgress = summary?.tasks.inProgress ?? 0;
  const tasksOpen = summary?.tasks.open ?? 0;
  const tasksDone = summary?.tasks.done ?? 0;
  const taskBlocked = summary?.tasks.blocked ?? 0;

  // Fleet state: error > warning > running > idle
  const fleetState: "error" | "warning" | "running" | "idle" =
    agentError > 0 ? "error" :
    taskBlocked > 0 ? "warning" :
    agentRunning > 0 ? "running" : "idle";

  const fleetConfig = {
    error: { label: "Fleet needs attention", color: "text-red-400", bg: "bg-red-950/40 border-red-800/60", icon: AlertTriangle },
    warning: { label: "Some tasks blocked", color: "text-yellow-400", bg: "bg-yellow-950/40 border-yellow-800/60", icon: AlertTriangle },
    running: { label: "Fleet running", color: "text-emerald-400", bg: "bg-emerald-950/40 border-emerald-800/60", icon: Loader2 },
    idle: { label: "Fleet idle", color: "text-muted-foreground", bg: "bg-muted/20 border-border", icon: CheckCircle2 },
  }[fleetState];

  const FleetIcon = fleetConfig.icon;

  return (
    <div className="flex flex-col min-h-0 h-full overflow-y-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4 shrink-0 border-b border-border">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-foreground">
            {selectedCompany?.name ?? "HQ"}
          </h1>
          {/* Fleet state indicator */}
          <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium", fleetConfig.bg, fleetConfig.color)}>
            <FleetIcon className={cn("h-3 w-3", fleetState === "running" && "animate-spin")} />
            {fleetConfig.label}
          </div>
        </div>
        <Link
          to="/agents/new"
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold transition-colors"
        >
          + New Agent
        </Link>
      </div>

      <div className="flex flex-1 min-h-0 gap-6 px-8 py-6">
        {/* Main column */}
        <div className="flex flex-col flex-1 min-w-0 gap-6">

          {/* Stats bar — real data */}
          <div className="grid grid-cols-4 gap-4">
            <StatBlock
              label="RUNNING"
              value={String(agentRunning)}
              sub={`${summary?.agents.active ?? 0} active agents`}
              valueClassName="text-emerald-400"
            />
            <StatBlock
              label="IN PROGRESS"
              value={String(tasksInProgress)}
              sub={`${tasksOpen} open total`}
            />
            <StatBlock
              label="DONE"
              value={String(tasksDone)}
              sub="issues completed"
              valueClassName="text-emerald-400"
            />
            <StatBlock
              label="BLOCKED"
              value={String(taskBlocked)}
              sub={agentError > 0 ? `${agentError} agents in error` : "needs attention"}
              valueClassName={taskBlocked > 0 || agentError > 0 ? "text-yellow-400" : "text-foreground"}
            />
          </div>

          {/* Active Goals */}
          {activeGoals && activeGoals.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5" />
                  Active Goals
                </h3>
                <Link to="/goals" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  View all →
                </Link>
              </div>
              <GoalTree goals={activeGoals} goalLink={(g) => `/goals/${g.id}`} />
            </div>
          )}

          {/* Recent Activity */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
                <CircleDot className="h-3.5 w-3.5" />
                Recent Activity
              </h3>
              <Link to="/activity" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                View all →
              </Link>
            </div>

            {recentActivity.length === 0 ? (
              <p className="text-xs text-muted-foreground">No activity yet.</p>
            ) : (
              <div className="border border-border rounded-lg divide-y divide-border">
                {recentActivity.map((event) => (
                  <div key={event.id} className="flex items-center gap-3 px-3 py-2 text-xs">
                    <span className="text-muted-foreground shrink-0 w-24 truncate">
                      {timeAgo(typeof event.createdAt === "string" ? event.createdAt : new Date(event.createdAt).toISOString())}
                    </span>
                    <span className="text-muted-foreground shrink-0">{actionLabel(event.action)}</span>
                    {event.details && typeof event.details === "object" && "title" in event.details && (
                      <span className="flex-1 truncate text-foreground">
                        {String((event.details as Record<string, unknown>).title ?? "")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="flex flex-col gap-4 w-64 shrink-0">
          {/* Quick Actions */}
          <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
            <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Quick Actions
            </h4>
            <div className="flex flex-col gap-1">
              <QuickAction icon={<Building2 className="h-4 w-4" />} label="New Agent" to="/agents/new" />
              <QuickAction icon={<Zap className="h-4 w-4" />} label="New Routine" to="/routines" />
              <QuickAction icon={<Target className="h-4 w-4" />} label="Goals" to="/goals" />
              <QuickAction icon={<Clock className="h-4 w-4" />} label="Activity" to="/activity" />
              <QuickAction icon={<Users className="h-4 w-4" />} label="Org Chart" to="/org" />
            </div>
          </div>

          {/* Fleet health detail */}
          <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
            <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Fleet Health
            </h4>
            <div className="flex flex-col gap-2 text-xs">
              <HealthRow label="Running" value={agentRunning} valueClass="text-emerald-400" />
              <HealthRow label="Active" value={summary?.agents.active ?? 0} />
              <HealthRow label="Paused" value={summary?.agents.paused ?? 0} />
              {agentError > 0 && (
                <HealthRow label="Error" value={agentError} valueClass="text-red-400" />
              )}
            </div>

            <div className="border-t border-border pt-3 flex flex-col gap-2 text-xs">
              <HealthRow label="In Progress" value={tasksInProgress} valueClass="text-emerald-400" />
              <HealthRow label="Open" value={tasksOpen} />
              {taskBlocked > 0 && (
                <HealthRow label="Blocked" value={taskBlocked} valueClass="text-yellow-400" />
              )}
              {summary?.pendingApprovals != null && summary.pendingApprovals > 0 && (
                <HealthRow label="Approvals" value={summary.pendingApprovals} valueClass="text-yellow-400" link="/approvals" />
              )}
            </div>

            {summary?.costs && (
              <div className="border-t border-border pt-3 flex flex-col gap-1.5 text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Month spend</span>
                  <span className="font-medium text-foreground">
                    ${((summary.costs.monthSpendCents ?? 0) / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function HealthRow({ label, value, valueClass, link }: { label: string; value: number; valueClass?: string; link?: string }) {
  const val = (
    <span className={cn("font-medium tabular-nums", valueClass ?? "text-foreground")}>{value}</span>
  );
  return (
    <div className="flex items-center justify-between text-muted-foreground">
      <span>{label}</span>
      {link ? <Link to={link} className="hover:underline">{val}</Link> : val}
    </div>
  );
}

function StatBlock({
  label,
  value,
  sub,
  valueClassName = "text-foreground",
}: {
  label: string;
  value: string;
  sub: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-1">
      <span className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
        {label}
      </span>
      <span className={cn("text-3xl font-bold", valueClassName)}>{value}</span>
      <span className="text-xs text-muted-foreground">{sub}</span>
    </div>
  );
}

function QuickAction({ icon, label, to }: { icon: React.ReactNode; label: string; to: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-accent/50 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      {icon}
      {label}
    </Link>
  );
}
