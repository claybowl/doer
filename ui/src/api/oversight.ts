import type { OversightData } from "@doerai/shared";
import { api } from "./client";

export const oversightApi = {
  get: (companyId: string) => api.get<OversightData>(`/companies/${companyId}/oversight`),
};
