import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import { randomBytes } from "node:crypto";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Db } from "@doerai/db";
import {
  deliverables,
  deliverableShareTokens,
  companyPortalBranding,
  companies,
  companyLogos,
  assets,
} from "@doerai/db";
import {
  createDeliverableSchema,
  updateDeliverableSchema,
  deliverableListQuerySchema,
  createDeliverableShareTokenSchema,
  DELIVERABLE_CONTENT_TYPES,
  PORTAL_BRANDING_DEFAULTS,
  type Deliverable,
  type DeliverableKind,
  type DeliverableShareTokenScope,
  type ResolvedPortalBranding,
} from "@doerai/shared";
import type { StorageService } from "../storage/types.js";
import { deliverableService, logActivity } from "../services/index.js";
import { badRequest, forbidden, notFound, unprocessable } from "../errors.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";

/**
 * Deliverables HTTP surface — three concerns in one file, each exported
 * as its own router:
 *
 *   deliverableRoutes(db, storage) — authenticated CRUD. Agents post
 *     files via multipart. UI lists, patches visibility, soft-deletes,
 *     downloads.
 *
 *   shareTokenRoutes(db)           — authenticated share-token CRUD for
 *     the company admin (Clay / team). Generates url-safe tokens scoped
 *     to projects/issues/specific deliverables.
 *
 *   portalRoutes(db, storage)      — UNAUTHENTICATED token-gated surface
 *     for /portal/:token. Token IS the auth. Returns the deliverables
 *     the token scope covers, plus resolved branding; streams downloads.
 *
 * The three share a single file because they all touch the same tables
 * and it's easier to keep the invariants in one place than to split
 * logic across three files.
 */

const MAX_DELIVERABLE_BYTES = 50 * 1024 * 1024; // 50 MB per file, tune later

function kindToContentType(kind: DeliverableKind): string {
  return DELIVERABLE_CONTENT_TYPES[kind] ?? "application/octet-stream";
}

function resolveBranding(
  row: typeof companyPortalBranding.$inferSelect | null,
  fallbackDisplayName: string,
  logoUrl: string | null,
): ResolvedPortalBranding {
  return {
    displayName: row?.displayName ?? fallbackDisplayName,
    primaryColor: row?.primaryColor ?? PORTAL_BRANDING_DEFAULTS.primaryColor,
    accentColor: row?.accentColor ?? PORTAL_BRANDING_DEFAULTS.accentColor,
    backgroundColor:
      row?.backgroundColor ?? PORTAL_BRANDING_DEFAULTS.backgroundColor,
    surfaceColor: row?.surfaceColor ?? PORTAL_BRANDING_DEFAULTS.surfaceColor,
    fontFamily: row?.fontFamily ?? PORTAL_BRANDING_DEFAULTS.fontFamily,
    tagline: row?.tagline ?? null,
    logoUrl,
  };
}

async function fetchResolvedBranding(
  db: Db,
  companyId: string,
): Promise<ResolvedPortalBranding | null> {
  const [company] = await db
    .select({ id: companies.id, name: companies.name })
    .from(companies)
    .where(eq(companies.id, companyId));
  if (!company) return null;

  const [brandingRow] = await db
    .select()
    .from(companyPortalBranding)
    .where(eq(companyPortalBranding.companyId, companyId));

  const [logoRow] = await db
    .select({
      assetId: companyLogos.assetId,
      objectKey: assets.objectKey,
    })
    .from(companyLogos)
    .innerJoin(assets, eq(assets.id, companyLogos.assetId))
    .where(eq(companyLogos.companyId, companyId));

  // Public logo URL for the portal. We don't serve logos through the
  // deliverable portal endpoint — assets have their own public-asset
  // route. For v1 we return a relative path; UI prefixes with origin.
  const logoUrl = logoRow
    ? `/api/companies/${companyId}/assets/${logoRow.assetId}/content`
    : null;

  return resolveBranding(brandingRow ?? null, company.name, logoUrl);
}

