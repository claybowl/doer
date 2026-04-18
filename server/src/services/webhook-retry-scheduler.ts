/**
 * WebhookRetryScheduler — manages the delivery lifecycle in the database.
 *
 * Retry schedule (4 attempts max):
 *   Attempt 1 — immediate
 *   Attempt 2 — +1 minute
 *   Attempt 3 — +5 minutes
 *   Attempt 4 — +15 minutes
 *
 * After 4 failures the delivery row is marked `failed`.
 * A 2xx on any attempt marks it `delivered` immediately.
 *
 * This service owns all DB mutations related to webhook deliveries.
 * It is called by:
 *  - WebhookEventEmitter (initial enqueue)
 *  - The background cron that processes `pending`/`retrying` rows
 */

import { and, eq, isNull, lte, or } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { webhookDeliveries, webhookEndpoints } from "@paperclipai/db";
import type { WebhookDeliveryStatus } from "@paperclipai/shared";
import { logger } from "../middleware/logger.js";
import { dispatchWebhook } from "./webhook-dispatcher.js";

/** Delay in ms before each retry attempt (index 0 = first retry after failure). */
const RETRY_DELAYS_MS = [
	1 * 60 * 1000,   // +1 min
	5 * 60 * 1000,   // +5 min
	15 * 60 * 1000,  // +15 min
];

/** Maximum delivery attempts before marking failed. */
const MAX_ATTEMPTS = 4;

// ─── Enqueue ─────────────────────────────────────────────────────────────────

export interface EnqueueDeliveryInput {
	id: string;                         // ULID
	webhookId: string;
	eventType: string;
	eventId: string;
	payload: Record<string, unknown>;
}

/**
 * Insert a new pending delivery row.
 * The background processor will pick it up on the next tick.
 */
export async function enqueueDelivery(
	db: Db,
	input: EnqueueDeliveryInput,
): Promise<void> {
	await db.insert(webhookDeliveries).values({
		id: input.id,
		webhookId: input.webhookId,
		eventType: input.eventType,
		eventId: input.eventId,
		payload: input.payload,
		status: "pending",
		attempts: 0,
	});
}

// ─── Process pending / retry queue ───────────────────────────────────────────

/**
 * Process all deliveries that are due for an attempt.
 * Called by the background cron — runs once per minute.
 */
export async function processDueDeliveries(db: Db): Promise<void> {
	const now = new Date();

	// Fetch rows that are pending or overdue for retry
	const due = await db
		.select({
			id: webhookDeliveries.id,
			webhookId: webhookDeliveries.webhookId,
			eventType: webhookDeliveries.eventType,
			payload: webhookDeliveries.payload,
			attempts: webhookDeliveries.attempts,
			url: webhookEndpoints.url,
			enabled: webhookEndpoints.enabled,
			// We need the raw secret — but it's hashed at rest.
			// Delivery uses the caller-supplied plain secret stored ephemerally.
			// For the retry path, the plain secret must be in the payload or
			// we need to look it up from a separate secret store.
			// For now we surface this as a known limitation — see comment below.
		})
		.from(webhookDeliveries)
		.innerJoin(
			webhookEndpoints,
			eq(webhookDeliveries.webhookId, webhookEndpoints.id),
		)
		.where(
			and(
				or(
					eq(webhookDeliveries.status, "pending"),
					and(
						eq(webhookDeliveries.status, "retrying"),
						lte(webhookDeliveries.nextRetryAt, now),
					),
				),
			),
		)
		.limit(100);

	for (const row of due) {
		if (!row.enabled) {
			// Endpoint was disabled — skip but don't fail
			continue;
		}

		await attemptDelivery(db, {
			id: row.id,
			webhookId: row.webhookId,
			url: row.url,
			payload: row.payload as Record<string, unknown>,
			attempts: row.attempts,
		});
	}
}

// ─── Single attempt ──────────────────────────────────────────────────────────

interface AttemptInput {
	id: string;
	webhookId: string;
	url: string;
	payload: Record<string, unknown>;
	attempts: number;
	/** Plain-text secret for signing. If not provided, signing is skipped (dev/test). */
	secret?: string;
}

/**
 * Execute one delivery attempt and update the DB row accordingly.
 */
export async function attemptDelivery(
	db: Db,
	input: AttemptInput,
): Promise<void> {
	const rawBody = JSON.stringify(input.payload);
	const newAttempts = input.attempts + 1;
	const now = new Date();

	let result;
	if (input.secret) {
		result = await dispatchWebhook(input.id, input.url, rawBody, input.secret);
	} else {
		// No secret available for signing (retry path — secret hashed at rest).
		// This path should only be hit in development. Production callers must
		// supply the secret via the secret store integration (TODO: DON-250).
		logger.warn(
			{ deliveryId: input.id },
			"webhook-retry: no plain-text secret available, dispatching unsigned",
		);
		// Dispatch unsigned (no signature headers)
		try {
			const resp = await fetch(input.url, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: rawBody,
				signal: AbortSignal.timeout(10_000),
			});
			const body = await resp.text().catch(() => "");
			result = {
				success: resp.ok,
				responseStatus: resp.status,
				responseBody: body.slice(0, 1024),
			};
		} catch (err) {
			result = {
				success: false,
				responseStatus: null,
				responseBody: err instanceof Error ? err.message : "dispatch error",
			};
		}
	}

	if (result.success) {
		await db
			.update(webhookDeliveries)
			.set({
				status: "delivered" as WebhookDeliveryStatus,
				attempts: newAttempts,
				lastAttemptAt: now,
				nextRetryAt: null,
				responseStatus: result.responseStatus,
				responseBody: result.responseBody,
			})
			.where(eq(webhookDeliveries.id, input.id));
		return;
	}

	// Failed — schedule retry or mark permanently failed
	if (newAttempts >= MAX_ATTEMPTS) {
		await db
			.update(webhookDeliveries)
			.set({
				status: "failed" as WebhookDeliveryStatus,
				attempts: newAttempts,
				lastAttemptAt: now,
				nextRetryAt: null,
				responseStatus: result.responseStatus,
				responseBody: result.responseBody,
			})
			.where(eq(webhookDeliveries.id, input.id));

		logger.warn(
			{ deliveryId: input.id, webhookId: input.webhookId },
			"webhook: delivery permanently failed after max attempts",
		);
	} else {
		const delayMs = RETRY_DELAYS_MS[newAttempts - 1] ?? RETRY_DELAYS_MS.at(-1)!;
		const nextRetryAt = new Date(now.getTime() + delayMs);

		await db
			.update(webhookDeliveries)
			.set({
				status: "retrying" as WebhookDeliveryStatus,
				attempts: newAttempts,
				lastAttemptAt: now,
				nextRetryAt,
				responseStatus: result.responseStatus,
				responseBody: result.responseBody,
			})
			.where(eq(webhookDeliveries.id, input.id));
	}
}
