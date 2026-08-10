import type {
  Deliverable,
  DeliverableListQuery,
  UpdateDeliverablePayload,
  DeliverableShareToken,
  CreateDeliverableShareTokenPayload,
  PortalResolveResponse,
} from "@doerai/shared";
import { api } from "./client";

/**
 * Client helpers for the deliverables surface. Mirrors the server routes
 * in server/src/routes/deliverables.ts. All endpoints under /api/*.
 *
 * Uploads are NOT here — the Fernweh UI doesn't post multipart file bytes
 * in v1 (agents do that via the skill). This module covers the read /
 * mutate / share-token surface the UI needs.
 */

function toQueryString(q: DeliverableListQuery): string {
  const parts: string[] = [];
  if (q.projectId) parts.push(`projectId=${encodeURIComponent(q.projectId)}`);
  if (q.issueId) parts.push(`issueId=${encodeURIComponent(q.issueId)}`);
  if (q.agentId) parts.push(`agentId=${encodeURIComponent(q.agentId)}`);
  if (q.kind) parts.push(`kind=${encodeURIComponent(q.kind)}`);
  if (q.clientVisible !== undefined) {
    parts.push(`clientVisible=${q.clientVisible ? "true" : "false"}`);
  }
  if (q.includeDeleted) parts.push(`includeDeleted=true`);
  if (q.limit !== undefined) parts.push(`limit=${q.limit}`);
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

export const deliverablesApi = {
  list: (companyId: string, query: DeliverableListQuery = {}) =>
    api.get<Deliverable[]>(
      `/companies/${companyId}/deliverables${toQueryString(query)}`,
    ),
  get: (id: string) => api.get<Deliverable>(`/deliverables/${id}`),
  update: (id: string, data: UpdateDeliverablePayload) =>
    api.patch<Deliverable>(`/deliverables/${id}`, data),
  remove: (id: string) => api.delete<Deliverable>(`/deliverables/${id}`),
  restore: (id: string) => api.post<Deliverable>(`/deliverables/${id}/restore`, {}),

  /**
   * Build the download URL. The server redirects to / streams the file
   * back with Content-Disposition=attachment. We return a URL string
   * rather than triggering the download here so callers can use it in
   * `<a href>` or `window.open()` as they prefer.
   */
  downloadUrl: (id: string) => `/api/deliverables/${id}/download`,

  /**
   * Same bytes as downloadUrl but served with Content-Disposition: inline,
   * so <iframe>/<img> previews can render instead of forcing a download.
   */
  previewUrl: (id: string) => `/api/deliverables/${id}/download?inline=true`,
};

export const shareTokensApi = {
  list: (companyId: string) =>
    api.get<DeliverableShareToken[]>(`/companies/${companyId}/share-tokens`),
  create: (companyId: string, data: CreateDeliverableShareTokenPayload) =>
    api.post<DeliverableShareToken>(
      `/companies/${companyId}/share-tokens`,
      data,
    ),
  revoke: (id: string) =>
    api.post<DeliverableShareToken>(`/share-tokens/${id}/revoke`, {}),
};

/**
 * The client Portal endpoint is token-gated and unauthenticated. Fernweh
 * doesn't hit it directly (Fernweh renders as the owner, not the
 * visitor), but we expose a client here so a preview / "open as client"
 * flow can fetch against a real token.
 */
export const portalApi = {
  resolve: (token: string) =>
    api.get<PortalResolveResponse>(`/portal/${token}`),
  /**
   * Build a portal URL a user can copy/paste. Includes origin so the
   * result is shareable outside Doer.
   */
  portalUrl: (token: string) =>
    typeof window !== "undefined"
      ? `${window.location.origin}/portal/${token}`
      : `/portal/${token}`,
};
