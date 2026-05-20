// packages/plugins/council/src/session-store.ts
import { randomUUID } from "node:crypto";
import type { PluginContext, PluginEntityRecord } from "@doerai/plugin-sdk";
import type {
  CouncilConfig,
  CouncilSession,
  InvocationMode,
  ResolutionMode,
  SessionTypeId,
  AgentAddress,
} from "@doerai/shared";
import { CONFIG_STATE_KEY, DEFAULT_CONFIG, ENTITY_TYPE } from "./constants.js";

type CreateSessionInput = {
  companyId: string;
  sessionTypeId: SessionTypeId;
  invocationMode: InvocationMode;
  resolutionMode: ResolutionMode;
  triggeredBy: "schedule" | "manual" | "api";
};

type UpdateSessionInput = Partial<
  Pick<
    CouncilSession,
    | "status"
    | "context"
    | "transcript"
    | "decision"
    | "issuesCreated"
    | "error"
    | "startedAt"
    | "completedAt"
  >
>;

function entityToSession(entity: PluginEntityRecord): CouncilSession {
  return entity.data as unknown as CouncilSession;
}

export function createSessionStore(ctx: PluginContext) {
  return {
    async createSession(input: CreateSessionInput): Promise<CouncilSession> {
      const id = randomUUID();
      const now = new Date().toISOString();
      const session: CouncilSession = {
        id,
        companyId: input.companyId,
        sessionTypeId: input.sessionTypeId,
        status: "pending",
        invocationMode: input.invocationMode,
        resolutionMode: input.resolutionMode,
        context: {},
        transcript: [],
        decision: null,
        issuesCreated: [],
        triggeredBy: input.triggeredBy,
        startedAt: null,
        completedAt: null,
        createdAt: now,
      };

      await ctx.entities.upsert({
        entityType: ENTITY_TYPE,
        scopeKind: "company",
        scopeId: input.companyId,
        externalId: id,
        title: `${input.sessionTypeId} — ${now.slice(0, 10)}`,
        status: "pending",
        data: session as unknown as Record<string, unknown>,
      });

      return session;
    },

    async getSession(sessionId: string, companyId: string): Promise<CouncilSession | null> {
      const records = await ctx.entities.list({
        entityType: ENTITY_TYPE,
        scopeKind: "company",
        scopeId: companyId,
        externalId: sessionId,
        limit: 1,
        offset: 0,
      });
      const match = records.find((r) => r.externalId === sessionId);
      if (!match) return null;
      return entityToSession(match);
    },

    async listSessions(companyId: string, limit = 50): Promise<CouncilSession[]> {
      const records = await ctx.entities.list({
        entityType: ENTITY_TYPE,
        scopeKind: "company",
        scopeId: companyId,
        limit,
        offset: 0,
      });
      return records.map(entityToSession);
    },

    async updateSession(
      sessionId: string,
      companyId: string,
      patch: UpdateSessionInput,
    ): Promise<CouncilSession> {
      const existing = await this.getSession(sessionId, companyId);
      if (!existing) throw new Error(`Session not found: ${sessionId}`);
      const updated: CouncilSession = { ...existing, ...patch };
      await ctx.entities.upsert({
        entityType: ENTITY_TYPE,
        scopeKind: "company",
        scopeId: companyId,
        externalId: sessionId,
        title: `${updated.sessionTypeId} — ${updated.createdAt.slice(0, 10)}`,
        status: updated.status,
        data: updated as unknown as Record<string, unknown>,
      });
      return updated;
    },

    async appendTranscriptEntry(
      sessionId: string,
      companyId: string,
      entry: AgentAddress,
    ): Promise<void> {
      const session = await this.getSession(sessionId, companyId);
      if (!session) throw new Error(`Session not found: ${sessionId}`);
      await this.updateSession(sessionId, companyId, {
        transcript: [...session.transcript, entry],
      });
    },

    async getConfig(companyId: string): Promise<CouncilConfig | null> {
      const stored = await ctx.state.get({
        scopeKind: "company",
        scopeId: companyId,
        stateKey: CONFIG_STATE_KEY,
      });
      if (!stored) return null;
      return stored as CouncilConfig;
    },

    async saveConfig(companyId: string, config: CouncilConfig): Promise<void> {
      await ctx.state.set(
        { scopeKind: "company", scopeId: companyId, stateKey: CONFIG_STATE_KEY },
        config,
      );
    },

    async getOrDefaultConfig(companyId: string): Promise<CouncilConfig> {
      const stored = await this.getConfig(companyId);
      if (stored) return stored;
      return {
        companyId,
        enabledSessionTypes: [...DEFAULT_CONFIG.enabledSessionTypes],
        defaultSessionTypeId: DEFAULT_CONFIG.defaultSessionTypeId,
        invocationMode: DEFAULT_CONFIG.invocationMode,
        resolutionMode: DEFAULT_CONFIG.resolutionMode,
        agenda: { ...DEFAULT_CONFIG.agenda },
        participants: { full_council: [] },
      };
    },

    async findStaleRunningSessions(): Promise<CouncilSession[]> {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const allRunning = await ctx.entities.list({
        entityType: ENTITY_TYPE,
        limit: 200,
        offset: 0,
      });
      return allRunning
        .map(entityToSession)
        .filter(
          (s) =>
            s.status === "running" &&
            s.startedAt !== null &&
            s.startedAt < fifteenMinutesAgo,
        );
    },
  };
}

export type SessionStore = ReturnType<typeof createSessionStore>;
