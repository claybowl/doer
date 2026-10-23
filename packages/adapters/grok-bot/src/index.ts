export const type = "grok_bot";
export const label = "Grok Bot (xAI)";

// Memfs capability — external agent harness, no local fs-mount.
export const memfsCapability = {
  supported: ["none"] as const,
  default: "none" as const,
};

export const models = [
  { id: "grok-2-1212", label: "Grok 2" },
  { id: "grok-2-mini-1212", label: "Grok 2 Mini" },
  { id: "grok-beta", label: "Grok Beta" },
];

export const agentConfigurationDoc = `# grok_bot agent configuration

Adapter: grok_bot

Use when:
- You want Doer to invoke xAI's Grok Bot as an external agent harness
- You want Grok's real-time X/Twitter integration and reasoning capabilities
- You have an xAI API key

Don't use when:
- You need local tool execution (use claude_local, codex_local, etc.)
- You don't have an xAI API key
- You need webhook-style external invocation (use http or openclaw_gateway)

Core fields:
- apiKey (string, required): xAI API key (from https://x.ai/api)
- model (string, optional): Grok model id. Defaults to grok-2-1212.
- baseUrl (string, optional): API base URL. Defaults to https://api.x.ai/v1.
- systemPrompt (string, optional): System prompt / persona for the agent
- promptTemplate (string, optional): Run prompt template
- timeoutSec (number, optional): Request timeout in seconds (default: 120)

Operational fields:
- maxTokens (number, optional): Max output tokens
- temperature (number, optional): Sampling temperature (0-2)

Notes:
- Grok Bot is a full agent harness with its own tool-calling and reasoning.
- Doer orchestrates it (tasks, budgets, goals) but Grok handles execution internally.
- Costs are tracked via xAI's API usage reporting.
- Grok has real-time access to X/Twitter data.
`;
