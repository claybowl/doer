export const agentConfigurationDoc = `
# Letta Cloud Adapter

Connect any Letta Cloud agent to Paperclip by providing an Agent ID and API key.
Memory blocks are loaded live and editable directly from the config panel.

## Connection

| Field | Description |
|-------|-------------|
| **Agent ID** | Your Letta agent ID — format: \`agent-xxxxxxxx-xxxx-...\` |
| **API Key** | Your Letta Cloud API key (stored encrypted) |
| **Base URL** | Leave blank for Letta Cloud (\`https://api.letta.com\`). Set for self-hosted instances. |

## Memory Blocks

All memory blocks attached to the agent are shown in the config panel.
Edits are saved directly to Letta Cloud on blur — no separate Save step needed.
Read-only blocks (marked by Letta Cloud) are displayed but cannot be edited.

## Tools

Attached tools are listed with their name, description, and type.
You can attach/detach tools by providing a Letta Tool ID.

## Model Settings

| Field | Description |
|-------|-------------|
| **Model** | LLM handle, e.g. \`anthropic/claude-sonnet-4-5\` or \`openai/gpt-4o\` |
| **Temperature** | Sampling temperature (0.0–1.0) |
| **Max Tokens** | Maximum tokens per response |

## Running the Agent

Tasks sent to this agent are delivered as user messages to the Letta agent via the
Letta Cloud messages API. Responses are streamed back to the Paperclip transcript.

## Examples

\`\`\`
Agent ID:  agent-d436abf8-6057-44a6-8019-5f5dc0b22763
Base URL:  https://api.letta.com  (default)
Model:     anthropic/claude-sonnet-4-5
\`\`\`
`;
