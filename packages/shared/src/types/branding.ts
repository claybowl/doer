/**
 * Per-company Portal branding.
 *
 * Named `CompanyPortalBranding` (not `CompanyBranding`) to disambiguate
 * from the existing product-level branding fields on `companies`
 * (brandColor, logoAssetId). This type applies specifically to the
 * client-facing Portal.
 *
 * All fields on `CompanyPortalBranding` are nullable — `null` means
 * "use PORTAL_BRANDING_DEFAULTS for this field." The API composes a fully
 * resolved `ResolvedPortalBranding` before handing it to the Portal.
 *
 * Logo is resolved separately via the existing `company_logos` + `assets`
 * tables.
 */
export interface CompanyPortalBranding {
  id: string;
  companyId: string;
  displayName: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  backgroundColor: string | null;
  surfaceColor: string | null;
  fontFamily: string | null;
  tagline: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Fully-resolved Portal branding served to the client. Every field
 * non-null — the resolver fills holes from PORTAL_BRANDING_DEFAULTS.
 * `logoUrl` is resolved from company_logos → assets (may still be null
 * if no logo has been uploaded).
 */
export interface ResolvedPortalBranding {
  displayName: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  fontFamily: string;
  tagline: string | null;
  logoUrl: string | null;
}

export interface UpdateCompanyPortalBrandingPayload {
  displayName?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
  backgroundColor?: string | null;
  surfaceColor?: string | null;
  fontFamily?: string | null;
  tagline?: string | null;
}
