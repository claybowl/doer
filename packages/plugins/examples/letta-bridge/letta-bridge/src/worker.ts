import { definePlugin, runWorker } from "@doerai/plugin-sdk";
import type { LettaAgent, LettaMessage } from "./types.js";

// Letta API client
class LettaClient {
	private baseUrl: string;
	private apiKey: string;

	constructor(baseUrl: string, apiKey: string) {
		this.baseUrl = baseUrl.replace(/\/$/, "");
		this.apiKey = apiKey;
	}

	private async fetch<T>(path: string, opts?: RequestInit): Promise<T> {
		const url = `${this.baseUrl}${path}`;
		const response = await fetch(url, {
			...opts,
			headers: {
				"Authorization": `Bearer ${this.apiKey}`,
				"Content-Type": "application/json",
				...opts?.headers
			}
		});

		if (!response.ok) {
			const text = await response.text();
			throw new Error(`Letta API error: ${response.status} ${text}`);
		}

		return response.json() as Promise<T>;
	}

	async listAgents(): Promise<LettaAgent[]> {
		return this.fetch<LettaAgent[]>("/v1/agents");
	}

	async getAgent(agentId: string): Promise<LettaAgent> {
		return this.fetch<LettaAgent>(`/v1/agents/${agentId}`);
	}

	async sendMessage(agentId: string, message: string): Promise<{ messages: LettaMessage[] }> {
		return this.fetch<{ messages: LettaMessage[] }>(`/v1/agents/${agentId}/messages`, {
			method: "POST",
			body: JSON.stringify({ messages: [{ role: "user", content: message }] })
		});
	}

	async getAgentMemory(agentId: string): Promise<unknown> {
		return this.fetch(`/v1/agents/${agentId}/memory`);
	}
}

// Plugin definition
const plugin = definePlugin({
	async setup(ctx) {
		// --- Configuration ---
		const getLettaClient = async (): Promise<LettaClient | null> => {
			const config = ctx.config as { lettaApiKey?: string; lettaBaseUrl?: string };
			const apiKey = config.lettaApiKey;
			const baseUrl = config.lettaBaseUrl || "https://api.letta.com";

			if (!apiKey) {
				ctx.logger.warn("No Letta API key configured");
				return null;
			}

			return new LettaClient(baseUrl, apiKey);
		};

		// --- Data Actions ---

		// Get connection health
		ctx.data.register("health", async () => {
			const client = await getLettaClient();
			if (!client) return { status: "unconfigured", message: "API key not set" };

			try {
				const agents = await client.listAgents();
				return { status: "connected", agentCount: agents.length, checkedAt: new Date().toISOString() };
			} catch (err) {
				return { status: "error", message: err instanceof Error ? err.message : "Unknown error", checkedAt: new Date().toISOString() };
			}
		});

		// Get list of Letta agents
		ctx.data.register("letta-agents", async () => {
			const client = await getLettaClient();
			if (!client) return { agents: [], error: "Not configured" };

			try {
				const agents = await client.listAgents();
				return { agents };
			} catch (err) {
				return { agents: [], error: err instanceof Error ? err.message : "Failed to fetch agents" };
			}
		});

		// Get specific agent details
		ctx.data.register("letta-agent", async (params) => {
			const { agentId } = params as { agentId: string };
			const client = await getLettaClient();
			if (!client) return { error: "Not configured" };

			try {
				const agent = await client.getAgent(agentId);
				const memory = await client.getAgentMemory(agentId);
				return { agent, memory };
			} catch (err) {
				return { error: err instanceof Error ? err.message : "Failed to fetch" };
			}
		});

		// --- Actions ---

		// Test connection
		ctx.actions.register("test-connection", async () => {
			const client = await getLettaClient();
			if (!client) throw new Error("Letta API key not configured");

			const agents = await client.listAgents();
			return { ok: true, agentCount: agents.length };
		});

		// Sync all agents to state
		ctx.actions.register("sync-agents", async (params) => {
			const { companyId } = params as { companyId: string };
			const client = await getLettaClient();
			if (!client) throw new Error("Not configured");

			const lettaAgents = await client.listAgents();
			const synced: string[] = [];

			for (const agent of lettaAgents) {
				const mappingKey = `mapping:${companyId}:${agent.id}`;
				await ctx.state.set(
					{ scopeKind: "instance", stateKey: mappingKey },
					{ lettaAgentId: agent.id, name: agent.name, description: agent.description || "Imported from Letta", lastSync: new Date().toISOString() }
				);
				synced.push(agent.name);
			}

			await ctx.state.set(
				{ scopeKind: "company", scopeId: companyId, stateKey: "last-sync" },
				{ agentCount: lettaAgents.length, syncedAt: new Date().toISOString(), agentNames: synced }
			);

			return { synced: synced.length, agents: synced };
		});

		// Send message to Letta agent (with streaming)
		ctx.actions.register("send-message", async (params) => {
			const { lettaAgentId, message, streamChannel, companyId } = params as {
				lettaAgentId: string;
				message: string;
				streamChannel?: string;
				companyId: string;
			};

			const client = await getLettaClient();
			if (!client) throw new Error("Not configured");

			if (streamChannel) {
				ctx.streams.open(streamChannel, companyId);
			}

			const response = await client.sendMessage(lettaAgentId, message);

			if (streamChannel && response.messages) {
				for (const msg of response.messages) {
					ctx.streams.emit(streamChannel, { type: "chunk", content: msg.content, role: msg.role });
				}
				ctx.streams.close(streamChannel);
			}

			return { response: response.messages?.map(m => m.content).join("\n") || "", messageCount: response.messages?.length || 0 };
		});

		// --- Jobs ---
		ctx.jobs.register("sync-letta-agents", async (job) => {
			ctx.logger.info("Running scheduled Letta sync", { jobId: job.runId });
			const client = await getLettaClient();
			if (!client) {
				ctx.logger.warn("Cannot sync: not configured");
				return { skipped: true };
			}

			const agents = await client.listAgents();
			ctx.logger.info("Synced agents from Letta", { count: agents.length });
			return { synced: agents.length };
		});

		// --- Events ---
		ctx.events.on("agent.created", async (event) => {
			ctx.logger.info("Doer agent created", { agentId: event.entityId });
		});
	},

	async onHealth() {
		return { status: "ok", message: "Letta Bridge plugin running" };
	},

	async onValidateConfig(config) {
		const cfg = config as { lettaApiKey?: string; lettaBaseUrl?: string };
		const errors: string[] = [];

		if (!cfg.lettaApiKey) errors.push("Letta API key is required");

		return { ok: errors.length === 0, errors, warnings: [] };
	}
});

export default plugin;
runWorker(plugin, import.meta.url);
