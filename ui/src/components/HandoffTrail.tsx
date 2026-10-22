import { useQuery } from "@tanstack/react-query";
import { activityApi, type HandoffEvent } from "../api/activity";
import { cn } from "../lib/utils";
import { relativeTime } from "../lib/utils";

const EVENT_COLORS: Record<string, string> = {
  run_started: "bg-blue-500",
  run_completed: "bg-green-500",
  run_failed: "bg-red-500",
  checkout: "bg-amber-500",
  delegation: "bg-purple-500",
  comment: "bg-gray-400",
  status_change: "bg-cyan-500",
  created: "bg-emerald-500",
  artifact: "bg-indigo-500",
  update: "bg-gray-300",
  activity: "bg-gray-200",
};

const EVENT_ICONS: Record<string, string> = {
  run_started: "▶",
  run_completed: "✓",
  run_failed: "✗",
  checkout: "📋",
  delegation: "→",
  comment: "💬",
  status_change: "↻",
  created: "✚",
  artifact: "📎",
  update: "✎",
  activity: "•",
};

function formatTimestamp(ts: string): string {
  try {
    return relativeTime(ts);
  } catch {
    return ts;
  }
}

interface HandoffTrailProps {
  issueId: string;
  isActive: boolean;
}

export function HandoffTrail({ issueId, isActive }: HandoffTrailProps) {
  const { data: events, isLoading, error } = useQuery({
    queryKey: ["handoff-trail", issueId],
    queryFn: () => activityApi.handoffTrail(issueId),
    enabled: !!issueId,
    refetchInterval: isActive ? 5000 : false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        Loading trail...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8 text-red-500">
        Failed to load handoff trail.
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        No activity yet. The trail will appear as agents work on this issue.
      </div>
    );
  }

  return (
    <div className="relative pl-6">
      {/* Vertical timeline line */}
      <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-border" />

      {events.map((event, index) => {
        const isLast = index === events.length - 1;
        const color = EVENT_COLORS[event.type] || "bg-gray-300";
        const icon = EVENT_ICONS[event.type] || "•";
        const isRunEvent = event.type.startsWith("run_");

        return (
          <div key={event.id} className={cn("relative pb-4", isLast && "pb-0")}>
            {/* Timeline dot */}
            <div
              className={cn(
                "absolute left-[-14px] top-1 w-3 h-3 rounded-full border-2 border-background",
                color,
                event.type === "run_started" && "animate-pulse"
              )}
            />

            {/* Event content */}
            <div className={cn("ml-2", isRunEvent && "font-medium")}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm">{icon}</span>
                <span className="text-sm font-medium">
                  {event.agentName || "System"}
                </span>
                <span className="text-sm text-muted-foreground">
                  {event.summary.replace(event.agentName || "", "").trim() || event.summary}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {formatTimestamp(event.timestamp)}
                </span>
              </div>

              {/* Delegation arrow */}
              {event.type === "delegation" && event.delegatedToAgentName && (
                <div className="mt-1 ml-6 text-sm text-purple-600 dark:text-purple-400 flex items-center gap-1">
                  <span>→</span>
                  <span>{event.delegatedToAgentName}</span>
                </div>
              )}

              {/* Run status badge */}
              {event.runId && event.type === "run_started" && (
                <div className="mt-1 ml-6">
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      event.runStatus === "running"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                        : event.runStatus === "succeeded"
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        : event.runStatus === "failed"
                        ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                        : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    )}
                  >
                    {event.runStatus}
                  </span>
                </div>
              )}

              {/* Detail (truncated) */}
              {event.detail && event.type !== "comment" && (
                <div className="mt-1 ml-6 text-xs text-muted-foreground truncate max-w-md">
                  {event.detail}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}