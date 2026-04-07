import { useState } from "react";
import { LayoutDashboard, BookOpen, FileText, Zap, Users, Activity, TrendingUp, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "blog", label: "Blog & Updates", icon: BookOpen },
  { id: "docs", label: "Documentation", icon: FileText },
] as const;

type TabId = (typeof TABS)[number]["id"];

// Mock data — replace with real API calls
const STATS = [
  { label: "Active Agents", value: "12", icon: Users, change: "+2 this week" },
  { label: "Tasks Completed", value: "847", icon: Activity, change: "+23 today" },
  { label: "Avg Response", value: "1.2s", icon: Zap, change: "-0.3s vs last week" },
  { label: "Uptime", value: "99.9%", icon: TrendingUp, change: "30-day streak" },
];

const BLOG_POSTS = [
  {
    id: "1",
    title: "Welcome to Doer — Your AI Agent Command Center",
    excerpt: "Get started with your first agent and learn how Doer orchestrates your automation workforce.",
    author: "Doer Team",
    date: "Apr 1, 2026",
    readTime: "4 min read",
    featured: true,
    tag: "Getting Started",
    tagColor: "bg-teal-500/20 text-teal-400",
  },
  {
    id: "2",
    title: "How to Build Your First Routine",
    excerpt: "Routines let you schedule agent workflows. Here's how to create one in under 5 minutes.",
    author: "Doer Team",
    date: "Mar 28, 2026",
    readTime: "3 min read",
    featured: false,
    tag: "Tutorial",
    tagColor: "bg-blue-500/20 text-blue-400",
  },
  {
    id: "3",
    title: "Agent Memory: What Your Agents Remember",
    excerpt: "Understand how Doer agents maintain context across sessions and what that means for your workflows.",
    author: "Doer Team",
    date: "Mar 25, 2026",
    readTime: "5 min read",
    featured: false,
    tag: "Deep Dive",
    tagColor: "bg-purple-500/20 text-purple-400",
  },
  {
    id: "4",
    title: "Integrating External Tools with MCP Servers",
    excerpt: "Connect your agents to GitHub, Slack, Notion, and 50+ other tools through the MCP ecosystem.",
    author: "Doer Team",
    date: "Mar 20, 2026",
    readTime: "6 min read",
    featured: false,
    tag: "Integration",
    tagColor: "bg-amber-500/20 text-amber-400",
  },
  {
    id: "5",
    title: "Security Best Practices for AI Agents",
    excerpt: "Keep your automation workforce secure with these essential practices and configurations.",
    author: "Doer Team",
    date: "Mar 15, 2026",
    readTime: "7 min read",
    featured: false,
    tag: "Security",
    tagColor: "bg-red-500/20 text-red-400",
  },
];

const DOCS_SECTIONS = [
  {
    title: "Getting Started",
    items: [
      { label: "Quick Start Guide", href: "#" },
      { label: "Creating Your First Agent", href: "#" },
      { label: "Understanding Workspaces", href: "#" },
      { label: "Core Concepts", href: "#" },
    ],
  },
  {
    title: "Agents & Skills",
    items: [
      { label: "Agent Types Reference", href: "#" },
      { label: "Building Custom Skills", href: "#" },
      { label: "Memory Management", href: "#" },
      { label: "Agent Communication", href: "#" },
    ],
  },
  {
    title: "Workflows",
    items: [
      { label: "Routines & Scheduling", href: "#" },
      { label: "Triggers & Events", href: "#" },
      { label: "Conditional Logic", href: "#" },
      { label: "Error Handling", href: "#" },
    ],
  },
  {
    title: "Integrations",
    items: [
      { label: "MCP Server Setup", href: "#" },
      { label: "Slack Integration", href: "#" },
      { label: "GitHub Actions", href: "#" },
      { label: "API Webhooks", href: "#" },
    ],
  },
  {
    title: "Administration",
    items: [
      { label: "Team Management", href: "#" },
      { label: "Permissions & Roles", href: "#" },
      { label: "Audit Logs", href: "#" },
      { label: "Billing & Plans", href: "#" },
    ],
  },
];

