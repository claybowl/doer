/**
 * Memfs reader — Phase 0 (decided 2026-04-22).
 *
 * Reads agent memory files directly from `~/.letta/agents/**` via Node `fs`.
 * No SDK extension, no capability gate — this is a first-party plugin and the
 * worker runs inside Doer's process. The `"memfs.read"` capability is declared
 * in the plugin manifest as documentation; when host-side enforcement lands,
 * the plugin contract does not change.
 *
 * Resolution order for the memfs root:
 *   1. Explicit `rootOverride` passed to the function (useful for tests)
 *   2. `MEMFS_ROOT` environment variable (set in Doer dev env)
 *   3. `${HOME}/.letta/agents` (fallback)
 *
 * `.lettaignore` is honored at the agent-dir level. The matcher supports a
 * deliberately small subset of gitignore syntax (exact path, directory prefix
 * with trailing `/`, `*.ext`, and `**` globs). Anything more exotic lands when
 * a real use case demands it.
 *
 * @see doc/plans/2026-04-21-wiki-graph-plugin.md — "Where memfs bytes actually
 *   come from — resolved 2026-04-22"
 */

import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

// ---------------------------------------------------------------------------
// Public wire-format types
// ---------------------------------------------------------------------------

export interface MemfsFileEntry {
  agentId: string;
  /** Path relative to the agent's root directory, forward-slashed. */
  path: string;
  sizeBytes: number;
  /** ISO8601 mtime — used as a cheap freshness signal. */
  updatedAt: string;
}

export interface MemfsFile extends MemfsFileEntry {
  /** UTF-8 contents. */
  content: string;
}

export interface MemfsReaderOptions {
  /** Override the resolved root. Primarily for tests. */
  rootOverride?: string;
}

// ---------------------------------------------------------------------------
// Root resolution
// ---------------------------------------------------------------------------

export function resolveMemfsRoot(opts: MemfsReaderOptions = {}): string {
  if (opts.rootOverride && opts.rootOverride.length > 0) {
    return opts.rootOverride;
  }
  const envRoot = process.env.MEMFS_ROOT;
  if (envRoot && envRoot.trim().length > 0) {
    return envRoot;
  }
  return path.join(os.homedir(), ".letta", "agents");
}

// ---------------------------------------------------------------------------
// Listing
// ---------------------------------------------------------------------------

/**
 * Enumerate agent IDs (subdirectories) under the memfs root.
 *
 * In production the caller should constrain this by consulting
 * `memfs_bindings` for their company scope. Phase 0 ships the raw enumeration;
 * Phase 1.5 wires the company filter.
 */
