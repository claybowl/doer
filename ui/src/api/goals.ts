import type { Goal } from "@doerai/shared";
import { api } from "./client";

export interface GoalProgress {
  goalId: string;
  issueCount: number;
  doneCount: number;
  inProgressCount: number;
  todoCount: number;
  percentComplete: number;
  childGoalCount: number;
  childGoalsAchieved: number;
}

export const goalsApi = {
  list: (companyId: string, filters?: { level?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.level) params.set("level", filters.level);
    if (filters?.status) params.set("status", filters.status);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return api.get<Goal[]>(`/companies/${companyId}/goals${qs}`);
  },
  get: (id: string) => api.get<Goal>(`/goals/${id}`),
  getProgress: (id: string) => api.get<GoalProgress>(`/goals/${id}/progress`),
  create: (companyId: string, data: Record<string, unknown>) =>
    api.post<Goal>(`/companies/${companyId}/goals`, data),
  update: (id: string, data: Record<string, unknown>) => api.patch<Goal>(`/goals/${id}`, data),
  remove: (id: string) => api.delete<Goal>(`/goals/${id}`),
};
