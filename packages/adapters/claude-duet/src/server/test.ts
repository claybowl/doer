import type { AdapterEnvironmentTestContext, AdapterEnvironmentTestResult } from "@doerai/adapter-utils";

export async function testEnvironment(ctx: AdapterEnvironmentTestContext): Promise<AdapterEnvironmentTestResult> {
  const config = (ctx.config ?? {}) as Record<string, unknown>;
  const apiKey = (config.apiKey as string) || "";
  if (!apiKey) {
    return {
      adapterType: ctx.adapterType,
      status: "fail",
      checks: [
        { code: "claude_duet_api_key_missing", level: "error", message: "Anthropic API key is required" },
      ],
      testedAt: new Date().toISOString(),
    };
  }

  const baseUrl = (config.baseUrl as string) || "https://api.anthropic.com/v1";
  try {
    const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-3-5-20241022",
        max_tokens: 1,
        messages: [{ role: "user", content: "ping" }],
      }),
    });
    if (res.status === 401) {
      return {
      adapterType: ctx.adapterType,
        status: "fail",
        checks: [
          { code: "claude_duet_auth_failed", level: "error", message: "Invalid Anthropic API key" },
        ],
      testedAt: new Date().toISOString(),
      };
    }
    return {
      adapterType: ctx.adapterType,
      status: "pass",
      checks: [
        { code: "claude_duet_auth_ok", level: "info", message: "Anthropic API key validated" },
      ],
      testedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      adapterType: ctx.adapterType,
      status: "fail",
      checks: [
        { code: "claude_duet_connection_failed", level: "error", message: `Connection failed: ${err}` },
      ],
      testedAt: new Date().toISOString(),
    };
  }
}
