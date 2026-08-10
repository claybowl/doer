import fs from "node:fs/promises";
import path from "node:path";
import type { AdapterExecutionContext } from "@doerai/adapter-utils";
import { buildPaperclipEnv } from "@doerai/adapter-utils/server-utils";

// ── Output auto-capture ─────────────────────────────────────────────────
// Local agents can't be trusted to publish deliverables voluntarily — they
// naturally drop files into `<cwd>/outputs/` (or `deliverables/`) and move
// on. After each successful run we scan those directories for files written
// during the run window and POST a copy to the company deliverables
// endpoint, so every produced file shows up on the Outputs page regardless
// of agent discipline. The sweep never fails the run.

const SCAN_DIR_NAMES = ["outputs", "deliverables"] as const;
const SKIP_DIR_NAMES = new Set(["node_modules", ".git"]);
const MAX_DEPTH = 3;
const MAX_FILES = 25;
const MAX_BYTES = 50 * 1024 * 1024; // matches the server's deliverable size cap
const MTIME_GRACE_MS = 5_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EXT_TO_KIND: Record<string, string> = {
  ".md": "md",
  ".markdown": "md",
  ".png": "png",
  ".jpg": "jpg",
  ".jpeg": "jpg",
  ".csv": "csv",
  ".html": "html",
  ".htm": "html",
  ".json": "json",
  ".pdf": "pdf",
  ".docx": "docx",
  ".xlsx": "xlsx",
  ".pptx": "pptx",
};

export function kindForFilename(filename: string): string {
  return EXT_TO_KIND[path.extname(filename).toLowerCase()] ?? "other";
}

export interface OutputSweepResult {
  captured: number;
  failed: number;
}

interface CandidateFile {
  absPath: string;
  relPath: string;
  sizeBytes: number;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function collectCandidateFiles(
  dir: string,
  cwd: string,
  depth: number,
  runStartMs: number,
  out: CandidateFile[],
): Promise<void> {
  if (out.length >= MAX_FILES || depth > MAX_DEPTH) return;
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return; // missing/unreadable scan dir is normal — most cwds have no outputs/
  }
  for (const entry of entries) {
    if (out.length >= MAX_FILES) return;
    if (entry.name.startsWith(".")) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIR_NAMES.has(entry.name)) continue;
      await collectCandidateFiles(abs, cwd, depth + 1, runStartMs, out);
    } else if (entry.isFile()) {
      try {
        const stat = await fs.stat(abs);
        if (stat.mtimeMs < runStartMs - MTIME_GRACE_MS) continue; // written before this run
        if (stat.size === 0 || stat.size > MAX_BYTES) continue;
        out.push({ absPath: abs, relPath: path.relative(cwd, abs), sizeBytes: stat.size });
      } catch {
        // File vanished mid-sweep — skip it.
      }
    }
  }
}

async function uploadCandidate(
  ctx: AdapterExecutionContext,
  base: string,
  companyId: string,
  issueId: string | null,
  file: CandidateFile,
): Promise<void> {
  const body = await fs.readFile(file.absPath);
  const filename = path.basename(file.absPath);
  const form = new FormData();
  form.append("file", new Blob([body]), filename);
  form.append("kind", kindForFilename(filename));
  form.append("filename", filename);
  form.append("title", filename);
  form.append("description", `Auto-captured from ${file.relPath}`);
  if (issueId) form.append("issueId", issueId);

  const headers: Record<string, string> = {};
  if (ctx.authToken) headers.Authorization = `Bearer ${ctx.authToken}`;
  headers["X-Doer-Run-Id"] = ctx.runId;

  const res = await fetch(`${base}/api/companies/${companyId}/deliverables`, {
    method: "POST",
    headers,
    body: form,
  });
  if (!res.ok) throw new Error(`POST deliverables -> ${res.status}`);
}

export async function captureRunOutputs(
  ctx: AdapterExecutionContext,
  cwd: string,
  runStartMs: number,
): Promise<OutputSweepResult> {
  const result: OutputSweepResult = { captured: 0, failed: 0 };
  try {
    const base = buildPaperclipEnv(ctx.agent).DOER_API_URL?.replace(/\/+$/, "");
    if (!base) return result;

    const context = record(ctx.context);
    const rawIssueId = nonEmptyString(context.issueId) ?? nonEmptyString(context.taskId);
    const issueId = rawIssueId && UUID_RE.test(rawIssueId) ? rawIssueId : null;

    const candidates: CandidateFile[] = [];
    for (const dirName of SCAN_DIR_NAMES) {
      await collectCandidateFiles(path.join(cwd, dirName), cwd, 1, runStartMs, candidates);
      if (candidates.length >= MAX_FILES) break;
    }

    for (const file of candidates) {
      try {
        await uploadCandidate(ctx, base, ctx.agent.companyId, issueId, file);
        result.captured += 1;
        await ctx.onLog("stdout", `[output-sweep] Captured ${file.relPath} → Outputs\n`);
      } catch (err) {
        result.failed += 1;
        await ctx.onLog(
          "stderr",
          `[output-sweep] Failed to capture ${file.relPath}: ${err instanceof Error ? err.message : String(err)}\n`,
        );
      }
    }
  } catch (err) {
    await ctx.onLog(
      "stderr",
      `[output-sweep] Sweep failed: ${err instanceof Error ? err.message : String(err)}\n`,
    );
  }
  return result;
}
