import type { ResolvedMemfsBinding } from "@paperclipai/shared";
import type { MemfsMountStrategy, MemfsMountResult } from "./types.js";

/**
 * `native-letta`: Letta Cloud already ingests memfs files natively via its
 * agent runtime. Paperclip does not need to mount anything — we only record
 * the binding so Doer can observe/display it.
 *
 * V1 behavior: no-op mount, no-op unmount. Returns success with a descriptive
 * note so the execution workspace can log the decision.
 */
export const nativeLettaStrategy: MemfsMountStrategy = {
  id: "native-letta",

  async mount(binding: ResolvedMemfsBinding): Promise<MemfsMountResult> {
    return {
      ok: true,
      strategy: "native-letta",
      bindingId: binding.id,
      mountedPath: null,
      note: "Letta Cloud handles memfs natively; no server-side mount performed.",
    };
  },

  async unmount(): Promise<void> {
    // no-op
  },
};
