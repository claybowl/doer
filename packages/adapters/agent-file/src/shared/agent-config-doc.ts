export const agentConfigurationDoc = `
# Letta .af → OpenCode Adapter

Import any Letta agent from a \`.af\` file and run it locally via OpenCode.
Memory blocks are unpacked into a local directory managed by Doer's memfs system.

## How it works

1. **Hire** — point Doer at a \`.af\` file. On hire-approval, Doer:
   - Unpacks the archive and extracts memory blocks (\`persona.txt\`, \`human.txt\`, etc.)
   - Writes an \`AGENTS.md\` file containing the agent's identity and memory map
   - Stores the extraction directory in \`memoryDir\` (shown below after hire)

2. **Run** — each heartbeat delegates to OpenCode locally:
   - The agent reads \`AGENTS.md\` for identity and memory block locations
   - Memory block files are mounted at \`.memory/<label>.txt\` in the working dir
   - The agent reads and updates these files directly — no Letta Cloud API calls

3. **Memfs panel** — to see and edit memory blocks in the Fernweh UI:
   - Go to **Memfs** → **New Root** → point it at \`memoryDir\`
   - Create a binding for this agent with strategy \`fs-mount\`
   - Memory files appear in the panel and stay in sync with the agent's working dir

## Connection

| Field | Description |
|-------|-------------|
| **Agent file (.af)** | Absolute path to the \`.af\` export from Letta Cloud or \`letta export\` |
| **Model** | OpenCode model in \`provider/model\` format — overrides the one in the .af |

## Memory

After hire, memory blocks are written as plain text files:
- \`<memoryDir>/persona.txt\` — agent identity and personality
- \`<memoryDir>/human.txt\` — context about the user
- \`<memoryDir>/<label>.txt\` — any additional blocks from the .af

Edit them directly in the filesystem or through the Fernweh memfs panel.

## Model Settings

| Field | Description |
|-------|-------------|
| **Model** | OpenCode model id, e.g. \`anthropic/claude-sonnet-4-5\` or \`openai/gpt-4o\` |
| **Skip permissions** | Allow OpenCode to access external directories without prompts (default: on) |
| **Timeout** | Run timeout in seconds (0 = no timeout) |

## Heartbeat Prompt

The wake message sent to the agent each heartbeat. Supports template vars:
\`{{agent.id}}\`, \`{{agent.name}}\`, \`{{run.id}}\`, \`{{context.*}}\`

## Notes

- This adapter intentionally severs the Letta Cloud connection. Once imported,
  the agent runs fully locally — no API keys, no cloud costs.
- To re-export a modified agent back to Letta Cloud, zip the \`memoryDir\`
  and update the agent via the Letta CLI.
- Session resumption is supported: OpenCode resumes the same session across
  heartbeats when the working directory is stable.
`;
