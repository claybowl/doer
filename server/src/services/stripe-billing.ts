import Stripe from "stripe";
import type { Db } from "@doerai/db";
import { companies, processedStripeEvents } from "@doerai/db";
import { eq } from "drizzle-orm";

export type Plan = "free" | "pro" | "team" | "enterprise";
export type PlanStatus = "active" | "trialing" | "past_due" | "canceled" | "unpaid";

export const PLAN_LIMITS: Record<Plan, { maxAgents: number; maxSeats: number; storageGb: number }> = {
  free: { maxAgents: 2, maxSeats: 1, storageGb: 1 },
  pro: { maxAgents: 10, maxSeats: 5, storageGb: 20 },
  team: { maxAgents: 50, maxSeats: 25, storageGb: 100 },
  enterprise: { maxAgents: Infinity, maxSeats: Infinity, storageGb: Infinity },
};

const GRACE_PERIOD_DAYS = 7;
const STRIPE_API_VERSION = "2026-04-22.dahlia" as const;

function resolvePlan(priceId: string): Plan {
  if (priceId === process.env.STRIPE_PRICE_PRO_MONTHLY) return "pro";
  if (priceId === process.env.STRIPE_PRICE_TEAM_MONTHLY) return "team";
  return "free";
}

export function stripeBillingService(db: Db) {
  function getStripe(): Stripe {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY not set");
    return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: STRIPE_API_VERSION });
  }

  async function getOrCreateStripeCustomer(companyId: string): Promise<string> {
    const [company] = await db.select().from(companies).where(eq(companies.id, companyId));
    if (!company) throw new Error("Company not found");

    if (company.stripeCustomerId) return company.stripeCustomerId;

    const stripe = getStripe();
    const customer = await stripe.customers.create({
      metadata: { companyId },
      name: company.name,
    });

    await db.update(companies).set({ stripeCustomerId: customer.id }).where(eq(companies.id, companyId));
    return customer.id;
  }

  async function createCheckoutSession(input: {
    companyId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<string> {
    const stripe = getStripe();
    const customerId = await getOrCreateStripeCustomer(input.companyId);
    const isPro = input.priceId === process.env.STRIPE_PRICE_PRO_MONTHLY;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: input.priceId, quantity: 1 }],
      subscription_data: {
        ...(isPro ? { trial_period_days: 14 } : {}),
        metadata: { companyId: input.companyId },
      },
      allow_promotion_codes: true,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    });

    return session.url!;
  }

  async function createPortalSession(input: { companyId: string; returnUrl: string }): Promise<string> {
    const stripe = getStripe();
    const [company] = await db.select().from(companies).where(eq(companies.id, input.companyId));
    if (!company?.stripeCustomerId) throw new Error("No Stripe customer for this company");

    const session = await stripe.billingPortal.sessions.create({
      customer: company.stripeCustomerId,
      return_url: input.returnUrl,
    });

    return session.url;
  }

  async function syncSubscription(sub: Stripe.Subscription): Promise<void> {
    const companyId = sub.metadata?.companyId;
    if (!companyId) return;

    const priceId = sub.items.data[0]?.price.id ?? "";
    const plan = resolvePlan(priceId);
    const status = sub.status as PlanStatus;

    // In Stripe v22, current_period_end is on the subscription item
    const currentPeriodEnd = sub.items.data[0]?.current_period_end
      ? new Date(sub.items.data[0].current_period_end * 1000)
      : null;

    const gracePeriodEnd =
      status === "canceled"
        ? new Date(Date.now() + GRACE_PERIOD_DAYS * 86400 * 1000)
        : null;

    await db.update(companies)
      .set({
        plan,
        planStatus: status,
        stripeSubscriptionId: sub.id,
        currentPeriodEnd,
        trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
        gracePeriodEnd,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, companyId));
  }

  async function getCustomerIdFromInvoice(invoice: Stripe.Invoice): Promise<string | null> {
    const customer = invoice.customer;
    if (!customer) return null;
    return typeof customer === "string" ? customer : customer.id;
  }

  async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const customerId = await getCustomerIdFromInvoice(invoice);
    if (!customerId) return;

    await db.update(companies)
      .set({ planStatus: "past_due", updatedAt: new Date() })
      .where(eq(companies.stripeCustomerId, customerId));
  }

  async function handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const customerId = await getCustomerIdFromInvoice(invoice);
    if (!customerId) return;

    await db.update(companies)
      .set({ planStatus: "active", gracePeriodEnd: null, updatedAt: new Date() })
      .where(eq(companies.stripeCustomerId, customerId));
  }

  async function isEventProcessed(eventId: string): Promise<boolean> {
    const [row] = await db.select().from(processedStripeEvents).where(eq(processedStripeEvents.eventId, eventId));
    return !!row;
  }

  async function markEventProcessed(eventId: string, eventType: string): Promise<void> {
    await db.insert(processedStripeEvents).values({ eventId, eventType }).onConflictDoNothing();
  }

  async function processWebhookEvent(event: Stripe.Event): Promise<void> {
    if (await isEventProcessed(event.id)) return;

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await syncSubscription({ ...event.data.object, status: "canceled" } as Stripe.Subscription);
        break;
      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      default:
        break;
    }

    await markEventProcessed(event.id, event.type);
  }

  function constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    if (!process.env.STRIPE_WEBHOOK_SECRET) throw new Error("STRIPE_WEBHOOK_SECRET not set");
    const stripe = getStripe();
    return stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  }

  return {
    createCheckoutSession,
    createPortalSession,
    processWebhookEvent,
    constructWebhookEvent,
    syncSubscription,
    PLAN_LIMITS,
  };
}
