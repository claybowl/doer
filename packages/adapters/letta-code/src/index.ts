export type {
  LettaCodeAdapterConfig,
  LettaCodeOnlineConfig,
  LettaCodeOfflineConfig,
  LettaCodeMemoryBlock,
  LettaCodeMemoryUpdate,
} from "./shared/types.js";
export { parseLettaCodeStdoutLine } from "./ui/adapter.js";

export const models = [
  // ── Online mode — uses the model configured on the Letta agent ──────────
  // These are shown as suggestions; the actual model is set in the Letta UI.
  { id: "claude-opus-4-8", label: "Claude Opus 4.8 (via Letta)" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (via Letta / Offline)" },
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (via Letta / Offline)" },
  // ── Offline mode — called directly via Anthropic SDK ────────────────────
  { id: "gpt-4o", label: "GPT-4o (Offline / OpenAI)" },
  { id: "gpt-4o-mini", label: "GPT-4o Mini (Offline / OpenAI)" },
] as const;

export const memfsCapability = {
  supported: ["none", "fs_mount"],
  default: "fs_mount",
} as const;

export const agentConfigurationDoc = `
# letta_code Adapter

One adapter, two modes. Switch via \`mode\` in adapterConfig.

---

## Online mode (\`mode: "online"\`)

Connects to any Letta server — your Letta membership at \`api.letta.com\`,
a self-hosted instance, or a local Docker container. Streams responses exactly
like the dedicated \`letta_cloud\` adapter.

**Required fields:**
| Field | Description |
|-------|-------------|
| \`agentId\` | Your Letta agent ID (\`agent-<uuid>\`) |
| \`apiKey\` | Your Letta API key |
| \`baseUrl\` | Optional — defaults to \`https://api.letta.com\` |

---

## Offline mode (\`mode: "offline"\`)

Runs entirely inside Doer's Node.js process. No external server, no PostgreSQL,
no Docker. Memory is stored as plain \`.md\` files the LLM reads and updates.

**Required fields:**
| Field | Description |
|-------|-------------|
| \`memoryDir\` | Absolute path to directory of \`.md\` memory block files |
| \`model\` | LLM model string — e.g. \`claude-sonnet-4-6\` or \`gpt-4o\` |
| \`provider\` | \`anthropic\` (default) or \`openai\` |

**Optional:**
| Field | Description |
|-------|-------------|
| \`apiKey\` | API key override (falls back to \`ANTHROPIC_API_KEY\` / \`OPENAI_API_KEY\`) |
| \`systemPrompt\` | Base persona — memory block content is injected below this |
| \`heartbeatPrompt\` | Default user message for timer-triggered wakes |
| \`temperature\` | Sampling temperature |
| \`maxTokens\` | Max tokens per run (default 8192) |

**Memory update protocol:**
The LLM updates a block by including in its response:
\`\`\`
<memory_update label="persona">
new content here
</memory_update>
\`\`\`
The adapter writes \`{memoryDir}/{label}.md\` after the run.
New labels create new block files automatically.
`.trim();
