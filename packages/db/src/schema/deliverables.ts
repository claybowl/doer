import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { agents } from "./agents.js";
import { issues } from "./issues.js";
import { projects } from "./projects.js";
import { routineRuns } from "./routines.js";
import { heartbeatRuns } from "./heartbeat_runs.js";

/**
 * Deliverables — first-class "file that a human client will see."
 *
 * Distinct from issue work products and raw memfs files:
 *  - work products: intermediate artifacts tied to a single issue
 *  - memfs files:   scratch filesystem backing agent runs
 *  - deliverables:  promoted, titled, client-visible, download-ready files
 *
 * v1 targets .docx and .xlsx produced by `claude_local`. Other formats
 * and adapters follow in v1.1+.
 */
export const deliverables = pgTable(
  "deliverables",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    // Origin — at least one of these should be set in practice. We keep all
    // nullable so a deliverable can outlive its producing run or be promoted
    // independently of an issue (e.g. standalone report request).
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    issueId: uuid("issue_id").references(() => issues.id, {
      onDelete: "set null",
    }),
    routineRunId: uuid("routine_run_id").references(() => routineRuns.id, {
      onDelete: "set null",
    }),
    producedByAgentId: uuid("produced_by_agent_id").references(() => agents.id, {
      onDelete: "set null",
    }),
    producedByRunId: uuid("produced_by_run_id").references(
      () => heartbeatRuns.id,
      { onDelete: "set null" },
    ),

    // File identity — all non-null because a deliverable without a file is
    // meaningless. `kind` is a free-form text constrained at the application
    // layer via DELIVERABLE_KINDS in @doerai/shared; we intentionally do not
    // use a pg enum so adding kinds doesn't require a migration.
    kind: text("kind").notNull(),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    checksumSha256: text("checksum_sha256").notNull(),
    storagePath: text("storage_path").notNull(),

    // Semantics — title/description are what the client actually sees in the
    // portal. They may differ from filename (filename is a filesystem name;
    // title is a human title).
    title: text("title").notNull(),
    description: text("description"),

    // Opt-in visibility. Defaults false: a freshly promoted deliverable is
    // NOT automatically visible to clients. Clay (or another authorized user)
    // flips `clientVisible` true before any portal surface renders it.
    clientVisible: boolean("client_visible").notNull().default(false),

    metadata: jsonb("metadata").notNull().default({}),

    producedAt: timestamp("produced_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Set the first time `clientVisible` flips true. Stays set after that;
    // used for portal sort order and audit.
    promotedAt: timestamp("promoted_at", { withTimezone: true }),

    // Soft-delete. v1 retains deliverables indefinitely; v1.1 adds a GC
    // policy (e.g. auto-soft-delete after 90d with no clientVisible=true).
    deletedAt: timestamp("deleted_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    companyProducedIdx: index("deliverables_company_produced_idx").on(
      table.companyId,
      table.producedAt,
    ),
    projectIdx: index("deliverables_project_idx").on(table.projectId),
    issueIdx: index("deliverables_issue_idx").on(table.issueId),
    agentIdx: index("deliverables_agent_idx").on(table.producedByAgentId),
    runIdx: index("deliverables_run_idx").on(table.producedByRunId),
    clientVisibleIdx: index("deliverables_client_visible_idx").on(
      table.companyId,
      table.clientVisible,
    ),
    // A single storage path must identify at most one live deliverable. Used
    // by the post-run scanner to make auto-promotion idempotent.
    storagePathUq: uniqueIndex("deliverables_storage_path_uq").on(
      table.storagePath,
    ),
  }),
);