async function deliverablesForTokenScope(
  db: Db,
  companyId: string,
  scope: DeliverableShareTokenScope,
): Promise<Deliverable[]> {
  // Gather the set of deliverable IDs the scope covers. We do three
  // separate queries (by project, by issue, by explicit id) rather than
  // one giant OR so the query planner can use the per-column indexes.
  const ids = new Set<string>();

  if (scope.projectIds && scope.projectIds.length > 0) {
    const rows = await db
      .select({ id: deliverables.id })
      .from(deliverables)
      .where(
        and(
          eq(deliverables.companyId, companyId),
          eq(deliverables.clientVisible, true),
          isNull(deliverables.deletedAt),
          inArray(deliverables.projectId, scope.projectIds),
        ),
      );
    for (const r of rows) ids.add(r.id);
  }

  if (scope.issueIds && scope.issueIds.length > 0) {
    const rows = await db
      .select({ id: deliverables.id })
      .from(deliverables)
      .where(
        and(
          eq(deliverables.companyId, companyId),
          eq(deliverables.clientVisible, true),
          isNull(deliverables.deletedAt),
          inArray(deliverables.issueId, scope.issueIds),
        ),
      );
    for (const r of rows) ids.add(r.id);
  }

  if (scope.deliverableIds && scope.deliverableIds.length > 0) {
    const rows = await db
      .select({ id: deliverables.id })
      .from(deliverables)
      .where(
        and(
          eq(deliverables.companyId, companyId),
          eq(deliverables.clientVisible, true),
          isNull(deliverables.deletedAt),
          inArray(deliverables.id, scope.deliverableIds),
        ),
      );
    for (const r of rows) ids.add(r.id);
  }

  if (ids.size === 0) return [];

  const svc = deliverableService(db);
  // Pull full rows via the service so we get the same DTO shape the
  // authenticated list returns. Could optimize to one query, but this
  // code path is low-frequency (token-gated portal access).
  const rows = await Promise.all(
    [...ids].map((id) => svc.getForCompany(companyId, id)),
  );
  return rows.filter((r): r is Deliverable => r != null);
}

function generateShareToken(): string {
  // 32 bytes = 256 bits of entropy, url-safe base64. Matches typical
  // "random secret" token length in the rest of the codebase.
  return randomBytes(32).toString("base64url");
}

// ---------- authenticated deliverable CRUD ----------