export async function listAllAgentIds(
  opts: MemfsReaderOptions = {},
): Promise<string[]> {
  const root = resolveMemfsRoot(opts);
  let entries;
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

/**
 * List files under a single agent's directory, honoring `.lettaignore`.
 *
 * Returns `[]` if the agent directory does not exist. Symlinks are followed
 * for stat but not treated specially — V1 does not attempt symlink-escape
 * detection beyond the per-read path-resolve check in `readAgentFile`.
 */
export async function listAgentFiles(
  agentId: string,
  opts: MemfsReaderOptions = {},
): Promise<MemfsFileEntry[]> {
  const root = resolveMemfsRoot(opts);
  const agentDir = path.join(root, agentId);

  const ignorePatterns = await loadLettaignore(agentDir);
  const relPaths = await walkFiles(agentDir);

  const out: MemfsFileEntry[] = [];
  for (const relRaw of relPaths) {
    const rel = toForwardSlash(relRaw);
    // `.lettaignore` is implementation metadata — never surface it.
    if (rel === ".lettaignore") continue;
    if (shouldIgnore(rel, ignorePatterns)) continue;
    const full = path.join(agentDir, relRaw);
    const stat = await fs.stat(full);
    if (!stat.isFile()) continue;
    out.push({
      agentId,
      path: rel,
      sizeBytes: stat.size,
      updatedAt: stat.mtime.toISOString(),
    });
  }

  out.sort((a, b) => a.path.localeCompare(b.path));
  return out;
}

/**
 * Read a single file under an agent's directory.
 *
 * Returns `null` if the file does not exist. Throws on path escape
 * (the caller passed a `relPath` that resolves outside the agent's dir).
 */
export async function readAgentFile(
  agentId: string,
  relPath: string,
  opts: MemfsReaderOptions = {},
): Promise<MemfsFile | null> {
  const root = resolveMemfsRoot(opts);
  const agentDir = path.resolve(path.join(root, agentId));

  // Path escape guard — resolve and ensure the result is still within agentDir.
  const requested = path.resolve(agentDir, relPath);
  const agentDirWithSep = agentDir.endsWith(path.sep)
    ? agentDir
    : agentDir + path.sep;
  if (requested !== agentDir && !requested.startsWith(agentDirWithSep)) {
    throw new Error(
      `MemfsReader: path escape rejected (agentId=${agentId}, relPath=${relPath})`,
    );
  }

  try {
    const stat = await fs.stat(requested);
    if (!stat.isFile()) return null;
    const content = await fs.readFile(requested, "utf8");
    const relNormalized = toForwardSlash(path.relative(agentDir, requested));
    return {
      agentId,
      path: relNormalized,
      sizeBytes: stat.size,
      updatedAt: stat.mtime.toISOString(),
      content,
    };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Internals — directory walk, `.lettaignore` matcher
// ---------------------------------------------------------------------------

async function walkFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  await walk(dir, "", out);
  return out;
}

async function walk(
  absDir: string,
  relPrefix: string,
  out: string[],
): Promise<void> {
  let entries;
  try {
    entries = await fs.readdir(absDir, { withFileTypes: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return;
    throw err;
  }

  for (const entry of entries) {
    const rel = relPrefix ? path.join(relPrefix, entry.name) : entry.name;
    const full = path.join(absDir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, rel, out);
    } else if (entry.isFile()) {
      out.push(rel);
    }
  }
}

async function loadLettaignore(agentDir: string): Promise<string[]> {
  const ignorePath = path.join(agentDir, ".lettaignore");
  try {
    const raw = await fs.readFile(ignorePath, "utf8");
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));
  } catch {
    return [];
  }
}

/**
 * Minimal gitignore-style matcher. Supports:
 *   - Exact relative path:                    `drafts/scratch.md`
 *   - Directory prefix (with `/`):            `drafts/`
 *   - Extension / basename glob (no `/`):     `*.tmp` — matches at any depth
 *   - Anchored glob (contains `/`):           `memory/*.tmp` — matches from root
 *   - Double-star glob:                       `secrets/**`, `**\/drafts`
 *
 * Bare patterns without `/` match the basename at any depth (gitignore
 * semantics). Patterns with `/` are anchored to the agent root.
 *
 * Intentionally small — expand only when a concrete need appears.
 */
export function shouldIgnore(relPath: string, patterns: string[]): boolean {
  if (patterns.length === 0) return false;
  const basename = relPath.includes("/")
    ? relPath.slice(relPath.lastIndexOf("/") + 1)
    : relPath;

  for (const patRaw of patterns) {
    const pat = patRaw.trim();
    if (pat.length === 0) continue;

    if (pat === relPath) return true;

    if (pat.endsWith("/")) {
      if (relPath === pat.slice(0, -1)) return true;
      if (relPath.startsWith(pat)) return true;
      continue;
    }

    if (pat.includes("*") || pat.includes("?")) {
      const re = globToRegex(pat);
      if (re.test(relPath)) return true;
      // Gitignore: a pattern without `/` matches the basename at any depth.
      if (!pat.includes("/") && re.test(basename)) return true;
      continue;
    }

    // Literal, no globs: also match bare basename at any depth.
    if (!pat.includes("/") && pat === basename) return true;
  }
  return false;
}

function globToRegex(pattern: string): RegExp {
  let out = "";
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i];
    if (ch === "*" && pattern[i + 1] === "*") {
      out += ".*";
      i += 2;
      if (pattern[i] === "/") i += 1;
      continue;
    }
    if (ch === "*") {
      out += "[^/]*";
      i += 1;
      continue;
    }
    if (ch === "?") {
      out += "[^/]";
      i += 1;
      continue;
    }
    if (/[.+^${}()|[\]\\]/.test(ch)) {
      out += "\\" + ch;
      i += 1;
      continue;
    }
    out += ch;
    i += 1;
  }
  return new RegExp(`^${out}$`);
}

function toForwardSlash(p: string): string {
  if (path.sep === "/") return p;
  return p.split(path.sep).join("/");
}
