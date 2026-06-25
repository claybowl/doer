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

      // Case 1: Already a symlink pointing to the correct target — no-op.
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
        // Symlink exists but points elsewhere — give actionable error.
        return {
          ok: false,
          strategy: "fs-mount",
          bindingId: binding.id,
          mountedPath: null,
          note: `fs-mount target is a symlink pointing to ${resolvedExisting} instead of ${sourceAbs}. Remove the existing symlink at ${mountAbs} and retry the heartbeat, or change the binding's mountAs to use a different path.`,
        };
      }

      // Case 2: Existing directory — check if empty (safe to replace) or non-empty (user data).
      if (existing.isDirectory()) {
        const entries = await fs.readdir(mountAbs);
        if (entries.length === 0) {
          // Empty directory — safe to replace with symlink.
          await fs.rmdir(mountAbs);
        } else {
          // Non-empty directory — refuse to clobber user data.
          return {
            ok: false,
            strategy: "fs-mount",
            bindingId: binding.id,
            mountedPath: null,
            note: `fs-mount cannot create symlink at ${mountAbs}: directory exists with ${entries.length} file(s) inside. Move files to ${sourceAbs}, remove the directory (rmdir "${mountAbs}"), then retry the heartbeat. Or change the binding's mountAs to use a different path.`,
          };
        }
      } else {
        // Regular file or other — refuse to overwrite.
        return {
          ok: false,
          strategy: "fs-mount",
          bindingId: binding.id,
          mountedPath: null,
          note: `fs-mount target already exists as a file (not a directory or symlink): ${mountAbs}. Remove it and retry the heartbeat, or change the binding's mountAs to use a different path.`,
        };
      }
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
