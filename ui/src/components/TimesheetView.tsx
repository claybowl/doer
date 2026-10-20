import * as React from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import {
  formatDuration,
  getWeekStart,
  getWeekEnd,
  getWeekDayKeys,
  shortDayName,
  formatDateKey,
} from "@/lib/time-format";

export interface TimesheetEntryData {
  id: string;
  issueId: string;
  issueTitle: string;
  issueIdentifier: string | null;
  agentName: string | null;
  userName: string | null;
  source: string;
  billingType: string;
  description: string | null;
  startedAt: string | Date;
  endedAt: string | Date | null;
  durationMs: number | null;
}

interface TimesheetViewProps {
  entries: TimesheetEntryData[];
  weekStart?: Date;
  onWeekChange?: (weekStart: Date) => void;
}

export function TimesheetView({ entries, weekStart: controlledWeekStart, onWeekChange }: TimesheetViewProps) {
  const [internalWeekStart, setInternalWeekStart] = React.useState(getWeekStart());
  const weekStart = controlledWeekStart ?? internalWeekStart;
  const weekEnd = getWeekEnd(weekStart);

  const setWeek = (date: Date) => {
    const ws = getWeekStart(date);
    if (onWeekChange) onWeekChange(ws);
    else setInternalWeekStart(ws);
  };

  // Filter entries to this week
  const weekEntries = entries.filter((e) => {
    const start = new Date(e.startedAt);
    return start >= weekStart && start < weekEnd;
  });

  // Group by day
  const dayKeys = getWeekDayKeys(weekStart);
  const byDay: Record<string, TimesheetEntryData[]> = {};
  for (const key of dayKeys) byDay[key] = [];
  for (const entry of weekEntries) {
    const key = formatDateKey(new Date(entry.startedAt));
    if (byDay[key]) byDay[key].push(entry);
  }

  // Calculate totals
  const dayTotals: Record<string, number> = {};
  for (const key of dayKeys) {
    dayTotals[key] = byDay[key].reduce((sum, e) => sum + (e.durationMs ?? 0), 0);
  }
  const weekTotal = Object.values(dayTotals).reduce((sum, ms) => sum + ms, 0);

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            {weekStart.toLocaleDateString("en-US", { month: "long", day: "numeric" })}
            {" – "}
            {new Date(weekEnd.getTime() - 1).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </h3>
          <p className="text-sm text-muted-foreground">
            Total: <span className="font-mono font-medium tabular-nums">{formatDuration(weekTotal)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const d = new Date(weekStart);
              d.setDate(d.getDate() - 7);
              setWeek(d);
            }}
            className="rounded-md border border-border p-1.5 hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setWeek(new Date())}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
          >
            This Week
          </button>
          <button
            onClick={() => {
              const d = new Date(weekStart);
              d.setDate(d.getDate() + 7);
              setWeek(d);
            }}
            className="rounded-md border border-border p-1.5 hover:bg-muted transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Day-by-day breakdown */}
      <div className="space-y-3">
        {dayKeys.map((key) => {
          const dayEntries = byDay[key];
          const dayTotal = dayTotals[key];

          if (dayEntries.length === 0 && dayTotal === 0) {
            return (
              <div key={key} className="rounded-lg border border-border p-3 opacity-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{shortDayName(key)}</span>
                  <span className="text-xs text-muted-foreground">No entries</span>
                </div>
              </div>
            );
          }

          return (
            <div key={key} className="rounded-lg border border-border overflow-hidden">
              <div className="flex items-center justify-between bg-muted/30 px-3 py-2 border-b border-border">
                <span className="text-sm font-semibold">{shortDayName(key)}</span>
                <span className="text-sm font-mono font-medium tabular-nums">
                  {formatDuration(dayTotal)}
                </span>
              </div>
              <div className="divide-y divide-border">
                {dayEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-3 px-3 py-2">
                    <div className="shrink-0">
                      {entry.source === "agent" ? (
                        <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-600">
                          Agent
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-purple-500/10 px-2 py-0.5 text-xs text-purple-600">
                          Human
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">
                        {entry.issueIdentifier && (
                          <span className="text-muted-foreground mr-1">{entry.issueIdentifier}</span>
                        )}
                        {entry.issueTitle}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {entry.agentName ?? entry.userName ?? "Manual"}
                        {entry.description && ` · ${entry.description}`}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-mono font-medium tabular-nums">
                        {formatDuration(entry.durationMs ?? 0)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(entry.startedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {weekEntries.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
          No time entries for this week
        </div>
      )}
    </div>
  );
}
