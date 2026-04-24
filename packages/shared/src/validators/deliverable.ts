import { z } from "zod";
import { DELIVERABLE_KINDS } from "../constants.js";

/**
 * Metadata fields that accompany a multipart file upload when an agent
 * (or the UI) posts a new deliverable. The file bytes come via the
 * multipart `file` field; the server stores those bytes through the
 * existing StorageService and assigns its own `storagePath` (objectKey),
 * `contentType`, `sizeBytes`, and `checksumSha256`.
 *
 * All values arrive as multipart strings and should be coerced where
 * needed. For the JSON-only variant of this endpoint (not yet exposed
 * in v1), the same schema applies after normal JSON parsing.
 */
export const createDeliverableSchema = z.object({
  kind: z.enum(DELIVERABLE_KINDS),
  filename: z.string().min(1).max(256),
  title: z.string().min(1).max(256),
  description: z.string().max(2048).nullable().optional(),

  projectId: z.string().uuid().nullable().optional(),
  issueId: z.string().uuid().nullable().optional(),
  routineRunId: z.string().uuid().nullable().optional(),

  // Accept either a real object or a JSON-stringified one (multipart forms
  // can't carry nested objects natively).
  metadata: z
    .union([
      z.record(z.string(), z.unknown()),
      z
        .string()
        .transform((s, ctx) => {
          try {
            const parsed = JSON.parse(s);
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
              return parsed as Record<string, unknown>;
            }
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "metadata must be a JSON object",
            });
            return z.NEVER;
          } catch {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "metadata must be valid JSON",
            });
            return z.NEVER;
          }
        }),
    ])
    .optional(),
});
export type CreateDeliverable = z.infer<typeof createDeliverableSchema>;

export const updateDeliverableSchema = z.object({
  title: z.string().min(1).max(256).optional(),
  description: z.string().max(2048).nullable().optional(),
  clientVisible: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type UpdateDeliverable = z.infer<typeof updateDeliverableSchema>;

export const deliverableListQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  issueId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
  kind: z.enum(DELIVERABLE_KINDS).optional(),
  clientVisible: z.coerce.boolean().optional(),
  includeDeleted: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});
export type DeliverableListQueryInput = z.infer<
  typeof deliverableListQuerySchema
>;

// ---------- share tokens ----------

export const shareTokenScopeSchema = z
  .object({
    projectIds: z.array(z.string().uuid()).optional(),
    issueIds: z.array(z.string().uuid()).optional(),
    deliverableIds: z.array(z.string().uuid()).optional(),
  })
  .refine(
    (s) =>
      (s.projectIds?.length ?? 0) +
        (s.issueIds?.length ?? 0) +
        (s.deliverableIds?.length ?? 0) >
      0,
    "scope must include at least one projectId, issueId, or deliverableId",
  );

export const createDeliverableShareTokenSchema = z.object({
  label: z.string().max(128).nullable().optional(),
  scope: shareTokenScopeSchema,
  expiresAt: z.string().datetime().nullable().optional(),
});
export type CreateDeliverableShareToken = z.infer<
  typeof createDeliverableShareTokenSchema
>;
