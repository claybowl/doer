export const agentConfigurationDoc = `
# A2A Remote Agent Adapter

Connect Doer to any A2A (Agent-to-Agent Protocol) compliant remote agent.
Doer sends tasks as A2A messages and streams the agent's responses back
to the Doer transcript. See the [A2A specification](https://github.com/a2aproject/A2A) for details.

## Connection

| Field | Description |
|-------|-------------|
| **Endpoint URL** | Base URL of the remote A2A agent (e.g. \`https://agent.example.com/a2a\`) |
| **Agent Card URL** | Optional override. Defaults to \`{endpointUrl}/.well-known/agent-card.json\`. Leave blank to auto-discover. |
| **Auth Token** | Bearer token for A2A authentication (if the agent requires it). Stored encrypted. |
| **Skill ID** | Optional: invoke a specific skill on the remote agent instead of the default. Matches the \`id\` field in the agent card's \`skills\` array. |
| **Timeout** | Seconds before Doer cancels the A2A task. Default: 300 (5 min). |

## How It Works

1. On each heartbeat, Doer fetches the remote agent's Agent Card (cached per agent).
2. Doer sends an A2A \`message/stream\` JSON-RPC request with the task prompt.
3. The agent's SSE stream responses (\`TaskStatusUpdateEvent\` / \`TaskArtifactUpdateEvent\`)
   are mapped to Doer transcript entries in real time.
4. When the task reaches a terminal state (completed, failed, canceled), the adapter returns
   \`AdapterExecutionResult\` with exit code and summary.

## Agent Card Discovery

Doer fetches \`GET {endpointUrl}/.well-known/agent-card.json\` (or your custom URL).
The Card declares the agent's \`capabilities.streaming\` (must be true for live streaming),
\`skills\` (for skill-specific invocation), and \`securitySchemes\` (for auth).

## Examples

\`\`\`
Endpoint URL:  https://research-agent.example.com/a2a
Auth Token:    letta-sk-abc123...
Skill ID:      research     (optional — invoke a specific skill)
Timeout:       300
\`\`\`
`;
