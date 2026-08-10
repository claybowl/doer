import {
  LettaAgentClient,
  type CreateAgentOptions,
  type AnyAgentTool,
  type LettaCodeClientOptions,
  type LettaCodeClientSessionOptions,
} from "@letta-ai/letta-agent-sdk";
import path from "node:path";
import type { LettaCodeLlmProvider, LettaCodeSessionParams, ResolvedLettaCodeConfig } from "../shared/types.js";
import { StreamTokenBuffer } from "@doerai/adapter-utils/stream-buffer";
import { estimateCostUsd } from "@doerai/adapter-utils";
import { LLM_PROVIDER_PRESETS } from "./config.js";
import { mapSdkMessage, type LettaCodeOutputEvent, type LettaCodeSdkSessionIdentity } from "./sdk-events.js";
import {
  isPendingApprovalError,
  sweepStaleApprovals,
  type StaleApprovalSweepOptions,
  type StaleApprovalSweepResult,
} from "./stale-approvals.js";

export interface LettaSdkSessionLike {
  send(message: string): Promise<void>;
  stream(): AsyncGenerator<unknown>;
  abort(): Promise<void>;
  close(): void;
  readonly agentId: string | null;
  readonly sessionId: string | null;
  readonly conversationId: string | null;
}

export interface LettaSdkClientLike {
  createAgent(options?: CreateAgentOptions): Promise<string>;
  createSession(agentId?: string, options?: LettaCodeClientSessionOptions): LettaSdkSessionLike;
  resumeSession(id: string, options?: LettaCodeClientSessionOptions): LettaSdkSessionLike;
}

export interface LettaSdkRuntimeDependencies {
  createClient(options: LettaCodeClientOptions): LettaSdkClientLike;
  /**
   * Cloud-attached recovery hook: deny stale pending approvals left behind
   * when a previous run died mid-approval. Injectable for tests.
   */
  sweepStaleApprovals?(
    options: StaleApprovalSweepOptions,
  ): Promise<StaleApprovalSweepResult | null>;
}

export interface LettaSdkTurnInput {
  prompt: string;
  config: ResolvedLettaCodeConfig;
  sessionParams?: LettaCodeSessionParams | null;
  env: Record<string, string | undefined>;
  onEvent(event: LettaCodeOutputEvent): Promise<void>;
  signal?: AbortSignal;
  tools?: AnyAgentTool[];
}

export interface LettaSdkTurnUsage {
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
}

export interface LettaSdkTurnResult {
  success: boolean;
  summary: string;
  model: string;
  costUsd: number | null;
  /** True when `costUsd` was estimated from the rate card, not provider-reported. */
  costEstimated: boolean;
  /** Latest cumulative token usage reported by the Letta stream, if any. */
  usage: LettaSdkTurnUsage | null;
  sessionParams: LettaCodeSessionParams;
  sessionDisplayId: string;
}

const DEFAULT_DEPENDENCIES: LettaSdkRuntimeDependencies = {
  createClient: (options) => new LettaAgentClient(options) as LettaSdkClientLike,
};

function clientOptions(config: ResolvedLettaCodeConfig): LettaCodeClientOptions {
  return {
    backend: "local",
    transport: "app-server",
    appServer: { harnessBackend: config.harnessBackend },
  };
}

