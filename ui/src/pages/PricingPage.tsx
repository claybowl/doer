import * as React from "react";
import { Link } from "@/lib/router";
import { Bot, CheckCircle2, X, Zap, ChevronDown, ChevronUp } from "lucide-react";

// ─── Data ─────────────────────────────────────────────────────────────────────

type Tier = {
  name: string;
  monthlyPrice: number | null;
  annualPrice: number | null;
  description: string;
  features: string[];
  cta: string;
  ctaHref: string;
  highlighted: boolean;
};

const TIERS: Tier[] = [
  {
    name: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    description: "For individuals exploring AI agents.",
    features: [
      "1 agent",
      "50 tasks/month",
      "Basic templates",
      "Community support",
    ],
    cta: "Start Free",
    ctaHref: "/auth?mode=sign_up",
    highlighted: false,
  },
  {
    name: "Starter",
    monthlyPrice: 29,
    annualPrice: 24,
    description: "For teams getting serious about automation.",
    features: [
      "3 agents",
      "500 tasks/month",
      "Custom templates",
      "Email support",
      "Webhooks",
    ],
    cta: "Start Free Trial",
    ctaHref: "/auth?mode=sign_up",
    highlighted: false,
  },
  {
    name: "Pro",
    monthlyPrice: 99,
    annualPrice: 83,
    description: "For power users running real workflows.",
    features: [
      "10 agents",
      "Unlimited tasks",
      "API access",
      "Webhooks & integrations",
      "Priority support",
      "All templates",
    ],
    cta: "Start Free Trial",
    ctaHref: "/auth?mode=sign_up",
    highlighted: true,
  },
  {
    name: "Enterprise",
    monthlyPrice: null,
    annualPrice: null,
    description: "For orgs that need control and scale.",
    features: [
      "Unlimited agents",
      "Unlimited tasks",
      "SSO",
      "SLA guarantee",
      "Dedicated support",
      "Custom contracts",
      "Advanced security",
    ],
    cta: "Contact Us",
    ctaHref: "mailto:hello@doer.ai",
    highlighted: false,
  },
];

// ─── Comparison Table ─────────────────────────────────────────────────────────

const COMPARISON_FEATURES = [
  { label: "Agents", free: "1", starter: "3", pro: "10", enterprise: "Unlimited" },
  { label: "Tasks/month", free: "50", starter: "500", pro: "Unlimited", enterprise: "Unlimited" },
  { label: "Custom templates", free: false, starter: true, pro: true, enterprise: true },
  { label: "API access", free: false, starter: false, pro: true, enterprise: true },
  { label: "Webhooks", free: false, starter: true, pro: true, enterprise: true },
  { label: "Priority support", free: false, starter: false, pro: true, enterprise: true },
  { label: "SSO", free: false, starter: false, pro: false, enterprise: true },
  { label: "SLA", free: false, starter: false, pro: false, enterprise: true },
  { label: "Dedicated support", free: false, starter: false, pro: false, enterprise: true },
];

// ─── FAQ ──────────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: "Do I need a credit card to start?",
    a: "No. The Free plan requires no credit card — just an email and you're in. Upgrade anytime when you're ready to scale.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from your account settings at any time. No questions, no penalties. Annual plans are refunded pro-rata for unused months.",
  },
  {
    q: "What counts as a task?",
    a: "A task is a single heartbeat run by an agent — each time an agent checks in, does work, and posts an update. Most workflows use a handful of heartbeats per task.",
  },
  {
    q: "What's the difference between Pro and Starter?",
    a: "Pro gives you 10x the agents, unlimited tasks, direct API access, and priority support. If you're running production workflows or building on top of Doer, Pro is the right tier.",
  },
  {
    q: "Do you offer discounts for nonprofits or startups?",
    a: "Yes — reach out to hello@doer.ai with a brief description of your org and we'll set you up.",
  },
];

// ─── Components ───────────────────────────────────────────────────────────────

