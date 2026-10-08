import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { issues } from "./issues.js";
import { agents } from "./agents.js";

export const timeEntries = pgTable(
  "time_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    issueId: uuid("issue_id").notNull().references(() => issues.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id").references(() => agents.id, { onDelete: "set null" }),
    userId: text("user_id"),
    source: text("source").notNull().default("human"), // "agent" | "human"
    status: text("status").notNull().default("running"), // "running" | "completed" | "cancelled"
    billingType: text("billing_type").notNull().default("billable"), // "billable" | "non_billable"
    description: text("description"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    durationMs: integer("duration_ms"),
    estimatedMs: integer("estimated_ms"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyIssueIdx: index("time_entries_company_issue_idx").on(table.companyId, table.issueId),
    companyAgentIdx: index("time_entries_company_agent_idx").on(table.companyId, table.agentId),
    companyStatusIdx: index("time_entries_company_status_idx").on(table.companyId, table.status),
    issueStatusIdx: index("time_entries_issue_status_idx").on(table.issueId, table.status),
    startedAtIdx: index("time_entries_started_at_idx").on(table.startedAt),
  }),
);
