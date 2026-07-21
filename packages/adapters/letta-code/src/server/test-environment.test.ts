import { describe, expect, it } from "vitest";
import { testEnvironment } from "./test-environment.js";

describe("letta_code environment diagnostics", () => {
  it("accepts a local canonical SDK agent with Doer MemFS and no provider API key", async () => {
    const result = await testEnvironment({
      companyId: "company-1",
      adapterType: "letta_code",
      config: {
        backend: "local",
        model: "openai-codex/gpt-5",
        permissionMode: "unrestricted",
        env: { LETTA_MEMFS_DIR: "/tmp" },
      },
    }, {
      discoverCliVersion: async () => "0.27.30",
      readModDiagnostics: async () => ({ mods: [{ name: "memory-tools", status: "loaded" }] }),
    });

    expect(result.status).toBe("pass");
    expect(result.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "agent_sdk_ready", level: "info" }),
      expect.objectContaining({ code: "memory_dir_ok", level: "info" }),
      expect.objectContaining({ code: "local_agent_create", level: "info" }),
      expect.objectContaining({ code: "permissions", message: expect.stringContaining("unrestricted") }),
      expect.objectContaining({ code: "letta_cli_ready", message: expect.stringContaining("0.27.30") }),
      expect.objectContaining({ code: "mods_loaded", message: expect.stringContaining("1") }),
    ]));
    expect(result.checks.some((check) => check.code === "api_key_missing" && check.level === "error")).toBe(false);
  });

  it("requires an agent ID but allows CLI login for cloud-attached compatibility", async () => {
    const result = await testEnvironment({
      companyId: "company-1",
      adapterType: "letta_code",
      config: {
        backend: "cloud_attached",
        env: { LETTA_MEMFS_DIR: "/tmp" },
      },
    }, {
      discoverCliVersion: async () => null,
      readModDiagnostics: async () => null,
    });

    expect(result.status).toBe("fail");
    expect(result.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "agent_id_missing", level: "error" }),
      expect.objectContaining({ code: "cloud_auth_cli", level: "warn", hint: expect.stringContaining("letta /connect") }),
      expect.objectContaining({ code: "letta_cli_missing", level: "warn" }),
    ]));
  });
});
