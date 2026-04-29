import {
  definePlugin,
  runWorker,
  type PaperclipPlugin,
  type PluginContext,
} from "@doerai/plugin-sdk";
import type { Agent, Goal, Issue } from "@doerai/shared";
import { DATA_KEYS, DEFAULT_WINDOW_DAYS } from "./constants.js";

/**
 * Delivered plugin worker.
 *
 * Exposes a single `completions` data handler that the UI calls to render the
 * showcase. The plugin SDK does not expose issue work-products, so we
 * approximate a "completion" as an issue with status === "done" completed
 * inside the selected rolling window. The UI hydrates each completion with
 * its assignee agent + parent goal for grouping / accent color.
 */

type CompletionsParams = {
  companyId?: unknown;
  windowDays?: unknown;
  agentId?: unknown;
};

export type CompletionAgent = Pick<
  Agent,
  "id" | "name" | "title" | "icon" | "role" | "status"
>;

export type CompletionGoal = Pick<Goal, "id" | "title" | "level">;

export type CompletionIssueRef = {
  id: string;
  identifier: string;
  title: string;
};

export type Completion = {
  id: string;
  artifactType: "issue";
  title: string;
  summary: string | null;
  url: null;
  agent: CompletionAgent | null;
  issue: CompletionIssueRef;
  goal: CompletionGoal | null;
  completedAt: string | null;
  isPrimary: boolean;
};

export type CompletionsResponse = {
  completions: Completion[];
  agents: CompletionAgent[];
  windowDays: number;
  generatedAt: string;
};

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asPositiveInt(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  return fallback;
}

function projectAgent(agent: Agent): CompletionAgent {
  return {
    id: agent.id,
    name: agent.name,
    title: agent.title,
    icon: agent.icon,
    role: agent.role,
    status: agent.status,
  };
}

function projectGoal(goal: Goal): CompletionGoal {
  return {
    id: goal.id,
    title: goal.title,
    level: goal.level,
  };
}

function projectIssue(
  issue: Issue,
  agent: CompletionAgent | null,
  goal: CompletionGoal | null,
): Completion {
  return {
    id: issue.id,
    artifactType: "issue",
    title: issue.title,
    summary: issue.description ?? null,
    url: null,
    agent,
    issue: {
      id: issue.id,
      identifier: issue.identifier ?? issue.id,
      title: issue.title,
    },
    goal,
    completedAt: issue.completedAt ? new Date(issue.completedAt).toISOString() : null,
    isPrimary: true,
  };
}

async function buildCompletionsResponse(
  ctx: PluginContext,
  params: CompletionsParams,
): Promise<CompletionsResponse> {
  const companyId = asString(params.companyId);
  const windowDays = asPositiveInt(params.windowDays, DEFAULT_WINDOW_DAYS);
  const filterAgentId = asString(params.agentId);
  const generatedAt = new Date().toISOString();

  if (!companyId) {
    return { completions: [], agents: [], windowDays, generatedAt };
  }

  const windowStartMs = Date.now() - windowDays * 86_400_000;

  // Pull in parallel. The plugin SDK limits list endpoints to offset-based
  // pagination; 500 is a reasonable ceiling for a showcase window.
  const [doneIssues, agents, goals] = await Promise.all([
    ctx.issues.list({ companyId, status: "done", limit: 500, offset: 0 }),
    ctx.agents.list({ companyId, limit: 500, offset: 0 }),
    ctx.goals.list({ companyId, limit: 500, offset: 0 }),
  ]);

  const agentMap = new Map<string, CompletionAgent>(
    agents.map((agent) => [agent.id, projectAgent(agent)]),
  );
  const goalMap = new Map<string, CompletionGoal>(
    goals.map((goal) => [goal.id, projectGoal(goal)]),
  );

  const completions: Completion[] = [];
  for (const issue of doneIssues) {
    if (!issue.completedAt) continue;
    const completedAtMs = new Date(issue.completedAt).getTime();
    if (Number.isNaN(completedAtMs) || completedAtMs < windowStartMs) continue;
    if (filterAgentId && issue.assigneeAgentId !== filterAgentId) continue;

    const agent = issue.assigneeAgentId
      ? agentMap.get(issue.assigneeAgentId) ?? null
      : null;
    const goal = issue.goalId ? goalMap.get(issue.goalId) ?? null : null;
    completions.push(projectIssue(issue, agent, goal));
  }

  completions.sort((a, b) => {
    const aMs = a.completedAt ? new Date(a.completedAt).getTime() : 0;
    const bMs = b.completedAt ? new Date(b.completedAt).getTime() : 0;
    return bMs - aMs;
  });

  // Filter the agent roster down to agents that actually shipped in-window so
  // the UI filter chips stay relevant.
  const shippingAgentIds = new Set<string>();
  for (const completion of completions) {
    if (completion.agent) shippingAgentIds.add(completion.agent.id);
  }
  const visibleAgents = [...shippingAgentIds]
    .map((id) => agentMap.get(id))
    .filter((agent): agent is CompletionAgent => agent != null)
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    completions,
    agents: visibleAgents,
    windowDays,
    generatedAt,
  };
}

const plugin: PaperclipPlugin = definePlugin({
  async setup(ctx) {
    ctx.data.register(DATA_KEYS.completions, async (params) => {
      return await buildCompletionsResponse(ctx, params as CompletionsParams);
    });
  },
});

export default plugin;

runWorker(plugin, import.meta.url);
