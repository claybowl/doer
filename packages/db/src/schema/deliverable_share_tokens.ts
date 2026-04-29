import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { authUsers } from "./auth.js";

// NOTE: authUsers.id is `text` (Better Auth convention), not uuid. Any FK
// to user ids must be `text` too, otherwise Postgres rejects the FK with
// "incompatible types: uuid and text".

/**
 * Share tokens for the client Portal.
 *
 * A token grants read-only access to a scoped set of deliverables via
 * `/portal/:token`. The token itself is the auth — there is no login.
 *
 * Scope shape (enforced at application layer, not DB):
 *   { projectIds?: string[]; issueIds?: string[]; deliverableIds?: string[] }
 *
 * At least one of the three arrays must be non-empty. A deliverable is
 * accessible iff its id is in `deliverableIds`, OR its `issueId` is in
 * `issueIds`, OR its `projectId` is in `projectIds`, AND the deliverable
 * has `clientVisible = true` AND `deletedAt IS NULL`.
 */
export const deliverableShareTokens = pgTable(
  "deliverable_share_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    // URL-safe random string. Generated server-side; never user-chosen.
    token: text("token").notNull(),

    // Internal label for Clay/team reference (e.g. "Acme Corp · Q4 brief").
    // Never rendered to the portal visitor.
    label: text("label"),

    scope: jsonb("scope").notNull(),

    createdByUserId: text("created_by_user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),

    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),

    lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),
    accessCount: integer("access_count").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tokenUq: uniqueIndex("deliverable_share_tokens_token_uq").on(table.token),
    companyIdx: index("deliverable_share_tokens_company_idx").on(
      table.companyId,
    ),
  }),
);
