import { promises as fs } from "node:fs";
import path from "node:path";
import type { MemfsFileEntry } from "@paperclipai/shared";

/**
 * Backend-agnostic interface for reading memfs content.
 *
 * V1 implementation: {@link LocalFsStore} against a filesystem directory.
 * V2+ may add GitHostedStore, McpProxyStore, etc. (see plan doc).
 *
 * Writes are intentionally not in the V1 surface — Letta remains the writer
 * while we ship read-only Paperclip visibility.
 */
export interface MemfsStore {
  /**
   * List entries directly under `prefix` (relative to the root). Non-recursive
   * by default to keep UI payloads small; callers can request recursion for
   * tree views.
   */
  list(prefix: string, options?: { recursive?: boolean }): Promise<MemfsFileEntry[]>;
  read(relPath: string): Promise<Buffer>;
  exists(relPath: string): Promise<boolean>;
  stat(relPath: string): Promise<MemfsFileEntry | null>;
}

/**
 * Normalize and validate a relative memfs path. Throws if the path would
 * escape the root or contains empty / dot segments. Always returns a
 * forward-slash joined string without a leading slash.
 */
export function normalizeMemfsPath(rel: string): string {
  // Reject absolute paths and Windows drive letters outright.
  if (rel.startsWith("/") || /^[a-zA-Z]:[\\/]/.test(rel)) {
    throw new Error(`memfs path must be relative: ${rel}`);
  }
  const segments = rel.split(/[\\/]+/).filter((s) => s.length > 0);
  if (segments.length === 0) return "";
  for (const seg of segments) {
    if (seg === "." || seg === "..") {
      throw new Error(`memfs path contains illegal segment "${seg}": ${rel}`);
    }
    // Disallow NUL and platform separators inside a single segment after split.
    if (seg.includes("\0")) {
      throw new Error(`memfs path contains NUL byte: ${rel}`);
    }
  }
  return segments.join("/");
}

interface IgnoreRule {
  pattern: string;
  negated: boolean;
  directoryOnly: boolean;
  hasSlash: boolean;
}

/**
 * Parses a subset of .gitignore-style rules from a `.lettaignore` file.
 * V1 supports: blank/comment lines, trailing `/` for directory-only,
 * leading `!` for negation, and literal `*` wildcards on path segments.
 * Full gitignore semantics (e.g. `**`, character classes) are intentionally
 * deferred.
 */
export function parseLettaIgnore(content: string): IgnoreRule[] {
  const rules: IgnoreRule[] = [];
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.length === 0 || line.startsWith("#")) continue;
    let pattern = line;
    let negated = false;
    if (pattern.startsWith("!")) {
      negated = true;
      pattern = pattern.slice(1);
    }
    let directoryOnly = false;
    if (pattern.endsWith("/")) {
      directoryOnly = true;
      pattern = pattern.slice(0, -1);
    }
    if (pattern.startsWith("/")) pattern = pattern.slice(1);
    const hasSlash = pattern.includes("/");
    rules.push({ pattern, negated, directoryOnly, hasSlash });
  }
  return rules;
}

function patternToRegExp(pattern: string): RegExp {
  // Escape regex metacharacters other than `*` and `?`, which we treat as
  // single-segment wildcards.
  let re = "";
  for (const ch of pattern) {
    if (ch === "*") re += "[^/]*";
    else if (ch === "?") re += "[^/]";
    else if (/[.+^$(){}|\\[\]]/.test(ch)) re += `\\${ch}`;
    else re += ch;
  }
  return new RegExp(`^${re}$`);
}

function matchRule(rule: IgnoreRule, relPath: string, isDirectory: boolean): boolean {
  if (rule.directoryOnly && !isDirectory) return false;
  const segments = relPath.split("/");
  if (rule.hasSlash) {
    return patternToRegExp(rule.pattern).test(relPath);
  }
  // Unanchored: match if any segment matches.
  const re = patternToRegExp(rule.pattern);
  return segments.some((seg) => re.test(seg));
}

