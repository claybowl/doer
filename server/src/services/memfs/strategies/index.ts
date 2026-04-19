import type { MemfsStrategy, ResolvedMemfsBinding } from "@paperclipai/shared";
import { fsMountStrategy } from "./fs-mount.js";
import { nativeLettaStrategy } from "./native-letta.js";
import type { MemfsMountContext, MemfsMountResult, MemfsMountStrategy } from "./types.js";

const REGISTRY: Partial<Record<MemfsStrategy, MemfsMountStrategy>> = {
  "native-letta": nativeLettaStrategy,
  "fs-mount": fsMountStrategy,
  // V1 intentionally stops here. mcp-server/tool-callable/system-prompt-inject/none
  // are declared in the type system but have no implementation yet.
};

export function getMemfsStrategy(id: MemfsStrategy): MemfsMountStrategy | null {
  return REGISTRY[id] ?? null;
}

/**
 * Apply all bindings for an execution context. Unsupported strategies are
 * logged into the result rather than thrown so adapter boot isn't blocked
 * by a single mis-configured binding.
 */
export async function resolveMemfsStrategies(
  bindings: readonly ResolvedMemfsBinding[],
  ctx: MemfsMountContext,
): Promise<MemfsMountResult[]> {
  const results: MemfsMountResult[] = [];
  for (const binding of bindings) {
    const strategy = getMemfsStrategy(binding.strategy);
    if (!strategy) {
      results.push({
        ok: false,
        strategy: binding.strategy,
        bindingId: binding.id,
        mountedPath: null,
        note: `memfs strategy "${binding.strategy}" is not implemented in V1`,
      });
      continue;
    }
    try {
      results.push(await strategy.mount(binding, ctx));
    } catch (err) {
      results.push({
        ok: false,
        strategy: binding.strategy,
        bindingId: binding.id,
        mountedPath: null,
        note: `mount threw: ${(err as Error).message}`,
      });
    }
  }
  return results;
}

export { fsMountStrategy } from "./fs-mount.js";
export { nativeLettaStrategy } from "./native-letta.js";
export type { MemfsMountContext, MemfsMountResult, MemfsMountStrategy } from "./types.js";
