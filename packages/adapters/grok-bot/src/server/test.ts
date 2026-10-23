import type { AdapterEnvironmentTestContext, AdapterEnvironmentTestResult } from "@doerai/adapter-utils";

export async function testEnvironment(ctx: AdapterEnvironmentTestContext): Promise<AdapterEnvironmentTestResult> {
  const config = (ctx.config ?? {}) as Record<string, unknown>;
  const apiKey = (config.apiKey as string) || "";
  if (!apiKey) {
    return {
      adapterType: ctx.adapterType,
      status: "fail",
      checks: [
        { code: "grok_bot_api_key_missing", level: "error", message: "xAI API key is required" },
      ],
      testedAt: new Date().toISOString(),
    };
  }

  const baseUrl = (config.baseUrl as string) || "https://api.x.ai/v1";
  try {
    const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/models`, {
      headers: { authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      return {
      adapterType: ctx.adapterType,
        status: "fail",
        checks: [
          { code: "grok_bot_auth_failed", level: "error", message: `xAI API returned ${res.status}` },
        ],
      testedAt: new Date().toISOString(),
      };
    }
    return {
      adapterType: ctx.adapterType,
      status: "pass",
      checks: [
        { code: "grok_bot_auth_ok", level: "info", message: "xAI API key validated" },
      ],
      testedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      adapterType: ctx.adapterType,
      status: "fail",
      checks: [
        { code: "grok_bot_connection_failed", level: "error", message: `Connection failed: ${err}` },
      ],
      testedAt: new Date().toISOString(),
    };
  }
}
