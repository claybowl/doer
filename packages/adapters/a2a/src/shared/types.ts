// ─── A2A Adapter — Shared Types ──────────────────────────────────────────────
//
// Type definitions for the A2A (Agent-to-Agent) Protocol adapter.
// A2A spec: https://github.com/a2aproject/A2A (v1.0.0)

// ─── Agent Card (L1 Data Model) ─────────────────────────────────────────────

export interface A2aAgentSkill {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  examples?: string[];
  inputModes?: string[];
  outputModes?: string[];
}

export interface A2aAgentCapabilities {
  streaming?: boolean;
  pushNotifications?: boolean;
  extendedAgentCard?: boolean;
  /** Dynamic skills discovery (declared extension) */
  [key: string]: unknown;
}

export interface A2aSecurityScheme {
  type: "HTTP" | "apiKey" | "oauth2";
  scheme?: "bearer" | string;
  flows?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface A2aAgentCard {
  name: string;
  description?: string;
  url: string;
  version: string;
  supportedProtocolVersions?: number[];
  capabilities: A2aAgentCapabilities;
  defaultInputModes: string[];
  defaultOutputModes: string[];
  skills: A2aAgentSkill[];
  securitySchemes?: Record<string, A2aSecurityScheme>;
  security?: Record<string, unknown>[];
  preferredTransport?: "JSON-RPC" | "JSON-REST";
  [key: string]: unknown;
}

// ─── Messages & Parts ────────────────────────────────────────────────────────

export type A2aPartType = "text" | "file" | "data";
export type A2aPart = A2aTextPart | A2aFilePart | A2aDataPart;

export interface A2aTextPart {
  type: "text";
  text: string;
  metadata?: Record<string, unknown>;
}

export interface A2aFilePart {
  type: "file";
  name?: string;
  description?: string;
  file: {
    name?: string;
    /** MIME type, e.g. "image/png" */
    mimeType?: string;
    /** Either a base64-encoded string or a URI reference */
    bytes?: string;
    uri?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface A2aDataPart {
  type: "data";
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface A2aMessage {
  messageId: string;
  role: "user" | "agent";
  parts: A2aPart[];
  metadata?: Record<string, unknown>;
}

// ─── Task Model ─────────────────────────────────────────────────────────────

export type A2aTaskState =
  | "TASK_STATE_SUBMITTED"
  | "TASK_STATE_WORKING"
  | "TASK_STATE_COMPLETED"
  | "TASK_STATE_FAILED"
  | "TASK_STATE_CANCELED"
  | "TASK_STATE_REJECTED"
  | "TASK_STATE_INPUT_REQUIRED"
  | "TASK_STATE_AUTH_REQUIRED";

export interface A2aTaskStatus {
  state: A2aTaskState;
  timestamp?: string;
  message?: A2aMessage;
}

export interface A2aArtifact {
  artifactId: string;
  name?: string;
  description?: string;
  parts: A2aPart[];
  metadata?: Record<string, unknown>;
}

export interface A2aTask {
  id: string;
  contextId: string;
  status: A2aTaskStatus;
  artifacts?: A2aArtifact[];
  history?: A2aMessage[];
  metadata?: Record<string, unknown>;
}

// ─── Streaming Events ────────────────────────────────────────────────────────

export interface A2aTaskStatusUpdateEvent {
  taskId: string;
  contextId: string;
  status: A2aTaskStatus;
  final: boolean;
}

export interface A2aTaskArtifactUpdateEvent {
  taskId: string;
  contextId: string;
  artifact: A2aArtifact;
}

export type A2aStreamEvent =
  | A2aTaskStatusUpdateEvent
  | A2aTaskArtifactUpdateEvent;

// ─── JSON-RPC 2.0 ───────────────────────────────────────────────────────────

export interface A2aJsonRpcRequest<T = unknown> {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params: T;
}

export interface A2aJsonRpcResponse<T = unknown> {
  jsonrpc: "2.0";
  id: string | number;
  result?: T;
  error?: A2aJsonRpcError;
}

export interface A2aJsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

// ─── Adapter Configuration ──────────────────────────────────────────────────

export interface A2aAdapterConfig {
  /** Base URL of the remote A2A agent endpoint (e.g. "https://agent.example.com/a2a") */
  endpointUrl: string;
  /** Optional: full URL to the Agent Card. Defaults to {endpointUrl}/.well-known/agent-card.json */
  agentCardUrl?: string;
  /** Bearer token for A2A authentication. Stored encrypted by Doer. */
  authToken?: string;
  /** Optional skill to invoke on the remote agent (maps to an AgentCard skill ID) */
  skillId?: string;
  /** Timeout in seconds before the A2A task is cancelled. Default: 300 */
  timeoutSec?: number;
}

/** Form values for the A2A adapter config UI. */
export interface A2aCreateConfigValues {
  endpointUrl: string;
  agentCardUrl?: string;
  authToken?: string;
  skillId?: string;
  timeoutSec?: number | string;
}

/** Resolved agent card + metadata, fetched once and cached. */
export interface A2aAgentInfo {
  card: A2aAgentCard;
  capabilities: {
    streaming: boolean;
    pushNotifications: boolean;
    extendedAgentCard: boolean;
  };
  skills: A2aAgentSkill[];
}