export function deliverableRoutes(db: Db, storage: StorageService) {
  const router = Router();
  const svc = deliverableService(db);

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_DELIVERABLE_BYTES, files: 1 },
  });

  async function runSingleFileUpload(
    req: Request,
    res: Response,
  ): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      upload.single("file")(req, res, (err: unknown) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Agent-facing: POST multipart with `file` + metadata form fields.
  router.post("/companies/:companyId/deliverables", async (req, res, next) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    try {
      await runSingleFileUpload(req, res);
    } catch (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          throw unprocessable(
            `File exceeds ${MAX_DELIVERABLE_BYTES} bytes`,
          );
        }
        throw badRequest(err.message);
      }
      throw err;
    }

    const file = (req as Request & {
      file?: { mimetype: string; buffer: Buffer; originalname: string };
    }).file;
    if (!file) {
      throw badRequest("Missing file field 'file'");
    }
    if (file.buffer.length === 0) {
      throw unprocessable("File is empty");
    }

    const parsed = createDeliverableSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw badRequest("Invalid metadata", parsed.error.issues);
    }
    const meta = parsed.data;

    // We trust the server's content-type map over whatever the client
    // sends in the multipart header — clients routinely send wrong MIMEs
    // (application/octet-stream for a .docx is a common offender).
    const contentType = kindToContentType(meta.kind);

    const stored = await storage.putFile({
      companyId,
      namespace: "deliverables",
      originalFilename: meta.filename,
      contentType,
      body: file.buffer,
    });

    const actor = getActorInfo(req);
    const deliverable = await svc.create({
      companyId,
      kind: meta.kind,
      filename: meta.filename,
      contentType: stored.contentType,
      sizeBytes: stored.byteSize,
      checksumSha256: stored.sha256,
      storagePath: stored.objectKey,
      title: meta.title,
      description: meta.description ?? null,
      projectId: meta.projectId ?? null,
      issueId: meta.issueId ?? null,
      routineRunId: meta.routineRunId ?? null,
      producedByAgentId: actor.agentId,
      producedByRunId: actor.runId,
      metadata: meta.metadata ?? {},
    });

    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "deliverable.created",
      entityType: "deliverable",
      entityId: deliverable.id,
      details: {
        kind: deliverable.kind,
        filename: deliverable.filename,
        title: deliverable.title,
        sizeBytes: deliverable.sizeBytes,
        projectId: deliverable.projectId,
        issueId: deliverable.issueId,
      },
    });

    res.status(201).json(deliverable);
  });

  // UI-facing: list with filters.
  router.get("/companies/:companyId/deliverables", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const parsed = deliverableListQuerySchema.safeParse(req.query ?? {});
    if (!parsed.success) {
      throw badRequest("Invalid query", parsed.error.issues);
    }
    const rows = await svc.list(companyId, parsed.data);
    res.json(rows);
  });

  router.get("/deliverables/:id", async (req, res) => {
    const id = req.params.id as string;
    const d = await svc.getById(id);
    if (!d || d.deletedAt) {
      throw notFound(`Deliverable ${id} not found`);
    }
    assertCompanyAccess(req, d.companyId);
    res.json(d);
  });

  router.patch("/deliverables/:id", async (req, res) => {
    const id = req.params.id as string;
    const existing = await svc.getById(id);
    if (!existing) throw notFound(`Deliverable ${id} not found`);
    assertCompanyAccess(req, existing.companyId);

    const parsed = updateDeliverableSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw badRequest("Invalid update", parsed.error.issues);
    }

    const updated = await svc.update(id, parsed.data);
    if (!updated) throw notFound(`Deliverable ${id} not found`);

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId: updated.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action:
        parsed.data.clientVisible === true && !existing.clientVisible
          ? "deliverable.promoted"
          : "deliverable.updated",
      entityType: "deliverable",
      entityId: updated.id,
      details: parsed.data,
    });

    res.json(updated);
  });

  router.delete("/deliverables/:id", async (req, res) => {
    const id = req.params.id as string;
    const existing = await svc.getById(id);
    if (!existing) throw notFound(`Deliverable ${id} not found`);
    assertCompanyAccess(req, existing.companyId);

    const removed = await svc.softDelete(id);
    if (!removed) throw notFound(`Deliverable ${id} not found`);

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId: removed.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "deliverable.deleted",
      entityType: "deliverable",
      entityId: removed.id,
    });

    res.json(removed);
  });

  router.post("/deliverables/:id/restore", async (req, res) => {
    const id = req.params.id as string;
    const existing = await svc.getById(id);
    if (!existing) throw notFound(`Deliverable ${id} not found`);
    assertCompanyAccess(req, existing.companyId);

    const restored = await svc.restore(id);
    if (!restored) throw notFound(`Deliverable ${id} not found`);
    res.json(restored);
  });

  // Authenticated download (Fernweh UI).
  router.get(
    "/deliverables/:id/download",
    async (req, res, next: NextFunction) => {
      const id = req.params.id as string;
      const d = await svc.getById(id);
      if (!d || d.deletedAt) {
        throw notFound(`Deliverable ${id} not found`);
      }
      assertCompanyAccess(req, d.companyId);

      const obj = await storage.getObject(d.companyId, d.storagePath);
      res.setHeader("Content-Type", d.contentType);
      res.setHeader(
        "Content-Length",
        String(d.sizeBytes || obj.contentLength || 0),
      );
      res.setHeader("Cache-Control", "private, max-age=60");
      res.setHeader("X-Content-Type-Options", "nosniff");
      // `attachment` (not `inline`) — these are meant to be downloaded.
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${d.filename.replaceAll('"', "")}"`,
      );
      obj.stream.on("error", (err) => next(err));
      obj.stream.pipe(res);
    },
  );

  return router;
}

// ---------- authenticated share-token CRUD ----------