export function isIgnored(rules: IgnoreRule[], relPath: string, isDirectory: boolean): boolean {
  let ignored = false;
  for (const rule of rules) {
    if (matchRule(rule, relPath, isDirectory)) {
      ignored = !rule.negated;
    }
  }
  return ignored;
}

export interface LocalFsStoreOptions {
  /** Optional override; defaults to `<rootPath>/.lettaignore` when present. */
  ignoreFilePath?: string;
}

export class LocalFsStore implements MemfsStore {
  private readonly rootPath: string;
  private rulesPromise: Promise<IgnoreRule[]> | null = null;

  constructor(rootPath: string, private readonly options: LocalFsStoreOptions = {}) {
    // Canonicalize on construction so later path guards are comparing absolutes.
    this.rootPath = path.resolve(rootPath);
  }

  private async loadIgnoreRules(): Promise<IgnoreRule[]> {
    if (!this.rulesPromise) {
      const ignoreFile = this.options.ignoreFilePath ?? path.join(this.rootPath, ".lettaignore");
      this.rulesPromise = fs
        .readFile(ignoreFile, "utf8")
        .then(parseLettaIgnore)
        .catch(() => [] as IgnoreRule[]);
    }
    return this.rulesPromise;
  }

  /** Resolve + guard a relative path against the root. Throws on escape. */
  private resolveSafe(rel: string): string {
    const normalized = normalizeMemfsPath(rel);
    const abs = path.resolve(this.rootPath, normalized);
    const rootWithSep = this.rootPath.endsWith(path.sep) ? this.rootPath : this.rootPath + path.sep;
    if (abs !== this.rootPath && !abs.startsWith(rootWithSep)) {
      throw new Error(`memfs path escapes root: ${rel}`);
    }
    return abs;
  }

  async list(prefix: string, options: { recursive?: boolean } = {}): Promise<MemfsFileEntry[]> {
    const absPrefix = this.resolveSafe(prefix);
    const rules = await this.loadIgnoreRules();
    const results: MemfsFileEntry[] = [];
    await this.walk(absPrefix, rules, options.recursive === true, results);
    // Sort for deterministic responses: directories first, then by path.
    results.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.path.localeCompare(b.path);
    });
    return results;
  }

  private async walk(
    absDir: string,
    rules: IgnoreRule[],
    recursive: boolean,
    acc: MemfsFileEntry[],
  ): Promise<void> {
    let entries: import("node:fs").Dirent[];
    try {
      entries = await fs.readdir(absDir, { withFileTypes: true });
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e.code === "ENOENT" || e.code === "ENOTDIR") return;
      throw err;
    }
    for (const entry of entries) {
      const entryAbs = path.join(absDir, entry.name);
      const rel = path.relative(this.rootPath, entryAbs).split(path.sep).join("/");
      const isDir = entry.isDirectory();
      if (isIgnored(rules, rel, isDir)) continue;
      const stat = await fs.stat(entryAbs);
      acc.push({
        path: rel,
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
        isDirectory: isDir,
      });
      if (recursive && isDir) {
        await this.walk(entryAbs, rules, recursive, acc);
      }
    }
  }

  async read(relPath: string): Promise<Buffer> {
    const abs = this.resolveSafe(relPath);
    return fs.readFile(abs);
  }

  async exists(relPath: string): Promise<boolean> {
    try {
      const abs = this.resolveSafe(relPath);
      await fs.access(abs);
      return true;
    } catch {
      return false;
    }
  }

  async stat(relPath: string): Promise<MemfsFileEntry | null> {
    try {
      const abs = this.resolveSafe(relPath);
      const stat = await fs.stat(abs);
      const rel = path.relative(this.rootPath, abs).split(path.sep).join("/");
      return {
        path: rel,
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
        isDirectory: stat.isDirectory(),
      };
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e.code === "ENOENT") return null;
      throw err;
    }
  }

  /** Exposed for strategy modules that need the absolute root to build symlinks. */
  getRootPath(): string {
    return this.rootPath;
  }
}
