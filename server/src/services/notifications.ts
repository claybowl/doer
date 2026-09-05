import { and, desc, eq, lt, isNull, isNotNull, sql, count } from "drizzle-orm";
import type { Db } from "@doerai/db";
import {
  notificationPreferences,
  notificationQueue,
  notificationLog,
  unsubscribeTokens,
  authUsers,
  companies,
} from "@doerai/db";
import type {
  NotificationType,
  NotificationChannel,
  DigestMode,
  EnqueueNotificationInput,
  EmailTemplateData,
  DigestPayload,
  DigestEntry,
} from "@doerai/shared";
import { NOTIFICATION_TYPES } from "@doerai/shared";
import { randomBytes } from "node:crypto";
import type { EmailProvider } from "../email/provider.js";
import { renderNotificationEmail, renderDigestEmail } from "../email/templates.js";
import type { Config } from "../config.js";

// ─── Rate Limiting ────────────────────────────────────────────────────────────

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_PER_USER = 10; // max 10 notifications per minute per user
const MAX_RETRIES = 3;
const UNSUBSCRIBE_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ─── Notification Service ──────────────────────────────────────────────────────

export function notificationService(db: Db, emailProvider: EmailProvider, config: Config) {
  return {
    // ─── Preferences ────────────────────────────────────────────────────────

    async getPreferences(userId: string, companyId?: string | null) {
      // Try company-specific first, then global default
      if (companyId) {
        const companyPref = await db
          .select()
          .from(notificationPreferences)
          .where(
            and(
              eq(notificationPreferences.userId, userId),
              eq(notificationPreferences.companyId, companyId),
            ),
          )
          .limit(1)
          .then((rows) => rows[0]);
        if (companyPref) return companyPref;
      }
      const globalPref = await db
        .select()
        .from(notificationPreferences)
        .where(
          and(
            eq(notificationPreferences.userId, userId),
            isNull(notificationPreferences.companyId),
          ),
        )
        .limit(1)
        .then((rows) => rows[0]);
      if (globalPref) return globalPref;
      // Create default preferences if none exist
      return db
        .insert(notificationPreferences)
        .values({
          userId,
          companyId: null,
          channel: "email",
          digestMode: "none",
          emailVerified: false,
        })
        .returning()
        .then((rows) => rows[0]);
    },

    async upsertPreferences(
      userId: string,
      input: {
        channel?: NotificationChannel;
        digestMode?: DigestMode;
        typeOverrides?: Record<string, NotificationChannel> | null;
        companyId?: string | null;
      },
    ) {
      const existing = await db
        .select()
        .from(notificationPreferences)
        .where(
          and(
            eq(notificationPreferences.userId, userId),
            input.companyId
              ? eq(notificationPreferences.companyId, input.companyId)
              : isNull(notificationPreferences.companyId),
          ),
        )
        .limit(1)
        .then((rows) => rows[0]);

      if (existing) {
        return db
          .update(notificationPreferences)
          .set({
            ...(input.channel && { channel: input.channel }),
            ...(input.digestMode && { digestMode: input.digestMode }),
            ...(input.typeOverrides !== undefined && { typeOverrides: input.typeOverrides }),
            updatedAt: new Date(),
          })
          .where(eq(notificationPreferences.id, existing.id))
          .returning()
          .then((rows) => rows[0]);
      }
      return db
        .insert(notificationPreferences)
        .values({
          userId,
          companyId: input.companyId ?? null,
          channel: input.channel ?? "email",
          digestMode: input.digestMode ?? "none",
          typeOverrides: input.typeOverrides ?? null,
          emailVerified: false,
        })
        .returning()
        .then((rows) => rows[0]);
    },

    // ─── Unsubscribe ───────────────────────────────────────────────────────

    async generateUnsubscribeToken(userId: string): Promise<string> {
      const token = randomBytes(32).toString("hex");
      await db.insert(unsubscribeTokens).values({
        userId,
        token,
        expiresAt: new Date(Date.now() + UNSUBSCRIBE_TOKEN_TTL_MS),
      });
      return token;
    },

    async unsubscribe(token: string): Promise<boolean> {
      const tokenRow = await db
        .select()
        .from(unsubscribeTokens)
        .where(eq(unsubscribeTokens.token, token))
        .limit(1)
        .then((rows) => rows[0]);
      if (!tokenRow) return false;
      if (tokenRow.usedAt) return true; // already unsubscribed
      if (new Date(tokenRow.expiresAt) < new Date()) return false;

      await db
        .update(unsubscribeTokens)
        .set({ usedAt: new Date() })
        .where(eq(unsubscribeTokens.id, tokenRow.id));
      await db
        .update(notificationPreferences)
        .set({
          channel: "none",
          unsubscribedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(notificationPreferences.userId, tokenRow.userId));
      return true;
    },

    // ─── Enqueue ───────────────────────────────────────────────────────────

    async enqueue(input: EnqueueNotificationInput): Promise<void> {
      const prefs = await this.getPreferences(input.userId, input.companyId);

      // Check if unsubscribed
      if (prefs.unsubscribedAt || prefs.channel === "none") return;

      // Check per-type override
      const typeOverride = prefs.typeOverrides?.[input.type];
      const effectiveChannel = typeOverride ?? prefs.channel;
      if (effectiveChannel === "none") return;

      // Rate limit check
      const recentCount = await db
        .select({ count: count() })
        .from(notificationQueue)
        .where(
          and(
            eq(notificationQueue.userId, input.userId),
            eq(notificationQueue.status, "pending"),
            sql`${notificationQueue.createdAt} > now() - interval '1 minute'`,
          ),
        )
        .then((rows) => Number(rows[0]?.count ?? 0));
      if (recentCount >= RATE_LIMIT_MAX_PER_USER) {
        console.warn(
          `[notifications] Rate limit hit for user ${input.userId}: ${recentCount} pending in last minute`,
        );
        return;
      }

      // Determine scheduling based on digest mode
      const scheduledFor =
        prefs.digestMode === "none" ? new Date() : this.nextDigestTime(prefs.digestMode as DigestMode);

      await db.insert(notificationQueue).values({
        userId: input.userId,
        companyId: input.companyId,
        type: input.type,
        title: input.title,
        body: input.body,
        issueId: input.issueId ?? null,
        metadata: input.metadata ?? null,
        status: "pending",
        scheduledFor,
      });
    },

    // ─── Process Pending Notifications ──────────────────────────────────────

    async processPending(): Promise<{ sent: number; failed: number; skipped: number }> {
      const pending = await db
        .select()
        .from(notificationQueue)
        .where(
          and(
            eq(notificationQueue.status, "pending"),
            lt(notificationQueue.scheduledFor, new Date()),
          ),
        )
        .limit(50);
      // Only process non-digest items (digest items have future scheduledFor)
      let sent = 0;
      let failed = 0;
      let skipped = 0;

      for (const item of pending) {
        const prefs = await this.getPreferences(item.userId, item.companyId);
        if (prefs.unsubscribedAt || prefs.channel === "none") {
          await db
            .update(notificationQueue)
            .set({ status: "skipped", updatedAt: new Date() })
            .where(eq(notificationQueue.id, item.id));
          skipped++;
          continue;
        }

        try {
          const user = await db
            .select()
            .from(authUsers)
            .where(eq(authUsers.id, item.userId))
            .limit(1)
            .then((rows) => rows[0]);
          if (!user?.email) {
            await db
              .update(notificationQueue)
              .set({ status: "skipped", lastError: "No email on user", updatedAt: new Date() })
              .where(eq(notificationQueue.id, item.id));
            skipped++;
            continue;
          }

          const company = await db
            .select()
            .from(companies)
            .where(eq(companies.id, item.companyId))
            .limit(1)
            .then((rows) => rows[0]);

          const baseUrl = config.authPublicBaseUrl ?? `http://${config.host}:${config.port}`;
          const unsubToken = await this.generateUnsubscribeToken(item.userId);
          const actionUrl = item.issueId
            ? `${baseUrl}/api/companies/${item.companyId}/issues/${item.issueId}`
            : undefined;

          const templateData: EmailTemplateData = {
            recipientName: user.name ?? user.email,
            title: item.title,
            body: item.body,
            issueId: item.issueId ?? undefined,
            companyName: company?.name,
            actionUrl,
            unsubscribeUrl: `${baseUrl}/api/notifications/unsubscribe?token=${unsubToken}`,
            preferencesUrl: `${baseUrl}/settings/notifications`,
            metadata: item.metadata ?? undefined,
          };

          const rendered = renderNotificationEmail(item.type as NotificationType, templateData);
          const result = await emailProvider.send({ to: user.email, rendered });

          // Log the sent notification
          await db.insert(notificationLog).values({
            userId: item.userId,
            companyId: item.companyId,
            type: item.type,
            title: item.title,
            body: item.body,
            issueId: item.issueId,
            metadata: item.metadata,
            channel: "email",
            providerMessageId: result.messageId,
          });

          await db
            .update(notificationQueue)
            .set({ status: "sent", sentAt: new Date(), updatedAt: new Date() })
            .where(eq(notificationQueue.id, item.id));
          sent++;
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          const attempts = item.attempts + 1;
          if (attempts >= MAX_RETRIES) {
            await db
              .update(notificationQueue)
              .set({
                status: "failed",
                attempts,
                lastError: errorMsg,
                updatedAt: new Date(),
              })
              .where(eq(notificationQueue.id, item.id));
            failed++;
          } else {
            await db
              .update(notificationQueue)
              .set({
                attempts,
                lastError: errorMsg,
                updatedAt: new Date(),
              })
              .where(eq(notificationQueue.id, item.id));
          }
        }
      }

      return { sent, failed, skipped };
    },

    // ─── Digest Processing ──────────────────────────────────────────────────

    async processDigests(): Promise<{ digestsSent: number }> {
      // Find users with daily/weekly digest mode who have pending notifications
      const digestUsers = await db
        .select({
          userId: notificationQueue.userId,
          companyId: notificationQueue.companyId,
          digestMode: notificationPreferences.digestMode,
        })
        .from(notificationQueue)
        .innerJoin(
          notificationPreferences,
          and(
            eq(notificationPreferences.userId, notificationQueue.userId),
            eq(notificationPreferences.companyId, notificationQueue.companyId),
          ),
        )
        .where(
          and(
            eq(notificationQueue.status, "pending"),
            isNotNull(notificationPreferences.digestMode),
            sql`${notificationPreferences.digestMode} != 'none'`,
          ),
        )
        .groupBy(
          notificationQueue.userId,
          notificationQueue.companyId,
          notificationPreferences.digestMode,
        );

      let digestsSent = 0;

      for (const du of digestUsers) {
        const pendingItems = await db
          .select()
          .from(notificationQueue)
          .where(
            and(
              eq(notificationQueue.userId, du.userId),
              eq(notificationQueue.companyId, du.companyId),
              eq(notificationQueue.status, "pending"),
            ),
          )
          .orderBy(desc(notificationQueue.createdAt));

        if (pendingItems.length === 0) continue;

        const user = await db
          .select()
          .from(authUsers)
          .where(eq(authUsers.id, du.userId))
          .limit(1)
          .then((rows) => rows[0]);
        if (!user?.email) continue;

        const company = await db
          .select()
          .from(companies)
          .where(eq(companies.id, du.companyId))
          .limit(1)
          .then((rows) => rows[0]);

        const baseUrl = config.authPublicBaseUrl ?? `http://${config.host}:${config.port}`;
        const unsubToken = await this.generateUnsubscribeToken(du.userId);

        const entries: DigestEntry[] = pendingItems.map((item) => ({
          type: item.type as NotificationType,
          title: item.title,
          body: item.body,
          issueId: item.issueId,
          createdAt: item.createdAt.toISOString(),
        }));

        const digestPayload: DigestPayload = {
          recipientName: user.name ?? user.email,
          companyName: company?.name ?? "Doer",
          entries,
          digestType: du.digestMode as "daily" | "weekly",
          unsubscribeUrl: `${baseUrl}/api/notifications/unsubscribe?token=${unsubToken}`,
          preferencesUrl: `${baseUrl}/settings/notifications`,
        };

        try {
          const rendered = renderDigestEmail(digestPayload);
          const result = await emailProvider.send({ to: user.email, rendered });

          // Log digest
          await db.insert(notificationLog).values({
            userId: du.userId,
            companyId: du.companyId,
            type: pendingItems[0].type,
            title: `${digestPayload.digestType} digest — ${entries.length} notifications`,
            body: `${entries.length} notifications summarized`,
            channel: "digest",
            providerMessageId: result.messageId,
          });

          // Mark all pending items as sent
          for (const item of pendingItems) {
            await db
              .update(notificationQueue)
              .set({ status: "sent", sentAt: new Date(), updatedAt: new Date() })
              .where(eq(notificationQueue.id, item.id));
          }
          digestsSent++;
        } catch (err) {
          console.error(`[notifications] Digest send failed for user ${du.userId}:`, err);
        }
      }

      return { digestsSent };
    },

    // ─── Queue Listing (for UI) ────────────────────────────────────────────

    async listQueue(userId: string, companyId?: string, limit = 50) {
      const conditions = [eq(notificationQueue.userId, userId)];
      if (companyId) conditions.push(eq(notificationQueue.companyId, companyId));
      return db
        .select()
        .from(notificationQueue)
        .where(and(...conditions))
        .orderBy(desc(notificationQueue.createdAt))
        .limit(limit);
    },

    async listLog(userId: string, companyId?: string, limit = 50) {
      const conditions = [eq(notificationLog.userId, userId)];
      if (companyId) conditions.push(eq(notificationLog.companyId, companyId));
      return db
        .select()
        .from(notificationLog)
        .where(and(...conditions))
        .orderBy(desc(notificationLog.sentAt))
        .limit(limit);
    },

    // ─── Helpers ───────────────────────────────────────────────────────────

    nextDigestTime(mode: DigestMode): Date {
      const now = new Date();
      if (mode === "daily") {
        // Next 9 AM UTC
        const next = new Date(now);
        next.setUTCHours(9, 0, 0, 0);
        if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
        return next;
      }
      if (mode === "weekly") {
        // Next Monday 9 AM UTC
        const next = new Date(now);
        next.setUTCHours(9, 0, 0, 0);
        const dayOfWeek = next.getUTCDay();
        const daysUntilMonday = (1 - dayOfWeek + 7) % 7 || 7;
        next.setUTCDate(next.getUTCDate() + daysUntilMonday);
        return next;
      }
      return now;
    },

    // ─── Send Test Email ────────────────────────────────────────────────────

    async sendTestEmail(to: string): Promise<{ messageId: string }> {
      const { renderTestEmail } = await import("../email/templates.js");
      const rendered = renderTestEmail(to);
      return emailProvider.send({ to, rendered });
    },
  };
}
