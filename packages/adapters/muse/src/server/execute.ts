import type { AdapterExecutionContext, AdapterExecutionResult } from "@doerai/adapter-utils";
import { asString, asNumber } from "@doerai/adapter-utils/server-utils";

export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const { config, runId, agent, context } = ctx;
  const apiKey = asString(config.apiKey, "");
  if (!apiKey) throw new Error("Muse adapter missing apiKey");

  const baseUrl = asString(config.baseUrl, "https://api.muse.ai/v1");
  const timeoutMs = asNumber(config.timeoutSec, 120) * 1000;

  const url = `${baseUrl.replace(/\/+$/, "")}/agent/run`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        agentId: agent.id,
        runId,
        context,
        prompt: JSON.stringify(context),
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`Muse API failed with status ${res.status}: ${errorBody}`);
    }

    const data = await res.json() as { result?: string; usage?: { inputTokens?: number; outputTokens?: number } };

    return {
      exitCode: 0,
      signal: null,
      timedOut: false,
      summary: `Muse: ${(data.result ?? "").slice(0, 200)}`,
      provider: "meta",
      biller: "meta",
      model: asString(config.model, "muse-default"),
      usage: {
        inputTokens: data.usage?.inputTokens ?? 0,
        outputTokens: data.usage?.outputTokens ?? 0,
        cachedInputTokens: 0,
      },
      resultJson: data,
    };
  } finally {
    clearTimeout(timer);
  }
}
