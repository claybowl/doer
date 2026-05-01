import { promises as fs } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";

import type { LecoFileMap } from "./unpack.js";

/**
 * Result of writing a LeCo file map to disk.
 */
export interface WriteResult {
  /** Absolute path of the directory written. */
  unpackedTo: string;
  /** Number of files written. */
  fileCount: number;
  /** Warnings carried forward from the file map plus any disk-time warnings. */
  warnings: string[];
}

export interface WriteOptions {
  /** If true, write into a non-empty target directory (skipping conflicts). Default: false (throws on existing non-empty target). */
  overwrite?: boolean;
}

/**
 * Write a LeCo file map to disk.
 *
 * Pure-ish: takes the file map (path→content) plus a target directory and
 * an absolute Node fs handle. No network, no shell. The caller is
 * responsible for validating the user picked a sensible target dir.
 *
 * Refuses to write into a non-empty target unless `overwrite: true`. This
 * is the sharp edge — accidentally pointing at `~` and overwriting an
 * agent over the user's home directory would be catastrophic, so the
 * default behavior fails closed.
 */
export async function writeLecoToDisk(
  fileMap: LecoFileMap,
  targetDirectory: string,
  options: WriteOptions = {},
): Promise<WriteResult> {
  const { files, warnings: parseWarnings } = fileMap;

  if (!isAbsolute(targetDirectory)) {
    throw new Error(
      `Target directory must be an absolute path, got: ${targetDirectory}`,
    );
  }
  const target = resolve(targetDirectory);
  const warnings = [...parseWarnings];

  // Pre-flight: ensure target is empty (or doesn't exist), unless overwrite is on.
  let existed = false;
  try {
    const entries = await fs.readdir(target);
    existed = true;
    if (entries.length > 0 && !options.overwrite) {
      throw new Error(
        `Target directory is not empty: ${target}. Pass { overwrite: true } to write anyway.`,
      );
    }
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw err;
  }

  if (!existed) {
    await fs.mkdir(target, { recursive: true });
  }

  // Write each file. Create intermediate directories as needed.
  let fileCount = 0;
  for (const [relPath, content] of files) {
    const absPath = join(target, relPath);
    if (!absPath.startsWith(target + "/") && absPath !== target) {
      // Defensive: file map should only contain relative paths, but if a
      // bad entry slipped through, refuse to write outside target.
      warnings.push(`Skipped '${relPath}' — resolves outside target directory.`);
      continue;
    }
    await fs.mkdir(dirname(absPath), { recursive: true });
    await fs.writeFile(absPath, content, "utf8");
    fileCount++;
  }

  return { unpackedTo: target, fileCount, warnings };
}
