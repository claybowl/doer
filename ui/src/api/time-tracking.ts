import { apiClient } from "./client";
import type {
  TimeEntry,
  TimeEntryInput,
  TimeEntryUpdate,
  TimeSummary,
  AgentTimeSummary,
  ProjectTimeSummary,
  Timesheet,
} from "@doerai/shared";

export const timeTrackingApi = {
  async listByIssue(companyId: string, issueId: string): Promise<TimeEntry[]> {
    return apiClient.get(
      `/api/companies/${companyId}/issues/${issueId}/time-entries`,
    );
  },

  async listByCompany(
    companyId: string,
    params?: { startDate?: string; endDate?: string; source?: string },
  ): Promise<TimeEntry[]> {
    const search = new URLSearchParams();
    if (params?.startDate) search.set("startDate", params.startDate);
    if (params?.endDate) search.set("endDate", params.endDate);
    if (params?.source) search.set("source", params.source);
    const qs = search.toString();
    return apiClient.get(
      `/api/companies/${companyId}/time-entries${qs ? `?${qs}` : ""}`,
    );
  },

  async start(companyId: string, input: TimeEntryInput): Promise<TimeEntry> {
    return apiClient.post(
      `/api/companies/${companyId}/time-entries`,
      input,
    );
  },

  async stop(companyId: string, entryId: string, update?: TimeEntryUpdate): Promise<TimeEntry> {
    return apiClient.patch(
      `/api/companies/${companyId}/time-entries/${entryId}`,
      { status: "completed", endedAt: new Date().toISOString(), ...update },
    );
  },

  async cancel(companyId: string, entryId: string): Promise<TimeEntry> {
    return apiClient.patch(
      `/api/companies/${companyId}/time-entries/${entryId}`,
      { status: "cancelled", endedAt: new Date().toISOString() },
    );
  },

  async update(companyId: string, entryId: string, update: TimeEntryUpdate): Promise<TimeEntry> {
    return apiClient.patch(
      `/api/companies/${companyId}/time-entries/${entryId}`,
      update,
    );
  },

  async delete(companyId: string, entryId: string): Promise<void> {
    return apiClient.delete(
      `/api/companies/${companyId}/time-entries/${entryId}`,
    );
  },

  async getSummary(companyId: string, issueId?: string): Promise<TimeSummary> {
    const path = issueId
      ? `/api/companies/${companyId}/issues/${issueId}/time-summary`
      : `/api/companies/${companyId}/time-summary`;
    return apiClient.get(path);
  },

  async getAgentSummaries(companyId: string): Promise<AgentTimeSummary[]> {
    return apiClient.get(
      `/api/companies/${companyId}/time-tracking/by-agent`,
    );
  },

  async getProjectSummaries(companyId: string): Promise<ProjectTimeSummary[]> {
    return apiClient.get(
      `/api/companies/${companyId}/time-tracking/by-project`,
    );
  },

  async getTimesheet(
    companyId: string,
    weekStart?: string,
  ): Promise<Timesheet> {
    const qs = weekStart ? `?weekStart=${weekStart}` : "";
    return apiClient.get(
      `/api/companies/${companyId}/timesheet${qs}`,
    );
  },
};
