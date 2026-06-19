import { describe, it, expect } from "vitest";
import type { AdapterExecutionContext } from "@doerai/adapter-utils";
import type { LettaCodeOfflineConfig } from "../shared/types.js";
import { resolveOfflineMemoryDir } from "./execute.js";

/**
 * Build a minimal AdapterExecutionContext whose config carries an `env` bag —
 * this is what Doer's heartbeat injects (LETTA_MEMFS_DIR from a memory binding,
 * DOER_AGENT_MEMORY_DIR from the native workspace).
 */
function ctxWithEnv(
  env: Record<string, string>,
  configExtra: Record<string, unknown> = {},
): AdapterExecutionContext {
  return {
    runId: "run-1",
    agent: { id: "a", name: "n", companyId: "c" } as never,
    runtime: { sessionId: null, sessionParams: null, sessionDisplayId: null, taskKey: null },
    config: { mode: "offline", env, ...configExtra },
    context: {},
    onLog: async () => {},
  } as unknown as AdapterExecutionContext;
}

const baseConfig: LettaCodeOfflineConfig = { mode: "offline", memoryDir: "" };

describe("resolveOfflineMemoryDir", () => {
  it("prefers an explicit adapterConfig.memoryDir over env", () => {
    const ctx = ctxWithEnv({ LETTA_MEMFS_DIR: "/from/binding" });
    const config: LettaCodeOfflineConfig = { ...baseConfig, memoryDir: "/explicit/dir" };
    expect(resolveOfflineMemoryDir(ctx, config)).toBe("/explicit/dir");
  });

  it("falls back to LETTA_MEMFS_DIR when memoryDir is unset", () => {
    const ctx = ctxWithEnv({ LETTA_MEMFS_DIR: "/from/binding" });
    expect(resolveOfflineMemoryDir(ctx, baseConfig)).toBe("/from/binding");
  });

  it("falls back to DOER_AGENT_MEMORY_DIR when no binding mount is present", () => {
    const ctx = ctxWithEnv({ DOER_AGENT_MEMORY_DIR: "/native/workspace/memory" });
    expect(resolveOfflineMemoryDir(ctx, baseConfig)).toBe("/native/workspace/memory");
  });

  it("prefers LETTA_MEMFS_DIR over DOER_AGENT_MEMORY_DIR", () => {
    const ctx = ctxWithEnv({
      LETTA_MEMFS_DIR: "/from/binding",
      DOER_AGENT_MEMORY_DIR: "/native/workspace/memory",
    });
    expect(resolveOfflineMemoryDir(ctx, baseConfig)).toBe("/from/binding");
  });

  it("returns undefined when nothing is configured", () => {
    const ctx = ctxWithEnv({});
    expect(resolveOfflineMemoryDir(ctx, baseConfig)).toBeUndefined();
  });

  it("ignores blank/whitespace values", () => {
    const ctx = ctxWithEnv({ LETTA_MEMFS_DIR: "   " });
    const config: LettaCodeOfflineConfig = { ...baseConfig, memoryDir: "  " };
    expect(resolveOfflineMemoryDir(ctx, config)).toBeUndefined();
  });
});
