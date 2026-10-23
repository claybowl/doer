import type { AdapterExecutionContext, AdapterExecutionResult } from "@doerai/adapter-utils";
import { asString, asNumber, parseObject } from "@doerai/adapter-utils/server-utils";

export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const { config, runId, agent, context } = ctx;
  const apiKey = asString(config.apiKey, "");
  if (!apiKey) throw new Error("Grok Bot adapter missing apiKey");

  const baseUrl = asString(config.baseUrl, "https://api.x.ai/v1");
  const model = asString(config.model, "grok-2-1212");
  const timeoutMs = asNumber(config.timeoutSec, 120) * 1000;
  const maxTokens = asNumber(config.maxTokens, 4096);
  const temperature = asNumber(config.temperature, 0.7);
  const systemPrompt = asString(config.systemPrompt, "");

  const url = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;

  const messages: Array<{ role: string; content: string }> = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: JSON.stringify(context) });

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
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`Grok Bot API failed with status ${res.status}: ${errorBody}`);
    }

    const data = await res.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };

    const content = data.choices?.[0]?.message?.content ?? "";
    const usage = data.usage;

    return {
      exitCode: 0,
      signal: null,
      timedOut: false,
      summary: `Grok Bot (${model}): ${content.slice(0, 200)}`,
      provider: "xai",
      biller: "xai",
      model,
      usage: {
        inputTokens: usage?.prompt_tokens ?? 0,
        outputTokens: usage?.completion_tokens ?? 0,
        cachedInputTokens: 0,
      },
      resultJson: { content, usage },
    };
  } finally {
    clearTimeout(timer);
  }
}
