import type { MemfsStrategy, MemfsPermission, MemfsRootKind } from "../constants.js";

/**
 * Capability declaration exported by each adapter package. Declares which
 * memfs strategies the adapter supports and which one it defaults to.
 */
export interface AdapterMemfsCapability {
  supported: readonly MemfsStrategy[];
  default: MemfsStrategy;
}

/**
 * A file or directory entry returned by MemfsStore.list / stat.
 * Paths are relative to the memfs root.
 */
export interface MemfsFileEntry {
  path: string;
  size: number;
  modifiedAt: string; // ISO
  isDirectory: boolean;
}

/** DTO shape returned by the memfs REST endpoints. */
export interface MemfsRootDTO {
  id: string;
  companyId: string;
  kind: MemfsRootKind;
  rootPath: string;
  label: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemfsBindingDTO {
  id: string;
  agentId: string;
  rootId: string;
  pathPrefix: string;
  strategy: MemfsStrategy;
  permission: MemfsPermission;
  mountAs: string | null;
  label: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Binding resolved for execution — joined with root rootPath for the runtime. */
export interface ResolvedMemfsBinding extends MemfsBindingDTO {
  rootPath: string;
  rootKind: MemfsRootKind;
  rootLabel: string;
}
