import { pgTable, uuid, text, timestamp, index, unique } from "drizzle-orm/pg-core";
import { agents } from "./agents.js";
import { memfsRoots } from "./memfs_roots.js";

/**
 * Binds a path prefix (relative to a memfs root) to an agent, with a strategy
 * that determines how the adapter ingests the memory.
 *
 * V1: `permission = "read"` only. Writes land in V2.
 * `strategy` is a MemfsStrategy literal (see packages/shared/src/types/memfs.ts).
 */
export const memfsBindings = pgTable(
  "memfs_bindings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: uuid("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
    rootId: uuid("root_id").notNull().references(() => memfsRoots.id, { onDelete: "cascade" }),
    pathPrefix: text("path_prefix").notNull(),
    strategy: text("strategy").notNull().default("fs-mount"),
    permission: text("permission").notNull().default("read"),
    mountAs: text("mount_as"),
    label: text("label"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    agentIdx: index("memfs_bindings_agent_idx").on(table.agentId),
    rootIdx: index("memfs_bindings_root_idx").on(table.rootId),
    uniqueAgentPath: unique("memfs_bindings_agent_path_uniq").on(
      table.agentId,
      table.rootId,
      table.pathPrefix,
    ),
  }),
);

export type MemfsBindingRow = typeof memfsBindings.$inferSelect;
export type MemfsBindingInsert = typeof memfsBindings.$inferInsert;
