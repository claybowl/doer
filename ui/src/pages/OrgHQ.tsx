import { useEffect, useState } from "react";
import { Link } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import { agentsApi } from "../api/agents";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { Building2, Zap, Clock, Users, ArrowRight, BookOpen, Rss } from "lucide-react";

type FeedTab = "updates" | "docs";

const FEED_CARDS = [
  {
    tag: "TUTORIAL",
    tagColor: "text-emerald-400",
    tagBg: "bg-emerald-950/60",
    title: "Building Your First Automation in 5 Steps",
  },
  {
    tag: "ENGINEERING",
    tagColor: "text-violet-400",
    tagBg: "bg-violet-950/60",
    title: "How We Cut API Latency by 60% with Edge Functions",
  },
  {
    tag: "VISION",
    tagColor: "text-red-400",
    tagBg: "bg-red-950/60",
    title: "The Agentic Web: Why 2026 Changes Everything",
  },
];

const DOC_LINKS = [
  { title: "Getting Started", description: "Deploy your first agent in 10 minutes." },
  { title: "Agent Architecture", description: "How Doer models multi-agent workflows." },
  { title: "Cost & Budget Controls", description: "Hard stops, approvals, and spend governance." },
  { title: "Routines & Automations", description: "Schedule recurring agent tasks." },
  { title: "API Reference", description: "REST endpoints, auth, and rate limits." },
];

export function OrgHQ() {
  const { selectedCompanyId, selectedCompany } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const [activeTab, setActiveTab] = useState<FeedTab>("updates");

  useEffect(() => {
    setBreadcrumbs([{ label: "HQ" }]);
  }, [setBreadcrumbs]);

  const { data: agents } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const activeAgentCount = agents?.filter((a) => a.status === "active").length ?? 0;
  const totalAgentCount = agents?.length ?? 0;

  return (
    <div className="flex flex-col min-h-0 h-full overflow-y-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4 shrink-0 border-b border-border">
        <h1 className="text-lg font-semibold text-foreground">
          Welcome to {selectedCompany?.name ?? "HQ"}
        </h1>
        <Link
          to="/agents/new"
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold transition-colors"
        >
          + New Agent
        </Link>
      </div>

      <div className="flex flex-1 min-h-0 gap-6 px-8 py-6">
        {/* Main column */}
        <div className="flex flex-col flex-1 min-w-0 gap-8">
          {/* Hero */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-0">
              <h2 className="text-5xl font-extrabold text-foreground leading-tight">
                Orchestrate anything.
              </h2>
              <h2 className="text-5xl font-extrabold text-emerald-400 leading-tight">
                Ship faster.
              </h2>
            </div>
            <p className="text-sm text-muted-foreground max-w-lg mt-1">
              Doer turns your workflows into intelligent automation — deploy agents, govern costs,
              and reclaim your time.
            </p>
            <div className="flex items-center gap-3 mt-2">
              <Link
                to="/agents/new"
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold transition-colors"
              >
                Get Started <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <a
                href="https://docs.doer.ai"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
              >
                Read the Docs
              </a>
            </div>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-4 gap-6">
            <StatBlock
              label="AGENTS ACTIVE"
              value={String(activeAgentCount || totalAgentCount)}
              sub={totalAgentCount > 0 ? `${totalAgentCount} total` : "No agents yet"}
              valueClassName="text-emerald-400"
            />
            <StatBlock
              label="AGENTS TOTAL"
              value={String(totalAgentCount)}
              sub="across all projects"
            />
            <StatBlock
              label="HOURS SAVED"
              value="—"
              sub="Coming soon"
            />
            <StatBlock
              label="TEAM MEMBERS"
              value="—"
              sub="Invite your team"
            />
          </div>

          {/* Feed tabs */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-6 border-b border-border">
              <button
                onClick={() => setActiveTab("updates")}
                className={`flex items-center gap-1.5 pb-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === "updates"
                    ? "border-emerald-400 text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Rss className="h-3.5 w-3.5" />
                Blog &amp; Updates
              </button>
              <button
                onClick={() => setActiveTab("docs")}
                className={`flex items-center gap-1.5 pb-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === "docs"
                    ? "border-emerald-400 text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                Documentation
              </button>
            </div>

            {activeTab === "updates" && (
              <div className="flex flex-col gap-4">
                {/* Featured card */}
                <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
                  <span className="text-[10px] font-semibold tracking-widest text-emerald-400 uppercase">
                    ✦ Featured — Product Update
                  </span>
                  <h3 className="text-base font-bold text-foreground">
                    Introducing Doer HQ: Autonomous Agent Orchestration
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Multi-step reasoning, persistent memory, and tool chaining — all in one visual canvas.
                    Deploy your first autonomous workflow in under 10 minutes.
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Don Clayjon · Apr 2, 2026</span>
                    <button className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
                      Read more →
                    </button>
                  </div>
                </div>

                {/* Feed cards grid */}
                <div className="grid grid-cols-3 gap-4">
                  {FEED_CARDS.map((card) => (
                    <div key={card.tag} className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold tracking-wider w-fit ${card.tagColor} ${card.tagBg}`}>
                        {card.tag}
                      </span>
                      <div className="h-16 rounded-md bg-muted/30" />
                      <p className="text-xs font-semibold text-foreground leading-snug">{card.title}</p>
                      <button className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors text-left">
                        Read →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "docs" && (
              <div className="flex flex-col gap-2">
                {DOC_LINKS.map((doc) => (
                  <a
                    key={doc.title}
                    href="https://docs.doer.ai"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-card hover:bg-accent/40 transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{doc.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{doc.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="flex flex-col gap-4 w-72 shrink-0">
          {/* Quick Actions */}
          <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
            <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Quick Actions
            </h4>
            <div className="flex flex-col gap-2">
              <QuickAction
                icon={<Building2 className="h-4 w-4" />}
                label="New Agent"
                to="/agents/new"
              />
              <QuickAction
                icon={<Zap className="h-4 w-4" />}
                label="New Routine"
                to="/routines"
              />
              <QuickAction
                icon={<Clock className="h-4 w-4" />}
                label="View Activity"
                to="/activity"
              />
              <QuickAction
                icon={<Users className="h-4 w-4" />}
                label="Org Chart"
                to="/org"
              />
            </div>
          </div>

          {/* Platform summary */}
          <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
            <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Platform
            </h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Agents</span>
                <span className="font-medium text-foreground">{totalAgentCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Active</span>
                <span className="font-medium text-emerald-400">{activeAgentCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBlock({
  label,
  value,
  sub,
  valueClassName = "text-foreground",
}: {
  label: string;
  value: string;
  sub: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
        {label}
      </span>
      <span className={`text-4xl font-bold ${valueClassName}`}>{value}</span>
      <span className="text-xs text-muted-foreground">{sub}</span>
    </div>
  );
}

function QuickAction({ icon, label, to }: { icon: React.ReactNode; label: string; to: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-accent/50 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      {icon}
      {label}
    </Link>
  );
}
