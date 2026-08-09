// ─── A2A Adapter — Server Execute ─────────────────────────────────────────────
//
// Implements the Doer ServerAdapterModule execute() contract for the
// A2A (Agent-to-Agent) Protocol. Sends the task prompt as an A2A
// message/stream JSON-RPC request to a remote agent, maps SSE stream
// events into Doer transcript entries (JSON-lines on ctx.onLog("stdout")),
// and returns an AdapterExecutionResult with a trajectory array.
//
// A2A spec: https://github.com/a2aproject/A2A (v1.0.0, JSON-RPC 2.0 + SSE)

import type {
  AdapterExecutionContext,
  AdapterExecutionResult,
  AdapterInvocationMeta,
} from "@doerai/adapter-utils";
import type {
  A2aAdapterConfig,
  A2aMessage,
  A2aTask,
  A2aTaskState,
  A2aStreamEvent,
  A2aTaskStatusUpdateEvent,
  A2aTaskArtifactUpdateEvent,
  A2aAgentInfo,
} from "../shared/types.js";
import { A2aClient } from "./a2a-client.js";

// ── Constants ──────────────────────────────────────────────────────────────

const TERMINAL_STATES = new Set<A2aTaskState>([
  "TASK_STATE_COMPLETED",
  "TASK_STATE_FAILED",
  "TASK_STATE_CANCELED",
  "TASK_STATE_REJECTED",
]);

// Terminal failure states
const FAILURE_STATES = new Set<A2aTaskState>([
  "TASK_STATE_FAILED",
  "TASK_STATE_CANCELED",
  "TASK_STATE_REJECTED",
]);

// ── JSON-line emit helper ──────────────────────────────────────────────────
// Each emit writes one JSON object + newline to stdout. The UI parser
// (parseA2aStdoutLine) will reverse this into TranscriptEntry objects.
// Includes a timestamp matching the trajectory format.
// Also accumulates entries into the trajectory array for resultJson.

interface EmitFn {
  (payload: Record<string, unknown>): Promise<void>;
}

function makeEmit(
  ctx: AdapterExecutionContext,
  trajectory: Array<Record<string, unknown>>,
): EmitFn {
  return async function emit(payload: Record<string, unknown>): Promise<void> {
    const entry: Record<string, unknown> = {
      ts: new Date().toISOString(),
      ...payload,
    };
    await ctx.onLog("stdout", JSON.stringify(entry) + "\n");
    trajectory.push(entry);
  };
}

// ── Message construction ───────────────────────────────────────────────────

function buildTextMessage(
  ctx: AdapterExecutionContext,
  config: A2aAdapterConfig,
  userMessage: string,
): A2aMessage {
  const metadata: Record<string, unknown> = {
    doerRunId: ctx.runId,
    doerAgentId: ctx.agent?.id,
  };
  if (config.skillId) {
    metadata.skillId = config.skillId;
  }

  return {
    messageId: crypto.randomUUID(),
    role: "user",
    parts: [{ type: "text", text: userMessage }],
    metadata,
  };
}

// ── Streaming event → transcript mapping ───────────────────────────────────
// Maps A2A SSE stream events into Doer transcript JSON lines.

async function handleStatusUpdate(
  emit: EmitFn,
  event: A2aTaskStatusUpdateEvent,
): Promise<A2aTaskState | null> {
  const { status, final } = event;
  const state = status.state;

  // Emit the status message content (if any) as assistant text
  if (status.message && status.message.parts?.length > 0) {
    for (const part of status.message.parts) {
      if (part.type === "text" && part.text) {
        await emit({
          type: final ? "stop_reason" : "assistant_message",
          content: part.text,
          state,
        });
      }
    }
  }

  if (final) {
    // Emit a final status marker
    await emit({
      type: "stop_reason",
      reason: state,
      ...(status.message?.role ? { finalRole: status.message.role } : {}),
    });
    return state;
  }

  return null;
}

async function handleArtifactUpdate(
  emit: EmitFn,
  event: A2aTaskArtifactUpdateEvent,
): Promise<void> {
  const { artifact } = event;
  if (!artifact?.parts) return;

  for (const part of artifact.parts) {
    if (part.type === "text" && part.text) {
      await emit({
        type: "tool_return_message",
        content: part.text,
        toolCallId: artifact.artifactId,
        name: artifact.name ?? "artifact",
        isError: false,
      });
    } else if (part.type === "data" && part.data) {
      await emit({
        type: "tool_return_message",
        content: JSON.stringify(part.data),
        toolCallId: artifact.artifactId,
        name: artifact.name ?? "artifact",
        isError: false,
      });
    }
  }
}

// ── Main execution ──────────────────────────────────────────────────────────

