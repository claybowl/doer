import {
  pgTable,
  text,
  integer,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { webhookEndpoints } from "./webhook_endpoints.js";

/**
 * Delivery status for a webhook attempt.
 *
 * - `pending`   — queued, not yet attempted
 * - `delivered` — at least one attempt returned 2xx
 * - `failed`    — all retry attempts exhausted without a 2xx
 * - `retrying`  — a previous attempt failed; next retry scheduled
 */
export type WebhookDeliveryStatus = "pending" | "delivered" | "failed" | "retrying";

/**
 * `webhook_deliveries` table — delivery log for the Doer webhook system.
 *
 * Each row represents one event delivery attempt lifecycle. A single event may
 * produce one row; retries are tracked in-place via `attempts`, `last_attempt_at`,
 * and `next_retry_at` rather than creating new rows.
 *
 * The compound index on `(webhook_id, created_at DESC)` supports the delivery
 * log query pattern: paginated history for a specific endpoint, newest first.
 *
 * IDs are ULIDs (26-char Crockford base32), matching `webhook_endpoints.id`.
 */
export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    /** ULID — lexicographically sortable unique identifier. */
    id: text("id").primaryKey(),
    /** FK to the target endpoint. Cascades on delete. */
    webhookId: text("webhook_id")
      .notNull()
      .references(() => webhookEndpoints.id, { onDelete: "cascade" }),
    /** Event type string, e.g. `"task.completed"`. */
    eventType: text("event_type").notNull(),
    /** Stable deduplication ID for the source event (e.g. issue id + timestamp hash). */
    eventId: text("event_id").notNull(),
    /** Full JSON payload sent (or to be sent) to the endpoint. */
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    /** Current delivery state. */
    status: text("status").$type<WebhookDeliveryStatus>().notNull().default("pending"),
    /** Total number of delivery attempts made so far. */
    attempts: integer("attempts").notNull().default(0),
    /** Timestamp of the most recent delivery attempt. */
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    /** When the next retry should be attempted (null if no retry scheduled). */
    nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
    /** HTTP status code returned by the endpoint on the last attempt. */
    responseStatus: integer("response_status"),
    /** Response body (truncated) from the last attempt, for debugging. */
    responseBody: text("response_body"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    /** Primary access pattern: paginated delivery log for an endpoint, newest first. */
    webhookCreatedIdx: index("webhook_deliveries_webhook_created_idx").on(
      table.webhookId,
      table.createdAt,
    ),
    /** Secondary: queue worker fetches rows by status for retry scheduling. */
    statusIdx: index("webhook_deliveries_status_idx").on(table.status),
  }),
);
