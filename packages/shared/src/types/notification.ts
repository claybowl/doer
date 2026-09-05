import type {
  NotificationType,
  NotificationChannel,
  DigestMode,
  NotificationQueueStatus,
} from "../constants.js";

// ─── Notification Preferences ────────────────────────────────────────────────

export interface NotificationPreferences {
  id: string;
  userId: string;
  companyId: string | null;
  channel: NotificationChannel;
  digestMode: DigestMode;
  typeOverrides: Record<string, NotificationChannel> | null;
  emailVerified: boolean;
  unsubscribedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertNotificationPreferencesInput {
  channel?: NotificationChannel;
  digestMode?: DigestMode;
  typeOverrides?: Record<string, NotificationChannel> | null;
  companyId?: string | null;
}

// ─── Notification Queue ────────────────────────────────────────────────────────

export interface NotificationQueueItem {
  id: string;
  userId: string;
  companyId: string;
  type: NotificationType;
  title: string;
  body: string;
  issueId: string | null;
  metadata: Record<string, unknown> | null;
  status: NotificationQueueStatus;
  scheduledFor: string;
  sentAt: string | null;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EnqueueNotificationInput {
  userId: string;
  companyId: string;
  type: NotificationType;
  title: string;
  body: string;
  issueId?: string;
  metadata?: Record<string, unknown>;
}

// ─── Notification Log ──────────────────────────────────────────────────────────

export interface NotificationLogEntry {
  id: string;
  userId: string;
  companyId: string;
  type: NotificationType;
  title: string;
  body: string;
  issueId: string | null;
  metadata: Record<string, unknown> | null;
  channel: NotificationChannel | "digest";
  providerMessageId: string | null;
  sentAt: string;
}

// ─── Email Rendering ──────────────────────────────────────────────────────────

export interface EmailTemplateData {
  recipientName: string;
  title: string;
  body: string;
  issueId?: string;
  issueTitle?: string;
  companyName?: string;
  actionUrl?: string;
  unsubscribeUrl?: string;
  preferencesUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

// ─── Digest ────────────────────────────────────────────────────────────────────

export interface DigestEntry {
  type: NotificationType;
  title: string;
  body: string;
  issueId: string | null;
  createdAt: string;
}

export interface DigestPayload {
  recipientName: string;
  companyName: string;
  entries: DigestEntry[];
  digestType: "daily" | "weekly";
  unsubscribeUrl: string;
  preferencesUrl: string;
}

// ─── Unsubscribe ──────────────────────────────────────────────────────────────

export interface UnsubscribeToken {
  id: string;
  userId: string;
  token: string;
  usedAt: string | null;
  expiresAt: string;
  createdAt: string;
}

// ─── API Response Shapes ──────────────────────────────────────────────────────

export interface NotificationPreferencesResponse {
  preferences: NotificationPreferences;
}

export interface NotificationQueueResponse {
  items: NotificationQueueItem[];
  total: number;
}

export interface UnsubscribeResponse {
  success: boolean;
  message: string;
}

export interface SendTestEmailResponse {
  success: boolean;
  message: string;
  providerMessageId?: string;
}
