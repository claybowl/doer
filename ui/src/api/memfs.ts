import type {
  CreateMemfsBinding,
  CreateMemfsRoot,
  MemfsBindingDTO,
  MemfsFileEntry,
  MemfsRootDTO,
  UpdateMemfsBinding,
  UpdateMemfsRoot,
} from "@paperclipai/shared";
import { api } from "./client";

export const memfsApi = {
  // ---- Roots ----
  listRoots: (companyId: string) =>
    api.get<MemfsRootDTO[]>(`/companies/${companyId}/memfs/roots`),
  getRoot: (companyId: string, rootId: string) =>
    api.get<MemfsRootDTO>(`/companies/${companyId}/memfs/roots/${rootId}`),
  createRoot: (companyId: string, data: CreateMemfsRoot) =>
    api.post<MemfsRootDTO>(`/companies/${companyId}/memfs/roots`, data),
  updateRoot: (companyId: string, rootId: string, data: UpdateMemfsRoot) =>
    api.patch<MemfsRootDTO>(`/companies/${companyId}/memfs/roots/${rootId}`, data),
  removeRoot: (companyId: string, rootId: string) =>
    api.delete<void>(`/companies/${companyId}/memfs/roots/${rootId}`),

  // ---- Bindings ----
  listBindingsForCompany: (companyId: string) =>
    api.get<MemfsBindingDTO[]>(`/companies/${companyId}/memfs/bindings`),
  listBindingsForAgent: (companyId: string, agentId: string) =>
    api.get<MemfsBindingDTO[]>(
      `/companies/${companyId}/agents/${agentId}/memfs/bindings`,
    ),
  getBinding: (companyId: string, bindingId: string) =>
    api.get<MemfsBindingDTO>(
      `/companies/${companyId}/memfs/bindings/${bindingId}`,
    ),
  createBinding: (companyId: string, data: CreateMemfsBinding) =>
    api.post<MemfsBindingDTO>(`/companies/${companyId}/memfs/bindings`, data),
  updateBinding: (
    companyId: string,
    bindingId: string,
    data: UpdateMemfsBinding,
  ) =>
    api.patch<MemfsBindingDTO>(
      `/companies/${companyId}/memfs/bindings/${bindingId}`,
      data,
    ),
  removeBinding: (companyId: string, bindingId: string) =>
    api.delete<void>(`/companies/${companyId}/memfs/bindings/${bindingId}`),

  // ---- Files (read-only) ----
  listFiles: (
    companyId: string,
    rootId: string,
    opts?: { prefix?: string; recursive?: boolean },
  ) => {
    const params = new URLSearchParams();
    if (opts?.prefix) params.set("prefix", opts.prefix);
    if (opts?.recursive) params.set("recursive", "true");
    const qs = params.toString();
    return api.get<MemfsFileEntry[]>(
      `/companies/${companyId}/memfs/roots/${rootId}/files${qs ? `?${qs}` : ""}`,
    );
  },
};
