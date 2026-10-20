/**
 * Format milliseconds into a human-readable duration string.
 * Examples: "47s", "2h 34m", "5m 12s", "1h 5m"
 */
export function formatDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }
  return `${seconds}s`;
}

/**
 * Format milliseconds into a compact duration (always shows most significant unit).
 * Examples: "47s", "2h", "5m", "1h"
 */
export function formatDurationCompact(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

/**
 * Format a live timer that's still running.
 * Returns the elapsed time since the given start date.
 */
export function formatLiveTimer(startedAt: Date | string): string {
  const start = typeof startedAt === "string" ? new Date(startedAt) : startedAt;
  const elapsed = Date.now() - start.getTime();
  return formatDuration(elapsed);
}

/**
 * Get the start of the week (Monday) for a given date.
 */
export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust for Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the end of the week (Sunday) for a given date.
 */
export function getWeekEnd(date: Date = new Date()): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return end;
}

/**
 * Format a date as YYYY-MM-DD.
 */
export function formatDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Get an array of 7 date keys for the week starting at weekStart.
 */
export function getWeekDayKeys(weekStart: Date): string[] {
  const keys: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    keys.push(formatDateKey(d));
  }
  return keys;
}

/**
 * Format a date key as a short day name (Mon, Tue, etc.)
 */
export function shortDayName(dateKey: string): string {
  const d = new Date(dateKey + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short" });
}
