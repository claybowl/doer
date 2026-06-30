import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { Db } from "@doerai/db";
import { memfsRoots, deliverables } from "@doerai/db";
import { DELIVERABLE_CONTENT_TYPES } from "@doerai/shared";
import type { DeliverableKind } from "@doerai/shared";
import { resolveCompanyOutputsDir } from "../home-paths.js";

const KIND_EXT: Record<string, string> = {
  md: "md",
  json: "json",
  csv: "csv",
  html: "html",
  txt: "txt",
  other: "txt",
};

function kindToExt(kind: string): string {
  return KIND_EXT[kind] ?? kind;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "output";
}

function todayPrefix(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * Ensure `~/Doer/<instance>/companies/<companyId>/outputs/` exists on disk
 * and has a corresponding memfs root row.  Idempotent — safe to call on
 * every write_output invocation.
 */
export async function ensureCompanyOutputsRoot(
  db: Db,
  companyId: string,
): Promise<{ rootId: string; dir: string }> {
  const dir = resolveCompanyOutputsDir(companyId);
  await fs.mkdir(dir, { recursive: true });

  // Check for existing root by path.
  const existing = await db
    .select({ id: memfsRoots.id })
    .from(memfsRoots)
    .where(and(eq(memfsRoots.companyId, companyId), eq(memfsRoots.rootPath, dir)))
    .then((rows) => rows[0] ?? null);

  if (existing) return { rootId: existing.id, dir };

  // Create the root.  If two concurrent calls race, one will conflict —
  // re-fetch on unique-constraint error.
  try {
    const [inserted] = await db
      .insert(memfsRoots)
      .values({ companyId, kind: "local-fs", rootPath: dir, label: "Outputs" })
      .returning({ id: memfsRoots.id });
    return { rootId: inserted!.id, dir };
  } catch {
    const row = await db
      .select({ id: memfsRoots.id })
      .from(memfsRoots)
      .where(and(eq(memfsRoots.companyId, companyId), eq(memfsRoots.rootPath, dir)))
      .then((rows) => rows[0] ?? null);
    if (!row) throw new Error("ensureCompanyOutputsRoot: race recovery failed");
    return { rootId: row.id, dir };
  }
}

export interface WriteOutputInput {
  companyId: string;
  title: string;
  content: string;
  kind: DeliverableKind;
  description?: string | null;
  producedByAgentId?: string | null;
  producedByRunId?: string | null;
  issueId?: string | null;
  projectId?: string | null;
}

export interface WriteOutputResult {
  deliverableId: string;
  filename: string;
  absPath: string;
  storagePath: string;
  downloadUrl: string;
}

/**
 * Write text content to the company outputs directory and create a
 * Deliverable DB record.  Returns enough for the agent to construct a
 * user-facing response.
 */
export async function writeOutputFile(
  db: Db,
  input: WriteOutputInput,
): Promise<WriteOutputResult> {
  const { rootId, dir } = await ensureCompanyOutputsRoot(db, input.companyId);
  void rootId; // memfs root is provisioned; we don't need the id here

  const ext = kindToExt(input.kind);
  const filename = `${todayPrefix()}-${slugify(input.title)}.${ext}`;
  const absPath = path.join(dir, filename);

  // Write the file (overwrite if exists — agent re-ran the same output).
  const contentBuf = Buffer.from(input.content, "utf8");
  await fs.writeFile(absPath, contentBuf);

  const sha256 = crypto.createHash("sha256").update(contentBuf).digest("hex");
  const contentType = DELIVERABLE_CONTENT_TYPES[input.kind] ?? "application/octet-stream";
  // storagePath is the absolute path — used as a unique key and for downloads.
  const storagePath = absPath;

  // Upsert: if the agent re-runs write_output with the same path, the unique
  // index on storagePath fires.  We catch that and return the existing row.
  let deliverableId: string;
  try {
    const [row] = await db
      .insert(deliverables)
      .values({
        companyId: input.companyId,
        kind: input.kind,
        filename,
        contentType,
        sizeBytes: contentBuf.byteLength,
        checksumSha256: sha256,
        storagePath,
        title: input.title,
        description: input.description ?? null,
        producedByAgentId: input.producedByAgentId ?? null,
        producedByRunId: input.producedByRunId ?? null,
        issueId: input.issueId ?? null,
        projectId: input.projectId ?? null,
        routineRunId: null,
        metadata: { source: "write_output" },
      })
      .returning({ id: deliverables.id });
    deliverableId = row!.id;
  } catch {
    // Unique constraint on storagePath — fetch the existing row.
    const [row] = await db
      .select({ id: deliverables.id })
      .from(deliverables)
      .where(eq(deliverables.storagePath, storagePath));
    if (!row) throw new Error("writeOutputFile: conflict recovery failed");
    deliverableId = row.id;
  }

  const downloadUrl = `/api/deliverables/${deliverableId}/download`;

  return { deliverableId, filename, absPath, storagePath, downloadUrl };
}
