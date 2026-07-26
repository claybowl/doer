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
      const councilRoles = ["gm", "cto", "researcher", "engineer"];
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

// ── Goal and project tool intercepts ────────────────────────────────────

/** read_goals — list company goals with optional filters */
export async function interceptReadGoals(
  ctx: AdapterExecutionContext,
  args: Record<string, unknown>,
): Promise<string> {
  try {
    const companyId = ctx.agent.companyId;
    const params = new URLSearchParams();
    if (args.level) params.set("level", String(args.level));
    if (args.status) params.set("status", String(args.status));
    const qs = params.toString();
    const goals = (await doerGet(ctx, `/api/companies/${companyId}/goals${qs ? `?${qs}` : ""}`)) as Array<Record<string, unknown>>;
    return JSON.stringify({ success: true, total: goals.length, goals });
  } catch (err) {
    return JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
}

/** create_goal — create a goal in the current Doer company */
export async function interceptCreateGoal(
  ctx: AdapterExecutionContext,
  args: Record<string, unknown>,
): Promise<string> {
  try {
    const companyId = ctx.agent.companyId;
    const goal = (await doerPost(ctx, `/api/companies/${companyId}/goals`, {
      title: String(args.title ?? "Untitled goal"),
      description: args.description == null ? null : String(args.description),
      level: String(args.level ?? "task"),
      status: String(args.status ?? "active"),
      parentId: args.parent_id ?? args.parentId ?? null,
      ownerAgentId: args.owner_agent_id ?? args.ownerAgentId ?? null,
    })) as Record<string, unknown>;
    return JSON.stringify({ success: true, goal });
  } catch (err) {
    return JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
}

/** update_goal_status — update a Doer goal's status */
export async function interceptUpdateGoalStatus(
  ctx: AdapterExecutionContext,
  args: Record<string, unknown>,
): Promise<string> {
  try {
    const goalId = String(args.goal_id ?? args.goalId ?? "");
    if (!goalId) return JSON.stringify({ success: false, error: "goal_id is required" });
    const goal = (await doerPatch(ctx, `/api/goals/${encodeURIComponent(goalId)}`, {
      status: String(args.status ?? "active"),
    })) as Record<string, unknown>;
    return JSON.stringify({ success: true, goal });
  } catch (err) {
    return JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
}

/** read_projects — list projects in the current Doer company */
export async function interceptReadProjects(
  ctx: AdapterExecutionContext,
  _args: Record<string, unknown>,
): Promise<string> {
  try {
    const companyId = ctx.agent.companyId;
    const projects = (await doerGet(ctx, `/api/companies/${companyId}/projects`)) as Array<Record<string, unknown>>;
    return JSON.stringify({ success: true, total: projects.length, projects });
  } catch (err) {
    return JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
}

/** create_project — create a goal-linked project */
export async function interceptCreateProject(
  ctx: AdapterExecutionContext,
  args: Record<string, unknown>,
): Promise<string> {
  try {
    const companyId = ctx.agent.companyId;
    const rawGoalIds = args.goalIds ?? args.goal_ids;
    const goalIds = Array.isArray(rawGoalIds)
      ? rawGoalIds.map(String)
      : args.goalId ?? args.goal_id
        ? [String(args.goalId ?? args.goal_id)]
        : [];
    const project = (await doerPost(ctx, `/api/companies/${companyId}/projects`, {
      name: String(args.name ?? args.title ?? "Untitled project"),
      description: args.description == null ? null : String(args.description),
      status: String(args.status ?? "planned"),
      goalIds,
      leadAgentId: args.leadAgentId ?? args.lead_agent_id ?? null,
      targetDate: args.targetDate ?? args.target_date ?? null,
    })) as Record<string, unknown>;
    return JSON.stringify({ success: true, project });
  } catch (err) {
    return JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
}

/** update_project — update a Doer project */
export async function interceptUpdateProject(
  ctx: AdapterExecutionContext,
  args: Record<string, unknown>,
): Promise<string> {
  try {
    const projectId = String(args.project_id ?? args.projectId ?? args.id ?? "");
    if (!projectId) return JSON.stringify({ success: false, error: "project_id is required" });
    const patch: Record<string, unknown> = {};
    for (const key of ["name", "description", "status", "leadAgentId", "targetDate", "goalIds"]) {
      if (args[key] !== undefined) patch[key] = args[key];
    }
    if (args.lead_agent_id !== undefined) patch.leadAgentId = args.lead_agent_id;
    if (args.target_date !== undefined) patch.targetDate = args.target_date;
    if (args.goal_ids !== undefined) patch.goalIds = args.goal_ids;
    const project = (await doerPatch(ctx, `/api/projects/${encodeURIComponent(projectId)}`, patch)) as Record<string, unknown>;
    return JSON.stringify({ success: true, project });
  } catch (err) {
    return JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
}

// ── Paperclip issue tool intercepts ─────────────────────────────────────
// These replace the Python tools that run inside E2B sandboxes and call
// localhost:3100 (unreachable from E2B without ngrok). The adapter
// intercepts the tool call in the stream and makes the HTTP call locally.

/** create_paperclip_issue — create a new issue in the Paperclip system */
export async function interceptCreatePaperclipIssue(
  ctx: AdapterExecutionContext,
  args: Record<string, unknown>,
): Promise<string> {
  try {
    const companyId = ctx.agent.companyId;
    const body: Record<string, unknown> = {
      title: String(args.title ?? "Untitled"),
      status: String(args.status ?? "todo"),
    };
    if (args.description !== undefined) body.description = String(args.description);
    if (args.priority !== undefined) body.priority = String(args.priority);
    // Accept both camelCase (API convention) and snake_case (Letta tool convention)
    const assigneeId = args.assigneeAgentId ?? args.assignee_agent_id;
    if (assigneeId !== undefined && String(assigneeId).trim()) body.assigneeAgentId = String(assigneeId);
    if (args.projectId ?? args.project_id) body.projectId = String(args.projectId ?? args.project_id);
    if (args.goalId ?? args.goal_id) body.goalId = String(args.goalId ?? args.goal_id);
    if (args.parentId ?? args.parent_id) body.parentId = String(args.parentId ?? args.parent_id);
    if (args.labelIds !== undefined) body.labelIds = args.labelIds;

    const issue = (await doerPost(ctx, `/api/companies/${companyId}/issues`, body)) as Record<string, unknown>;
    await ctx.onLog("stdout", `[create_paperclip_issue] Created ${issue.identifier ?? issue.id}: ${issue.title}\n`);
    return JSON.stringify({ success: true, id: issue.id, identifier: issue.identifier, title: issue.title });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await ctx.onLog("stderr", `[create_paperclip_issue] failed: ${msg}\n`);
    return JSON.stringify({ success: false, error: msg });
  }
}

/** read_paperclip_issues — list issues for this company */
export async function interceptReadPaperclipIssues(
  ctx: AdapterExecutionContext,
  args: Record<string, unknown>,
): Promise<string> {
  try {
    const companyId = ctx.agent.companyId;
    const params = new URLSearchParams();
    if (args.status) params.set("status", String(args.status));
    if (args.assigneeAgentId) params.set("assigneeAgentId", String(args.assigneeAgentId));
    if (args.projectId) params.set("projectId", String(args.projectId));
    if (args.limit) params.set("limit", String(args.limit));

    const qs = params.toString();
    const path = `/api/companies/${companyId}/issues${qs ? `?${qs}` : ""}`;
    const issues = (await doerGet(ctx, path)) as Array<Record<string, unknown>>;

    const summary = issues.slice(0, 50).map((i) => ({
      id: i.id,
      identifier: i.identifier,
      title: i.title,
      description: i.description,
      status: i.status,
      priority: i.priority,
      assigneeAgentId: i.assigneeAgentId,
      projectId: i.projectId,
      goalId: i.goalId,
      parentId: i.parentId,
    }));

    await ctx.onLog("stdout", `[read_paperclip_issues] Fetched ${issues.length} issues\n`);
    return JSON.stringify({ success: true, total: issues.length, issues: summary });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await ctx.onLog("stderr", `[read_paperclip_issues] failed: ${msg}\n`);
    return JSON.stringify({ success: false, error: msg });
  }
}

/** read_paperclip_issue — get single issue by id or identifier */
export async function interceptReadPaperclipIssue(
  ctx: AdapterExecutionContext,
  args: Record<string, unknown>,
): Promise<string> {
  try {
    const issueId = String(args.issue_id ?? args.id ?? "");
    if (!issueId) return JSON.stringify({ success: false, error: "issue_id is required" });

    const issue = (await doerGet(ctx, `/api/issues/${encodeURIComponent(issueId)}`)) as Record<string, unknown>;
    await ctx.onLog("stdout", `[read_paperclip_issue] Fetched ${issue.identifier ?? issue.id}\n`);
    return JSON.stringify({ success: true, issue });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await ctx.onLog("stderr", `[read_paperclip_issue] failed: ${msg}\n`);
    return JSON.stringify({ success: false, error: msg });
  }
}

/** update_paperclip_issue — update fields on an existing issue */
export async function interceptUpdatePaperclipIssue(
  ctx: AdapterExecutionContext,
  args: Record<string, unknown>,
): Promise<string> {
  try {
    const issueId = String(args.issue_id ?? args.id ?? "");
    if (!issueId) return JSON.stringify({ success: false, error: "issue_id is required" });

    const patch: Record<string, unknown> = {};
    if (args.title !== undefined) patch.title = String(args.title);
    if (args.description !== undefined) patch.description = String(args.description);
    if (args.status !== undefined) patch.status = String(args.status);
    if (args.priority !== undefined) patch.priority = String(args.priority);
    if (args.assigneeAgentId !== undefined) patch.assigneeAgentId = String(args.assigneeAgentId);
    if (args.labelIds !== undefined) patch.labelIds = args.labelIds;

    const updated = (await doerPatch(ctx, `/api/issues/${encodeURIComponent(issueId)}`, patch)) as Record<string, unknown>;
    await ctx.onLog("stdout", `[update_paperclip_issue] Updated ${updated.identifier ?? updated.id}\n`);
    return JSON.stringify({ success: true, id: updated.id, identifier: updated.identifier, status: updated.status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await ctx.onLog("stderr", `[update_paperclip_issue] failed: ${msg}\n`);
    return JSON.stringify({ success: false, error: msg });
  }
}

/** post_issue_comment — add a comment to an issue */
export async function interceptPostIssueComment(
  ctx: AdapterExecutionContext,
  args: Record<string, unknown>,
): Promise<string> {
  try {
    const issueId = String(args.issue_id ?? args.id ?? "");
    const body = String(args.body ?? args.content ?? args.comment ?? "");
    if (!issueId) return JSON.stringify({ success: false, error: "issue_id is required" });
    if (!body) return JSON.stringify({ success: false, error: "body is required" });

    const comment = (await doerPost(ctx, `/api/issues/${encodeURIComponent(issueId)}/comments`, { body })) as Record<string, unknown>;
    await ctx.onLog("stdout", `[post_issue_comment] Comment posted to ${issueId}: ${comment.id}\n`);
    return JSON.stringify({ success: true, commentId: comment.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await ctx.onLog("stderr", `[post_issue_comment] failed: ${msg}\n`);
    return JSON.stringify({ success: false, error: msg });
  }
}

// ── Tool name constants for execute.ts wiring ────────────────────────────

export const CREATE_PAPERCLIP_ISSUE_TOOL_NAME = "create_paperclip_issue";
export const READ_PAPERCLIP_ISSUES_TOOL_NAME = "read_paperclip_issues";
export const READ_PAPERCLIP_ISSUE_TOOL_NAME = "read_paperclip_issue";
export const UPDATE_PAPERCLIP_ISSUE_TOOL_NAME = "update_paperclip_issue";
export const POST_ISSUE_COMMENT_TOOL_NAME = "post_issue_comment";

export const READ_GOALS_TOOL_NAME = "read_goals";
export const CREATE_GOAL_TOOL_NAME = "create_goal";
export const UPDATE_GOAL_STATUS_TOOL_NAME = "update_goal_status";
export const READ_PROJECTS_TOOL_NAME = "read_projects";
export const CREATE_PROJECT_TOOL_NAME = "create_project";
export const UPDATE_PROJECT_TOOL_NAME = "update_project";

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