export function CompanyHome() {
  const [activeTab, setActiveTab] = useState<TabId>("blog");

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Hero Section */}
        <div className="relative mb-8 rounded-2xl border border-border/50 bg-gradient-to-br from-background via-background to-accent/5 overflow-hidden">
          {/* Animated background grid */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
            }}
          />
          {/* Floating orbs */}
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-teal-500/20 to-transparent rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-gradient-to-tr from-blue-500/20 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />

          <div className="relative px-8 py-12">
            {/* Banner image in top right, replacing logo text */}
            <div className="absolute top-6 right-8">
              <img
                src="https://i.ibb.co/rKfCzsQV/doer-banner.png"
                alt="Doer banner"
                className="h-24 w-auto object-contain"
              />
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-blue-500">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
                </svg>
              </div>
            </div>

            <h2 className="text-4xl font-bold text-foreground mb-3">
              Your AI agent workforce,<br />
              <span className="bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">
                organized and running.
              </span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mb-6">
              Deploy agents, automate workflows, and scale your operations — all from one command center.
            </p>

            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Last sync: Just now</span>
              </div>
              <span className="text-border">•</span>
              <div className="flex items-center gap-2 text-teal-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500" />
                </span>
                <span>All systems operational</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{stat.label}</span>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold text-foreground">{stat.value}</span>
                <span className="text-xs text-muted-foreground">{stat.change}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-lg bg-muted/30 w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "blog" && (
          <div className="space-y-6">
            {/* Featured Post */}
            {BLOG_POSTS.filter(p => p.featured).map((post) => (
              <div
                key={post.id}
                className="group relative rounded-2xl border border-border/50 bg-gradient-to-br from-card to-card/50 p-6 hover:border-teal-500/30 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", post.tagColor)}>
                    {post.tag}
                  </span>
                  <span className="text-sm text-muted-foreground">{post.date}</span>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-teal-400 transition-colors">
                  {post.title}
                </h3>
                <p className="text-muted-foreground mb-4">{post.excerpt}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">By {post.author}</span>
                  <span className="text-sm text-teal-400 font-medium group-hover:underline">
                    Read more →
                  </span>
                </div>
              </div>
            ))}

            {/* Blog Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {BLOG_POSTS.filter(p => !p.featured).map((post) => (
                <div
                  key={post.id}
                  className="group rounded-xl border border-border/50 bg-card/30 p-5 hover:border-border hover:bg-card/50 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", post.tagColor)}>
                      {post.tag}
                    </span>
                    <span className="text-xs text-muted-foreground">{post.readTime}</span>
                  </div>
                  <h4 className="font-semibold text-foreground mb-2 group-hover:text-teal-400 transition-colors line-clamp-2">
                    {post.title}
                  </h4>
                  <p className="text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "docs" && (
          <div className="grid lg:grid-cols-[200px_1fr] gap-6">
            {/* Docs Sidebar */}
            <div className="space-y-6">
              {DOCS_SECTIONS.map((section) => (
                <div key={section.title}>
                  <h4 className="text-sm font-semibold text-foreground mb-2">{section.title}</h4>
                  <ul className="space-y-1">
                    {section.items.map((item) => (
                      <li key={item.label}>
                        <a
                          href={item.href}
                          className="text-sm text-muted-foreground hover:text-teal-400 transition-colors block py-1"
                        >
                          {item.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Docs Content */}
            <div className="rounded-xl border border-border/50 bg-card/30 p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Quick Start Guide</h3>
              <div className="prose prose-sm prose-invert max-w-none">
                <p className="text-muted-foreground mb-4">
                  Welcome to Doer! This guide will walk you through setting up your first agent in under 5 minutes.
                </p>
                <h4 className="text-foreground font-semibold mt-6 mb-3">Step 1: Create Your First Agent</h4>
                <p className="text-muted-foreground mb-4">
                  Click the <strong className="text-foreground">"New Agent"</strong> button in the sidebar to start. Give your agent a name and select its primary role.
                </p>
                <h4 className="text-foreground font-semibold mt-6 mb-3">Step 2: Connect Tools</h4>
                <p className="text-muted-foreground mb-4">
                  Navigate to Skills to browse and install MCP tools. Popular options include Slack, GitHub, and Notion integrations.
                </p>
                <h4 className="text-foreground font-semibold mt-6 mb-3">Step 3: Create a Routine</h4>
                <p className="text-muted-foreground mb-4">
                  Routines let you schedule agent tasks. Go to <strong className="text-foreground">Routines</strong> and click "New Routine" to set up automated workflows.
                </p>
                <div className="mt-6 p-4 rounded-lg bg-teal-500/10 border border-teal-500/20">
                  <p className="text-sm text-teal-400">
                    <strong>Pro tip:</strong> Start with simple, focused agents before building complex multi-agent workflows.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
