/**
 * One-time Stripe product/price setup script.
 * Run once per environment (test + production) to create products and prices.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... npx tsx scripts/stripe-setup.ts
 *
 * Outputs the price IDs to add to your environment variables.
 */

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

async function main() {
  console.log("Setting up Stripe products and prices...\n");

  // Pro plan
  const pro = await stripe.products.create({
    name: "Doer Pro",
    description: "Up to 10 agents, 5 seats, 20GB storage, 14-day free trial",
    metadata: { plan: "pro" },
  });
  const proMonthly = await stripe.prices.create({
    product: pro.id,
    unit_amount: 2900,
    currency: "usd",
    recurring: { interval: "month" },
    nickname: "Pro Monthly",
  });
  console.log(`Pro product: ${pro.id}`);
  console.log(`STRIPE_PRICE_PRO_MONTHLY=${proMonthly.id}`);

  // Team plan
  const team = await stripe.products.create({
    name: "Doer Team",
    description: "Up to 50 agents, 25 seats, 100GB storage, SSO, custom roles",
    metadata: { plan: "team" },
  });
  const teamMonthly = await stripe.prices.create({
    product: team.id,
    unit_amount: 7900,
    currency: "usd",
    recurring: { interval: "month" },
    nickname: "Team Monthly",
  });
  console.log(`Team product: ${team.id}`);
  console.log(`STRIPE_PRICE_TEAM_MONTHLY=${teamMonthly.id}`);

  // Enterprise — invoice-based, no standard price
  const enterprise = await stripe.products.create({
    name: "Doer Enterprise",
    description: "Unlimited agents, custom seats, priority support, custom pricing",
    metadata: { plan: "enterprise" },
  });
  console.log(`Enterprise product: ${enterprise.id}`);

  console.log("\n--- Add these to your .env ---");
  console.log(`STRIPE_PRICE_PRO_MONTHLY=${proMonthly.id}`);
  console.log(`STRIPE_PRICE_TEAM_MONTHLY=${teamMonthly.id}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
