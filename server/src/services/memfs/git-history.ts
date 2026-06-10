import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

/**
 * Git-backed history for local-fs memory roots — the "what did this agent
 * learn?" surface (capture-the-magic Phase 1.4). Mirrors the proven
 * ~/.letta pattern: every memory root is a git repo; UI saves and run
 * completions create commits; the UI renders session-to-session diffs.
 *
 * All functions are best-effort and never throw on missing git/repo —
 * memory must keep working on machines without git.
 */

const GIT_TIMEOUT_MS = 10_000;

async function git(rootPath: string, args: string[]): Promise<string> {
  const { stdout } = await exec("git", ["-C", rootPath, ...args], {
    timeout: GIT_TIMEOUT_MS,
    maxBuffer: 5 * 1024 * 1024,
  });
  return stdout;
}

export async function isGitRepo(rootPath: string): Promise<boolean> {
  try {
    const out = await git(rootPath, ["rev-parse", "--is-inside-work-tree"]);
    return out.trim() === "true";
  } catch {
    return false;
  }
}

/** Initialise a repo at the root if none exists. Returns true when a repo is present afterwards. */
export async function ensureGitRepo(rootPath: string): Promise<boolean> {
  if (await isGitRepo(rootPath)) return true;
  try {
    await git(rootPath, ["init"]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Stage everything under `pathScope` (or all) and commit. No-op when there is
 * nothing to commit. Returns the new commit sha, or null when skipped/failed.
 */
export async function commitMemoryChanges(
  rootPath: string,
  message: string,
  pathScope?: string,
): Promise<string | null> {
  try {
    if (!(await ensureGitRepo(rootPath))) return null;
    const scope = pathScope?.trim() ? [pathScope.trim()] : ["."];
    await git(rootPath, ["add", "--", ...scope]);
    const status = await git(rootPath, ["status", "--porcelain", "--", ...scope]);
    if (!status.trim()) return null;
    await git(rootPath, [
      "-c", "user.name=Doer",
      "-c", "user.email=memory@doer.local",
      "commit", "-m", message, "--", ...scope,
    ]);
    return (await git(rootPath, ["rev-parse", "HEAD"])).trim();
  } catch {
    return null;
  }
}

export interface MemoryCommit {
  sha: string;
  message: string;
  authorName: string;
  committedAt: string; // ISO
  filesChanged: number;
}

const LOG_FORMAT = "%H%x1f%an%x1f%cI%x1f%s";

export async function listMemoryHistory(
  rootPath: string,
  options: { pathScope?: string; limit?: number } = {},
): Promise<MemoryCommit[]> {
  try {
    if (!(await isGitRepo(rootPath))) return [];
    const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
    const args = ["log", `--max-count=${limit}`, `--format=${LOG_FORMAT}`, "--shortstat"];
    if (options.pathScope?.trim()) args.push("--", options.pathScope.trim());
    const out = await git(rootPath, args);

    const commits: MemoryCommit[] = [];
    let current: MemoryCommit | null = null;
    for (const line of out.split("\n")) {
      if (line.includes("\x1f")) {
        const [sha, authorName, committedAt, message] = line.split("\x1f");
        current = {
          sha: sha ?? "",
          authorName: authorName ?? "",
          committedAt: committedAt ?? "",
          message: message ?? "",
          filesChanged: 0,
        };
        commits.push(current);
      } else if (current && /\d+ files? changed/.test(line)) {
        const m = line.match(/(\d+) files? changed/);
        current.filesChanged = m ? Number(m[1]) : 0;
      }
    }
    return commits;
  } catch {
    return [];
  }
}

/** Unified diff for a single commit, optionally scoped to a path prefix. */
export async function getMemoryCommitDiff(
  rootPath: string,
  sha: string,
  options: { pathScope?: string; maxBytes?: number } = {},
): Promise<string | null> {
  if (!/^[0-9a-f]{4,40}$/i.test(sha)) return null;
  try {
    if (!(await isGitRepo(rootPath))) return null;
    const args = ["show", "--format=%H%n%an%n%cI%n%s%n---", "--unified=3", sha];
    if (options.pathScope?.trim()) args.push("--", options.pathScope.trim());
    const out = await git(rootPath, args);
    const maxBytes = options.maxBytes ?? 256 * 1024;
    return out.length > maxBytes ? `${out.slice(0, maxBytes)}\n… (diff truncated)` : out;
  } catch {
    return null;
  }
}
