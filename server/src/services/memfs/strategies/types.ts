import type { MemfsStrategy, ResolvedMemfsBinding } from "@paperclipai/shared";

export interface MemfsMountContext {
  /** Absolute path to the adapter's execution working directory, if any. */
  workingDirectory: string | null;
  /** Optional adapter identifier for strategy-specific behavior. */
  adapterType?: string;
}

export interface MemfsMountResult {
  ok: boolean;
  strategy: MemfsStrategy;
  bindingId: string;
  /** Absolute path where the memory was mounted, or null if no mount was performed. */
  mountedPath: string | null;
  note: string;
}

export interface MemfsMountStrategy {
  readonly id: MemfsStrategy;
  mount(binding: ResolvedMemfsBinding, ctx: MemfsMountContext): Promise<MemfsMountResult>;
  unmount(binding: ResolvedMemfsBinding, ctx: MemfsMountContext): Promise<void>;
}
