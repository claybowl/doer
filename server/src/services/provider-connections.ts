import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@doerai/db";
import { agents, providerConnections } from "@doerai/db";
import {
  createProviderConnectionSchema,
  type CreateProviderConnection,
  type UpdateProviderConnection,
} from "@doerai/shared";
import { conflict, notFound } from "../errors.js";
import { secretService } from "./secrets.js";

function referencesConnection(config: Record<string, unknown>, connectionId: string) {
  return config.providerConnectionId === connectionId;
}

export function providerConnectionService(db: Db) {
  const secrets = secretService(db);

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
    providerType: string,
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
