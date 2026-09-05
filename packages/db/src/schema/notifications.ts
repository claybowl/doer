import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

// ─── Notification Preferences ─────────────────────────────────────────────────
// Per-user notification preferences. One row per user (globally) with optional
// per-company overrides via the `companyId` field (null = global default).

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    companyId: uuid("company_id").references(() => companies.id), // null = global default
    channel: text("channel").notNull().default("email"), // email | in_app | both | none
    digestMode: text("digest_mode").notNull().default("none"), // none | daily | weekly
    // Per-type overrides: { "task_assigned": "email", "comment_mention": "none", ... }
    typeOverrides: jsonb("type_overrides").$type<Record<string, string>>(),
    emailVerified: boolean("email_verified").notNull().default(false),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userCompanyIdx: uniqueIndex("notif_prefs_user_company_idx").on(
      table.userId,
      table.companyId,
    ),
    userIdx: index("notif_prefs_user_idx").on(table.userId),
  }),
);

// ─── Notification Queue ────────────────────────────────────────────────────────
// Queued notifications waiting to be sent (either immediately or in next digest).

export const notificationQueue = pgTable(
  "notification_queue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    type: text("type").notNull(), // task_assigned | task_completed | comment_mention | blocker_flagged | deadline_approaching
    title: text("title").notNull(),
    body: text("body").notNull(),
    issueId: uuid("issue_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    status: text("status").notNull().default("pending"), // pending | sent | skipped | failed
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userStatusIdx: index("notif_queue_user_status_idx").on(
      table.userId,
      table.status,
    ),
    scheduledIdx: index("notif_queue_scheduled_idx").on(
      table.status,
      table.scheduledFor,
    ),
    companyTypeIdx: index("notif_queue_company_type_idx").on(
      table.companyId,
      table.type,
    ),
  }),
);

// ─── Notification Log ──────────────────────────────────────────────────────────
// Log of all sent notifications for audit, dedup, and digest generation.

export const notificationLog = pgTable(
  "notification_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    issueId: uuid("issue_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    channel: text("channel").notNull(), // email | in_app | digest
    providerMessageId: text("provider_message_id"), // ID from email provider
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userSentIdx: index("notif_log_user_sent_idx").on(
      table.userId,
      table.sentAt,
    ),
    companyTypeIdx: index("notif_log_company_type_idx").on(
      table.companyId,
      table.type,
    ),
  }),
);

// ─── Unsubscribe Tokens ───────────────────────────────────────────────────────
// One-time tokens for email unsubscribe links (GDPR compliant).

export const unsubscribeTokens = pgTable(
  "unsubscribe_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    token: text("token").notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tokenIdx: uniqueIndex("unsubscribe_token_idx").on(table.token),
    userIdx: index("unsubscribe_user_idx").on(table.userId),
  }),
);
