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

export type AdapterMemfsCapabilityDTO = {
  supported: readonly string[];
  default: string;
};

export const memfsApi = {
  // ---- Adapter capability ----
  getAdapterCapability: (companyId: string, adapterType: string) =>
    api.get<AdapterMemfsCapabilityDTO>(
      `/companies/${companyId}/adapters/${encodeURIComponent(adapterType)}/memfs-capability`,
    ),

  // ---- Default agent memory (visible root + namespaced binding) ----
  ensureDefaultAgentBinding: (companyId: string, agentId: string) =>
    api.post<MemfsBindingDTO & { rootPath?: string }>(
      `/companies/${companyId}/agents/${agentId}/memfs/default-binding`,
      {},
    ),

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
  writeFile: (
    companyId: string,
    rootId: string,
    data: { path: string; content: string; commitMessage?: string },
  ) =>
    api.put<{ entry: MemfsFileEntry | null; commitSha: string | null }>(
      `/companies/${companyId}/memfs/roots/${rootId}/file`,
      data,
    ),

  listHistory: (
    companyId: string,
    rootId: string,
    opts?: { path?: string; limit?: number },
  ) => {
    const params = new URLSearchParams();
    if (opts?.path) params.set("path", opts.path);
    if (opts?.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return api.get<
      { sha: string; message: string; authorName: string; committedAt: string; filesChanged: number }[]
    >(`/companies/${companyId}/memfs/roots/${rootId}/history${qs ? `?${qs}` : ""}`);
  },

  getCommitDiff: async (
    companyId: string,
    rootId: string,
    sha: string,
    opts?: { path?: string },
  ): Promise<string> => {
    const params = new URLSearchParams();
    if (opts?.path) params.set("path", opts.path);
    const qs = params.toString();
    const res = await fetch(
      `/api/companies/${companyId}/memfs/roots/${rootId}/history/${sha}/diff${qs ? `?${qs}` : ""}`,
      { credentials: "include" },
    );
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(
        (body as { error?: string } | null)?.error ?? `Request failed: ${res.status}`,
      );
    }
    return res.text();
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
