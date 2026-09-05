import type {
  TimeEntry,
  TimeEntryWithRelations,
  TimeSummary,
  TimeByAgent,
  TimeByProject,
  TimeByIssue,
  WeeklyTimesheet,
} from "@doerai/shared";
import { api } from "./client";

function dateParams(from?: string, to?: string): string {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const timeTrackingApi = {
  // ─── Timer actions ────────────────────────────────────────────────
  startTimer: (companyId: string, data: { issueId: string; description?: string; billable?: boolean; billingCode?: string | null }) =>
    api.post<TimeEntry>(`/companies/${companyId}/time-entries/start`, data),

  stopTimer: (companyId: string, entryId: string, data?: { description?: string }) =>
    api.post<TimeEntry>(`/companies/${companyId}/time-entries/${entryId}/stop`, data ?? {}),

  // ─── CRUD ──────────────────────────────────────────────────────────
  list: (companyId: string, params?: {
    issueId?: string;
    agentId?: string;
    projectId?: string;
    source?: string;
    status?: string;
    billable?: boolean;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) qs.set(key, String(value));
      });
    }
    const query = qs.toString();
    return api.get<TimeEntryWithRelations[]>(`/companies/${companyId}/time-entries${query ? `?${query}` : ""}`);
  },

  getEntry: (companyId: string, entryId: string) =>
    api.get<TimeEntry>(`/companies/${companyId}/time-entries/${entryId}`),

  updateEntry: (companyId: string, entryId: string, data: { description?: string | null; billable?: boolean; billingCode?: string | null; durationMs?: number }) =>
    api.patch<TimeEntry>(`/companies/${companyId}/time-entries/${entryId}`, data),

  deleteEntry: (companyId: string, entryId: string) =>
    api.delete<void>(`/companies/${companyId}/time-entries/${entryId}`),

  // ─── Reporting ────────────────────────────────────────────────────
  summary: (companyId: string, from?: string, to?: string) =>
    api.get<TimeSummary>(`/companies/${companyId}/time-tracking/summary${dateParams(from, to)}`),

  byAgent: (companyId: string, from?: string, to?: string) =>
    api.get<TimeByAgent[]>(`/companies/${companyId}/time-tracking/by-agent${dateParams(from, to)}`),

  byProject: (companyId: string, from?: string, to?: string) =>
    api.get<TimeByProject[]>(`/companies/${companyId}/time-tracking/by-project${dateParams(from, to)}`),

  byIssue: (companyId: string, from?: string, to?: string) =>
    api.get<TimeByIssue[]>(`/companies/${companyId}/time-tracking/by-issue${dateParams(from, to)}`),

  // ─── Timesheet ────────────────────────────────────────────────────
  weeklyTimesheet: (companyId: string, userId?: string, weekStart?: string) => {
    const qs = new URLSearchParams();
    if (userId) qs.set("userId", userId);
    if (weekStart) qs.set("weekStart", weekStart);
    const query = qs.toString();
    return api.get<WeeklyTimesheet>(`/companies/${companyId}/time-tracking/timesheet${query ? `?${query}` : ""}`);
  },

  // ─── Issue time ───────────────────────────────────────────────────
  issueTime: (companyId: string, issueId: string) =>
    api.get<{ totalMs: number; agentMs: number; humanMs: number; entryCount: number; runningCount: number }>(
      `/companies/${companyId}/issues/${issueId}/time`
    ),

  // ─── Running timers ───────────────────────────────────────────────
  runningTimers: (companyId: string) =>
    api.get<Array<{
      id: string;
      issueId: string;
      issueTitle: string | null;
      issueIdentifier: string | null;
      startedAt: string;
      source: string;
      userId: string | null;
      agentId: string | null;
      agentName: string | null;
    }>>(`/companies/${companyId}/time-tracking/running`),
};
