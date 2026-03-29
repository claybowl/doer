// Letta API types

export interface AgentsData {
	agents: LettaAgent[];
	error?: string;
}

export interface LettaAgent {
	id: string;
	name: string;
	description?: string;
	user_id?: string;
	created_at?: string;
	updated_at?: string;
	llm_config?: {
		model?: string;
		model_endpoint_type?: string;
		model_endpoint?: string;
		context_window?: number;
	};
	embedding_config?: {
		model?: string;
	};
	memory?: {
		core_memory?: Record<string, string>;
		archive_memory?: string;
	};
	tools?: string[];
	sources?: string[];
	tags?: string[];
}

export interface LettaMessage {
	role: "user" | "assistant" | "system" | "tool";
	content: string;
	name?: string;
	tool_calls?: unknown[];
	tool_call_id?: string;
}

export interface LettaResponse {
	messages: LettaMessage[];
	usage?: {
		input_tokens?: number;
		output_tokens?: number;
		total_tokens?: number;
	};
}

export interface AgentMapping {
	lettaAgentId: string;
	name: string;
	description: string;
	lastSync: string;
}

export interface SyncState {
	agentCount: number;
	syncedAt: string;
	agentNames: string[];
}
