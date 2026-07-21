import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@doerai/db";
import { agents, providerConnections } from "@doerai/db";
import {
  createProviderConnectionSchema,
  type DiscoveredLettaAgent,
  type DiscoveredProviderModel,
  type ProviderType,
  type CreateProviderConnection,
  type UpdateProviderConnection,
} from "@doerai/shared";
import {
  discoverAgents as discoverProviderAgents,
  discoverModels as discoverProviderModels,
} from "@doerai/adapter-letta-code/server";
import { conflict, notFound } from "../errors.js";
import { secretService } from "./secrets.js";

function referencesConnection(config: Record<string, unknown>, connectionId: string) {
  return config.providerConnectionId === connectionId;
}

export function providerConnectionService(db: Db) {
  const secrets = secretService(db);
  const discoveryCache = new Map<string, { expiresAt: number; value: unknown }>();
  const discoveryCacheTtlMs = 5 * 60_000;
  const discoveryCacheLimit = 100;

  function cacheKey(id: string, updatedAt: Date, resource: "models" | "agents") {
    return `${id}:${updatedAt.toISOString()}:${resource}`;
  }

  function cached<T>(key: string): T | null {
    const entry = discoveryCache.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      discoveryCache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  function remember(key: string, value: unknown) {
    if (discoveryCache.size >= discoveryCacheLimit) {
      const oldest = discoveryCache.keys().next().value as string | undefined;
      if (oldest) discoveryCache.delete(oldest);
    }
    discoveryCache.set(key, { expiresAt: Date.now() + discoveryCacheTtlMs, value });
  }

  async function discoveryContext(id: string) {
    const connection = await getById(id);
    if (!connection) throw notFound("Provider connection not found");
    const secretValue = connection.secretId
      ? await secrets.resolveSecretValue(connection.companyId, connection.secretId, "latest")
      : null;
    return { connection, secretValue };
  }

  async function getById(id: string) {
    return db
      .select()
      .from(providerConnections)
      .where(eq(providerConnections.id, id))
      .then((rows) => rows[0] ?? null);
  }

  async function getByName(companyId: string, name: string) {
    return db
      .select()
      .from(providerConnections)
      .where(
        and(
          eq(providerConnections.companyId, companyId),
          eq(providerConnections.name, name),
        ),
      )
      .then((rows) => rows[0] ?? null);
  }

  async function validateSecret(companyId: string, input: CreateProviderConnection) {
    if (input.secretId) {
      await secrets.assertSecretInCompany(companyId, input.secretId);
    }
  }

  async function clearDefault(
    tx: Parameters<Parameters<Db["transaction"]>[0]>[0],
    companyId: string,
    providerType: ProviderType,
    exceptId?: string,
  ) {
    const currentDefaults = await tx
      .select({ id: providerConnections.id })
      .from(providerConnections)
      .where(
        and(
          eq(providerConnections.companyId, companyId),
          eq(providerConnections.providerType, providerType),
          eq(providerConnections.isDefault, true),
        ),
      );

    const ids = currentDefaults.map((row) => row.id).filter((id) => id !== exceptId);
    for (const id of ids) {
      await tx
        .update(providerConnections)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(providerConnections.id, id));
    }
  }

  return {
    list: (companyId: string) =>
      db
        .select()
        .from(providerConnections)
        .where(eq(providerConnections.companyId, companyId))
        .orderBy(desc(providerConnections.isDefault), providerConnections.name),

    getById,

    discoverModels: async (id: string, refresh = false): Promise<DiscoveredProviderModel[]> => {
      const { connection, secretValue } = await discoveryContext(id);
      const key = cacheKey(id, connection.updatedAt, "models");
      if (!refresh) {
        const hit = cached<DiscoveredProviderModel[]>(key);
        if (hit) return hit;
      }
      const models = await discoverProviderModels(connection, secretValue);
      remember(key, models);
      return models;
    },

    discoverAgents: async (id: string, refresh = false): Promise<DiscoveredLettaAgent[]> => {
      const { connection, secretValue } = await discoveryContext(id);
      const key = cacheKey(id, connection.updatedAt, "agents");
      if (!refresh) {
        const hit = cached<DiscoveredLettaAgent[]>(key);
        if (hit) return hit;
      }
      const discoveredAgents = await discoverProviderAgents(connection, secretValue);
      remember(key, discoveredAgents);
      return discoveredAgents;
    },

    test: async (id: string) => {
      const connection = await getById(id);
      if (!connection) throw notFound("Provider connection not found");
      try {
        if (connection.providerType === "letta") {
          await discoveryContext(id).then(({ connection: current, secretValue }) =>
            discoverProviderAgents(current, secretValue),
          );
        } else {
          await discoveryContext(id).then(({ connection: current, secretValue }) =>
            discoverProviderModels(current, secretValue),
          );
        }
        return { ok: true, message: "Connection succeeded" };
      } catch (error) {
        return {
          ok: false,
          message: error instanceof Error ? error.message : "Connection failed",
        };
      }
    },

    create: async (companyId: string, input: CreateProviderConnection) => {
      await validateSecret(companyId, input);
      const duplicate = await getByName(companyId, input.name);
      if (duplicate) throw conflict(`Provider connection already exists: ${input.name}`);

      return db.transaction(async (tx) => {
        if (input.isDefault) {
          await clearDefault(tx, companyId, input.providerType);
        }
        return tx
          .insert(providerConnections)
          .values({ companyId, ...input })
          .returning()
          .then((rows) => rows[0]);
      });
    },

    update: async (id: string, patch: UpdateProviderConnection) => {
      const existing = await getById(id);
      if (!existing) throw notFound("Provider connection not found");

      const parsed = createProviderConnectionSchema.parse({ ...existing, ...patch });
      await validateSecret(existing.companyId, parsed);
      const duplicate = await getByName(existing.companyId, parsed.name);
      if (duplicate && duplicate.id !== id) {
        throw conflict(`Provider connection already exists: ${parsed.name}`);
      }

      return db.transaction(async (tx) => {
        if (parsed.isDefault) {
          await clearDefault(tx, existing.companyId, parsed.providerType, id);
        }
        return tx
          .update(providerConnections)
          .set({ ...parsed, updatedAt: new Date() })
          .where(eq(providerConnections.id, id))
          .returning()
          .then((rows) => rows[0] ?? null);
      });
    },

    listReferencingAgents: async (connectionId: string, companyId: string) => {
      const companyAgents = await db
        .select({ id: agents.id, name: agents.name, adapterConfig: agents.adapterConfig })
        .from(agents)
        .where(eq(agents.companyId, companyId));
      return companyAgents
        .filter((agent) => referencesConnection(agent.adapterConfig, connectionId))
        .map(({ id, name }) => ({ id, name }));
    },

    remove: async (id: string) => {
      const existing = await getById(id);
      if (!existing) throw notFound("Provider connection not found");
      const referencedBy = await db
        .select({ id: agents.id, name: agents.name, adapterConfig: agents.adapterConfig })
        .from(agents)
        .where(eq(agents.companyId, existing.companyId))
        .then((rows) =>
          rows
            .filter((agent) => referencesConnection(agent.adapterConfig, id))
            .map(({ id: agentId, name }) => ({ id: agentId, name })),
        );
      if (referencedBy.length > 0) {
        throw conflict("Provider connection is in use", {
          agentIds: referencedBy.map((agent) => agent.id),
          agents: referencedBy,
        });
      }
      await db.delete(providerConnections).where(eq(providerConnections.id, id));
      return existing;
    },
  };
}
