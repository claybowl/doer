import { Router } from "express";
import type { Db } from "@doerai/db";
import { z } from "zod";
import { stripeBillingService } from "../services/stripe-billing.js";
import { assertCompanyAccess, assertBoard } from "./authz.js";
import { validate } from "../middleware/validate.js";

const createCheckoutSchema = z.object({
  priceId: z.string(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

const createPortalSchema = z.object({
  returnUrl: z.string().url(),
});

export function billingRoutes(db: Db) {
  const router = Router();
  const billing = stripeBillingService(db);

  // POST /api/companies/:companyId/billing/create-checkout-session
  // Requires human board user (workspace admin) — agents must not initiate billing
  router.post(
    "/companies/:companyId/billing/create-checkout-session",
    validate(createCheckoutSchema),
    async (req, res, next) => {
      try {
        const companyId = req.params.companyId as string;
        assertBoard(req);
        assertCompanyAccess(req, companyId);
        const { priceId, successUrl, cancelUrl } = req.body as z.infer<typeof createCheckoutSchema>;
        const url = await billing.createCheckoutSession({ companyId, priceId, successUrl, cancelUrl });
        res.json({ url });
      } catch (err) {
        next(err);
      }
    },
  );

  // POST /api/companies/:companyId/billing/create-portal-session
  // Requires human board user (workspace admin)
  router.post(
    "/companies/:companyId/billing/create-portal-session",
    validate(createPortalSchema),
    async (req, res, next) => {
      try {
        const companyId = req.params.companyId as string;
        assertBoard(req);
        assertCompanyAccess(req, companyId);
        const { returnUrl } = req.body as z.infer<typeof createPortalSchema>;
        const url = await billing.createPortalSession({ companyId, returnUrl });
        res.json({ url });
      } catch (err) {
        next(err);
      }
    },
  );

  // GET /api/companies/:companyId/billing/usage
  // Returns current billing plan + usage for the workspace
  router.get("/companies/:companyId/billing/usage", async (req, res, next) => {
    try {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      const usage = await billing.getUsageSummary(companyId);
      res.json(usage);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/billing/webhook — PUBLIC, no auth, signature-verified
  router.post("/billing/webhook", async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature || typeof signature !== "string") {
      res.status(400).json({ error: "Missing stripe-signature header" });
      return;
    }

    // rawBody is captured by express.json verify callback in app.ts
    const rawBody: Buffer | undefined = (req as unknown as { rawBody?: Buffer }).rawBody;
    if (!rawBody) {
      res.status(400).json({ error: "Raw body unavailable" });
      return;
    }

    let event;
    try {
      event = billing.constructWebhookEvent(rawBody, signature);
    } catch {
      // Do NOT log rawBody — may contain PII
      console.error("Stripe webhook signature verification failed");
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      await billing.processWebhookEvent(event);
      res.json({ received: true });
    } catch (err) {
      console.error("Stripe webhook processing error:", (err as Error).message);
      // Return 500 so Stripe retries — idempotency dedup prevents double-processing
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  return router;
}
