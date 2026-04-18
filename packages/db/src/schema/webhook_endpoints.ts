import {
  pgTable,
  text,
  uuid,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

/**
 * `webhook_endpoints` table — outbound webhook configuration for the Doer webhook system.
 *
 * Each row represents a user-configured endpoint that Doer will POST event payloads to
 * when subscribed events occur. Supports HMAC-signed payloads and zero-downtime secret
 * rotation via the grace period fields.
 *
 * IDs are ULIDs (26-char Crockford base32) stored as text, giving lexicographic
 * time-ordering without a separate `created_at` sort key.
 *
 * Secret rotation flow:
 * 1. New secret generated → stored in `secret_hash`/`secret_salt`
 * 2. Old hash moved to `grace_period_secret_hash`, expiry set in `grace_period_expires_at`
 * 3. Both hashes accepted for signature verification until expiry
 * 4. After expiry, `grace_period_*` columns are cleared
 */
export const webhookEndpoints = pgTable(
  "webhook_endpoints",
  {
    /** ULID — lexicographically sortable unique identifier. */
    id: text("id").primaryKey(),
    /** FK to the owning company/workspace. Cascades on delete. */
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    /** Human-readable label shown in the webhook management UI. */
    name: text("name").notNull(),
    /** HTTPS URL Doer POSTs event payloads to. */
    url: text("url").notNull(),
    /** Argon2/bcrypt hash of the webhook signing secret. */
    secretHash: text("secret_hash").notNull(),
    /** Random salt used when hashing the signing secret. */
    secretSalt: text("secret_salt").notNull(),
    /**
     * Array of event type strings this endpoint subscribes to, e.g.
     * `["task.created", "task.completed", "agent.status_changed"]`.
     * Empty array = no events delivered (endpoint effectively paused).
     */
    events: text("events").array().notNull().default([]),
    /** When false, deliveries are skipped without deleting the endpoint. */
    enabled: boolean("enabled").notNull().default(true),
    /** Hash of the previous signing secret, valid until `grace_period_expires_at`. */
    gracePeriodSecretHash: text("grace_period_secret_hash"),
    /** When the grace-period old secret expires and stops being accepted. */
    gracePeriodExpiresAt: timestamp("grace_period_expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyIdx: index("webhook_endpoints_company_idx").on(table.companyId),
  }),
);
