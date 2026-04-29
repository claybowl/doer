import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";

export const processedStripeEvents = pgTable(
  "processed_stripe_events",
  {
    eventId: text("event_id").primaryKey(),
    eventType: text("event_type").notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    typeIdx: index("processed_stripe_events_type_idx").on(table.eventType),
  }),
);
