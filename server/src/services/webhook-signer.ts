/**
 * WebhookSigner — HMAC-SHA256 signing for outbound webhook payloads.
 *
 * Signed payload format (identical to Svix / Standard Webhooks spec):
 *   signed_payload = webhook_id + "." + timestamp_unix_seconds + "." + raw_body
 *
 * Output headers set on the outbound POST:
 *   Doer-Webhook-Id        — ULID of the delivery
 *   Doer-Webhook-Timestamp — Unix epoch seconds (string)
 *   Doer-Webhook-Signature — "v1=" + hex(HMAC-SHA256(signed_payload, secret))
 *
 * Secret format: whsec_<base64url(32 random bytes)>
 * The secret is stored ONLY as a salted SHA-256 hash in the DB. The plain-text
 * is returned once on creation / rotation and never persisted.
 *
 * Receiver replay protection:
 *   Reject if |timestamp - now| > 300s (5 minutes).
 *   Constant-time comparison MUST be used to compare signatures.
 */

import crypto from "node:crypto";

/** Bytes of entropy in a generated webhook secret. */
const SECRET_BYTES = 32;

/** Prefix prepended to the base64url-encoded secret material. */
const SECRET_PREFIX = "whsec_";

/** Grace period for secret rotation: 24 hours in milliseconds. */
export const SECRET_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

// ─── Secret generation & hashing ─────────────────────────────────────────────

/**
 * Generate a new webhook signing secret.
 * Returns `{ secret, hash, salt }` where:
 * - `secret` is the plain-text value to show the user once
 * - `hash`  is the value to persist in `webhook_endpoints.secret_hash`
 * - `salt`  is the value to persist in `webhook_endpoints.secret_salt`
 */
export function generateWebhookSecret(): {
	secret: string;
	hash: string;
	salt: string;
} {
	const secretBytes = crypto.randomBytes(SECRET_BYTES);
	const secret =
		SECRET_PREFIX +
		secretBytes
			.toString("base64")
			.replace(/\+/g, "-")
			.replace(/\//g, "_")
			.replace(/=/g, "");

	const salt = crypto.randomBytes(16).toString("hex");
	const hash = hashSecret(secret, salt);

	return { secret, hash, salt };
}

/**
 * Hash a plain-text webhook secret with a given salt using SHA-256.
 * The result is a lowercase hex string.
 */
export function hashSecret(secret: string, salt: string): string {
	return crypto
		.createHmac("sha256", salt)
		.update(secret)
		.digest("hex");
}

/**
 * Verify that `plainSecret` matches the stored `hash` + `salt` pair.
 * Uses constant-time comparison to prevent timing attacks.
 */
export function verifySecretHash(
	plainSecret: string,
	hash: string,
	salt: string,
): boolean {
	const expected = hashSecret(plainSecret, salt);
	try {
		return crypto.timingSafeEqual(
			Buffer.from(expected, "hex"),
			Buffer.from(hash, "hex"),
		);
	} catch {
		return false;
	}
}

// ─── Signing ─────────────────────────────────────────────────────────────────

export interface WebhookSignatureHeaders {
	"Doer-Webhook-Id": string;
	"Doer-Webhook-Timestamp": string;
	"Doer-Webhook-Signature": string;
}

/**
 * Produce the three signature headers for an outbound webhook POST.
 *
 * @param deliveryId  ULID of the `webhook_deliveries` row
 * @param rawBody     Serialised JSON string that will be sent as the POST body
 * @param secret      Plain-text `whsec_*` secret (NOT the stored hash)
 * @param now         Override for the current time (used in tests)
 */
export function signWebhookPayload(
	deliveryId: string,
	rawBody: string,
	secret: string,
	now: Date = new Date(),
): WebhookSignatureHeaders {
	const timestampSeconds = Math.floor(now.getTime() / 1000).toString();
	const signedPayload = `${deliveryId}.${timestampSeconds}.${rawBody}`;

	// Strip the whsec_ prefix to get the raw base64url key material
	const keyMaterial = secret.startsWith(SECRET_PREFIX)
		? secret.slice(SECRET_PREFIX.length)
		: secret;

	// Decode base64url → Buffer for use as HMAC key
	const keyBuffer = Buffer.from(
		keyMaterial.replace(/-/g, "+").replace(/_/g, "/"),
		"base64",
	);

	const signature =
		"v1=" +
		crypto
			.createHmac("sha256", keyBuffer)
			.update(signedPayload)
			.digest("hex");

	return {
		"Doer-Webhook-Id": deliveryId,
		"Doer-Webhook-Timestamp": timestampSeconds,
		"Doer-Webhook-Signature": signature,
	};
}

/**
 * Verify an inbound webhook signature (for webhooks received by Doer itself).
 * Returns true if the signature is valid and the timestamp is within `toleranceSeconds`.
 */
export function verifyInboundSignature(
	deliveryId: string,
	rawBody: string,
	secret: string,
	receivedHeaders: {
		"doer-webhook-id"?: string;
		"doer-webhook-timestamp"?: string;
		"doer-webhook-signature"?: string;
	},
	toleranceSeconds = 300,
	now: Date = new Date(),
): boolean {
	const headerId = receivedHeaders["doer-webhook-id"];
	const headerTimestamp = receivedHeaders["doer-webhook-timestamp"];
	const headerSignature = receivedHeaders["doer-webhook-signature"];

	if (!headerId || !headerTimestamp || !headerSignature) return false;
	if (headerId !== deliveryId) return false;

	const tsNum = Number(headerTimestamp);
	if (!Number.isFinite(tsNum)) return false;

	const ageDeltaSeconds = Math.abs(Math.floor(now.getTime() / 1000) - tsNum);
	if (ageDeltaSeconds > toleranceSeconds) return false;

	const expected = signWebhookPayload(deliveryId, rawBody, secret, new Date(tsNum * 1000));

	try {
		return crypto.timingSafeEqual(
			Buffer.from(expected["Doer-Webhook-Signature"]),
			Buffer.from(headerSignature),
		);
	} catch {
		return false;
	}
}
