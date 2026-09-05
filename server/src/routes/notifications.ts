import { Router } from "express";
import type { Db } from "@doerai/db";
import {
  upsertNotificationPreferencesSchema,
  unsubscribeSchema,
  sendTestEmailSchema,
} from "@doerai/shared";
import { validate } from "../middleware/validate.js";
import { notificationService } from "../services/index.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";
import type { EmailProvider } from "../email/provider.js";
import type { Config } from "../config.js";

export function notificationRoutes(db: Db, emailProvider: EmailProvider, config: Config) {
  const router = Router();
  const svc = notificationService(db, emailProvider, config);

  // ─── Get Preferences ──────────────────────────────────────────────────
  router.get("/notifications/preferences", async (req, res) => {
    const actor = getActorInfo(req);
    const userId =
      req.actor.type === "board" ? req.actor.userId ?? "board" : actor.actorId;
    const companyId = req.query.companyId as string | undefined;
    const prefs = await svc.getPreferences(userId, companyId);
    res.json({ preferences: prefs });
  });

  // ─── Update Preferences ───────────────────────────────────────────────
  router.patch(
    "/notifications/preferences",
    validate(upsertNotificationPreferencesSchema),
    async (req, res) => {
      const actor = getActorInfo(req);
      const userId =
        req.actor.type === "board" ? req.actor.userId ?? "board" : actor.actorId;
      const prefs = await svc.upsertPreferences(userId, req.body);
      res.json({ preferences: prefs });
    },
  );

  // ─── Get Notification Queue ───────────────────────────────────────────
  router.get("/notifications/queue", async (req, res) => {
    const actor = getActorInfo(req);
    const userId =
      req.actor.type === "board" ? req.actor.userId ?? "board" : actor.actorId;
    const companyId = req.query.companyId as string | undefined;
    const items = await svc.listQueue(userId, companyId);
    res.json({ items, total: items.length });
  });

  // ─── Get Notification Log ─────────────────────────────────────────────
  router.get("/notifications/log", async (req, res) => {
    const actor = getActorInfo(req);
    const userId =
      req.actor.type === "board" ? req.actor.userId ?? "board" : actor.actorId;
    const companyId = req.query.companyId as string | undefined;
    const items = await svc.listLog(userId, companyId);
    res.json({ items });
  });

  // ─── Unsubscribe (public, token-based) ────────────────────────────────
  router.get("/notifications/unsubscribe", async (req, res) => {
    const token = req.query.token as string;
    if (!token) {
      res.status(400).json({ error: "Missing unsubscribe token" });
      return;
    }
    const success = await svc.unsubscribe(token);
    if (success) {
      res.json({ success: true, message: "You have been unsubscribed from email notifications." });
    } else {
      res.status(400).json({ success: false, message: "Invalid or expired unsubscribe token." });
    }
  });

  // ─── Send Test Email ──────────────────────────────────────────────────
  router.post(
    "/notifications/test-email",
    validate(sendTestEmailSchema),
    async (req, res) => {
      try {
        const result = await svc.sendTestEmail(req.body.to);
        res.json({ success: true, message: "Test email sent", providerMessageId: result.messageId });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        res.status(500).json({ success: false, message });
      }
    },
  );

  // ─── Enqueue Notification (company-scoped) ─────────────────────────────
  router.post(
    "/companies/:companyId/notifications/enqueue",
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      const { userId, type, title, body, issueId, metadata } = req.body;
      await svc.enqueue({ userId, companyId, type, title, body, issueId, metadata });
      res.status(201).json({ success: true });
    },
  );

  // ─── Process Pending (admin/trigger) ─────────────────────────────────
  router.post("/notifications/process", async (_req, res) => {
    const result = await svc.processPending();
    res.json(result);
  });

  // ─── Process Digests (admin/trigger) ───────────────────────────────────
  router.post("/notifications/process-digests", async (_req, res) => {
    const result = await svc.processDigests();
    res.json(result);
  });

  return router;
}
