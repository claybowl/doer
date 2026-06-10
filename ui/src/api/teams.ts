import type { TeamImportResult, TeamSummary } from "@doerai/shared";
import { api } from "./client";

export const teamsApi = {
  list: (companyId: string) =>
    api.get<TeamSummary[]>(`/companies/${companyId}/teams`),
  import: (companyId: string, teamId: string) =>
    api.post<TeamImportResult>(
      `/companies/${companyId}/teams/${encodeURIComponent(teamId)}/import`,
      {},
    ),
};
