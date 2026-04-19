import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

/**
 * A configured memfs root — the filesystem (or future backend) where memory files live.
 *
 * V1: `kind === "local-fs"` with `rootPath` pointing at a directory on the
 * server's filesystem (typically `~/.letta`). Future kinds: `mcp`, `git-hosted`.
 */
export const memfsRoots = pgTable(
  "memfs_roots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("local-fs"),
    rootPath: text("root_path").notNull(),
    label: text("label").notNull().default("letta"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyIdx: index("memfs_roots_company_idx").on(table.companyId),
  }),
);

export type MemfsRootRow = typeof memfsRoots.$inferSelect;
export type MemfsRootInsert = typeof memfsRoots.$inferInsert;
