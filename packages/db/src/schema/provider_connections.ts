import { boolean, index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { companySecrets } from "./company_secrets.js";

export const providerConnections = pgTable(
  "provider_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    providerType: text("provider_type").notNull(),
    authMode: text("auth_mode").notNull(),
    secretId: uuid("secret_id").references(() => companySecrets.id, { onDelete: "restrict" }),
    lettaBaseUrl: text("letta_base_url").notNull().default("https://api.letta.com"),
    providerBaseUrl: text("provider_base_url"),
    isDefault: boolean("is_default").notNull().default(false),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyNameUq: uniqueIndex("provider_connections_company_name_uq").on(table.companyId, table.name),
    companyIdx: index("provider_connections_company_idx").on(table.companyId),
    companyProviderIdx: index("provider_connections_company_provider_idx").on(
      table.companyId,
      table.providerType,
    ),
  }),
);
