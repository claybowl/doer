// packages/plugins/council/src/worker.ts
import { definePlugin, runWorker } from "@doerai/plugin-sdk";
import type { PluginJobContext } from "@doerai/plugin-sdk";
import type { CouncilConfig } from "@doerai/shared";
import { ACTION_KEYS, DATA_KEYS, JOB_KEYS, PLUGIN_ID } from "./constants.js";
import { runSession, runWatchdog } from "./engine.js";
import { createSessionStore } from "./session-store.js";

const plugin = definePlugin({
  async setup(ctx) {
    const store = createSessionStore(ctx);

    // ── DATA HANDLERS ──────────────────────────────────────────────────────

    ctx.data.register(DATA_KEYS.sessions, async (params) => {
      const companyId = String(params.companyId ?? "");
      if (!companyId) return [];
      return store.listSessions(companyId);
    });

    ctx.data.register(DATA_KEYS.session, async (params) => {
      const sessionId = String(params.sessionId ?? "");
      const companyId = String(params.companyId ?? "");
      if (!sessionId || !companyId) return null;
      return store.getSession(sessionId, companyId);
    });

    ctx.data.register(DATA_KEYS.config, async (params) => {
      const companyId = String(params.companyId ?? "");
      if (!companyId) return null;
      return store.getOrDefaultConfig(companyId);
    });

    ctx.data.register(DATA_KEYS.agents, async (params) => {
      const companyId = String(params.companyId ?? "");
      if (!companyId) return [];
      const agents = await ctx.agents.list({ companyId, limit: 50, offset: 0 });
      // Map to the shape the UI expects: agentId, agentName, role as council role
      const config = await store.getOrDefaultConfig(companyId);
      const orchestratorIds = new Set(
        Object.values(config.participants)
          .flat()
          .filter((p) => p.role === "orchestrator")
          .map((p) => p.agentId),
      );
      return agents.map((a) => ({
        agentId: a.id,
        agentName: a.name,
        role: orchestratorIds.has(a.id) ? "orchestrator" : "member",
      }));
    });

    // ── ACTION HANDLERS ────────────────────────────────────────────────────

    ctx.actions.register(ACTION_KEYS.trigger, async (params) => {
      const companyId = String(params.companyId ?? "");
      const sessionTypeId = String(params.sessionTypeId ?? "full_council");
      const triggeredBy = (params.triggeredBy as "manual" | "api") ?? "manual";

      if (!companyId) throw new Error("companyId is required");

      const config = await store.getOrDefaultConfig(companyId);
      const session = await store.createSession({
        companyId,
        sessionTypeId,
        invocationMode: config.invocationMode,
        resolutionMode: config.resolutionMode,
        triggeredBy,
      });

      // Fire-and-forget — return session ID immediately, run async
      void runSession(session.id, companyId, store, ctx).catch((err) => {
        ctx.logger.error("Session runner error", {
          sessionId: session.id,
          error: err instanceof Error ? err.message : String(err),
        });
      });

      ctx.logger.info("Council session triggered", {
        sessionId: session.id,
        sessionTypeId,
      });
      return { sessionId: session.id, status: "pending" };
    });

    ctx.actions.register(ACTION_KEYS.saveConfig, async (params) => {
      const companyId = String(params.companyId ?? "");
      if (!companyId) throw new Error("companyId is required");

      const existing = await store.getOrDefaultConfig(companyId);
      const incoming = params as Partial<CouncilConfig>;
      const merged: CouncilConfig = {
        ...existing,
        ...incoming,
        companyId,
        agenda: {
          ...existing.agenda,
          ...(incoming.agenda ?? {}),
          outputConstraints: {
            ...existing.agenda.outputConstraints,
            ...(incoming.agenda?.outputConstraints ?? {}),
          },
        },
      };
      await store.saveConfig(companyId, merged);
      return { ok: true };
    });

    // ── JOB HANDLERS ───────────────────────────────────────────────────────

    ctx.jobs.register(JOB_KEYS.heartbeat, async (_job: PluginJobContext) => {
      ctx.logger.info("Council heartbeat fired");
      const companies = await ctx.companies.list({ limit: 100, offset: 0 });

      for (const company of companies) {
        const config = await store.getOrDefaultConfig(company.id);
        if (!config.schedule) continue; // only trigger for companies with schedule enabled

        const session = await store.createSession({
          companyId: company.id,
          sessionTypeId: config.defaultSessionTypeId,
          invocationMode: config.invocationMode,
          resolutionMode: config.resolutionMode,
          triggeredBy: "schedule",
        });

        void runSession(session.id, company.id, store, ctx).catch((err) => {
          ctx.logger.error("Scheduled session failed", {
            sessionId: session.id,
            error: err instanceof Error ? err.message : String(err),
          });
        });
      }
    });

    ctx.jobs.register(JOB_KEYS.watchdog, async () => {
      await runWatchdog(store, ctx);
    });

    ctx.logger.info("Council plugin ready", { pluginId: PLUGIN_ID });
  },

  async onHealth() {
    return { status: "ok" as const, message: "Council plugin operational" };
  },

  async onValidateConfig(config) {
    const errors: string[] = [];
    const typed = config as Partial<CouncilConfig>;
    if (
      typed.invocationMode &&
      !["parallel", "sequential"].includes(typed.invocationMode)
    ) {
      errors.push("invocationMode must be 'parallel' or 'sequential'");
    }
    if (
      typed.resolutionMode &&
      !["orchestrator", "user_approval", "auto"].includes(typed.resolutionMode)
    ) {
      errors.push("resolutionMode must be 'orchestrator', 'user_approval', or 'auto'");
    }
    return { ok: errors.length === 0, errors };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
