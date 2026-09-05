/**
 * Time tracking types for Doer — agent auto-timer and human manual timer.
 */

/** Source of a time entry: automatically tracked for agents, or manually started by humans */
export type TimeEntrySource = "agent_auto" | "manual";

/** Status of a time entry: running (timer active) or stopped (timer ended) */
export type TimeEntryStatus = "running" | "stopped";

/** A single time entry record tracking duration of work on an issue */
export interface TimeEntry {
  id: string;
  companyId: string;
  issueId: string;
  agentId: string | null;
  projectId: string | null;
  heartbeatRunId: string | null;
  source: TimeEntrySource;
  userId: string | null;
  status: TimeEntryStatus;
  startedAt: string; // ISO 8601
  stoppedAt: string | null; // ISO 8601
  durationMs: number | null;
  description: string | null;
  billable: boolean;
  billingCode: string | null;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/** Time entry with joined issue/agent/project info for display */
export interface TimeEntryWithRelations extends TimeEntry {
  issueTitle: string | null;
  issueIdentifier: string | null;
  issueStatus: string | null;
  agentName: string | null;
  agentRole: string | null;
  projectName: string | null;
}

/** Summary of time tracked for a given scope */
export interface TimeSummary {
  companyId: string;
  totalMs: number;
  agentMs: number;
  humanMs: number;
  billableMs: number;
  nonBillableMs: number;
  entryCount: number;
  /** Only entries with status='running' */
  runningCount: number;
}

/** Time aggregated by agent */
export interface TimeByAgent {
  agentId: string;
  agentName: string | null;
  agentRole: string | null;
  totalMs: number;
  entryCount: number;
  taskCount: number;
  billableMs: number;
  /** Average duration per task in ms */
  avgPerTaskMs: number;
}

/** Time aggregated by project */
export interface TimeByProject {
  projectId: string | null;
  projectName: string | null;
  totalMs: number;
  entryCount: number;
  taskCount: number;
  billableMs: number;
}

/** Time aggregated by issue (task) */
export interface TimeByIssue {
  issueId: string;
  issueTitle: string;
  issueIdentifier: string | null;
  issueStatus: string;
  totalMs: number;
  entryCount: number;
  agentMs: number;
  humanMs: number;
  estimatedMinutes: number | null;
  /** Difference: actualMs - estimatedMs (positive = over estimate) */
  varianceMs: number | null;
}

/** Weekly timesheet row for human time entries */
export interface TimesheetRow {
  userId: string;
  issueId: string;
  issueTitle: string;
  issueIdentifier: string | null;
  projectName: string | null;
  /** ISO date string for the day (YYYY-MM-DD) */
  date: string;
  totalMs: number;
  entryCount: number;
  billable: boolean;
  description: string | null;
}

/** Weekly timesheet summary */
export interface WeeklyTimesheet {
  userId: string;
  weekStart: string; // ISO date (Monday)
  weekEnd: string; // ISO date (Sunday)
  totalMs: number;
  billableMs: number;
  rows: TimesheetRow[];
  /** Daily totals: { "2026-01-15": 7200000, ... } */
  dailyTotals: Record<string, number>;
}
