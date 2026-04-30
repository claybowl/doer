import { pgTable, uuid, text, timestamp, integer, jsonb, index } from "drizzle-orm/pg-core";
import { agents } from "./agents.js";
import { companies } from "./companies.js";
import { issues } from "./issues.js";
import { heartbeatRuns } from "./heartbeat_runs.js";

export const agentMemories = pgTable(
  "agent_memories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    agentId: uuid("agent_id").notNull().references(() => agents.id),
    memoryType: text("memory_type").notNull().default("episodic"),
    content: text("content").notNull(),
    tags: text("tags").array().notNull().default([]),
    issueId: uuid("issue_id").references(() => issues.id),
    heartbeatRunId: uuid("heartbeat_run_id").references(() => heartbeatRuns.id),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    accessCount: integer("access_count").notNull().default(0),
    lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),
    summarizedAt: timestamp("summarized_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    agentTypeIdx: index("agent_memories_agent_type_idx").on(table.agentId, table.memoryType),
    companyCreatedIdx: index("agent_memories_company_created_idx").on(table.companyId, table.createdAt),
    agentAccessIdx: index("agent_memories_agent_access_idx").on(table.agentId, table.lastAccessedAt),
    issueIdx: index("agent_memories_issue_idx").on(table.issueId),
  }),
);
