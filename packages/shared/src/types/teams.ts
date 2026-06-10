/**
 * Starter Team manifests — capture-the-magic Phase 2.2.
 *
 * A team is a directory containing `team.json` (this shape) plus the
 * referenced `.af` files. The importer hires the agents in order, wires
 * `reportsTo` by slug, unpacks each agent's memory into the org's visible
 * memory root, and seeds shared coordination files under `SHARED/`.
 */

export interface TeamManifestAgent {
  /** Stable slug used for reportsTo references and the memory namespace. */
  slug: string;
  /** Display name; defaults to the .af agent name when omitted. */
  name?: string;
  /** Relative path to the .af file inside the team directory. */
  af: string;
  /** Doer role (ceo/executor/analyst/researcher/general). */
  role: string;
  title?: string;
  /** Slug of another team member this agent reports to, or null for top. */
  reportsTo?: string | null;
  /** Adapter to hire onto. Defaults to the team's defaultAdapterType. */
  adapterType?: string;
  /** Extra adapter config merged over the importer's defaults. */
  adapterConfig?: Record<string, unknown>;
}

export interface TeamManifest {
  id: string;
  name: string;
  description?: string;
  /** Adapter used for members that don't specify one. */
  defaultAdapterType?: string;
  agents: TeamManifestAgent[];
  /**
   * Shared coordination files seeded under `SHARED/` in the org memory
   * root (e.g. "council_notes", "kitchen_queue"). Every team member gets
   * a binding to the SHARED prefix so the delegation chain has a home.
   */
  sharedBlocks?: string[];
  /** Optional add-on pack ids this team is compatible with. */
  packs?: string[];
}

export interface TeamImportAgentResult {
  slug: string;
  agentId: string;
  name: string;
  memoryPathPrefix: string;
  warnings: string[];
}

export interface TeamImportResult {
  teamId: string;
  companyId: string;
  agents: TeamImportAgentResult[];
  sharedPathPrefix: string | null;
  warnings: string[];
}

/** Listing entry for available bundled teams. */
export interface TeamSummary {
  id: string;
  name: string;
  description: string | null;
  agentCount: number;
  agentNames: string[];
  packs: string[];
  /** False when referenced .af files are missing from the team directory. */
  ready: boolean;
  missingFiles: string[];
}