function PricingToggle({
  annual,
  onToggle,
}: {
  annual: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-center gap-3 mt-6">
      <span className={`text-sm ${!annual ? "text-foreground font-medium" : "text-muted-foreground"}`}>
        Monthly
      </span>
      <button
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          annual ? "bg-primary" : "bg-muted"
        }`}
        role="switch"
        aria-checked={annual}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-background shadow transition-transform ${
            annual ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
      <span className={`text-sm ${annual ? "text-foreground font-medium" : "text-muted-foreground"}`}>
        Annual
      </span>
      {annual && (
        <span className="text-xs rounded-full bg-green-500/10 text-green-600 px-2 py-0.5 font-medium">
          2 months free
        </span>
      )}
    </div>
  );
}

function TierCard({ tier, annual }: { tier: Tier; annual: boolean }) {
  const price = annual ? tier.annualPrice : tier.monthlyPrice;
  const displayPrice =
    price === null ? "Custom" : price === 0 ? "Free" : `$${price}`;
  const period = price === null || price === 0 ? "" : annual ? "/mo billed annually" : "/month";

  return (
    <div
      className={`relative rounded-xl border flex flex-col p-6 transition-all ${
        tier.highlighted
          ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
          : "border-border hover:border-muted-foreground/30"
      }`}
    >
      {tier.highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow">
            Most Popular
          </span>
        </div>
      )}

      <div className="mb-4">
        <div className="font-bold text-lg">{tier.name}</div>
        <p className="text-xs text-muted-foreground mt-1">{tier.description}</p>
      </div>

      <div className="mb-5">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold">{displayPrice}</span>
          {period && <span className="text-xs text-muted-foreground">{period}</span>}
        </div>
        {annual && tier.monthlyPrice !== null && tier.monthlyPrice > 0 && (
          <div className="text-xs text-muted-foreground mt-0.5 line-through">
            ${tier.monthlyPrice}/mo billed monthly
          </div>
        )}
      </div>

      <ul className="space-y-2 flex-1 mb-6">
        {tier.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
            {f}
          </li>
        ))}
      </ul>

      <a
        href={tier.ctaHref}
        className={`block text-center rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${
          tier.highlighted
            ? "bg-primary text-primary-foreground hover:opacity-90"
            : "border border-border hover:bg-muted"
        }`}
      >
        {tier.cta}
      </a>
    </div>
  );
}

function ComparisonTable() {
  function Cell({ value }: { value: string | boolean }) {
    if (typeof value === "boolean") {
      return value ? (
        <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
      ) : (
        <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />
      );
    }
    return <span className="text-xs font-medium">{value}</span>;
  }

  return (
    <section className="border-b border-border">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-xl font-bold text-center mb-2">Feature comparison</h2>
        <p className="text-sm text-muted-foreground text-center mb-10">
          Everything across all plans at a glance.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 pr-4 text-muted-foreground font-normal text-xs w-48" />
                {["Free", "Starter", "Pro", "Enterprise"].map((name) => (
                  <th
                    key={name}
                    className={`py-3 px-4 text-center text-xs font-semibold ${
                      name === "Pro" ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_FEATURES.map((row) => (
                <tr key={row.label} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 text-xs text-muted-foreground">{row.label}</td>
                  <td className="py-3 px-4 text-center">
                    <Cell value={row.free} />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Cell value={row.starter} />
                  </td>
                  <td className="py-3 px-4 text-center bg-primary/5">
                    <Cell value={row.pro} />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Cell value={row.enterprise} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-4 text-left text-sm font-medium hover:text-primary transition-colors"
      >
        {q}
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      {open && (
        <p className="pb-4 text-sm text-muted-foreground leading-relaxed">{a}</p>
      )}
    </div>
  );
}

function TrustSignals() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
        No credit card required
      </span>
      <span className="flex items-center gap-1.5">
        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
        Cancel anytime
      </span>
      <span className="flex items-center gap-1.5">
        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
        First agent live in 5 minutes
      </span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function PricingPage() {
  const [annual, setAnnual] = React.useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/landing" className="flex items-center gap-2 text-sm font-semibold hover:opacity-80 transition-opacity">
            <Bot className="h-4 w-4 text-muted-foreground" />
            Doer
          </Link>
          <nav className="hidden sm:flex items-center gap-5 text-sm text-muted-foreground">
            <Link to="/landing" className="hover:text-foreground transition-colors">Home</Link>
            <a href="#comparison" className="hover:text-foreground transition-colors">Compare</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Sign in
            </Link>
            <Link
              to="/auth?mode=sign_up"
              className="text-sm rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Start Free
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="border-b border-border">
          <div className="max-w-3xl mx-auto px-6 py-16 text-center">
            <h1 className="text-4xl font-bold tracking-tight">
              Simple, transparent pricing
            </h1>
            <p className="mt-3 text-lg text-muted-foreground">
              Start free. No credit card required. Scale when you're ready.
            </p>
            <PricingToggle annual={annual} onToggle={() => setAnnual((v) => !v)} />
          </div>
        </section>

        {/* Tier Cards */}
        <section className="border-b border-border">
          <div className="max-w-5xl mx-auto px-6 py-12">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {TIERS.map((tier) => (
                <TierCard key={tier.name} tier={tier} annual={annual} />
              ))}
            </div>
            <TrustSignals />
          </div>
        </section>

        {/* Comparison Table */}
        <ComparisonTable />

        {/* FAQ */}
        <section id="faq" className="border-b border-border">
          <div className="max-w-2xl mx-auto px-6 py-16">
            <h2 className="text-xl font-bold text-center mb-2">Frequently asked questions</h2>
            <p className="text-sm text-muted-foreground text-center mb-10">
              Everything you need to know about Doer pricing.
            </p>
            <div>
              {FAQS.map((faq) => (
                <FaqItem key={faq.q} q={faq.q} a={faq.a} />
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section>
          <div className="max-w-3xl mx-auto px-6 py-16 text-center">
            <h2 className="text-2xl font-bold">Ready to build your AI team?</h2>
            <p className="mt-3 text-muted-foreground">
              Start free. First agent live in under 5 minutes.
            </p>
            <Link
              to="/auth?mode=sign_up"
              className="inline-flex mt-6 items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Get started — it's free <Zap className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Bot className="h-4 w-4 text-muted-foreground" />
            Doer
          </div>
          <nav className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <a href="/docs" className="hover:text-foreground transition-colors">Docs</a>
            <a href="/api" className="hover:text-foreground transition-colors">API</a>
            <a href="/blog" className="hover:text-foreground transition-colors">Blog</a>
            <a href="/status" className="hover:text-foreground transition-colors">Status</a>
            <a href="mailto:hello@doer.ai" className="hover:text-foreground transition-colors">Contact</a>
            <Link to="/auth" className="hover:text-foreground transition-colors">Sign in</Link>
          </nav>
          <p className="text-xs text-muted-foreground">© 2026 Doer. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
