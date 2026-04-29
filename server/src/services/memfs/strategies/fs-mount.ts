import { promises as fs } from "node:fs";
import path from "node:path";
import type { ResolvedMemfsBinding } from "@doerai/shared";
import { normalizeMemfsPath } from "../store.js";
import type { MemfsMountStrategy, MemfsMountResult, MemfsMountContext } from "./types.js";

/**
 * `fs-mount`: Create a symlink (or directory) inside the adapter's working
 * directory that points at `<root>/<pathPrefix>`. The adapter reads/writes
 * through its normal file tools.
 *
 * V1 is read-only — we prefer symlinks so the adapter sees live edits from
 * Letta. If the target already exists, we leave it alone and return a warning
 * rather than overwriting user state.
 *
 * Mount path inside the working directory:
 *   - `binding.mountAs` if set (normalized)
 *   - otherwise `.memory/<binding.label or basename(pathPrefix)>`
 */
export const fsMountStrategy: MemfsMountStrategy = {
  id: "fs-mount",

  async mount(binding: ResolvedMemfsBinding, ctx: MemfsMountContext): Promise<MemfsMountResult> {
    if (!ctx.workingDirectory) {
      return {
        ok: false,
        strategy: "fs-mount",
        bindingId: binding.id,
        mountedPath: null,
        note: "fs-mount requires an execution working directory; none provided.",
      };
    }

    const normalizedPrefix = normalizeMemfsPath(binding.pathPrefix);
    const sourceAbs = path.resolve(binding.rootPath, normalizedPrefix);

    // Verify the source exists before symlinking; don't create dangling links.
    try {
      await fs.access(sourceAbs);
    } catch {
      return {
        ok: false,
        strategy: "fs-mount",
        bindingId: binding.id,
        mountedPath: null,
        note: `fs-mount source does not exist: ${sourceAbs}`,
      };
    }

    const mountRel = resolveMountRel(binding);
    const mountAbs = path.resolve(ctx.workingDirectory, mountRel);

    // Guard against mount paths escaping the working directory.
    const wdWithSep = ctx.workingDirectory.endsWith(path.sep)
      ? ctx.workingDirectory
      : ctx.workingDirectory + path.sep;
    if (!mountAbs.startsWith(wdWithSep)) {
      return {
        ok: false,
        strategy: "fs-mount",
        bindingId: binding.id,
        mountedPath: null,
        note: `fs-mount target escapes working directory: ${mountAbs}`,
      };
    }

    // Check for existing entry; if already a symlink to the same target, no-op.
    try {
      const existing = await fs.lstat(mountAbs);
      if (existing.isSymbolicLink()) {
        const linkTarget = await fs.readlink(mountAbs);
        const resolvedExisting = path.resolve(path.dirname(mountAbs), linkTarget);
        if (resolvedExisting === sourceAbs) {
          return {
            ok: true,
            strategy: "fs-mount",
            bindingId: binding.id,
            mountedPath: mountAbs,
            note: "fs-mount symlink already present.",
          };
        }
      }
      return {
        ok: false,
        strategy: "fs-mount",
        bindingId: binding.id,
        mountedPath: null,
        note: `fs-mount target already exists and is not our symlink: ${mountAbs}`,
      };
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e.code !== "ENOENT") throw err;
    }

    await fs.mkdir(path.dirname(mountAbs), { recursive: true });
    await fs.symlink(sourceAbs, mountAbs, "dir");

    return {
      ok: true,
      strategy: "fs-mount",
      bindingId: binding.id,
      mountedPath: mountAbs,
      note: `fs-mount symlink created at ${mountAbs}`,
    };
  },

  async unmount(binding: ResolvedMemfsBinding, ctx: MemfsMountContext): Promise<void> {
    if (!ctx.workingDirectory) return;
    const mountRel = resolveMountRel(binding);
    const mountAbs = path.resolve(ctx.workingDirectory, mountRel);
    try {
      const stat = await fs.lstat(mountAbs);
      if (stat.isSymbolicLink()) {
        await fs.unlink(mountAbs);
      }
    } catch {
      // ENOENT or permissions — nothing to do.
    }
  },
};

function resolveMountRel(binding: ResolvedMemfsBinding): string {
  if (binding.mountAs && binding.mountAs.length > 0) {
    return normalizeMemfsPath(binding.mountAs);
  }
  const leaf = binding.label
    ? binding.label
    : path.basename(normalizeMemfsPath(binding.pathPrefix)) || "memory";
  return path.posix.join(".memory", leaf);
}
