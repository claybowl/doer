// Plugin identity — stable across versions
export const PLUGIN_ID = "doer-wiki-graph";
export const PLUGIN_VERSION = "0.1.0";
export const PAGE_ROUTE = "wiki";

export const SLOT_IDS = {
  page: "wiki-graph-page",
  sidebar: "wiki-graph-sidebar-link",
} as const;

export const EXPORT_NAMES = {
  page: "WikiGraphPage",
  sidebar: "WikiGraphSidebarLink",
} as const;

// Data handler keys (worker registers, UI calls via usePluginData)
export const DATA_KEYS = {
  /** Current graph state: nodes + edges + communities + last-run meta */
  graph: "graph",
  /** Wiki page by slug */
  wikiPage: "wiki.page",
  /** Wiki index: catalog of all pages, grouped by category */
  wikiIndex: "wiki.index",
  /** Wiki log: chronological ingest / query / lint entries */
  wikiLog: "wiki.log",
  /** Graph report: god nodes, surprising connections, suggested questions */
  graphReport: "graph.report",
  /** Neighborhood expansion for a given node (click-to-explore) */
  nodeNeighborhood: "graph.neighborhood",
  /** Text search across wiki pages */
  search: "wiki.search",
  /** Last-run ingest stats for the ingest panel */
  ingestStats: "ingest.stats",
} as const;

// Action keys (worker registers, UI calls via performAction)
export const ACTION_KEYS = {
  /** Run ingest pass: walk memfs + outputs, extract, rebuild graph + wiki */
  ingest: "ingest",
  /** Run lint pass: orphans, contradictions, stale claims */
  lint: "lint",
  /** Publish derived wiki into ~/.letta/agents/SHARED/Wiki/memory — approval-gated */
  publishToMemfs: "publish-to-memfs",
  /** File an answer / chat response back into the wiki as a new page */
  fileAnswer: "file-answer",
} as const;

// Source toggles for ingest
export const SOURCE_KINDS = ["memfs", "outputs"] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];

// Edge provenance tags (Graphify convention)
export const EDGE_TAGS = ["EXTRACTED", "INFERRED", "AMBIGUOUS"] as const;
export type EdgeTag = (typeof EDGE_TAGS)[number];

// Defaults
export const DEFAULT_INGEST_BUDGET_USD = 2.0;
export const DEFAULT_GOD_NODE_COUNT = 10;
export const DEFAULT_SURPRISING_EDGE_COUNT = 15;
