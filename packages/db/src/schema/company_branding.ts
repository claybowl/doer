import {
  pgTable,
  uuid,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

/**
 * Per-company Portal branding config.
 *
 * Named `company_portal_branding` (not `company_branding`) to disambiguate
 * from the existing branding-ish fields on the `companies` table
 * (brandColor, logoAssetId). Those apply across the Doer product; this
 * table applies specifically to the client-facing Portal.
 *
 * A row here is OPTIONAL — if absent, Portal falls back to
 * PORTAL_BRANDING_DEFAULTS (graphite + indigo + ember).
 *
 * Logo is NOT stored here; it reuses the existing `company_logos` table,
 * which ties a company to an `assets` row (upload-backed). Portal resolves
 * logo URL by querying `company_logos` → `assets` at render time.
 *
 * All color fields accept any CSS-parseable color string. Validation lives
 * at the application layer.
 */
export const companyPortalBranding = pgTable(
  "company_portal_branding",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),

    // Overrides the portal "welcome · Company Name" string. Usually matches
    // `companies.name` but clients may want a specific DBA or brand.
    displayName: text("display_name"),

    // Primary CTA / accent colors. null = use PORTAL_BRANDING_DEFAULTS.
    primaryColor: text("primary_color"),
    accentColor: text("accent_color"),

    // Two shallow surface colors for card/app backgrounds. null = default.
    backgroundColor: text("background_color"),
    surfaceColor: text("surface_color"),

    // Font family override. Must be a google-fonts / system safe family; the
    // portal doesn't load arbitrary @font-face. null = default stack.
    fontFamily: text("font_family"),

    // Optional marketing tagline shown under the display name on the portal
    // landing card. Keep short; UI truncates.
    tagline: text("tagline"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    companyUq: uniqueIndex("company_portal_branding_company_uq").on(
      table.companyId,
    ),
  }),
);
