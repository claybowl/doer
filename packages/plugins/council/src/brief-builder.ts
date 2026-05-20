// packages/plugins/council/src/brief-builder.ts
import type { Agent } from "@doerai/plugin-sdk";
import type { CouncilConfig, CouncilSessionContext, CouncilAgentRole } from "@doerai/shared";

/**
 * Builds the council brief string sent to each agent.
 *
 * The brief is the agent's full context for the session:
 * - What the session is about (goals, issue count, budget)
 * - What questions to address (agenda prompts)
 * - Agent-specific directive (perAgent config)
 * - Expected output format (JSON proposals)
 */
export function buildBrief(
  context: CouncilSessionContext,
  agent: Agent,
  config: CouncilConfig,
  role: CouncilAgentRole,
): string {
  const { agenda } = config;
  const perAgentDirective = agenda.perAgent[agent.id] ?? "";
  const { minIssues, maxIssues } = agenda.outputConstraints;

  const goalList =
    context.activeGoals.length > 0
      ? context.activeGoals.map((g) => `  - [${g.level}] ${g.title}`).join("\n")
      : "  (none)";

  const recentActivityList =
    context.recentActivity.length > 0
      ? context.recentActivity.map((a) => `  - ${a}`).join("\n")
      : "  (none)";

  const promptList = agenda.prompts.map((p, i) => `${i + 1}. ${p}`).join("\n");

  return `You are attending a Full Council session as a ${role}.

== SESSION CONTEXT ==
Active goals:
${goalList}

Open issues: ${context.openIssueCount}
Budget remaining: $${context.budgetRemaining.toFixed(2)}
Recent activity:
${recentActivityList}

== YOUR AGENDA ==
Address the following:
${promptList}
${perAgentDirective ? `\nYour specific focus: ${perAgentDirective}` : ""}

== YOUR ROLE ==
You are a ${role}. After your reasoning, produce ${minIssues}–${maxIssues} concrete
issue proposals in a fenced JSON block at the END of your response:

\`\`\`json
[
  {
    "title": "Issue title (required)",
    "description": "Optional description",
    "priority": "critical | high | medium | low",
    "assigneeAgentId": "optional agent UUID"
  }
]
\`\`\`

Address the council now.`;
}
