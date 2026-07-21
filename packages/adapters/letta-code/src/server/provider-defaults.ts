import type { ProviderType } from "@doerai/shared";

export interface ProviderDefaults {
  providerBaseUrl: string | null;
  endpointLabel: string;
}

export const LETTA_API_DEFAULT = "https://api.letta.com";

export const PROVIDER_DEFAULTS: Record<ProviderType, ProviderDefaults> = {
  letta: { providerBaseUrl: null, endpointLabel: "Letta API" },
  chatgpt_oauth: { providerBaseUrl: null, endpointLabel: "Managed by Letta authentication" },
  openai: { providerBaseUrl: "https://api.openai.com/v1", endpointLabel: "OpenAI API" },
  anthropic: { providerBaseUrl: "https://api.anthropic.com", endpointLabel: "Anthropic API" },
  ollama: { providerBaseUrl: "http://127.0.0.1:11434", endpointLabel: "Local Ollama" },
  ollama_cloud: { providerBaseUrl: "https://ollama.com", endpointLabel: "Ollama Cloud" },
  openrouter: { providerBaseUrl: "https://openrouter.ai/api/v1", endpointLabel: "OpenRouter API" },
  groq: { providerBaseUrl: "https://api.groq.com/openai/v1", endpointLabel: "Groq API" },
  together: { providerBaseUrl: "https://api.together.xyz/v1", endpointLabel: "Together API" },
  custom: { providerBaseUrl: null, endpointLabel: "Custom provider" },
};

export function getProviderDefaults(providerType: ProviderType): ProviderDefaults {
  return PROVIDER_DEFAULTS[providerType];
}
