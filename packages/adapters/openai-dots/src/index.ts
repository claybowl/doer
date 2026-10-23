export const type = "openai_dots";
export const label = "OpenAI Dots";

export const memfsCapability = {
  supported: ["none"] as const,
  default: "none" as const,
};

export const models = [
  { id: "gpt-4o", label: "GPT-4o" },
  { id: "gpt-4o-mini", label: "GPT-4o Mini" },
  { id: "o1", label: "O1" },
  { id: "o3-mini", label: "O3 Mini" },
];

export const agentConfigurationDoc = `# openai_dots agent configuration

Adapter: openai_dots

Use when:
- You want Doer to invoke OpenAI's Dots agent harness
- You want OpenAI's reasoning and tool use capabilities
- You have an OpenAI API key

Don't use when:
- You need local tool execution (use codex_local or opencode_local)
- You don't have an OpenAI API key

Core fields:
- apiKey (string, required): OpenAI API key
- model (string, optional): OpenAI model id. Defaults to gpt-4o.
- baseUrl (string, optional): API base URL. Defaults to https://api.openai.com/v1.
- systemPrompt (string, optional): System prompt / persona
- promptTemplate (string, optional): Run prompt template
- timeoutSec (number, optional): Request timeout in seconds (default: 120)

Operational fields:
- maxTokens (number, optional): Max output tokens (default: 4096)
- temperature (number, optional): Sampling temperature (0-2)

Notes:
- OpenAI Dots is OpenAI's agent harness with tool use and reasoning.
- Doer orchestrates it (tasks, budgets, goals) but OpenAI handles execution internally.
- Costs tracked via OpenAI's API usage reporting.
`;
