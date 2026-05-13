import type { AdapterExecutionContext } from "@doerai/adapter-utils";
import { buildPaperclipEnv } from "@doerai/adapter-utils/server-utils";

// ── Shared Doer API client ──────────────────────────────────────────────

function getDoerApiUrl(ctx: AdapterExecutionContext): string | null {
  const env = buildPaperclipEnv(ctx.agent);
  return env.DOER_API_URL?.replace(/\/+$/, "") ?? null;
}

function buildAuthHeaders(ctx: AdapterExecutionContext): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (ctx.authToken) h.Authorization = `Bearer ${ctx.authToken}`;
  h["X-Doer-Run-Id"] = ctx.runId;
  return h;
}

async function doerGet(ctx: AdapterExecutionContext, path: string): Promise<unknown> {
  const base = getDoerApiUrl(ctx);
  if (!base) throw new Error("No DOER_API_URL");
  const res = await fetch(`${base}${path}`, { headers: buildAuthHeaders(ctx) });
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
  return res.json();
}

async function doerPost(ctx: AdapterExecutionContext, path: string, body: unknown): Promise<unknown> {
  const base = getDoerApiUrl(ctx);
  if (!base) throw new Error("No DOER_API_URL");
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: buildAuthHeaders(ctx),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} -> ${res.status}`);
  return res.json();
}

async function doerPatch(ctx: AdapterExecutionContext, path: string, body: unknown): Promise<unknown> {
  const base = getDoerApiUrl(ctx);
  if (!base) throw new Error("No DOER_API_URL");
  const res = await fetch(`${base}${path}`, {
    method: "PATCH",
    headers: buildAuthHeaders(ctx),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${path} -> ${res.status}`);
  return res.json();
}

