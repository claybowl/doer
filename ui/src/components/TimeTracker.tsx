import * as React from "react";
import { Play, Square, Clock, Timer as TimerIcon } from "lucide-react";

// ─── TimerButton ──────────────────────────────────────────────────────────────
// Start/stop button for manual time tracking on a task.

interface TimerButtonProps {
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
}

export function TimerButton({ isRunning, onStart, onStop, disabled }: TimerButtonProps) {
  if (isRunning) {
    return (
      <button
        onClick={onStop}
        disabled={disabled}
        className="inline-flex items-center gap-2 rounded-md bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-500/20 transition-colors disabled:opacity-50"
      >
        <Square className="h-3.5 w-3.5" />
        Stop Timer
      </button>
    );
  }
  return (
    <button
      onClick={onStart}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
    >
      <Play className="h-3.5 w-3.5" />
      Start Timer
    </button>
  );
}

// ─── RunningTimerDisplay ──────────────────────────────────────────────────────
// Shows a live-updating timer in the nav bar or task detail.

interface RunningTimerDisplayProps {
  startedAt: Date | string;
  label?: string;
}

export function RunningTimerDisplay({ startedAt, label }: RunningTimerDisplayProps) {
  const [, setTick] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const start = typeof startedAt === "string" ? new Date(startedAt) : startedAt;
  const elapsed = Date.now() - start.getTime();
  const totalSeconds = Math.floor(elapsed / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const timeStr = hours > 0
    ? `${hours}h ${minutes}m`
    : minutes > 0
      ? `${minutes}m ${seconds}s`
      : `${seconds}s`;

  return (
    <div className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/30 px-2.5 py-1 text-xs">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
      </span>
      <TimerIcon className="h-3.5 w-3.5 text-muted-foreground" />
      {label && <span className="text-muted-foreground truncate max-w-[120px]">{label}</span>}
      <span className="font-mono font-medium tabular-nums">{timeStr}</span>
    </div>
  );
}

// ─── TimeEntryList ────────────────────────────────────────────────────────────
// Displays a list of time entries for a task.

interface TimeEntryListProps {
  entries: Array<{
    id: string;
    source: string;
    status: string;
    description: string | null;
    startedAt: string | Date;
    endedAt: string | Date | null;
    durationMs: number | null;
    agentName?: string | null;
    userName?: string | null;
  }>;
}

export function TimeEntryList({ entries }: TimeEntryListProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
        No time entries yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const isRunning = entry.status === "running";
        const duration = entry.durationMs
          ? formatDuration(entry.durationMs)
          : isRunning
            ? "Running..."
            : "—";

        return (
          <div
            key={entry.id}
            className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5"
          >
            <div className="shrink-0">
              {entry.source === "agent" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-600">
                  Agent
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2 py-0.5 text-xs text-purple-600">
                  Human
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              {entry.description && (
                <div className="text-sm truncate">{entry.description}</div>
              )}
              <div className="text-xs text-muted-foreground">
                {entry.agentName && `Agent: ${entry.agentName}`}
                {entry.userName && `User: ${entry.userName}`}
                {!entry.agentName && !entry.userName && "Manual entry"}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className={`text-sm font-mono font-medium tabular-nums ${isRunning ? "text-green-600" : ""}`}>
                {duration}
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(entry.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── TimeSummaryCard ──────────────────────────────────────────────────────────
// Shows total time tracked for a task, agent, or project.

interface TimeSummaryCardProps {
  totalMs: number;
  label?: string;
  estimatedMs?: number | null;
  entryCount?: number;
}

export function TimeSummaryCard({ totalMs, label = "Total time", estimatedMs, entryCount }: TimeSummaryCardProps) {
  const overBudget = estimatedMs != null && totalMs > estimatedMs;

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex items-center gap-2 mb-1">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="text-2xl font-bold font-mono tabular-nums">
        {formatDuration(totalMs)}
      </div>
      {estimatedMs != null && (
        <div className="mt-1 text-xs">
          <span className={overBudget ? "text-red-500" : "text-muted-foreground"}>
            Est: {formatDuration(estimatedMs)}
          </span>
          {overBudget && (
            <span className="ml-2 text-red-500">
              ({formatDuration(totalMs - estimatedMs)} over)
            </span>
          )}
        </div>
      )}
      {entryCount != null && (
        <div className="mt-0.5 text-xs text-muted-foreground">
          {entryCount} {entryCount === 1 ? "entry" : "entries"}
        </div>
      )}
    </div>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  if (minutes > 0) return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  return `${seconds}s`;
}
