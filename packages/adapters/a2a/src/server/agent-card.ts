// ─── Agent Card Generation ───────────────────────────────────────────────────
//
// Generates an A2A Agent Card for a Doer agent, so Doer agents can be
// discovered and invoked by other A2A-compliant agents. This is the inbound
// direction (Doer as an A2A server).

import type { A2aAgentCard, A2aAgentSkill } from "../shared/types.js";

export interface DoerAgentInfo {
  id: string;
  name: string;
  description?: string;
  adapterType: string;
  skills?: string[];
}

/**
 * Generate an A2A Agent Card for a Doer agent.
 * Used by the server's Agent Discovery endpoints:
 *   GET /.well-known/agent-card.json
 *   GET /agent/{agentId}/.well-known/agent-card.json
 */
export function generateAgentCard(
  agent: DoerAgentInfo,
  options?: {
    baseUrl?: string;
    version?: string;
    streaming?: boolean;
    pushNotifications?: boolean;
    extendedAgentCard?: boolean;
  },
): A2aAgentCard {
  const {
    baseUrl = `http://${agent.id}.internal`,
    version = "1.0.0",
    streaming = true,
    pushNotifications = false,
    extendedAgentCard = false,
  } = options ?? {};

  // Map Doer skill names to A2A skill format
  const skills: A2aAgentSkill[] = (agent.skills ?? []).map((s) => ({
    id: s,
    name: s,
    description: `Doer skill: ${s}`,
    tags: [agent.adapterType],
  }));

  return {
    name: agent.name || `Doer Agent ${agent.id.slice(0, 8)}`,
    description: agent.description
      || `A Doer agent (adapter type: ${agent.adapterType}) participating in the A2A protocol.`,
    url: `${baseUrl}/a2a/${agent.id}`,
    version,
    supportedProtocolVersions: [1],
    capabilities: {
      streaming,
      pushNotifications,
      extendedAgentCard,
    },
    defaultInputModes: ["text"],
    defaultOutputModes: ["text"],
    skills,
    preferredTransport: "JSON-RPC",
  };
}

/**
 * Validate that a fetched Agent Card has the minimum required fields.
 */
export function validateAgentCard(card: unknown): A2aAgentCard {
  if (!card || typeof card !== "object") {
    throw new Error("Agent Card is not a valid object");
  }
  const obj = card as Record<string, unknown>;
  const required = ["name", "url", "version", "capabilities", "defaultInputModes", "defaultOutputModes", "skills"];
  for (const field of required) {
    if (!(field in obj)) {
      throw new Error(`Agent Card missing required field: ${field}`);
    }
  }
  return card as A2aAgentCard;
}
