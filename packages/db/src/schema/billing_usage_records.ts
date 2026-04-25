import { pgTable, uuid, timestamp, numeric, bigint, boolean, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

export const usageRecords = pgTable(
  "usage_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }),
    agentHours: numeric("agent_hours", { precision: 12, scale: 4 }).notNull().default("0"),
    toolExecs: bigint("tool_execs", { mode: "number" }).notNull().default(0),
    storageBytes: bigint("storage_bytes", { mode: "number" }).notNull().default(0),
    reportedToStripe: boolean("reported_to_stripe").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyPeriodIdx: index("usage_records_company_period_idx").on(table.companyId, table.periodStart),
  }),
);
