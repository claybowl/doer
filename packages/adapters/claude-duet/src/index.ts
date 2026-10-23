export const type = "claude_duet";
export const label = "Claude Duet (Anthropic)";

export const memfsCapability = {
  supported: ["none"] as const,
  default: "none" as const,
};

export const models = [
  { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  { id: "claude-opus-4-20250514", label: "Claude Opus 4" },
  { id: "claude-haiku-3-5-20241022", label: "Claude Haiku 3.5" },
];

export const agentConfigurationDoc = `# claude_duet agent configuration

Adapter: claude_duet

Use when:
- You want Doer to invoke Anthropic's Claude Duet agent harness
- You want Claude's reasoning, tool use, and computer use capabilities
- You have an Anthropic API key

Don't use when:
- You need local tool execution (use claude_local)
- You don't have an Anthropic API key

Core fields:
- apiKey (string, required): Anthropic API key
- model (string, optional): Claude model id. Defaults to claude-sonnet-4-20250514.
- baseUrl (string, optional): API base URL. Defaults to https://api.anthropic.com/v1.
- systemPrompt (string, optional): System prompt / persona
- promptTemplate (string, optional): Run prompt template
- timeoutSec (number, optional): Request timeout in seconds (default: 120)

Operational fields:
- maxTokens (number, optional): Max output tokens (default: 4096)
- temperature (number, optional): Sampling temperature (0-1)

Notes:
- Claude Duet is Anthropic's agent harness with tool use and computer use.
- Doer orchestrates it (tasks, budgets, goals) but Claude handles execution internally.
- Costs tracked via Anthropic's API usage reporting.
`;
