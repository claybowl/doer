import { pgTable, uuid, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { agents } from "./agents.js";

export const councilSessions = pgTable(
  "council_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    topic: text("topic").notNull(),
    urgency: text("urgency").notNull().default("normal"),
    status: text("status").notNull().default("live"),
    participantAgentIds: jsonb("participant_agent_ids").$type<string[]>().notNull().default([]),
    triggeredByAgentId: uuid("triggered_by_agent_id").references(() => agents.id, { onDelete: "set null" }),
    triggeredByUserId: text("triggered_by_user_id"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyStatusIdx: index("council_sessions_company_status_idx").on(table.companyId, table.status),
    companyCreatedIdx: index("council_sessions_company_created_idx").on(table.companyId, table.createdAt),
  }),
);
