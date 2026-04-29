import { Link } from "@/lib/router";
import {
  Bot,
  ClipboardList,
  Zap,
  CheckCircle2,
  X,
  BarChart3,
  PenLine,
  ShoppingCart,
  Code2,
} from "lucide-react";

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="max-w-5xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          Now in early access
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
          Your AI workforce.<br />
          <span className="text-muted-foreground">Ready in 5 minutes.</span>
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Doer lets you spin up autonomous AI agents that actually complete tasks — research, write,
          coordinate, and ship — without hand-holding.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/auth?mode=sign_up"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Start Free <Zap className="h-4 w-4" />
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 rounded-md border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            See how it works
          </a>
        </div>

        {/* Animated agent demo */}
        <div className="mt-16 rounded-xl border border-border bg-card shadow-lg overflow-hidden max-w-3xl mx-auto">
          <div className="border-b border-border px-4 py-2 flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
            <span className="ml-3 text-xs text-muted-foreground">Doer — Agent Dashboard</span>
          </div>
          <div className="p-4 space-y-2">
            {[
              { name: "Research Bot", task: "Summarised 12 competitor sites", status: "done" },
              { name: "Content Writer", task: "Drafted 3 blog posts", status: "done" },
              { name: "Sales Assistant", task: "Qualifying 47 leads...", status: "running" },
              { name: "PM Agent", task: "Updating sprint board", status: "running" },
            ].map((agent) => (
              <div key={agent.name} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 bg-background">
                <Bot className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium">{agent.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{agent.task}</div>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    agent.status === "done"
                      ? "bg-green-500/10 text-green-600"
                      : "bg-blue-500/10 text-blue-600"
                  }`}
                >
                  {agent.status === "done" ? "Done" : "Running"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      number: "01",
      icon: <Bot className="h-6 w-6" />,
      title: "Create your agents",
      description:
        "Choose from templates (researcher, writer, sales, PM) or describe exactly what you need. Agents are configured and ready in under a minute.",
    },
    {
      number: "02",
      icon: <ClipboardList className="h-6 w-6" />,
      title: "Assign tasks",
      description:
        "Create issues and assign them to agents — or let agents pick up work automatically. Clear briefs, clear outputs.",
    },
    {
      number: "03",
      icon: <Zap className="h-6 w-6" />,
      title: "Watch them work",
      description:
        "Agents run on heartbeats, report progress in real time, surface blockers, and hand off to humans when needed. You stay in the loop, not in the weeds.",
    },
  ];

  return (
    <section id="how-it-works" className="border-b border-border">
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold">How it works</h2>
          <p className="mt-2 text-muted-foreground">Three steps from idea to autonomous execution.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div key={step.number} className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-muted-foreground/20">{step.number}</span>
                <span className="text-muted-foreground">{step.icon}</span>
              </div>
              <h3 className="font-semibold">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

function Pricing() {
  const tiers = [
    {
      name: "Free",
      price: "$0",
      period: "/month",
      description: "For individuals exploring AI agents.",
      features: ["3 agents", "50 task runs/month", "Community support", "Basic templates"],
      cta: "Start Free",
      ctaHref: "/auth?mode=sign_up",
      highlighted: false,
    },
    {
      name: "Pro",
      price: "$29",
      period: "/month",
      description: "For power users running real workflows.",
      features: ["10 agents", "1,000 task runs/month", "Email support", "All templates", "Webhooks & API"],
      cta: "Start Pro",
      ctaHref: "/auth?mode=sign_up",
      highlighted: true,
    },
    {
      name: "Team",
      price: "$99",
      period: "/month",
      description: "For teams automating serious work.",
      features: ["Unlimited agents", "10,000 task runs/month", "Priority support", "Custom adapters", "SSO + audit log"],
      cta: "Start Team",
      ctaHref: "/auth?mode=sign_up",
      highlighted: false,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      description: "For orgs that need control and scale.",
      features: ["Self-hosted option", "SLA guarantee", "Dedicated support", "Custom contracts", "Advanced security"],
      cta: "Contact Us",
      ctaHref: "mailto:hello@doer.ai",
      highlighted: false,
    },
  ];

  return (
    <section id="pricing" className="border-b border-border">
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold">Pricing</h2>
          <p className="mt-2 text-muted-foreground">Start free, scale when you're ready.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-xl border p-5 flex flex-col gap-4 ${
                tier.highlighted
                  ? "border-primary bg-primary/5"
                  : "border-border"
              }`}
            >
              {tier.highlighted && (
                <span className="text-xs font-medium text-primary uppercase tracking-wide">Most popular</span>
              )}
              <div>
                <div className="font-bold text-lg">{tier.name}</div>
                <div className="flex items-baseline gap-0.5 mt-1">
                  <span className="text-2xl font-bold">{tier.price}</span>
                  <span className="text-xs text-muted-foreground">{tier.period}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{tier.description}</p>
              </div>
              <ul className="space-y-1.5 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href={tier.ctaHref}
                className={`block text-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  tier.highlighted
                    ? "bg-primary text-primary-foreground hover:opacity-90"
                    : "border border-border hover:bg-muted"
                }`}
              >
                {tier.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Comparison ───────────────────────────────────────────────────────────────

function Comparison() {
  const features = [
    "Autonomous task execution",
    "Multi-agent orchestration",
    "Built-in task management",
    "Human-in-the-loop approvals",
    "Heartbeat scheduling",
    "Webhook integrations",
    "Self-hostable",
    "Open source core",
  ];

  const tools = [
    { name: "Doer", values: [true, true, true, true, true, true, true, true] },
    { name: "n8n", values: [false, false, false, false, true, true, true, true] },
    { name: "Zapier", values: [false, false, false, false, true, true, false, false] },
    { name: "CrewAI", values: [true, true, false, false, false, false, true, true] },
    { name: "Make", values: [false, false, false, false, true, true, false, false] },
  ];

  return (
    <section id="comparison" className="border-b border-border">
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold">How we compare</h2>
          <p className="mt-2 text-muted-foreground">Doer versus the alternatives.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 pr-4 text-muted-foreground font-normal text-xs">Feature</th>
                {tools.map((tool) => (
                  <th
                    key={tool.name}
                    className={`py-3 px-4 text-center text-xs font-semibold ${
                      tool.name === "Doer" ? "text-primary" : "text-muted-foreground font-normal"
                    }`}
                  >
                    {tool.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.map((feature, fi) => (
                <tr key={feature} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 text-xs text-muted-foreground">{feature}</td>
                  {tools.map((tool) => (
                    <td key={tool.name} className="py-3 px-4 text-center">
                      {tool.values[fi] ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// ─── Use Cases ────────────────────────────────────────────────────────────────

function UseCases() {
  const cases = [
    {
      icon: <Zap className="h-5 w-5" />,
      title: "Startup founders",
      description:
        "Punch above your weight. Let agents handle research, content, and ops so you can focus on building.",
    },
    {
      icon: <ShoppingCart className="h-5 w-5" />,
      title: "Service businesses",
      description:
        "Automate lead qualification, follow-ups, and client reports without hiring more staff.",
    },
    {
      icon: <PenLine className="h-5 w-5" />,
      title: "Content teams",
      description:
        "Scale output without scaling headcount — research, draft, edit, and publish on autopilot.",
    },
    {
      icon: <Code2 className="h-5 w-5" />,
      title: "Developers",
      description:
        "Build agent-powered workflows with webhooks and the open API. Self-host for full control.",
    },
    {
      icon: <BarChart3 className="h-5 w-5" />,
      title: "Analysts",
      description:
        "Agents that monitor data, surface signals, and write reports — so you spend time on decisions, not data wrangling.",
    },
    {
      icon: <Bot className="h-5 w-5" />,
      title: "Agencies",
      description:
        "Deliver more for clients with agent-powered delivery. White-label and extend with the API.",
    },
  ];

  return (
    <section id="use-cases" className="border-b border-border">
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold">Who uses Doer</h2>
          <p className="mt-2 text-muted-foreground">Built for builders and operators at every scale.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cases.map((c) => (
            <div key={c.title} className="rounded-lg border border-border p-5 flex gap-4">
              <span className="text-muted-foreground mt-0.5 shrink-0">{c.icon}</span>
              <div>
                <div className="font-semibold text-sm">{c.title}</div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{c.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────

function FinalCTA() {
  return (
    <section className="border-b border-border">
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="text-2xl font-bold">Ready to build your AI team?</h2>
        <p className="mt-3 text-muted-foreground">
          Start free. No credit card required. First agent live in under 5 minutes.
        </p>
        <Link
          to="/auth?mode=sign_up"
          className="inline-flex mt-6 items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Get started — it's free <Zap className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
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
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Bot className="h-4 w-4 text-muted-foreground" />
            Doer
          </div>
          <nav className="hidden sm:flex items-center gap-5 text-sm text-muted-foreground">
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#comparison" className="hover:text-foreground transition-colors">Compare</a>
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
        <Hero />
        <HowItWorks />
        <Pricing />
        <Comparison />
        <UseCases />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
