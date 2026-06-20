import type { HomeContentResponse } from "@doerai/shared";
import { api } from "./client";

export const homeContentApi = {
  get: () => api.get<HomeContentResponse>(`/home-content`),
};
