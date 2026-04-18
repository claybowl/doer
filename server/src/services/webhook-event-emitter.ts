/**
 * WebhookEventEmitter — typed event catalog and envelope builder.
 *
 * This is the primary integration surface for the rest of the server.
 * Call `webhookEventEmitter.emit(db, companyId, type, data)` wherever
 * an event should fan out to registered endpoints.
 *
 * Event types:
 *   task.created / task.completed / task.failed / task.blocked
 *   agent.started / agent.completed / agent.error / agent.idle
 *   workspace.member_joined / workspace.member_left
 *   comment.created
 *
 * Envelope format:
 *   { id, type, apiVersion, createdAt, data }
 *
 * Fan-out: for each enabled endpoint that subscribes to the event type,
 * a delivery row is created in `webhook_deliveries` (via enqueueDelivery).
 * The background scheduler then processes the queue.
 */

import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { webhookEndpoints } from "@paperclipai/db";
import type {
	WebhookEventType,
	WebhookEnvelope,
} from "@paperclipai/shared";
import { logger } from "../middleware/logger.js";
import { enqueueDelivery } from "./webhook-retry-scheduler.js";

// ─── Typed event data payloads ────────────────────────────────────────────────

export interface TaskEventData {
	taskId: string;
	identifier: string | null;
	title: string;
	status: string;
	priority: string;
	assigneeAgentId: string | null;
	companyId: string;
	updatedAt: string;
}

export interface AgentEventData {
	agentId: string;
	name: string;
	role: string;
	companyId: string;
	runId?: string;
	errorMessage?: string;
}

export interface WorkspaceMemberEventData {
	companyId: string;
	userId?: string;
	agentId?: string;
	memberName: string;
}

export interface CommentEventData {
	commentId: string;
	issueId: string;
	issueIdentifier: string | null;
	authorUserId: string | null;
	authorAgentId: string | null;
	companyId: string;
	body: string;
	createdAt: string;
}

// Map from event type to its data shape
export interface WebhookEventDataMap {
	"task.created": TaskEventData;
	"task.completed": TaskEventData;
	"task.failed": TaskEventData;
	"task.blocked": TaskEventData;
	"agent.started": AgentEventData;
	"agent.completed": AgentEventData;
	"agent.error": AgentEventData;
	"agent.idle": AgentEventData;
	"workspace.member_joined": WorkspaceMemberEventData;
	"workspace.member_left": WorkspaceMemberEventData;
	"comment.created": CommentEventData;
}

// ─── ULID generation ─────────────────────────────────────────────────────────

/**
 * Generate a time-sortable ID.
 * Uses a 48-bit millisecond timestamp prefix + 80-bit random suffix,
 * encoded as a 26-character base32 string (Crockford alphabet).
 * This matches the ULID spec used by the rest of the schema.
 */
function generateUlid(): string {
	const ENCODING = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
	const now = Date.now();
	const chars: string[] = [];

	// 10 chars from 48-bit timestamp (5 bits each)
	let t = now;
	for (let i = 9; i >= 0; i--) {
		chars[i] = ENCODING[t % 32]!;
		t = Math.floor(t / 32);
	}

	// 16 chars of randomness (80 bits)
	const rand = new Uint8Array(10);
	crypto.getRandomValues(rand);
	let r = 0n;
	for (const byte of rand) r = (r << 8n) | BigInt(byte);
	for (let i = 25; i >= 10; i--) {
		chars[i] = ENCODING[Number(r % 32n)]!;
		r >>= 5n;
	}

	return chars.join("");
}

// ─── Envelope builder ────────────────────────────────────────────────────────

function buildEnvelope<T extends WebhookEventType>(
	type: T,
	data: WebhookEventDataMap[T],
): { deliveryId: string; envelope: WebhookEnvelope<WebhookEventDataMap[T]> } {
	const deliveryId = generateUlid();
	const envelope: WebhookEnvelope<WebhookEventDataMap[T]> = {
		id: deliveryId,
		type,
		apiVersion: "2026-04-18",
		createdAt: new Date().toISOString(),
		data,
	};
	return { deliveryId, envelope };
}

// ─── Fan-out ──────────────────────────────────────────────────────────────────

/**
 * Emit an event to all registered, enabled endpoints in `companyId` that
 * subscribe to `type`. Inserts delivery rows synchronously; actual HTTP
 * dispatch is handled by the background scheduler.
 *
 * Errors in fan-out are logged but do NOT throw — webhook delivery must
 * never block the main request path.
 */
async function emit<T extends WebhookEventType>(
	db: Db,
	companyId: string,
	type: T,
	data: WebhookEventDataMap[T],
): Promise<void> {
	try {
		// Find enabled endpoints that subscribe to this event type
		const endpoints = await db
			.select({
				id: webhookEndpoints.id,
				events: webhookEndpoints.events,
			})
			.from(webhookEndpoints)
			.where(
				and(
					eq(webhookEndpoints.companyId, companyId),
					eq(webhookEndpoints.enabled, true),
					// Array contains the event type
					sql`${webhookEndpoints.events} @> ARRAY[${type}]::text[]`,
				),
			);

		if (endpoints.length === 0) return;

		const { deliveryId, envelope } = buildEnvelope(type, data);
		const payload = envelope as unknown as Record<string, unknown>;

		// Deterministic eventId for deduplication: type + source ID
		const dataRecord = data as unknown as Record<string, unknown>;
		const sourceId =
			(dataRecord["taskId"] as string | undefined) ??
			(dataRecord["agentId"] as string | undefined) ??
			(dataRecord["commentId"] as string | undefined) ??
			randomUUID();
		const eventId = `${type}:${sourceId}:${envelope.createdAt}`;

		for (const endpoint of endpoints) {
			try {
				await enqueueDelivery(db, {
					id: generateUlid(),     // each endpoint gets its own delivery row
					webhookId: endpoint.id,
					eventType: type,
					eventId,
					payload,
				});
			} catch (err) {
				logger.error(
					{ err, webhookId: endpoint.id, eventType: type },
					"webhook-emitter: failed to enqueue delivery",
				);
			}
		}

		logger.debug(
			{ eventType: type, companyId, endpointCount: endpoints.length, deliveryId },
			"webhook-emitter: event enqueued",
		);
	} catch (err) {
		logger.error(
			{ err, eventType: type, companyId },
			"webhook-emitter: fan-out error (non-fatal)",
		);
	}
}

// ─── Convenience helpers ──────────────────────────────────────────────────────

export const webhookEventEmitter = {
	emit,

	/** Shorthand for task lifecycle events. */
	emitTask: (
		db: Db,
		companyId: string,
		status: "created" | "completed" | "failed" | "blocked",
		data: TaskEventData,
	) => emit(db, companyId, `task.${status}` as WebhookEventType, data as never),

	/** Shorthand for agent lifecycle events. */
	emitAgent: (
		db: Db,
		companyId: string,
		status: "started" | "completed" | "error" | "idle",
		data: AgentEventData,
	) => emit(db, companyId, `agent.${status}` as WebhookEventType, data as never),
} as const;
