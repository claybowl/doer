import { and, desc, eq, lt } from "drizzle-orm";
import type { Db } from "@doerai/db";
import { webhookDeliveries, webhookEndpoints } from "@doerai/db";
import type {
	CreateWebhookEndpoint,
	UpdateWebhookEndpoint,
	WebhookDelivery,
	WebhookEndpoint,
	WebhookEndpointCreateResult,
	WebhookEndpointRotateResult,
} from "@doerai/shared";
import {
	generateWebhookSecret,
	hashSecret,
	SECRET_GRACE_PERIOD_MS,
} from "./webhook-signer.js";
import { randomUUID } from "node:crypto";

function toEndpointDto(row: typeof webhookEndpoints.$inferSelect): WebhookEndpoint {
	return {
		id: row.id,
		companyId: row.companyId,
		name: row.name,
		url: row.url,
		events: row.events as WebhookEndpoint["events"],
		enabled: row.enabled,
		secretHash: null,
		gracePeriodExpiresAt: row.gracePeriodExpiresAt,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function toDeliveryDto(row: typeof webhookDeliveries.$inferSelect): WebhookDelivery {
	return {
		id: row.id,
		webhookId: row.webhookId,
		eventType: row.eventType as WebhookDelivery["eventType"],
		eventId: row.eventId,
		payload: row.payload,
		status: row.status as WebhookDelivery["status"],
		attempts: row.attempts,
		lastAttemptAt: row.lastAttemptAt,
		nextRetryAt: row.nextRetryAt,
		responseStatus: row.responseStatus,
		responseBody: row.responseBody,
		createdAt: row.createdAt,
	};
}

export function webhookService(db: Db) {
	async function listEndpoints(companyId: string): Promise<WebhookEndpoint[]> {
		const rows = await db
			.select()
			.from(webhookEndpoints)
			.where(eq(webhookEndpoints.companyId, companyId))
			.orderBy(desc(webhookEndpoints.createdAt));
		return rows.map(toEndpointDto);
	}

	async function getEndpoint(id: string): Promise<WebhookEndpoint | null> {
		const [row] = await db
			.select()
			.from(webhookEndpoints)
			.where(eq(webhookEndpoints.id, id));
		return row ? toEndpointDto(row) : null;
	}

	async function createEndpoint(
		companyId: string,
		input: CreateWebhookEndpoint,
	): Promise<WebhookEndpointCreateResult> {
		const { secret, hash, salt } = generateWebhookSecret();
		const id = randomUUID();

		const [row] = await db
			.insert(webhookEndpoints)
			.values({
				id,
				companyId,
				name: input.name,
				url: input.url,
				events: input.events,
				secretHash: hash,
				secretSalt: salt,
				enabled: true,
			})
			.returning();

		return { ...toEndpointDto(row), secret };
	}

	async function updateEndpoint(
		id: string,
		input: UpdateWebhookEndpoint,
	): Promise<WebhookEndpoint | null> {
		const [row] = await db
			.update(webhookEndpoints)
			.set({
				...(input.name !== undefined ? { name: input.name } : {}),
				...(input.url !== undefined ? { url: input.url } : {}),
				...(input.events !== undefined ? { events: input.events } : {}),
				...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
				updatedAt: new Date(),
			})
			.where(eq(webhookEndpoints.id, id))
			.returning();

		return row ? toEndpointDto(row) : null;
	}

	async function deleteEndpoint(id: string): Promise<boolean> {
		const rows = await db
			.delete(webhookEndpoints)
			.where(eq(webhookEndpoints.id, id))
			.returning({ id: webhookEndpoints.id });
		return rows.length > 0;
	}

	async function rotateSecret(id: string): Promise<WebhookEndpointRotateResult | null> {
		const [existing] = await db
			.select()
			.from(webhookEndpoints)
			.where(eq(webhookEndpoints.id, id));

		if (!existing) return null;

		const { secret, hash, salt } = generateWebhookSecret();
		const gracePeriodExpiresAt = new Date(Date.now() + SECRET_GRACE_PERIOD_MS);

		await db
			.update(webhookEndpoints)
			.set({
				secretHash: hash,
				secretSalt: salt,
				gracePeriodSecretHash: existing.secretHash,
				gracePeriodExpiresAt,
				updatedAt: new Date(),
			})
			.where(eq(webhookEndpoints.id, id));

		return { secret, gracePeriodExpiresAt };
	}

	async function ping(id: string): Promise<string> {
		const [endpoint] = await db
			.select()
			.from(webhookEndpoints)
			.where(eq(webhookEndpoints.id, id));

		if (!endpoint) throw new Error("Webhook endpoint not found");

		const { secret } = generateWebhookSecret();
		const deliveryId = randomUUID();
		const pingPayload = JSON.stringify({
			id: deliveryId,
			type: "ping",
			apiVersion: "2026-04-18",
			createdAt: new Date().toISOString(),
			data: { message: "Ping from Doer webhook system" },
		});

		const { dispatchWebhook } = await import("./webhook-dispatcher.js");
		const result = await dispatchWebhook(deliveryId, endpoint.url, pingPayload, secret);

		if (!result.success) {
			throw new Error(
				`Ping failed — HTTP ${result.responseStatus ?? "network error"}: ${result.responseBody ?? ""}`.trim(),
			);
		}

		return deliveryId;
	}

	async function listDeliveries(
		webhookId: string,
		opts: { limit?: number; before?: string } = {},
	): Promise<WebhookDelivery[]> {
		const limit = opts.limit ?? 50;

		let query = db
			.select()
			.from(webhookDeliveries)
			.where(
				opts.before
					? and(
						eq(webhookDeliveries.webhookId, webhookId),
						lt(webhookDeliveries.createdAt, new Date(opts.before)),
					)
					: eq(webhookDeliveries.webhookId, webhookId),
			)
			.orderBy(desc(webhookDeliveries.createdAt))
			.limit(limit);

		const rows = await query;
		return rows.map(toDeliveryDto);
	}

	return {
		listEndpoints,
		getEndpoint,
		createEndpoint,
		updateEndpoint,
		deleteEndpoint,
		rotateSecret,
		ping,
		listDeliveries,
	};
}
