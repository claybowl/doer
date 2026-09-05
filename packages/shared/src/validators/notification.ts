import { z } from "zod";
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_CHANNELS,
  DIGEST_MODES,
  EMAIL_PROVIDERS,
} from "../constants.js";

// ─── Notification Preferences ────────────────────────────────────────────────

export const upsertNotificationPreferencesSchema = z.object({
  channel: z.enum([...NOTIFICATION_CHANNELS]).optional(),
  digestMode: z.enum([...DIGEST_MODES]).optional(),
  typeOverrides: z
    .record(z.string(), z.enum([...NOTIFICATION_CHANNELS]))
    .nullable()
    .optional(),
  companyId: z.string().uuid().nullable().optional(),
});

// ─── Enqueue Notification ─────────────────────────────────────────────────────

export const enqueueNotificationSchema = z.object({
  userId: z.string().min(1),
  companyId: z.string().uuid(),
  type: z.enum([...NOTIFICATION_TYPES]),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  issueId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ─── Unsubscribe ──────────────────────────────────────────────────────────────

export const unsubscribeSchema = z.object({
  token: z.string().min(1),
});

// ─── Send Test Email ───────────────────────────────────────────────────────────

export const sendTestEmailSchema = z.object({
  to: z.string().email(),
});

// ─── Email Provider Config ────────────────────────────────────────────────────

export const emailProviderConfigSchema = z.object({
  provider: z.enum([...EMAIL_PROVIDERS]).default("smtp"),
  // SMTP
  smtpHost: z.string().optional(),
  smtpPort: z.number().int().min(1).max(65535).optional(),
  smtpUser: z.string().optional(),
  smtpPass: z.string().optional(),
  smtpSecure: z.boolean().optional(),
  smtpFrom: z.string().email().optional(),
  // SendGrid
  sendgridApiKey: z.string().optional(),
  // Resend
  resendApiKey: z.string().optional(),
  // Mailgun
  mailgunApiKey: z.string().optional(),
  mailgunDomain: z.string().optional(),
  mailgunRegion: z.string().optional(),
});
