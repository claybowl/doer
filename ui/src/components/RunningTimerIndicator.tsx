import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { timeTrackingApi } from "../api/time-tracking";
import { useCompany } from "../context/CompanyContext";
import { cn } from "../lib/utils";
import { Clock } from "lucide-react";

/** Format milliseconds into "2h 34m" or "34m" or "45s" */
function formatDuration(ms: number): string {
  if (ms < 1000) return "0s";
  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${secs}s`;
}

/**
 * Running timer indicator for the navigation bar.
 * Shows a pulsing dot + live duration when any manual timer is running.
 * Polls every 30 seconds for new running timers.
 */
export function RunningTimerIndicator() {
  const { company } = useCompany();
  const companyId = company?.id;
  const [liveDurations, setLiveDurations] = useState<Record<string, string>>({});

  const { data: runningTimers } = useQuery({
    queryKey: ["running-timers", companyId],
    queryFn: () => timeTrackingApi.runningTimers(companyId!),
    enabled: !!companyId,
    refetchInterval: 30_000, // refresh every 30s
  });

  // Update live durations every second
  useEffect(() => {
    if (!runningTimers || runningTimers.length === 0) {
      setLiveDurations({});
      return;
    }

    const update = () => {
      const next: Record<string, string> = {};
      for (const timer of runningTimers) {
        if (timer.source === "manual") {
          const elapsed = Date.now() - new Date(timer.startedAt).getTime();
          next[timer.id] = formatDuration(elapsed);
        }
      }
      setLiveDurations(next);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [runningTimers]);

  if (!companyId || !runningTimers || runningTimers.length === 0) return null;

  const manualTimers = runningTimers.filter((t) => t.source === "manual");
  if (manualTimers.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-red-500/10 border border-red-500/20">
      <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
      <Clock className="h-3.5 w-3.5 text-red-500" />
      <span className="text-sm font-mono tabular-nums text-red-500">
        {manualTimers.length === 1
          ? liveDurations[manualTimers[0].id] ?? "0s"
          : `${manualTimers.length} timers`}
      </span>
    </div>
  );
}
