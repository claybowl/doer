import { z } from "zod";
import { DELIVERABLE_KINDS } from "../constants.js";

/**
 * Payload an agent posts to promote a file to a deliverable.
 *
 * `storagePath` is trusted but validated: must be non-empty and must NOT
 * contain path traversal components (`..`, double slashes). Server further
 * constrains it to be inside the agent's own company memfs root.
 */
export const createDeliverableSchema = z.object({
  kind: z.enum(DELIVERABLE_KINDS),
  filename: z.string().min(1).max(256),
  storagePath: z
    .string()
    .min(1)
    .refine(
      (p) => !p.split("/").some((seg) => seg === "." || seg === ".."),
      "storagePath must not contain path traversal components",
    ),
  title: z.string().min(1).max(256),
  description: z.string().max(2048).nullable().optional(),

  projectId: z.string().uuid().nullable().optional(),
  issueId: z.string().uuid().nullable().optional(),
  routineRunId: z.string().uuid().nullable().optional(),

  metadata: z.record(z.string(), z.unknown()).optional(),
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
