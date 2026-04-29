import { z } from "zod";

/**
 * Permissive CSS color validator. We accept whatever the browser accepts
 * (hex, rgb, hsl, oklch, named) and let the browser enforce syntax at
 * render time. The only constraint here is length — no multi-KB strings.
 */
const cssColor = z.string().min(1).max(128).nullable();

/**
 * Font family strings. Comma-separated stack; we cap length to prevent
 * shenanigans. Portal does NOT load arbitrary @font-face; the client's
 * browser uses system fallbacks if the family isn't available.
 */
const fontFamily = z.string().min(1).max(256).nullable();

/**
 * Named `updateCompanyPortalBrandingSchema` (not
 * `updateCompanyBrandingSchema`) to avoid conflicting with the existing
 * schema of that name in `./company.ts`, which governs the separate
 * product-level branding fields on the `companies` table (brandColor,
 * logoAssetId). This schema governs the NEW `company_portal_branding`
 * table for Portal theming.
 */
export const updateCompanyPortalBrandingSchema = z.object({
  displayName: z.string().min(1).max(128).nullable().optional(),
  primaryColor: cssColor.optional(),
  accentColor: cssColor.optional(),
  backgroundColor: cssColor.optional(),
  surfaceColor: cssColor.optional(),
  fontFamily: fontFamily.optional(),
  tagline: z.string().max(280).nullable().optional(),
});
export type UpdateCompanyPortalBranding = z.infer<
  typeof updateCompanyPortalBrandingSchema
>;