export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const config = ctx.config as unknown as A2aAdapterConfig;

  if (!config.endpointUrl) {
    await ctx.onLog("stderr", "[a2a] Missing endpointUrl in adapter config\n");
    return {
      exitCode: 1,
      signal: null,
      timedOut: false,
      errorMessage: "A2A endpointUrl is required",
    };
  }

  const timeoutSec = config.timeoutSec ?? 300;
  const client = new A2aClient(config);

  // Trajectory accumulator — emitted entries are collected here for resultJson
  const trajectory: Array<Record<string, unknown>> = [];
  const emit = makeEmit(ctx, trajectory);

  // 1. Fetch and cache the Agent Card
  let agentInfo: A2aAgentInfo;
  try {
    agentInfo = await client.fetchAgentCard();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await ctx.onLog("stderr", `[a2a] Failed to fetch agent card: ${msg}\n`);
    return {
      exitCode: 1,
      signal: null,
      timedOut: false,
      errorMessage: `Agent Card fetch failed: ${msg}`,
    };
  }

  // 2. Build the user message
  const baseMessage =
    typeof ctx.context.message === "string"
      ? ctx.context.message
      : typeof ctx.context.prompt === "string"
        ? ctx.context.prompt
        : ctx.context.taskKey
          ? ctx.context.taskKey as string
          : "Hello";

  const userMessage = buildTextMessage(ctx, config, baseMessage);

  // 3. Emit the user message so the transcript shows the conversation
  await emit({ type: "user_message", content: baseMessage });

  // 4. Emit an init entry with agent card info
  await emit({
    type: "agent_card",
    agentName: agentInfo.card.name,
    agentDescription: agentInfo.card.description ?? "",
    version: agentInfo.card.version,
    streaming: agentInfo.capabilities.streaming,
    skills: agentInfo.skills.map((s) => s.id),
    model: agentInfo.card.name,
    sessionId: ctx.runtime.sessionId ?? ctx.runId,
  });

  // 5. Emit meta
  await ctx.onMeta?.({
    adapterType: "a2a",
    command: "a2a",
    prompt: baseMessage,
    context: {
      endpointUrl: config.endpointUrl,
      agentName: agentInfo.card.name,
      model: agentInfo.card.name,
    },
  } as AdapterInvocationMeta);

  // 6. Send message (streaming if supported, non-streaming fallback)
  let terminalState: A2aTaskState | null = null;
  let task: A2aTask | null = null;
  // Capture the task ID from the first SSE status update event.
  // A2A servers assign their own task ID (not the user message's messageId),
  // so getTask/cancelTask must use this captured ID.
  let taskId: string | null = null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutSec * 1000);

  try {
    if (agentInfo.capabilities.streaming) {
      // ── Streaming path: message/stream via SSE ──
      const stream = client.streamMessage(userMessage, controller.signal);

      for await (const event of stream) {
        if ("error" in event) {
          await ctx.onLog("stderr", `[a2a] Stream error: ${event.error.message}\n`);
          return {
            exitCode: 1,
            signal: null,
            timedOut: controller.signal.aborted,
            errorMessage: event.error.message,
            resultJson: { a2aTaskId: taskId ?? userMessage.messageId, trajectory },
          };
        }

        if ("end" in event) {
          break;
        }

        const evt = event as A2aStreamEvent;

        // Determine event type by discriminant
        if ("status" in evt && "final" in evt) {
          const statusEvt = evt as A2aTaskStatusUpdateEvent;
          if (!taskId && statusEvt.taskId) taskId = statusEvt.taskId;
          const state = await handleStatusUpdate(emit, statusEvt);
          if (state) terminalState = state;
        } else if ("artifact" in evt) {
          await handleArtifactUpdate(emit, evt as A2aTaskArtifactUpdateEvent);
        }
      }

      // If we didn't get a final state from the stream, try to fetch the task
      if (!terminalState) {
        try {
          task = await client.getTask(taskId ?? userMessage.messageId, true, controller.signal);
          terminalState = task.status.state;
        } catch {
          terminalState = "TASK_STATE_COMPLETED";
        }
      }
    } else {
      // ── Non-streaming path: message/send ──
      task = await client.sendMessage(userMessage, controller.signal);
      terminalState = task.status.state;

      // Emit the task's messages as a single block
      if (task.history) {
        for (const msg of task.history) {
          if (msg.role === "agent") {
            for (const part of msg.parts) {
              if (part.type === "text" && part.text) {
                await emit({ type: "assistant_message", content: part.text });
              }
            }
          }
        }
      }

      // Emit artifacts
      if (task.artifacts) {
        for (const artifact of task.artifacts) {
          await handleArtifactUpdate(emit, {
            taskId: task.id,
            contextId: task.contextId,
            artifact,
          });
        }
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const isTimeout = controller.signal.aborted;

    await ctx.onLog("stderr", `[a2a] ${isTimeout ? "Timeout" : "Error"}: ${msg}\n`);

    if (isTimeout) {
      // Attempt to cancel the task
      try {
        await client.cancelTask(taskId ?? userMessage.messageId, controller.signal);
      } catch {
        // best-effort
      }
    }

    return {
      exitCode: isTimeout ? null : 1,
      signal: isTimeout ? "SIGTERM" : null,
      timedOut: isTimeout,
      errorMessage: msg,
      resultJson: { a2aTaskId: taskId ?? userMessage.messageId, trajectory },
    };
  } finally {
    clearTimeout(timeoutId);
  }

  // 7. Determine exit code and summary
  const isFailure = terminalState ? FAILURE_STATES.has(terminalState) : false;

  // Emit a result summary
  await emit({
    type: "usage_statistics",
    state: terminalState,
    completed: !isFailure,
  });

  return {
    exitCode: isFailure ? 1 : 0,
    signal: null,
    timedOut: controller.signal.aborted,
    model: agentInfo.card.name,
    provider: "a2a",
    usage: {
      inputTokens: 0, // A2A doesn't expose token counts natively
      outputTokens: 0,
    },
    resultJson: {
      a2aTaskId: task?.id ?? taskId ?? userMessage.messageId,
      a2aContextId: task?.contextId ?? taskId ?? userMessage.messageId,
      finalState: terminalState,
      agentName: agentInfo.card.name,
      agentVersion: agentInfo.card.version,
      trajectory,
    },
    summary: `A2A task ${terminalState?.replace("TASK_STATE_", "").toLowerCase() ?? "completed"}`,
    clearSession: task ? false : true,
  };
}
