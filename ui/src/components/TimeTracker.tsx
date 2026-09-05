import { useEffect, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { timeTrackingApi } from "../api/time-tracking";
import { useCompany } from "../context/CompanyContext";
import { useToast } from "../context/ToastContext";
import { cn } from "../lib/utils";
import { Button } from "@/components/ui/button";
import { Clock, Play, Square, Plus, Trash2 } from "lucide-react";

interface TimeTrackerProps {
  issueId: string;
}

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

/** Format a live ticking timer */
function formatLiveDuration(startedAt: string): string {
  const start = new Date(startedAt).getTime();
  const now = Date.now();
  return formatDuration(now - start);
}

export function TimeTracker({ issueId }: TimeTrackerProps) {
  const { selectedCompany: company } = useCompany();
  const companyId = company?.id;
  const { pushToast: toast } = useToast();
  const queryClient = useQueryClient();
  const [liveDuration, setLiveDuration] = useState<string>("");
  const [description, setDescription] = useState("");

  // Fetch time entries for this issue
  const { data: entries } = useQuery({
    queryKey: ["time-entries", companyId, issueId],
    queryFn: () => timeTrackingApi.list(companyId!, { issueId, limit: 50 }),
    enabled: !!companyId && !!issueId,
  });

  // Fetch issue time summary
  const { data: issueTime, refetch: refetchIssueTime } = useQuery({
    queryKey: ["issue-time", companyId, issueId],
    queryFn: () => timeTrackingApi.issueTime(companyId!, issueId),
    enabled: !!companyId && !!issueId,
  });

  // Find running timer for this issue (manual source only — agent timers are read-only)
  const runningEntry = entries?.find((e) => e.status === "running" && e.source === "manual");

  // Start timer mutation
  const startMutation = useMutation({
    mutationFn: (data: { issueId: string; description?: string }) =>
      timeTrackingApi.startTimer(companyId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries", companyId, issueId] });
      queryClient.invalidateQueries({ queryKey: ["issue-time", companyId, issueId] });
      queryClient.invalidateQueries({ queryKey: ["running-timers", companyId] });
      toast({ title: "Timer started" });
      setDescription("");
    },
    onError: () => toast({ title: "Failed to start timer", tone: "error" }),
  });

  // Stop timer mutation
  const stopMutation = useMutation({
    mutationFn: (entryId: string) => timeTrackingApi.stopTimer(companyId!, entryId, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries", companyId, issueId] });
      queryClient.invalidateQueries({ queryKey: ["issue-time", companyId, issueId] });
      queryClient.invalidateQueries({ queryKey: ["running-timers", companyId] });
      toast({ title: "Timer stopped" });
    },
    onError: () => toast({ title: "Failed to stop timer", tone: "error" }),
  });

  // Delete entry mutation
  const deleteMutation = useMutation({
    mutationFn: (entryId: string) => timeTrackingApi.deleteEntry(companyId!, entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries", companyId, issueId] });
      queryClient.invalidateQueries({ queryKey: ["issue-time", companyId, issueId] });
      toast({ title: "Entry deleted" });
    },
  });

  // Live ticking display for running timer
  useEffect(() => {
    if (!runningEntry) {
      setLiveDuration("");
      return;
    }
    const update = () => setLiveDuration(formatLiveDuration(runningEntry.startedAt));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [runningEntry]);

  const handleStart = useCallback(() => {
    startMutation.mutate({ issueId, description: description || undefined });
  }, [issueId, description, startMutation]);

  const handleStop = useCallback(() => {
    if (runningEntry) stopMutation.mutate(runningEntry.id);
  }, [runningEntry, stopMutation]);

  if (!companyId) return null;

  const totalMs = issueTime?.totalMs ?? 0;
  const agentMs = issueTime?.agentMs ?? 0;
  const humanMs = issueTime?.humanMs ?? 0;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Time Tracking</h3>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold tabular-nums">{formatDuration(totalMs)}</div>
          <div className="text-xs text-muted-foreground">total tracked</div>
        </div>
      </div>

      {/* Timer controls */}
      <div className="flex items-center gap-2">
        {runningEntry ? (
          <Button onClick={handleStop} variant="destructive" size="sm" disabled={stopMutation.isPending}>
            <Square className="h-3.5 w-3.5 mr-1.5" />
            Stop Timer
          </Button>
        ) : (
          <Button onClick={handleStart} size="sm" disabled={startMutation.isPending}>
            <Play className="h-3.5 w-3.5 mr-1.5" />
            Start Timer
          </Button>
        )}
        {runningEntry && (
          <div className="flex items-center gap-1.5 text-sm">
            <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="font-mono tabular-nums font-semibold">{liveDuration}</span>
          </div>
        )}
      </div>

      {/* Optional description input */}
      {!runningEntry && (
        <input
          type="text"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      )}

      {/* Breakdown */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-md bg-muted/50 p-2">
          <div className="text-muted-foreground">Agent (auto)</div>
          <div className="font-semibold tabular-nums">{formatDuration(agentMs)}</div>
        </div>
        <div className="rounded-md bg-muted/50 p-2">
          <div className="text-muted-foreground">Human (manual)</div>
          <div className="font-semibold tabular-nums">{formatDuration(humanMs)}</div>
        </div>
      </div>

      {/* Entry list */}
      {entries && entries.length > 0 && (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {entries.slice(0, 10).map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between rounded-md border border-border/50 px-2.5 py-1.5 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={cn(
                    "inline-block h-1.5 w-1.5 rounded-full shrink-0",
                    entry.status === "running" ? "bg-red-500" : "bg-green-500",
                  )}
                />
                <span className="text-muted-foreground">
                  {entry.source === "agent_auto" ? "🤖" : "👤"}
                </span>
                <span className="truncate text-muted-foreground">
                  {entry.agentName ?? entry.userId ?? "Unknown"}
                </span>
                {entry.description && (
                  <span className="truncate text-muted-foreground/70">— {entry.description}</span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono tabular-nums">
                  {entry.status === "running"
                    ? formatLiveDuration(entry.startedAt)
                    : formatDuration(entry.durationMs ?? 0)}
                </span>
                {entry.source === "manual" && entry.status === "stopped" && (
                  <button
                    onClick={() => deleteMutation.mutate(entry.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    title="Delete entry"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Agent completion note */}
      {entries?.some((e) => e.source === "agent_auto" && e.status === "stopped") && (
        <div className="text-xs text-muted-foreground italic">
          {entries
            .filter((e) => e.source === "agent_auto" && e.status === "stopped")
            .slice(-1)
            .map((e) => {
              const dur = formatDuration(e.durationMs ?? 0);
              const agentName = e.agentName ?? "Agent";
              return `Agent completed in ${dur}`;
            })}
        </div>
      )}
    </div>
  );
}