function sessionEnvironment(
  config: ResolvedLettaCodeConfig,
  source: Record<string, string | undefined>,
): Record<string, string> {
  const env = Object.fromEntries(
    Object.entries(source).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
  const memoryDir = env.LETTA_MEMFS_DIR?.trim() || env.DOER_AGENT_MEMORY_DIR?.trim();
  if (memoryDir) {
    env.MEMORY_DIR = memoryDir;
    env.LETTA_MEMORY_DIR = memoryDir;
    env.LETTA_MEMORY_DIR_EXPLICIT = "1";
    env.LETTA_LOCAL_BACKEND_DIR = env.DOER_AGENT_STATE_DIR?.trim()
      ? path.join(env.DOER_AGENT_STATE_DIR, "letta-local-backend")
      : path.join(path.dirname(memoryDir), ".letta-local-backend");
  }
  if (config.backend === "cloud_attached") {
    if (config.apiKey) env.LETTA_API_KEY = config.apiKey;
    if (config.apiBaseUrl) env.LETTA_BASE_URL = config.apiBaseUrl;
  } else if (config.backend === "local" && config.llmProvider && config.llmProvider !== "anthropic") {
    // Inject the per-LLM-provider API key and base URL into env vars that
    // the Letta local runtime reads when talking to the OpenAI-compatible
    // provider (Groq, OpenAI, NVIDIA, Ollama, …). Anthropic is handled by
    // the SDK's own ANTHROPIC_API_KEY env var convention.
    const preset = LLM_PROVIDER_PRESETS[config.llmProvider as Exclude<LettaCodeLlmProvider, "anthropic">];
    if (preset) {
      if (config.llmApiKey) env[preset.envKey] = config.llmApiKey;
      if (config.llmBaseUrl) env.LETTA_LLM_BASE_URL = config.llmBaseUrl;
    }
  }
  if (!config.modsEnabled) env.LETTA_DISABLE_MODS = "1";
  return env;
}

function sessionOptions(
  config: ResolvedLettaCodeConfig,
  env: Record<string, string | undefined>,
  tools: AnyAgentTool[] = [],
): LettaCodeClientSessionOptions {
  return {
    ...(config.model ? { model: config.model } : {}),
    ...(config.reasoningEffort ? { reasoningEffort: config.reasoningEffort } : {}),
    ...(config.cwd ? { cwd: config.cwd } : {}),
    permissionMode: config.permissionMode,
    // The app-server currently rejects allowedTools/disallowedTools on both
    // createAgent and session requests. Keep parsing legacy config for
    // compatibility, but let the app-server own tool availability.
    skillSources: config.skillSources,
    ...(config.systemInfoReminder === undefined ? {} : { systemInfoReminder: config.systemInfoReminder }),
    ...(config.dreaming ? { dreaming: config.dreaming } : {}),
    env: sessionEnvironment(config, env),
    tools,
  };
}

function createAgentOptions(
  config: ResolvedLettaCodeConfig,
  env: Record<string, string | undefined>,
  tools: AnyAgentTool[] = [],
): CreateAgentOptions {
  return {
    memfs: true,
    ...(config.model ? { model: config.model } : {}),
    ...(config.cwd ? { cwd: config.cwd } : {}),
    permissionMode: config.permissionMode,
    skillSources: config.skillSources,
    ...(config.systemInfoReminder === undefined ? {} : { systemInfoReminder: config.systemInfoReminder }),
    ...(config.dreaming ? { dreaming: config.dreaming } : {}),
    tools,
    // Supported by the app-server create-agent mode even though SDK 0.2.6's
    // CreateAgentOptions declaration omits this session-scoping field.
    env: sessionEnvironment(config, env),
  } as CreateAgentOptions;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function numberField(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export async function runLettaSdkTurn(
  input: LettaSdkTurnInput,
  dependencies: LettaSdkRuntimeDependencies = DEFAULT_DEPENDENCIES,
): Promise<LettaSdkTurnResult> {
  const client = dependencies.createClient(clientOptions(input.config));
  let agentId = input.sessionParams?.lettaAgentId || input.config.lettaAgentId;
  if (!agentId) {
    if (input.config.backend !== "local") {
      throw new Error("A Letta agent ID is required for cloud-attached execution");
    }
    agentId = await client.createAgent(createAgentOptions(input.config, input.env, input.tools));
  }

  const options = sessionOptions(input.config, input.env, input.tools);
  // Latest cumulative usage report from the stream, shared across retry
  // attempts. Holder object so TS doesn't narrow the closure-assigned value.
  const turnUsage: { latest: LettaSdkTurnUsage | null } = { latest: null };
  const consume = async (resumeId: string) => {
    const session = client.resumeSession(resumeId, options);
    const abort = () => { void session.abort(); };
    input.signal?.addEventListener("abort", abort, { once: true });
    let identity: LettaCodeSdkSessionIdentity | undefined;
    let resultMessage: Record<string, unknown> | undefined;
    // Shared StreamTokenBuffer from adapter-utils consolidates partial
    // streaming tokens using the SDK prefix-match pattern.
    const streamBuffer = new StreamTokenBuffer();
    try {
      await session.send(input.prompt);
      for await (const message of session.stream()) {
        const mapped = mapSdkMessage(message);
        if (mapped.session) identity = mapped.session;
        for (const event of mapped.events) {
          if (event.type === "usage_statistics") {
            turnUsage.latest = {
              inputTokens: numberField(event.inputTokens),
              outputTokens: numberField(event.outputTokens),
              cachedTokens: numberField(event.cachedTokens),
            };
            // Tag with the resolved model so downstream transcript parsers can
            // estimate cost without seeing the adapter config.
            await input.onEvent({ ...event, model: identity?.model || input.config.model });
            continue;
          }
          if (event.type === "assistant_message" || event.type === "reasoning_message") {
            const content = typeof event.content === "string" ? event.content : "";
            const kind = event.type === "assistant_message" ? "assistant" : "reasoning";
            if (event.delta === true) {
              // Incremental delta — accumulate into the shared buffer
              streamBuffer.appendDelta(kind, content);
              await input.onEvent(event);
              continue;
            }
            // Full-content event — match against accumulated deltas
            const remainder = streamBuffer.matchFullAndConsume(kind, content);
            if (!remainder) continue;
            await input.onEvent({ ...event, content: remainder });
            continue;
          }
          await input.onEvent(event);
        }
        const candidate = record(message);
        if (candidate.type === "result") resultMessage = candidate;
      }
      return {
        identity,
        resultMessage,
        agentId: session.agentId,
        sessionId: session.sessionId,
        conversationId: session.conversationId,
      };
    } finally {
      input.signal?.removeEventListener("abort", abort);
      session.close();
    }
  };

  const staleConversation = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    return /conversation.*(?:not found|missing|unknown)|(?:not found|missing|unknown).*conversation|\b404\b/i.test(message);
  };

  // A cloud conversation holding a stale pending approval rejects every new
  // message with 409 until the exact pending tool call IDs are denied. Sweep
  // them once, then retry the turn on the same resume target.
  const recoverStaleApproval = async (error: unknown): Promise<boolean> => {
    if (input.config.backend !== "cloud_attached") return false;
    if (!isPendingApprovalError(error)) return false;
    if (!input.config.apiKey || !input.config.apiBaseUrl) return false;
    const sweep = dependencies.sweepStaleApprovals ?? sweepStaleApprovals;
    const result = await sweep({
      agentId,
      apiKey: input.config.apiKey,
      apiBaseUrl: input.config.apiBaseUrl,
    });
    await input.onEvent({
      type: "stale_approval_sweep",
      toolCallIds: result?.swept ?? [],
      outcome: result ? "swept" : "failed",
    }).catch(() => undefined);
    return result !== null;
  };

  const resumeId = input.sessionParams?.conversationId || agentId;
  let turn;
  try {
    turn = await consume(resumeId);
  } catch (error) {
    if (await recoverStaleApproval(error)) {
      turn = await consume(resumeId);
    } else {
      if (!input.sessionParams?.conversationId || resumeId === agentId || !staleConversation(error)) throw error;
      turn = await consume(agentId);
    }
  }

  const { identity, resultMessage } = turn;

  if (!resultMessage) throw new Error("Letta SDK stream ended without a result");
  const success = resultMessage.success === true;
  const summary = typeof resultMessage.result === "string"
    ? resultMessage.result
    : typeof resultMessage.error === "string"
      ? resultMessage.error
      : "";
  const conversationId = identity?.conversationId || turn.conversationId || input.sessionParams?.conversationId || "";
  const canonicalAgentId = identity?.lettaAgentId || turn.agentId || agentId;
  if (!conversationId || !canonicalAgentId) throw new Error("Letta SDK did not return canonical session identity");

  const model = identity?.model || input.config.model;
  // Letta does not report per-run cost. When it ever does (totalCostUsd),
  // prefer it; otherwise estimate from token usage via the rate card. Unknown
  // models yield null — never fabricate a cost.
  const latestUsage = turnUsage.latest;
  let costUsd = typeof resultMessage.totalCostUsd === "number" ? resultMessage.totalCostUsd : null;
  let costEstimated = false;
  if (costUsd === null && latestUsage && latestUsage.inputTokens + latestUsage.outputTokens > 0) {
    const estimate = estimateCostUsd(model, {
      inputTokens: latestUsage.inputTokens,
      outputTokens: latestUsage.outputTokens,
      cachedTokens: latestUsage.cachedTokens,
    });
    if (estimate !== null) {
      costUsd = estimate;
      costEstimated = true;
    }
  }

  return {
    success,
    summary,
    model,
    costUsd,
    costEstimated,
    usage: latestUsage,
    sessionParams: {
      conversationId,
      lettaAgentId: canonicalAgentId,
      cwd: input.config.cwd,
      backend: input.config.backend,
    },
    sessionDisplayId: identity?.sessionId || turn.sessionId || conversationId,
  };
}
