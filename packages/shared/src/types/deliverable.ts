import type { DeliverableKind } from "../constants.js";
import type { ResolvedPortalBranding } from "./branding.js";

/**
 * A promoted, client-visible file. Distinct from issue work-products and
 * raw memfs files — deliverables have a title, a description, and a
 * visibility flag gating the client Portal.
 */
export interface Deliverable {
  id: string;
  companyId: string;
  projectId: string | null;
  issueId: string | null;
  routineRunId: string | null;
  producedByAgentId: string | null;
  producedByRunId: string | null;

  kind: DeliverableKind;
  filename: string;
  contentType: string;
  sizeBytes: number;
  checksumSha256: string;
  storagePath: string;

  title: string;
  description: string | null;
  clientVisible: boolean;

  metadata: Record<string, unknown>;

  producedAt: Date;
  promotedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * List-shape. Same as Deliverable today; reserved as a separate type so
 * future aggregated fields (e.g. share count, last-downloaded-at) can be
 * added to the list response without polluting the base.
 */
export interface DeliverableListItem extends Deliverable {}

/**
 * Payload an agent posts to promote a file to a deliverable.
 *
 * Server resolves `contentType` from `kind` via DELIVERABLE_CONTENT_TYPES.
 * Server computes `sizeBytes` and `checksumSha256` by reading `storagePath`.
 * `clientVisible` defaults false.
 *
 * At least one of `projectId` / `issueId` / `routineRunId` SHOULD be set,
 * but the API doesn't enforce — stand-alone deliverables are legal.
 */
export interface CreateDeliverablePayload {
  kind: DeliverableKind;
  filename: string;
  storagePath: string;
  title: string;
  description?: string | null;

  projectId?: string | null;
  issueId?: string | null;
  routineRunId?: string | null;

  metadata?: Record<string, unknown>;
}

/**
 * Payload the UI posts to edit title/description or flip client-visibility.
 * All fields optional; server patches only what's present.
 */
export interface UpdateDeliverablePayload {
  title?: string;
  description?: string | null;
  clientVisible?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Server response when a download is requested. v1 returns a signed URL
 * string; v1.1+ may swap to a presigned-POST object for cloud storage
 * backends.
 */
export interface DeliverableDownloadResponse {
  url: string;
  expiresAt: string; // ISO8601
}

/**
 * Query filters accepted by GET /api/companies/:id/deliverables.
 * All optional, combinable. Server treats absent filters as "no constraint."
 */
export interface DeliverableListQuery {
  projectId?: string;
  issueId?: string;
  agentId?: string;
  kind?: DeliverableKind;
  clientVisible?: boolean;
  includeDeleted?: boolean;
  limit?: number;
}

// ---------- Share tokens ----------

export interface DeliverableShareTokenScope {
  projectIds?: string[];
  issueIds?: string[];
  deliverableIds?: string[];
}

export interface DeliverableShareToken {
  id: string;
  companyId: string;
  token: string;
  label: string | null;
  scope: DeliverableShareTokenScope;
  createdByUserId: string | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  lastAccessedAt: Date | null;
  accessCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDeliverableShareTokenPayload {
  label?: string | null;
  scope: DeliverableShareTokenScope;
  expiresAt?: string | null; // ISO8601
}

export interface PortalResolveResponse {
  company: {
    id: string;
    name: string;
    branding: ResolvedPortalBranding;
  };
  deliverables: DeliverableListItem[];
  token: {
    expiresAt: string | null;
    scope: DeliverableShareTokenScope;
  };
}