async function doerPut(ctx: AdapterExecutionContext, path: string, body: unknown): Promise<unknown> {
  const base = getDoerApiUrl(ctx);
  if (!base) throw new Error("No DOER_API_URL");
  const res = await fetch(`${base}${path}`, {
    method: "PUT",
    headers: buildAuthHeaders(ctx),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${path} -> ${res.status}`);
  return res.json();
}

// ── Tool intercept implementations ──────────────────────────────────────

/** get_fleet_status — GET fleet snapshot from Doer */
export async function interceptGetFleetStatus(
  ctx: AdapterExecutionContext,
  _args: Record<string, unknown>,
): Promise<void> {
  try {
    const companyId = ctx.agent.companyId;
    const agents = (await doerGet(ctx, `/api/companies/${companyId}/agents`)) as Array<Record<string, unknown>>;

    const total = agents.length;
    const idle = agents.filter((a) => a.status === "idle").length;
    const error = agents.filter((a) => a.status === "error").length;
    const paused = agents.filter((a) => a.status === "paused").length;
    const running = agents.filter((a) => a.status === "running").length;

    const spenders = agents
      .filter((a) => typeof a.spentMonthlyCents === "number" && (a.spentMonthlyCents as number) > 0)
      .map((a) => ({ name: String(a.name ?? "?"), spent: a.spentMonthlyCents as number }));

    const payload = {
      total_agents: total,
      idle,
      error,
      paused,
      running,
      spenders,
      notes: `${idle} idle | ${error} error | ${paused} paused | ${running} running`,
    };

    await ctx.onLog("stdout", `[fleet_status] ${JSON.stringify(payload)}\n`);
  } catch (err) {
    await ctx.onLog("stderr", `[fleet_status] failed: ${err instanceof Error ? err.message : String(err)}\n`);
  }
}

/** schedule_council — wake agents + write shared agenda block */
export async function interceptScheduleCouncil(
  ctx: AdapterExecutionContext,
  args: Record<string, unknown>,
): Promise<void> {
  try {
    const companyId = ctx.agent.companyId;
    const agenda = String(args.agenda ?? "No agenda provided");
    const agentNamesRaw = args.agent_names;
    const urgency = String(args.urgency ?? "normal");

    // Get all agents to resolve names
    const agents = (await doerGet(ctx, `/api/companies/${companyId}/agents`)) as Array<Record<string, unknown>>;

    let targetAgents: Array<Record<string, unknown>> = [];
    if (Array.isArray(agentNamesRaw) && agentNamesRaw.length > 0) {
      const names = agentNamesRaw.map((n) => String(n).toLowerCase());
      targetAgents = agents.filter((a) => names.includes(String(a.name ?? "").toLowerCase()));
    } else {
      // Default council members
      const councilRoles = ["ceo", "cto", "researcher", "engineer"];
      targetAgents = agents.filter((a) => councilRoles.includes(String(a.role ?? "")));
    }

    // Write shared council_agenda block via Letta proxy
    const agendaPayload = {
      blockLabel: "council_agenda",
      value: JSON.stringify({
        topic: agenda,
        urgency,
        summoned_at: new Date().toISOString(),
        summoned_by: ctx.agent.name ?? "agent",
        participants: targetAgents.map((a) => a.name),
      }),
    };

    const adapterConfig = (ctx.agent.adapterConfig ?? {}) as Record<string, unknown>;
    const lettaAgentId = String(adapterConfig.agentId ?? "");
    if (lettaAgentId) {
      try {
        await doerPatch(ctx, `/api/agents/${ctx.agent.id}/letta/memory`, agendaPayload);
      } catch {
        // Non-fatal: council can proceed without shared block
      }
    }

    // Wake each agent via Doer heartbeat trigger
    const awakened: string[] = [];
    for (const a of targetAgents) {
      const agentId = String(a.id ?? "");
      if (!agentId) continue;
      try {
        await doerPost(ctx, `/api/agents/${agentId}/wake`, {
          message: `[COUNCIL SUMMON — ${urgency.toUpperCase()}]\n${agenda}\n\nCalled by ${ctx.agent.name ?? "agent"}.`,
        });
        awakened.push(String(a.name ?? "?"));
      } catch {
        // Agent wake failed, log but continue
      }
    }

    await ctx.onLog(
      "stdout",
      `[schedule_council] Summoned ${awakened.length}/${targetAgents.length} agents: ${awakened.join(", ")}\n`,
    );
  } catch (err) {
    await ctx.onLog("stderr", `[schedule_council] failed: ${err instanceof Error ? err.message : String(err)}\n`);
  }
}

/** emergency_pause_agent — disable heartbeat / pause */
export async function interceptEmergencyPauseAgent(
  ctx: AdapterExecutionContext,
  args: Record<string, unknown>,
): Promise<void> {
  try {
    const companyId = ctx.agent.companyId;
    const agentName = String(args.agent_name ?? "");
    const reason = String(args.reason ?? "");

    if (!agentName) {
      await ctx.onLog("stderr", `[emergency_pause] Missing agent_name\n`);
      return;
    }

    // Find agent by name
    const agents = (await doerGet(ctx, `/api/companies/${companyId}/agents`)) as Array<Record<string, unknown>>;
    const target = agents.find((a) => String(a.name ?? "").toLowerCase() === agentName.toLowerCase());

    if (!target) {
      await ctx.onLog("stderr", `[emergency_pause] Agent '${agentName}' not found\n`);
      return;
    }

    const agentId = String(target.id ?? "");

    // Pause the agent
    await doerPatch(ctx, `/api/agents/${agentId}`, { status: "paused", pauseReason: reason });

    await ctx.onLog("stdout", `[emergency_pause] Paused ${agentName} (${agentId}): ${reason}\n`);
  } catch (err) {
    await ctx.onLog("stderr", `[emergency_pause] failed: ${err instanceof Error ? err.message : String(err)}\n`);
  }
}

/** clone_from_template — create new agent from existing agent's spec */
export async function interceptCloneFromTemplate(
  ctx: AdapterExecutionContext,
  args: Record<string, unknown>,
): Promise<void> {
  try {
    const companyId = ctx.agent.companyId;
    const templateName = String(args.template_agent_name ?? "");
    const newName = String(args.new_agent_name ?? "");
    const role = String(args.role ?? "general");
    const title = String(args.title ?? "");

    if (!templateName || !newName) {
      await ctx.onLog("stderr", `[clone] Missing template_agent_name or new_agent_name\n`);
      return;
    }

    // Find template agent
    const agents = (await doerGet(ctx, `/api/companies/${companyId}/agents`)) as Array<Record<string, unknown>>;
    const template = agents.find((a) => String(a.name ?? "").toLowerCase() === templateName.toLowerCase());

    if (!template) {
      await ctx.onLog("stderr", `[clone] Template agent '${templateName}' not found\n`);
      return;
    }

    // Create new agent with copied config
    const newAgent = await doerPost(ctx, `/api/companies/${companyId}/agents`, {
      name: newName,
      role,
      title: title || `${templateName} Clone`,
      adapterType: template.adapterType,
      adapterConfig: template.adapterConfig,
      runtimeConfig: template.runtimeConfig,
    }) as Record<string, unknown>;

    const newAgentId = String(newAgent.id ?? "");

    // Ensure workspace exists
    if (newAgentId) {
      try {
        await doerPost(ctx, `/api/agents/${newAgentId}/workspace/ensure`, {});
      } catch {
        // Non-fatal
      }
    }

    await ctx.onLog("stdout", `[clone] Created ${newName} (${newAgentId}) from ${templateName}\n`);
  } catch (err) {
    await ctx.onLog("stderr", `[clone] failed: ${err instanceof Error ? err.message : String(err)}\n`);
  }
}

/** bulk_dispatch — create multiple issues */
export async function interceptBulkDispatch(
  ctx: AdapterExecutionContext,
  args: Record<string, unknown>,
): Promise<void> {
  try {
    const companyId = ctx.agent.companyId;
    const tasks = Array.isArray(args.tasks) ? (args.tasks as Array<Record<string, unknown>>) : [];
    const defaultPriority = String(args.default_priority ?? "medium");

    const created: Array<Record<string, unknown>> = [];

    for (const task of tasks) {
      const title = String(task.title ?? "Untitled");
      const description = String(task.description ?? "");
      const priority = String(task.priority ?? defaultPriority);
      const assignTo = task.assign_to ? String(task.assign_to) : null;

      let assigneeAgentId: string | null = null;
      if (assignTo) {
        const agents = (await doerGet(ctx, `/api/companies/${companyId}/agents`)) as Array<Record<string, unknown>>;
        const target = agents.find((a) => String(a.name ?? "").toLowerCase() === assignTo.toLowerCase());
        if (target) assigneeAgentId = String(target.id ?? "");
      }

      const issue = (await doerPost(ctx, `/api/companies/${companyId}/issues`, {
        title,
        description,
        priority,
        status: "todo",
        assigneeAgentId,
      })) as Record<string, unknown>;

      created.push({ id: issue.id, title, assignee: assignTo });
    }

    await ctx.onLog("stdout", `[bulk_dispatch] Created ${created.length} issues\n`);
  } catch (err) {
    await ctx.onLog("stderr", `[bulk_dispatch] failed: ${err instanceof Error ? err.message : String(err)}\n`);
  }
}

/** reassign_task — move issue to new gremlin */
export async function interceptReassignTask(
  ctx: AdapterExecutionContext,
  args: Record<string, unknown>,
): Promise<void> {
  try {
    const issueId = String(args.issue_id ?? "");
    const toGremlin = String(args.to_gremlin ?? "");

    if (!issueId || !toGremlin) {
      await ctx.onLog("stderr", `[reassign] Missing issue_id or to_gremlin\n`);
      return;
    }

    const companyId = ctx.agent.companyId;
    const agents = (await doerGet(ctx, `/api/companies/${companyId}/agents`)) as Array<Record<string, unknown>>;
    const target = agents.find((a) => String(a.name ?? "").toLowerCase() === toGremlin.toLowerCase());

    if (!target) {
      await ctx.onLog("stderr", `[reassign] Gremlin '${toGremlin}' not found\n`);
      return;
    }

    await doerPatch(ctx, `/api/issues/${issueId}`, { assigneeAgentId: String(target.id ?? "") });
    await ctx.onLog("stdout", `[reassign] Issue ${issueId} → ${toGremlin}\n`);
  } catch (err) {
    await ctx.onLog("stderr", `[reassign] failed: ${err instanceof Error ? err.message : String(err)}\n`);
  }
}

/** forecast_capacity — compute from run history */
export async function interceptForecastCapacity(
  ctx: AdapterExecutionContext,
  args: Record<string, unknown>,
): Promise<void> {
  try {
    const days = typeof args.days === "number" ? args.days : 7;
    const companyId = ctx.agent.companyId;

    // Get all agents
    const agents = (await doerGet(ctx, `/api/companies/${companyId}/agents`)) as Array<Record<string, unknown>>;
    const idle = agents.filter((a) => a.status === "idle").length;

    // Get recent runs (last N days)
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    let completedIssues = 0;

    try {
      const issues = (await doerGet(
        ctx,
        `/api/companies/${companyId}/issues?status=done&updatedAfter=${encodeURIComponent(since)}`,
      )) as Array<Record<string, unknown>>;
      completedIssues = issues.length;
    } catch {
      // Non-fatal: if issues endpoint doesn't support filters, skip
    }

    const throughput = completedIssues / Math.max(days, 1);
    const capacity = Math.round(idle * throughput * 2);

    const payload = {
      days,
      idle_agents: idle,
      completed_issues_last_window: completedIssues,
      throughput_per_day: Math.round(throughput * 10) / 10,
      estimated_capacity: capacity,
      notes: `Fleet can handle ~${capacity} issues in next ${days} days`,
    };

    await ctx.onLog("stdout", `[forecast_capacity] ${JSON.stringify(payload)}\n`);
  } catch (err) {
    await ctx.onLog("stderr", `[forecast_capacity] failed: ${err instanceof Error ? err.message : String(err)}\n`);
  }
}

/** build_dependency_graph — parse issue descriptions for dependencies */
export async function interceptBuildDependencyGraph(
  ctx: AdapterExecutionContext,
  args: Record<string, unknown>,
): Promise<void> {
  try {
    const companyId = ctx.agent.companyId;
    const issueIds = Array.isArray(args.issue_ids) ? (args.issue_ids as string[]) : null;
    const projectId = args.project_id ? String(args.project_id) : null;

    // Fetch issues
    let issues: Array<Record<string, unknown>> = [];
    if (issueIds && issueIds.length > 0) {
      for (const id of issueIds) {
        try {
          const issue = (await doerGet(ctx, `/api/issues/${id}`)) as Record<string, unknown>;
          issues.push(issue);
        } catch {
          // Skip missing issues
        }
      }
    } else {
      const url = projectId
        ? `/api/companies/${companyId}/issues?projectId=${encodeURIComponent(projectId)}`
        : `/api/companies/${companyId}/issues?status=todo,in_progress`;
      issues = (await doerGet(ctx, url)) as Array<Record<string, unknown>>;
    }

    // Parse dependencies
    const graph: Array<Record<string, unknown>> = [];
    const depRegex = /(?:blocked by|needs?|after|depends on)[\s#]*([a-f0-9\-]{36})/gi;

    for (const issue of issues) {
      const desc = String(issue.description ?? "");
      const deps: string[] = [];
      let match;
      while ((match = depRegex.exec(desc)) !== null) {
        deps.push(match[1]);
      }
      if (deps.length > 0) {
        graph.push({
          issue_id: issue.id,
          title: issue.title,
          dependencies: deps,
        });
      }
    }

    await ctx.onLog("stdout", `[dependency_graph] ${JSON.stringify({ nodes: issues.length, edges: graph.length, graph })}\n`);
  } catch (err) {
    await ctx.onLog("stderr", `[dependency_graph] failed: ${err instanceof Error ? err.message : String(err)}\n`);
  }
}

/** analyze_issue_patterns — cluster recent issues */
export async function interceptAnalyzeIssuePatterns(
  ctx: AdapterExecutionContext,
  args: Record<string, unknown>,
): Promise<void> {
  try {
    const companyId = ctx.agent.companyId;
    const limit = typeof args.limit === "number" ? Math.min(args.limit, 100) : 50;
    const sinceDays = typeof args.since_days === "number" ? args.since_days : 14;

    const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();

    const issues = (await doerGet(
      ctx,
      `/api/companies/${companyId}/issues?limit=${limit}&createdAfter=${encodeURIComponent(since)}`,
    )) as Array<Record<string, unknown>>;

    // Simple keyword clustering
    const topics: Record<string, number> = {};
    const agentLoad: Record<string, number> = {};
    let blocked = 0;

    for (const issue of issues) {
      const desc = String(issue.description ?? "").toLowerCase();
      const title = String(issue.title ?? "").toLowerCase();
      const assignee = String(issue.assigneeName ?? issue.assigneeAgentId ?? "unassigned");

      // Count by assignee
      agentLoad[assignee] = (agentLoad[assignee] ?? 0) + 1;

      // Simple topic detection
      const keywords = ["mcp", "integration", "api", "bug", "feature", "document", "refactor", "deploy", "test"];
      for (const kw of keywords) {
        if (desc.includes(kw) || title.includes(kw)) {
          topics[kw] = (topics[kw] ?? 0) + 1;
        }
      }

      if (issue.status === "blocked" || desc.includes("blocked")) blocked++;
    }

    const payload = {
      issues_analyzed: issues.length,
      window_days: sinceDays,
      top_topics: Object.entries(topics).sort((a, b) => b[1] - a[1]).slice(0, 5),
      agent_load: Object.entries(agentLoad).sort((a, b) => b[1] - a[1]),
      blocked_count: blocked,
    };

    await ctx.onLog("stdout", `[analyze_patterns] ${JSON.stringify(payload)}\n`);
  } catch (err) {
    await ctx.onLog("stderr", `[analyze_patterns] failed: ${err instanceof Error ? err.message : String(err)}\n`);
  }
}

/** scan_fleet_anomalies — full health sweep */
export async function interceptScanFleetAnomalies(
  ctx: AdapterExecutionContext,
  _args: Record<string, unknown>,
): Promise<void> {
  try {
    const companyId = ctx.agent.companyId;
    const agents = (await doerGet(ctx, `/api/companies/${companyId}/agents`)) as Array<Record<string, unknown>>;

    const anomalies: Array<Record<string, unknown>> = [];

    for (const a of agents) {
      const name = String(a.name ?? "?");
      const status = String(a.status ?? "");
      const spend = typeof a.spentMonthlyCents === "number" ? (a.spentMonthlyCents as number) : 0;
      const budget = typeof a.budgetMonthlyCents === "number" ? (a.budgetMonthlyCents as number) : 0;
      const lastHb = a.lastHeartbeatAt ? new Date(String(a.lastHeartbeatAt)) : null;
      const hoursSinceHb = lastHb ? (Date.now() - lastHb.getTime()) / 3600000 : Infinity;

      if (status === "error") {
        anomalies.push({ agent: name, type: "error_status", severity: "critical", detail: "Agent in error state" });
      }
      if (budget > 0 && spend > budget * 0.9) {
        anomalies.push({ agent: name, type: "budget", severity: "high", detail: `Spent $${spend / 100} of $${budget / 100} budget` });
      }
      if (hoursSinceHb > 24) {
        anomalies.push({ agent: name, type: "stale_heartbeat", severity: "medium", detail: `Last heartbeat ${Math.round(hoursSinceHb)}h ago` });
      }
      if (status === "paused" && a.pauseReason) {
        anomalies.push({ agent: name, type: "paused", severity: "low", detail: `Paused: ${a.pauseReason}` });
      }
    }

    const critical = anomalies.filter((a) => a.severity === "critical").length;
    const high = anomalies.filter((a) => a.severity === "high").length;

    const payload = {
      total_agents: agents.length,
      anomalies_found: anomalies.length,
      critical,
      high,
      anomalies,
      summary: `${critical} critical | ${high} high | ${anomalies.length - critical - high} other`,
    };

    await ctx.onLog("stdout", `[fleet_anomalies] ${JSON.stringify(payload)}\n`);
  } catch (err) {
    await ctx.onLog("stderr", `[fleet_anomalies] failed: ${err instanceof Error ? err.message : String(err)}\n`);
  }
}

/** audit_agent_compliance — compare live config vs repo spec */
export async function interceptAuditAgentCompliance(
  ctx: AdapterExecutionContext,
  args: Record<string, unknown>,
): Promise<void> {
  try {
    const agentName = String(args.agent_name ?? "");
    if (!agentName) {
      await ctx.onLog("stderr", `[audit] Missing agent_name\n`);
      return;
    }

    // Try to read canonical spec from local repo
    const fs = await import("node:fs");
    const path = await import("node:path");
    const repoPath = "/Users/clay/Desktop/donjon.agency/donjonOrg/donjon-paperclip";
    const specPath = path.join(repoPath, "agents", agentName.toLowerCase(), "AGENTS.md");

    let specExists = false;
    try {
      fs.accessSync(specPath);
      specExists = true;
    } catch {
      specExists = false;
    }

    // Get live Letta snapshot
    const companyId = ctx.agent.companyId;
    const agents = (await doerGet(ctx, `/api/companies/${companyId}/agents`)) as Array<Record<string, unknown>>;
    const liveAgent = agents.find((a) => String(a.name ?? "").toLowerCase() === agentName.toLowerCase());

    if (!liveAgent) {
      await ctx.onLog("stderr", `[audit] Agent '${agentName}' not found in Doer\n`);
      return;
    }

    // Compare adapter config
    const drift: string[] = [];
    if (!specExists) {
      drift.push("No canonical AGENTS.md found in repo");
    }

    const payload = {
      agent: agentName,
      spec_exists: specExists,
      spec_path: specPath,
      live_status: liveAgent.status,
      live_adapter_type: liveAgent.adapterType,
      drift,
      compliant: drift.length === 0,
    };

    await ctx.onLog("stdout", `[audit_compliance] ${JSON.stringify(payload)}\n`);
  } catch (err) {
    await ctx.onLog("stderr", `[audit_compliance] failed: ${err instanceof Error ? err.message : String(err)}\n`);
  }
}

/** generate_weekly_brief — compile fleet activity */
export async function interceptGenerateWeeklyBrief(
  ctx: AdapterExecutionContext,
  _args: Record<string, unknown>,
): Promise<void> {
  try {
    const companyId = ctx.agent.companyId;
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Get issues opened/closed this week
    let opened = 0;
    let closed = 0;
    try {
      const allIssues = (await doerGet(ctx, `/api/companies/${companyId}/issues`)) as Array<Record<string, unknown>>;
      opened = allIssues.filter((i) => i.createdAt && String(i.createdAt) >= since).length;
      closed = allIssues.filter((i) => i.status === "done" && i.updatedAt && String(i.updatedAt) >= since).length;
    } catch {
      // Non-fatal
    }

    // Get deliverables
    let deliverables = 0;
    try {
      const dels = (await doerGet(ctx, `/api/companies/${companyId}/deliverables`)) as Array<Record<string, unknown>>;
      deliverables = dels.filter((d) => d.createdAt && String(d.createdAt) >= since).length;
    } catch {
      // Non-fatal
    }

    // Get spend
    const agents = (await doerGet(ctx, `/api/companies/${companyId}/agents`)) as Array<Record<string, unknown>>;
    const totalSpend = agents.reduce((sum, a) => sum + (typeof a.spentMonthlyCents === "number" ? (a.spentMonthlyCents as number) : 0), 0);

    const brief = {
      period: "last_7_days",
      issues_opened: opened,
      issues_closed: closed,
      deliverables_produced: deliverables,
      total_spend_cents: totalSpend,
      total_spend_dollars: totalSpend / 100,
      fleet_size: agents.length,
      active_agents: agents.filter((a) => a.status === "idle" || a.status === "running").length,
    };

    await ctx.onLog("stdout", `[weekly_brief] ${JSON.stringify(brief)}\n`);
  } catch (err) {
    await ctx.onLog("stderr", `[weekly_brief] failed: ${err instanceof Error ? err.message : String(err)}\n`);
  }
}

// ── Tool name constants for execute.ts wiring ────────────────────────────

export const GET_FLEET_STATUS_TOOL_NAME = "get_fleet_status";
export const SCHEDULE_COUNCIL_TOOL_NAME = "schedule_council";
export const EMERGENCY_PAUSE_AGENT_TOOL_NAME = "emergency_pause_agent";
export const CLONE_FROM_TEMPLATE_TOOL_NAME = "clone_from_template";
export const BULK_DISPATCH_TOOL_NAME = "bulk_dispatch";
export const REASSIGN_TASK_TOOL_NAME = "reassign_task";
export const FORECAST_CAPACITY_TOOL_NAME = "forecast_capacity";
export const BUILD_DEPENDENCY_GRAPH_TOOL_NAME = "build_dependency_graph";
export const ANALYZE_ISSUE_PATTERNS_TOOL_NAME = "analyze_issue_patterns";
export const SCAN_FLEET_ANOMALIES_TOOL_NAME = "scan_fleet_anomalies";
export const AUDIT_AGENT_COMPLIANCE_TOOL_NAME = "audit_agent_compliance";
export const GENERATE_WEEKLY_BRIEF_TOOL_NAME = "generate_weekly_brief";
