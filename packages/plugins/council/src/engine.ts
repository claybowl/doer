// packages/plugins/council/src/engine.ts
import type { PluginContext } from "@doerai/plugin-sdk";
import type { SessionStore } from "./session-store.js";
import { fullCouncilHandler } from "./session-types/full-council.js";

const SESSION_TYPE_HANDLERS: Record<string, typeof fullCouncilHandler> = {
  full_council: fullCouncilHandler,
};

export async function runSession(
  sessionId: string,
  companyId: string,
  store: SessionStore,
  ctx: PluginContext,
): Promise<void> {
  const session = await store.getSession(sessionId, companyId);
  if (!session) throw new Error(`Session not found: ${sessionId}`);

  const config = await store.getOrDefaultConfig(companyId);
  const handler = SESSION_TYPE_HANDLERS[session.sessionTypeId];

  if (!handler) {
    await store.updateSession(sessionId, companyId, {
      status: "failed",
      error: `Unknown session type: ${session.sessionTypeId}`,
      completedAt: new Date().toISOString(),
    });
    return;
  }

  await store.updateSession(sessionId, companyId, {
    status: "running",
    startedAt: new Date().toISOString(),
  });

  try {
    // 1. Build context
    const context = await handler.buildContext({ session, config }, ctx);
    await store.updateSession(sessionId, companyId, {
      context: context as unknown as Record<string, unknown>,
    });

    // 2. Load agents
    const participants = config.participants[session.sessionTypeId] ?? [];
    const agentOrNulls = await Promise.all(
      participants.map((p) =>
        ctx.agents.get(p.agentId, companyId).catch(() => null),
      ),
    );
    const agents = agentOrNulls.filter(
      (a): a is NonNullable<typeof a> => a !== null,
    );

    if (agents.length === 0) {
      throw new Error("No agents available for council session");
    }

    // 3. Invoke members (parallel or sequential per config)
    const updatedSession = { ...session, context: context as unknown as Record<string, unknown> };
    const addresses = await handler.invoke(updatedSession, agents as never, config, ctx);
    await store.updateSession(sessionId, companyId, { transcript: addresses });

    // 4. Find orchestrator agent
    const orchestratorId = participants.find((p) => p.role === "orchestrator")?.agentId;
    const orchestrator = orchestratorId
      ? (agents.find((a) => a.id === orchestratorId) ?? agents[agents.length - 1]!)
      : agents[agents.length - 1]!;

    // 5. Orchestrator resolves
    const fullSession = { ...updatedSession, transcript: addresses };
    const decision = await handler.resolve(addresses, orchestrator, config, ctx, fullSession as never);

    // 6. Apply — create issues
    const createdIssues = await handler.apply(decision, companyId, ctx);
    const hasErrors = createdIssues.length < decision.issueProposals.length;

    await store.updateSession(sessionId, companyId, {
      status: hasErrors ? "completed_with_errors" : "completed",
      decision,
      issuesCreated: createdIssues.map((i) => i.id),
      completedAt: new Date().toISOString(),
    });

    // 7. Activity log
    await ctx.activity.log({
      companyId,
      message: `Council session completed: ${decision.summary.slice(0, 120)}`,
      entityType: "council-session",
      entityId: sessionId,
      metadata: {
        sessionTypeId: session.sessionTypeId,
        issuesCreated: createdIssues.length,
      },
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    ctx.logger.error("Council session failed", { sessionId, error });
    await store.updateSession(sessionId, companyId, {
      status: "failed",
      error,
      completedAt: new Date().toISOString(),
    });
    await ctx.activity.log({
      companyId,
      message: `Council session failed: ${error}`,
      entityType: "council-session",
      entityId: sessionId,
    });
  }
}

export async function runWatchdog(store: SessionStore, ctx: PluginContext): Promise<void> {
  const stale = await store.findStaleRunningSessions();
  for (const session of stale) {
    ctx.logger.warn("Watchdog: resetting stale session", { sessionId: session.id });
    await store.updateSession(session.id, session.companyId, {
      status: "failed",
      error: "Watchdog: session exceeded 15 minute runtime limit",
      completedAt: new Date().toISOString(),
    });
  }
}
