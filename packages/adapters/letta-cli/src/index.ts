export type { LettaCliAdapterConfig } from "./shared/types.js";
export { parseLettaCliStdoutLine } from "./ui/adapter.js";

export const models = [
  { id: "kimi-k2-5", label: "Kimi K2.5 (via Letta CLI)" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (via Letta CLI)" },
  { id: "claude-opus-4-8", label: "Claude Opus 4.8 (via Letta CLI)" },
] as const;

export const memfsCapability = {
  supported: ["none"],
  default: "none",
} as const;

export const agentConfigurationDoc = `
# letta_cli Adapter

Spawns the \`letta-code\` CLI headlessly — the same way \`claude_local\` spawns
the \`claude\` CLI — and talks to an existing **Letta Cloud** agent by ID.

This is the genuine headless-CLI adapter. The \`letta_code\` adapter (HTTP SDK)
remains the primary path for online agents; \`letta_cli\` is for cases where you
want subprocess isolation, stdin-based prompt delivery, or the CLI's built-in
session/conversation tracking.

---

## Required fields

| Field | Description |
|-------|-------------|
| \`agentId\` | Letta agent ID — \`agent-<uuid>\` format |
| \`apiKey\` | Your Letta API key (from app.letta.com) |

## Optional fields

| Field | Default | Description |
|-------|---------|-------------|
| \`baseUrl\` | \`https://api.letta.com\` | Letta server URL |
| \`backend\` | \`"api"\` | \`"api"\` for Letta Cloud, \`"local"\` for self-hosted |
| \`command\` | \`"letta-code"\` | Path to the letta-code binary |
| \`heartbeatPrompt\` | \`"Hello"\` | Default user message for timer-triggered wakes |
| \`timeoutSec\` | 0 (no limit) | Run timeout in seconds |

## Session resumption

The CLI returns a \`conversation_id\` in its result event. Doer stores this as
\`sessionParams.conversationId\` and passes \`--conversation <id>\` on the next
run so the agent picks up in the same conversation thread.

## Prerequisites

\`\`\`bash
npm install -g @letta-ai/letta-code
# verify:
letta-code --version
\`\`\`
`.trim();
