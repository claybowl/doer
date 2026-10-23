export const type = "muse";
export const label = "Muse (Meta)";

export const memfsCapability = {
  supported: ["none"] as const,
  default: "none" as const,
};

export const models = [
  { id: "muse-default", label: "Muse Default" },
];

export const agentConfigurationDoc = `# muse agent configuration

Adapter: muse

Use when:
- You want Doer to invoke Meta's Muse agent as an external agent harness
- You want Muse's personal AI capabilities (finances, health, shopping, scheduling)

Don't use when:
- You need local tool execution (use claude_local, codex_local, etc.)
- Muse API is not yet publicly available

Core fields:
- apiKey (string, required): Muse API key
- baseUrl (string, optional): API base URL
- model (string, optional): Muse model variant
- systemPrompt (string, optional): System prompt / persona
- promptTemplate (string, optional): Run prompt template
- timeoutSec (number, optional): Request timeout in seconds (default: 120)

Notes:
- Muse is Meta's personal AI agent harness.
- Doer orchestrates it (tasks, budgets, goals) but Muse handles execution internally.
- API availability depends on Meta's developer program.
`;
