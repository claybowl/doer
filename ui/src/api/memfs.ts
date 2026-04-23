import type {
  CreateMemfsBinding,
  CreateMemfsRoot,
  MemfsBindingDTO,
  MemfsFileEntry,
  MemfsRootDTO,
  UpdateMemfsBinding,
  UpdateMemfsRoot,
} from "@doerai/shared";
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
  getFileText: async (
    companyId: string,
    rootId: string,
    filePath: string,
  ): Promise<{ text: string; modifiedAt: string | null; byteLength: number }> => {
    const qs = new URLSearchParams({ path: filePath }).toString();
    const res = await fetch(
      `/api/companies/${companyId}/memfs/roots/${rootId}/file?${qs}`,
      { credentials: "include" },
    );
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const msg =
        (body as { error?: string } | null)?.error ?? `Request failed: ${res.status}`;
      throw new Error(msg);
    }
    const buf = await res.arrayBuffer();
    const modifiedAt = res.headers.get("X-Memfs-Modified-At");
    // Best-effort UTF-8 decode; binary files will look like mojibake but
    // won't crash the viewer. The Memory screen gates preview on size/ext.
    const text = new TextDecoder("utf-8", { fatal: false }).decode(buf);
    return { text, modifiedAt, byteLength: buf.byteLength };
  },
};