export function shareTokenRoutes(db: Db) {
  const router = Router();

  router.post("/companies/:companyId/share-tokens", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const parsed = createDeliverableShareTokenSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw badRequest("Invalid share-token payload", parsed.error.issues);
    }

    const actor = getActorInfo(req);
    const token = generateShareToken();

    const [row] = await db
      .insert(deliverableShareTokens)
      .values({
        companyId,
        token,
        label: parsed.data.label ?? null,
        scope: parsed.data.scope,
        createdByUserId: actor.actorType === "user" ? actor.actorId : null,
        expiresAt: parsed.data.expiresAt
          ? new Date(parsed.data.expiresAt)
          : null,
      })
      .returning();

    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "share_token.created",
      entityType: "share_token",
      entityId: row.id,
      details: {
        label: row.label,
        scope: row.scope,
        expiresAt: row.expiresAt,
      },
    });

    res.status(201).json(row);
  });

  router.get("/companies/:companyId/share-tokens", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const rows = await db
      .select()
      .from(deliverableShareTokens)
      .where(eq(deliverableShareTokens.companyId, companyId))
      .orderBy(sql`${deliverableShareTokens.createdAt} DESC`);
    res.json(rows);
  });

  router.post("/share-tokens/:id/revoke", async (req, res) => {
    const id = req.params.id as string;
    const [existing] = await db
      .select()
      .from(deliverableShareTokens)
      .where(eq(deliverableShareTokens.id, id));
    if (!existing) throw notFound(`Share token ${id} not found`);
    assertCompanyAccess(req, existing.companyId);

    const [revoked] = await db
      .update(deliverableShareTokens)
      .set({ revokedAt: new Date(), updatedAt: new Date() })
      .where(eq(deliverableShareTokens.id, id))
      .returning();

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId: revoked.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "share_token.revoked",
      entityType: "share_token",
      entityId: revoked.id,
    });

    res.json(revoked);
  });

  return router;
}

// ---------- unauthenticated portal ----------

/**
 * Portal endpoints. These are intentionally NOT under the authenticated
 * `/api` mount — the token IS the auth. They live at
 * `/api/portal/:token` so the UI can call them cross-origin with
 * standard fetch. `.revokedAt` and `.expiresAt` gate access on every
 * request; once either trips, subsequent calls 404.
 */
export function portalRoutes(db: Db, storage: StorageService) {
  const router = Router();

  async function resolveActiveToken(token: string) {
    const [row] = await db
      .select()
      .from(deliverableShareTokens)
      .where(eq(deliverableShareTokens.token, token));
    if (!row) throw notFound("Invalid share token");
    if (row.revokedAt) throw forbidden("This share link has been revoked");
    if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
      throw forbidden("This share link has expired");
    }
    return row;
  }

  async function bumpAccess(id: string) {
    await db
      .update(deliverableShareTokens)
      .set({
        accessCount: sql`${deliverableShareTokens.accessCount} + 1`,
        lastAccessedAt: new Date(),
      })
      .where(eq(deliverableShareTokens.id, id));
  }

  router.get("/portal/:token", async (req, res) => {
    const token = req.params.token as string;
    const row = await resolveActiveToken(token);

    const scope = row.scope as DeliverableShareTokenScope;
    const [companyRow] = await db
      .select({ id: companies.id, name: companies.name })
      .from(companies)
      .where(eq(companies.id, row.companyId));
    if (!companyRow) throw notFound("Company not found");

    const [branding, deliverablesForScope] = await Promise.all([
      fetchResolvedBranding(db, row.companyId),
      deliverablesForTokenScope(db, row.companyId, scope),
    ]);

    await bumpAccess(row.id);

    res.json({
      company: {
        id: companyRow.id,
        name: companyRow.name,
        branding: branding ?? resolveBranding(null, companyRow.name, null),
      },
      deliverables: deliverablesForScope,
      token: {
        expiresAt: row.expiresAt?.toISOString() ?? null,
        scope,
      },
    });
  });

  router.get(
    "/portal/:token/deliverables/:id/download",
    async (req, res, next: NextFunction) => {
      const token = req.params.token as string;
      const id = req.params.id as string;
      const row = await resolveActiveToken(token);

      // Re-resolve scope + check the requested id is covered. Without
      // this, a token for project A would be able to download a
      // deliverable the attacker guessed from project B.
      const scope = row.scope as DeliverableShareTokenScope;
      const allowed = await deliverablesForTokenScope(db, row.companyId, scope);
      const match = allowed.find((d) => d.id === id);
      if (!match) {
        throw notFound("Deliverable not in this share scope");
      }

      const obj = await storage.getObject(match.companyId, match.storagePath);
      res.setHeader("Content-Type", match.contentType);
      res.setHeader(
        "Content-Length",
        String(match.sizeBytes || obj.contentLength || 0),
      );
      res.setHeader("Cache-Control", "private, max-age=60");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${match.filename.replaceAll('"', "")}"`,
      );

      await bumpAccess(row.id);

      obj.stream.on("error", (err) => next(err));
      obj.stream.pipe(res);
    },
  );

  return router;
}
