/**
 * Webhook system shared types.
 * Used by server services, API routes, and UI.
 */

// ─── Event catalog ────────────────────────────────────────────────────────────

export type WebhookEventType =
	// Issue / task lifecycle
	| "task.created"
	| "task.completed"
	| "task.failed"
	| "task.blocked"
	// Agent lifecycle
	| "agent.started"
	| "agent.completed"
	| "agent.error"
	| "agent.idle"
	// Workspace membership
	| "workspace.member_joined"
	| "workspace.member_left"
	// Comments
	| "comment.created";

export const ALL_WEBHOOK_EVENT_TYPES: WebhookEventType[] = [
	"task.created",
	"task.completed",
	"task.failed",
	"task.blocked",
	"agent.started",
	"agent.completed",
	"agent.error",
	"agent.idle",
	"workspace.member_joined",
	"workspace.member_left",
	"comment.created",
];

// ─── Envelope ─────────────────────────────────────────────────────────────────

/** Outbound webhook payload envelope. */
export interface WebhookEnvelope<T = unknown> {
	/** Unique delivery ID (ULID). */
	id: string;
	/** Event type string. */
	type: WebhookEventType;
	/** Schema version for forward-compat. */
	apiVersion: "2026-04-18";
	/** ISO-8601 timestamp of when the event was created. */
	createdAt: string;
	/** Event-specific payload. */
	data: T;
}

// ─── Endpoint DTOs ────────────────────────────────────────────────────────────

export interface WebhookEndpoint {
	id: string;
	companyId: string;
	name: string;
	url: string;
	events: WebhookEventType[];
	enabled: boolean;
	/** null — secret not exposed after initial creation */
	secretHash: null;
	gracePeriodExpiresAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface WebhookEndpointCreateResult extends WebhookEndpoint {
	/** Plain-text secret shown ONCE on creation. Prefix: whsec_ */
	secret: string;
}

export interface WebhookEndpointRotateResult {
	/** New plain-text secret shown ONCE. Prefix: whsec_ */
	secret: string;
	/** When the old secret stops being accepted. */
	gracePeriodExpiresAt: Date;
}

export interface CreateWebhookEndpoint {
	name: string;
	url: string;
	events: WebhookEventType[];
}

export interface UpdateWebhookEndpoint {
	name?: string;
	url?: string;
	events?: WebhookEventType[];
	enabled?: boolean;
}

// ─── Delivery DTOs ────────────────────────────────────────────────────────────

export type WebhookDeliveryStatus = "pending" | "delivered" | "failed" | "retrying";

export interface WebhookDelivery {
	id: string;
	webhookId: string;
	eventType: WebhookEventType;
	eventId: string;
	payload: Record<string, unknown>;
	status: WebhookDeliveryStatus;
	attempts: number;
	lastAttemptAt: Date | null;
	nextRetryAt: Date | null;
	responseStatus: number | null;
	responseBody: string | null;
	createdAt: Date;
}

export interface WebhookDeliveryListItem
	extends Omit<WebhookDelivery, "payload"> {}
