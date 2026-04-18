/**
 * WebhookDispatcher — HTTP POST delivery with 10s timeout.
 *
 * Responsibilities:
 * - POST the JSON payload to the endpoint URL
 * - Set signature headers via WebhookSigner
 * - Capture response status + body (truncate body to 1 KB)
 * - Return a DeliveryResult indicating success or failure
 *
 * This module is side-effect-free regarding the database; it only makes the
 * HTTP call and returns the outcome. WebhookRetryScheduler handles DB updates.
 */

import { signWebhookPayload, type WebhookSignatureHeaders } from "./webhook-signer.js";

/** Maximum response body captured for debugging. */
const MAX_RESPONSE_BODY_BYTES = 1024;

/** HTTP timeout in milliseconds. */
const DISPATCH_TIMEOUT_MS = 10_000;

export interface DeliveryResult {
	/** True when the remote returned a 2xx status code. */
	success: boolean;
	/** HTTP status code, or null if the request failed before receiving a response. */
	responseStatus: number | null;
	/** Truncated response body, or an error message string. */
	responseBody: string | null;
}

/**
 * Dispatch a single webhook delivery attempt.
 *
 * @param deliveryId  ULID of the delivery row (used in signature headers)
 * @param url         Target URL
 * @param payload     Pre-serialised JSON payload string
 * @param secret      Plain-text whsec_ signing secret
 */
export async function dispatchWebhook(
	deliveryId: string,
	url: string,
	payload: string,
	secret: string,
): Promise<DeliveryResult> {
	const signatureHeaders: WebhookSignatureHeaders = signWebhookPayload(
		deliveryId,
		payload,
		secret,
	);

	const controller = new AbortController();
	const timeoutId = setTimeout(
		() => controller.abort(),
		DISPATCH_TIMEOUT_MS,
	);

	try {
		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"User-Agent": "Doer-Webhooks/1.0",
				...signatureHeaders,
			},
			body: payload,
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		const rawBody = await response.text().catch(() => "");
		const truncatedBody = truncate(rawBody, MAX_RESPONSE_BODY_BYTES);

		return {
			success: response.ok,
			responseStatus: response.status,
			responseBody: truncatedBody,
		};
	} catch (err: unknown) {
		clearTimeout(timeoutId);
		const message =
			err instanceof Error ? err.message : "Unknown dispatch error";
		return {
			success: false,
			responseStatus: null,
			responseBody: message,
		};
	}
}

function truncate(str: string, maxBytes: number): string {
	const buf = Buffer.from(str, "utf8");
	if (buf.byteLength <= maxBytes) return str;
	return buf.subarray(0, maxBytes).toString("utf8") + "…";
}
