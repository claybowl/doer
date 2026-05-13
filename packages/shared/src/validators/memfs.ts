import { z } from "zod";
import { MEMFS_STRATEGIES, MEMFS_PERMISSIONS, MEMFS_ROOT_KINDS } from "../constants.js";

export const createMemfsRootSchema = z.object({
  kind: z.enum(MEMFS_ROOT_KINDS).optional().default("local-fs"),
  rootPath: z.string().trim().min(1).optional().default("~/.letta"),
  label: z.string().min(1).optional().default("letta"),
});
export type CreateMemfsRoot = z.infer<typeof createMemfsRootSchema>;

export const updateMemfsRootSchema = createMemfsRootSchema.partial();
export type UpdateMemfsRoot = z.infer<typeof updateMemfsRootSchema>;

export const createMemfsBindingSchema = z.object({
  agentId: z.string().uuid(),
  rootId: z.string().uuid(),
  pathPrefix: z
    .string()
    .min(1)
    .refine((p) => !p.split("/").some((seg) => seg === "" || seg === "." || seg === ".."), {
      message: "pathPrefix must be a relative, normalized path (no empty segments, '.', or '..')",
    })
    .optional(),
  strategy: z.enum(MEMFS_STRATEGIES).optional().default("fs-mount"),
  // V1 accepts only "read"; kept as enum so the shape is future-proof.
  permission: z.enum(MEMFS_PERMISSIONS).optional().default("read"),
  mountAs: z.string().min(1).optional().nullable(),
  label: z.string().min(1).optional().nullable(),
});
export type CreateMemfsBinding = z.infer<typeof createMemfsBindingSchema>;

export const updateMemfsBindingSchema = createMemfsBindingSchema.partial().omit({
  agentId: true,
  rootId: true,
});
export type UpdateMemfsBinding = z.infer<typeof updateMemfsBindingSchema>;
