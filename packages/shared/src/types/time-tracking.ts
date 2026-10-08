import type { TimeEntrySource, TimeEntryStatus, TimeBillingType } from "../constants.js";

export interface TimeEntry {
  id: string;
  companyId: string;
  issueId: string;
  agentId: string | null;
  userId: string | null;
  source: TimeEntrySource;
  status: TimeEntryStatus;
  billingType: TimeBillingType;
  description: string | null;
  startedAt: Date;
  endedAt: Date | null;
  durationMs: number | null;
  estimatedMs: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeEntryInput {
  issueId: string;
  agentId?: string | null;
  userId?: string | null;
  source: TimeEntrySource;
  billingType?: TimeBillingType;
  description?: string | null;
  estimatedMs?: number | null;
}

export interface TimeEntryUpdate {
  status?: TimeEntryStatus;
  billingType?: TimeBillingType;
  description?: string | null;
  endedAt?: Date | null;
  estimatedMs?: number | null;
}

export interface TimeSummary {
  totalMs: number;
  billableMs: number;
  nonBillableMs: number;
  entryCount: number;
  bySource: {
    agent: number;
    human: number;
  };
}

export interface AgentTimeSummary {
  agentId: string;
  agentName: string;
  totalMs: number;
  taskCount: number;
  thisWeekMs: number;
}

export interface ProjectTimeSummary {
  projectId: string;
  projectName: string;
  totalMs: number;
  billableMs: number;
  entryCount: number;
}

export interface TimesheetEntry {
  id: string;
  issueId: string;
  issueTitle: string;
  issueIdentifier: string | null;
  agentName: string | null;
  userName: string | null;
  source: TimeEntrySource;
  billingType: TimeBillingType;
  description: string | null;
  startedAt: Date;
  endedAt: Date | null;
  durationMs: number | null;
}

export interface Timesheet {
  weekStart: Date;
  weekEnd: Date;
  entries: TimesheetEntry[];
  totalMs: number;
  byDay: Record<string, number>; // YYYY-MM-DD -> ms
}
