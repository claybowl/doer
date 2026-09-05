import { pgTable, uuid, text, timestamp, integer, boolean, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { agents } from "./agents.js";
import { issues } from "./issues.js";
import { projects } from "./projects.js";
import { heartbeatRuns } from "./heartbeat_runs.js";

/**
 * Time entries track how long work takes on issues — both for agents (auto-tracked)
 * and humans (manual timer). Each entry has a start/end timestamp and a duration in
 * milliseconds for precise aggregation.
 *
 * Sources:
 *  - "agent_auto" — automatically created when an agent heartbeat run starts on an issue
 *  - "manual"     — created by a human user starting/stopping a timer in the UI
 */
export const timeEntries = pgTable(
  "time_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    issueId: uuid("issue_id").notNull().references(() => issues.id),
    agentId: uuid("agent_id").references(() => agents.id),
    projectId: uuid("project_id").references(() => projects.id),
    heartbeatRunId: uuid("heartbeat_run_id").references(() => heartbeatRuns.id),

    /** Who or what created this entry: "agent_auto" | "manual" */
    source: text("source").notNull().default("manual"),

    /** The user who started a manual timer (null for agent_auto entries) */
    userId: text("user_id"),

    /** Timer state: "running" | "stopped" */
    status: text("status").notNull().default("running"),

    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    stoppedAt: timestamp("stopped_at", { withTimezone: true }),

    /** Duration in milliseconds (computed when timer stops; null while running) */
    durationMs: integer("duration_ms"),

    /** Optional description / note for this time entry */
    description: text("description"),

    /** Billable flag for billing integration (default true) */
    billable: boolean("billable").notNull().default(true),

    /** Billing code override (falls back to issue billing code if not set) */
    billingCode: text("billing_code"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyStartedIdx: index("time_entries_company_started_idx").on(table.companyId, table.startedAt),
    companyIssueIdx: index("time_entries_company_issue_idx").on(table.companyId, table.issueId),
    companyAgentIdx: index("time_entries_company_agent_idx").on(table.companyId, table.agentId),
    companyProjectIdx: index("time_entries_company_project_idx").on(table.companyId, table.projectId),
    companyStatusIdx: index("time_entries_company_status_idx").on(table.companyId, table.status),
    heartbeatRunIdx: index("time_entries_heartbeat_run_idx").on(table.heartbeatRunId),
  }),
);
