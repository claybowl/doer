// packages/plugins/council/src/session-types/full-council.ts
import type { PluginContext, Agent } from "@doerai/plugin-sdk";
import type {
  AgentAddress,
  CouncilAgentRole,
  CouncilConfig,
  CouncilSession,
  CouncilSessionContext,
  IssueProposal,
  SessionDecision,
} from "@doerai/shared";
import { buildBrief } from "../brief-builder.js";
import { parseProposals } from "../parse-proposals.js";

async function invokeOneAgent(
  ctx: PluginContext,
  agent: Agent,
  session: CouncilSession,
  brief: string,
  role: CouncilAgentRole,
): Promise<AgentAddress> {
  const agentSession = await ctx.agents.sessions.create(agent.id, session.companyId, {
    taskKey: `council:${session.id}`,
    reason: `Council session ${session.sessionTypeId}`,
  });

  let content = "";

  try {
    await ctx.agents.sessions.sendMessage(agentSession.sessionId, session.companyId, {
      prompt: brief,
      reason: "Council brief",
      onEvent: (event) => {
        if (event.eventType === "chunk" && event.message) {
          content += event.message;
          ctx.streams.emit(`council:session:${session.id}`, {
            type: "transcript:chunk",
            agentId: agent.id,
            agentName: agent.name,
            chunk: event.message,
          });
        }
      },
    });
  } catch (err) {
    await ctx.agents.sessions
      .close(agentSession.sessionId, session.companyId)
      .catch(() => undefined);
    return {
      agentId: agent.id,
      agentName: agent.name,
      role,
      content: "",
      issueProposals: [],
      timestamp: new Date().toISOString(),
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
    };
  }

  await ctx.agents.sessions
    .close(agentSession.sessionId, session.companyId)
    .catch(() => undefined);

  const issueProposals = parseProposals(content);

  return {
    agentId: agent.id,
    agentName: agent.name,
    role,
    content,
    issueProposals,
    timestamp: new Date().toISOString(),
    status: "completed",
  };
}

export const fullCouncilHandler = {
  async buildContext(
    { session, config }: { session: CouncilSession; config: CouncilConfig },
    ctx: PluginContext,
  ): Promise<CouncilSessionContext> {
    const [goals, issues] = await Promise.all([
      ctx.goals.list({ companyId: session.companyId, status: "active", limit: 20, offset: 0 }),
      ctx.issues.list({ companyId: session.companyId, limit: 1, offset: 0 }),
    ]);

    return {
      companyId: session.companyId,
      sessionTypeId: session.sessionTypeId,
      activeGoals: goals.map((g) => ({ id: g.id, title: g.title, level: g.level })),
      openIssueCount: issues.length,
      recentActivity: [],
      budgetRemaining: 0,
      agenda: config.agenda.prompts,
      customContext: {},
    };
  },

  async invoke(
    session: CouncilSession,
    agents: Agent[],
    config: CouncilConfig,
    ctx: PluginContext,
  ): Promise<AgentAddress[]> {
    const participants = config.participants["full_council"] ?? [];
    const orchestratorId = participants.find((p) => p.role === "orchestrator")?.agentId;
    const members = agents.filter((a) => a.id !== orchestratorId);

    ctx.streams.open(`council:session:${session.id}`, session.companyId);

    const sessionContext = session.context as unknown as CouncilSessionContext;
    const addresses: AgentAddress[] = [];

    if (session.invocationMode === "parallel") {
      const results = await Promise.allSettled(
        members.map(async (agent) => {
          const participant = participants.find((p) => p.agentId === agent.id);
          const role: CouncilAgentRole = participant?.role === "orchestrator" ? "orchestrator" : "member";
          const brief = buildBrief(sessionContext, agent, config, role);
          return invokeOneAgent(ctx, agent, session, brief, role);
        }),
      );
      for (const result of results) {
        if (result.status === "fulfilled") addresses.push(result.value);
      }
    } else {
      for (const agent of members) {
        const participant = participants.find((p) => p.agentId === agent.id);
        const role: CouncilAgentRole = participant?.role === "orchestrator" ? "orchestrator" : "member";
        const brief = buildBrief(sessionContext, agent, config, role);
        addresses.push(await invokeOneAgent(ctx, agent, session, brief, role));
      }
    }

    return addresses;
  },

  async resolve(
    addresses: AgentAddress[],
    orchestrator: Agent,
    config: CouncilConfig,
    ctx: PluginContext,
    session: CouncilSession,
  ): Promise<SessionDecision> {
    const transcriptText = addresses
      .map((a) => `=== ${a.agentName} (${a.role}) ===\n${a.content}`)
      .join("\n\n");

    const { minIssues, maxIssues } = config.agenda.outputConstraints;

    const resolutionBrief = `You are the orchestrator of a council session. Read the following addresses from council members, then synthesize a decision.

${transcriptText}

Your task:
1. Summarize the key themes and proposals across all addresses.
2. Select and refine the most important ${minIssues}–${maxIssues} issues.
3. Output your final decision:
   - A 2–3 sentence summary
   - The refined issue list as a fenced JSON block

\`\`\`json
[
  {
    "title": "Issue title",
    "description": "Description",
    "priority": "critical | high | medium | low",
    "assigneeAgentId": "optional agent UUID"
  }
]
\`\`\``;

    const oSession = await ctx.agents.sessions.create(orchestrator.id, session.companyId, {
      taskKey: `council:${session.id}:resolution`,
      reason: "Council resolution",
    });

    let responseText = "";
    try {
      await ctx.agents.sessions.sendMessage(oSession.sessionId, session.companyId, {
        prompt: resolutionBrief,
        reason: "Council resolution",
        onEvent: (event) => {
          if (event.eventType === "chunk" && event.message) {
            responseText += event.message;
          }
        },
      });
    } finally {
      await ctx.agents.sessions
        .close(oSession.sessionId, session.companyId)
        .catch(() => undefined);
      ctx.streams.close(`council:session:${session.id}`);
    }

    const issueProposals = parseProposals(responseText);
    const summaryMatch = responseText.split("```json")[0]?.trim() ?? responseText.trim();

    return {
      summary: summaryMatch.slice(0, 500),
      reasoning: responseText,
      issueProposals,
      orchestratorAgentId: orchestrator.id,
      timestamp: new Date().toISOString(),
    };
  },

  async apply(
    decision: SessionDecision,
    companyId: string,
    ctx: PluginContext,
  ): Promise<Array<{ id: string; title: string }>> {
    const created: Array<{ id: string; title: string }> = [];
    for (const proposal of decision.issueProposals) {
      try {
        const issue = await ctx.issues.create({
          companyId,
          title: proposal.title,
          description: proposal.description,
          priority: proposal.priority,
          assigneeAgentId: proposal.assigneeAgentId,
          goalId: proposal.goalId,
        });
        created.push({ id: issue.id, title: issue.title });
      } catch {
        // Individual issue creation failure doesn't abort the whole apply.
        // The engine marks the session completed_with_errors if count differs.
      }
    }
    return created;
  },
};
