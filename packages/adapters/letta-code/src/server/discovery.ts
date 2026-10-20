import type {
  DiscoveredLettaAgent,
  DiscoveredProviderModel,
  ProviderConnection,
} from "@doerai/shared";
import { getProviderDefaults } from "./provider-defaults.js";

export interface DiscoveryDependencies {
  fetch: typeof globalThis.fetch;
  timeoutMs?: number;
}

const DEFAULT_DEPENDENCIES: DiscoveryDependencies = {
  fetch: globalThis.fetch,
  timeoutMs: 10_000,
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function joinUrl(base: string, path: string) {
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function authHeaders(secretValue: string | null): Record<string, string> {
  return secretValue ? { authorization: `Bearer ${secretValue}` } : {};
}

async function fetchJson(
  url: string,
  secretValue: string | null,
  dependencies: DiscoveryDependencies,
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), dependencies.timeoutMs ?? 10_000);
  try {
    const response = await dependencies.fetch(url, {
      headers: authHeaders(secretValue),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Provider request failed (${response.status})`);
    }
    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Provider request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function arrayPayload(value: unknown, keys: string[]): unknown[] {
  if (Array.isArray(value)) return value;
  const record = asRecord(value);
  if (!record) return [];
  for (const key of keys) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }
  return [];
}

function uniqueSorted<T extends { id: string }>(values: T[], label: (value: T) => string): T[] {
  const unique = new Map<string, T>();
  for (const value of values) {
    if (!unique.has(value.id)) unique.set(value.id, value);
  }
  return [...unique.values()].sort((a, b) => label(a).localeCompare(label(b)));
}

function normalizeLettaModels(payload: unknown): DiscoveredProviderModel[] {
  const models = arrayPayload(payload, ["models", "data"])
    .map((entry): DiscoveredProviderModel | null => {
      const model = asRecord(entry);
      if (!model) return null;
      const id = stringValue(model.handle) ?? stringValue(model.id);
      if (!id) return null;
      return {
        id,
        label: stringValue(model.display_name) ?? stringValue(model.name) ?? id,
        provider: stringValue(model.provider_type) ?? stringValue(model.provider) ?? id.split("/")[0] ?? "letta",
      };
    })
    .filter((model): model is DiscoveredProviderModel => model !== null);
  return uniqueSorted(models, (model) => model.label);
}

function providerHandle(provider: ProviderConnection["providerType"], id: string) {
  if (provider === "custom" || id.startsWith(`${provider}/`)) return id;
  const prefix = provider === "ollama_cloud" ? "ollama-cloud" : provider;
  return `${prefix}/${id}`;
}

function normalizeProviderModels(
  payload: unknown,
  provider: ProviderConnection["providerType"],
): DiscoveredProviderModel[] {
  const models = arrayPayload(payload, ["models", "data"])
    .map((entry): DiscoveredProviderModel | null => {
      const model = asRecord(entry);
      if (!model) return null;
      const rawId = stringValue(model.id) ?? stringValue(model.name) ?? stringValue(model.model);
      if (!rawId) return null;
      const id = providerHandle(provider, rawId);
      return {
        id,
        label: stringValue(model.display_name) ?? stringValue(model.name) ?? rawId,
        provider,
      };
    })
    .filter((model): model is DiscoveredProviderModel => model !== null);
  return uniqueSorted(models, (model) => model.label);
}

export async function discoverModels(
  connection: ProviderConnection,
  secretValue: string | null,
  dependencies: DiscoveryDependencies = DEFAULT_DEPENDENCIES,
): Promise<DiscoveredProviderModel[]> {
  if (connection.providerType === "letta") {
    const payload = await fetchJson(
      joinUrl(connection.lettaBaseUrl, "/v1/models/"),
      secretValue,
      dependencies,
    );
    return normalizeLettaModels(payload);
  }

  const providerBaseUrl =
    connection.providerBaseUrl ?? getProviderDefaults(connection.providerType).providerBaseUrl;
  if (!providerBaseUrl || connection.providerType === "chatgpt_oauth" || connection.providerType === "anthropic") {
    return [];
  }

  const path = connection.providerType === "ollama" ? "/api/tags" : "/models";
  const payload = await fetchJson(joinUrl(providerBaseUrl, path), secretValue, dependencies);
  return normalizeProviderModels(payload, connection.providerType);
}

export async function discoverAgents(
  connection: ProviderConnection,
  secretValue: string | null,
  dependencies: DiscoveryDependencies = DEFAULT_DEPENDENCIES,
): Promise<DiscoveredLettaAgent[]> {
  const payload = await fetchJson(
    joinUrl(connection.lettaBaseUrl, "/v1/agents/?limit=100"),
    secretValue,
    dependencies,
  );
  const agents = arrayPayload(payload, ["agents", "data"])
    .map((entry): DiscoveredLettaAgent | null => {
      const agent = asRecord(entry);
      if (!agent) return null;
      const id = stringValue(agent.id);
      if (!id) return null;
      return {
        id,
        name: stringValue(agent.name) ?? id,
        model: stringValue(agent.model),
      };
    })
    .filter((agent): agent is DiscoveredLettaAgent => agent !== null);
  return uniqueSorted(agents, (agent) => agent.name);
}
