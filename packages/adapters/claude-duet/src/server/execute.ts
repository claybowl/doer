import type { AdapterExecutionContext, AdapterExecutionResult } from "@doerai/adapter-utils";
import { asString, asNumber } from "@doerai/adapter-utils/server-utils";

export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const { config, runId, agent, context } = ctx;
  const apiKey = asString(config.apiKey, "");
  if (!apiKey) throw new Error("Claude Duet adapter missing apiKey");

  const baseUrl = asString(config.baseUrl, "https://api.anthropic.com/v1");
  const model = asString(config.model, "claude-sonnet-4-20250514");
  const timeoutMs = asNumber(config.timeoutSec, 120) * 1000;
  const maxTokens = asNumber(config.maxTokens, 4096);
  const temperature = asNumber(config.temperature, 0.7);
  const systemPrompt = asString(config.systemPrompt, "");

  const url = `${baseUrl.replace(/\/+$/, "")}/messages`;

  const messages = [{ role: "user", content: JSON.stringify(context) }];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt || undefined,
        messages,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`Claude Duet API failed with status ${res.status}: ${errorBody}`);
    }

    const data = await res.json() as {
      content?: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };

    const content = data.content?.find((c) => c.type === "text")?.text ?? "";
    const usage = data.usage;

    return {
      exitCode: 0,
      signal: null,
      timedOut: false,
      summary: `Claude Duet (${model}): ${content.slice(0, 200)}`,
      provider: "anthropic",
      biller: "anthropic",
      model,
      usage: {
        inputTokens: usage?.input_tokens ?? 0,
        outputTokens: usage?.output_tokens ?? 0,
        cachedInputTokens: 0,
      },
      resultJson: { content, usage },
    };
  } finally {
    clearTimeout(timer);
  }
}
