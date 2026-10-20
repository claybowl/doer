export type ProviderType =
  | "letta"
  | "chatgpt_oauth"
  | "openai"
  | "anthropic"
  | "ollama"
  | "ollama_cloud"
  | "openrouter"
  | "groq"
  | "together"
  | "custom";

export type ProviderAuthMode = "api_key" | "letta_cli" | "oauth" | "none";

export interface ProviderConnection {
  id: string;
  companyId: string;
  name: string;
  providerType: ProviderType;
  authMode: ProviderAuthMode;
  secretId: string | null;
  lettaBaseUrl: string;
  providerBaseUrl: string | null;
  isDefault: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface DiscoveredProviderModel {
  id: string;
  label: string;
  provider: string;
}

export interface DiscoveredLettaAgent {
  id: string;
  name: string;
  model: string | null;
}

export interface ProviderConnectionTestResult {
  ok: boolean;
  message: string;
}
