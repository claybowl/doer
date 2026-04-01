import type { AdapterExecutionContext, AdapterExecutionResult } from "@paperclipai/adapter-utils";
import type { LettaCloudAdapterConfig } from "../shared/types.js";
import { getLettaClient } from "./letta-client.js";
import { renderTemplate } from "@paperclipai/adapter-utils/server-utils";

/** Extract user-visible text from a single Letta message object */
function extractText(msg: Record<string, unknown>): string | null {
  const type = String(msg.message_type ?? "");
  switch (type) {
    case "assistant_message":
      return typeof msg.content === "string" ? msg.content : null;
    case "reasoning_message":
      return typeof msg.content === "string" ? `[thinking] ${msg.content}` : null;
    case "tool_call_message": {
      const tc = msg.tool_call as Record<string, unknown> | undefined;
      return tc ? `[tool: ${tc.name}]` : null;
    }
    case "tool_return_message":
      return null; // suppress tool results from transcript
    default:
      return null;
  }
}

export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const config = ctx.config as LettaCloudAdapterConfig;

  if (!config.agentId || !config.apiKey) {
    await ctx.onLog("stderr", "[letta-cloud] Missing agentId or apiKey in adapter config\n");
    return { exitCode: 1, signal: null, timedOut: false };
  }

  // The task message is passed via context.message (Paperclip standard)
  // If not set, fall back to heartbeatPrompt config, then to a sensible default.
  let userMessage =
    typeof ctx.context.message === "string"
      ? ctx.context.message
      : typeof ctx.context.prompt === "string"
        ? ctx.context.prompt
        : null;

  // If no explicit message/prompt, use heartbeatPrompt template or default
  if (!userMessage) {
    const heartbeatPrompt = config.heartbeatPrompt?.trim();
    if (heartbeatPrompt) {
      const templateData = {
        agentId: ctx.agent?.id ?? "",
        agentName: ctx.agent?.name ?? "",
        agent: ctx.agent ?? { id: "", name: "" },
        runId: ctx.runId ?? "",
        run: { id: ctx.runId ?? "" },
        context: ctx.context ?? {},
      };
      userMessage = renderTemplate(heartbeatPrompt, templateData);
    } else {
      userMessage = "Hello";
    }
  }

  const client = getLettaClient(config);

  try {
    await ctx.onMeta?.({
      adapterType: "letta_cloud",
      command: "letta-cloud",
      prompt: userMessage,
      context: { agentId: config.agentId, model: config.model },
    });

    const response = await client.agents.messages.create(config.agentId, {
      messages: [{ role: "user", content: userMessage }],
    });

    const messages = (response as Record<string, unknown>).messages;
    if (Array.isArray(messages)) {
      for (const msg of messages as Record<string, unknown>[]) {
        const text = extractText(msg);
        if (text) {
          await ctx.onLog("stdout", text + "\n");
        }
      }
    }

    return {
      exitCode: 0,
      signal: null,
      timedOut: false,
      model: config.model,
      provider: "letta",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    await ctx.onLog("stderr", `[letta-cloud] Error: ${message}\n`);
    return { exitCode: 1, signal: null, timedOut: false, errorMessage: message };
  }
}
