import {
  definePlugin,
  runWorker,
  type PaperclipPlugin,
  type PluginContext,
} from "@doerai/plugin-sdk";
import { ACTION_KEYS, DATA_KEYS, EDGE_TAGS, type EdgeTag } from "./constants.js";

/**
 * plugin-wiki-graph worker.
 *
 * Phase 1 skeleton. Registers the full data/action surface with stub responses
 * so the UI can be built against the final contract. Real extraction + graph
 * building lands in Phases 2–4 (see doc/plans/2026-04-21-wiki-graph-plugin.md).
 *
 * Architecture:
 *   - Ingest action walks memfs + gremlin outputs, extracts nodes/edges via
 *     link-parse (free) + LLM (tagged EXTRACTED | INFERRED | AMBIGUOUS), and
 *     writes graph.json + wiki/*.md into the plugin's derived data dir.
 *   - Data handlers serve graph state + wiki pages to the UI.
 *   - Publish action (approval-gated) copies wiki/ into ~/.letta/agents/SHARED/Wiki.
 */

// ---------------------------------------------------------------------------
// Wire-format types — shared with the UI (kept here as the source of truth)
// ---------------------------------------------------------------------------

export type GraphNode = {
  /** Stable slug: `${kind}:${normalizedTitle}` */
  id: string;
  kind: "entity" | "concept" | "agent" | "task" | "source";
  title: string;
  /** Weighted degree — higher = hub / god node */
  degree: number;
  /** Leiden / Louvain community ID */
  community: number | null;
  /** Inbound source file count — zero-means-orphan signal */
  sourceCount: number;
};

export type GraphEdge = {
  from: string;
  to: string;
  /** Provenance: how confident we are in this edge */
  tag: EdgeTag;
  /** Relation label produced by extractor (free text) */
  relation: string;
  /** SHA of the source that produced this edge, for cache busting */
  sourceSha: string;
};

export type GraphState = {
  companyId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  lastIngestAt: string | null;
  tokensSpent: number;
  cacheHitRate: number;
};

export type WikiPage = {
  slug: string;
  title: string;
  kind: GraphNode["kind"];
  markdown: string;
  /** `[[wiki-link]]` targets resolved to page slugs */
  outbound: string[];
  /** Pages that link to this one */
  inbound: string[];
  updatedAt: string;
};

export type WikiIndexEntry = {
  slug: string;
  title: string;
  kind: GraphNode["kind"];
  summary: string;
  updatedAt: string;
};

export type IngestStats = {
  lastRun: string | null;
  filesProcessed: number;
  nodesAdded: number;
  edgesAdded: number;
  tokensSpent: number;
  budgetUsd: number;
  cacheHitRate: number;
};

// ---------------------------------------------------------------------------
// Param coercion helpers
// ---------------------------------------------------------------------------

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

// ---------------------------------------------------------------------------
// Data handlers — Phase 1 stubs return empty/initial state so the UI renders
// the ingest-panel path. Replaced by real implementations in Phase 2+.
// ---------------------------------------------------------------------------

async function getGraph(ctx: PluginContext, companyId: string): Promise<GraphState> {
  void ctx;
  return {
    companyId,
    nodes: [],
    edges: [],
    lastIngestAt: null,
    tokensSpent: 0,
    cacheHitRate: 0,
  };
}

async function getWikiPage(ctx: PluginContext, slug: string): Promise<WikiPage | null> {
  void ctx;
  void slug;
  return null;
}

async function getWikiIndex(ctx: PluginContext, companyId: string): Promise<WikiIndexEntry[]> {
  void ctx;
  void companyId;
  return [];
}

async function getIngestStats(ctx: PluginContext, companyId: string): Promise<IngestStats> {
  void ctx;
  void companyId;
  return {
    lastRun: null,
    filesProcessed: 0,
    nodesAdded: 0,
    edgesAdded: 0,
    tokensSpent: 0,
    budgetUsd: 0,
    cacheHitRate: 0,
  };
}

// ---------------------------------------------------------------------------
// Action handlers — Phase 1 stubs emit an activity-log entry and return a
// deterministic "not-yet-implemented" result. This lets us wire the UI to the
// full action surface before we ship the real extraction pipeline.
// ---------------------------------------------------------------------------

type IngestResult = {
  runId: string;
  status: "queued" | "ok" | "error";
  message: string;
};

async function runIngest(
  ctx: PluginContext,
  params: { companyId: string; sources: string[] },
): Promise<IngestResult> {
  const runId = `ingest-${Date.now().toString(36)}`;
  await ctx.activity.log({
    companyId: params.companyId,
    message: `Wiki ingest queued (sources=${params.sources.join(",")})`,
    metadata: { runId, sources: params.sources, kind: "wiki.ingest.queued" },
  });
  return {
    runId,
    status: "queued",
    message:
      "Phase 1 skeleton: ingest is wired but extraction is not yet implemented. See doc/plans/2026-04-21-wiki-graph-plugin.md Phase 2.",
  };
}

async function runLint(
  ctx: PluginContext,
  params: { companyId: string },
): Promise<IngestResult> {
  const runId = `lint-${Date.now().toString(36)}`;
  await ctx.activity.log({
    companyId: params.companyId,
    message: "Wiki lint queued",
    metadata: { runId, kind: "wiki.lint.queued" },
  });
  return {
    runId,
    status: "queued",
    message: "Phase 1 skeleton: lint pass not yet implemented. See plan Phase 4.",
  };
}

async function publishToMemfs(
  ctx: PluginContext,
  params: { companyId: string },
): Promise<IngestResult> {
  const runId = `publish-${Date.now().toString(36)}`;
  await ctx.activity.log({
    companyId: params.companyId,
    message: "Publish-to-memfs requested",
    metadata: {
      runId,
      kind: "wiki.publish.requested",
      target: "~/.letta/agents/SHARED/Wiki/memory",
    },
  });
  return {
    runId,
    status: "queued",
    message:
      "Phase 1 skeleton: publish is approval-gated and not yet implemented. See plan Phase 4.",
  };
}

// ---------------------------------------------------------------------------
// Plugin definition
// ---------------------------------------------------------------------------

const plugin: PaperclipPlugin = definePlugin({
  async setup(ctx) {
    // Tag types we expose for downstream consumers / debugging.
    ctx.logger.info("plugin-wiki-graph setup", { edgeTags: EDGE_TAGS });

    // --- Data handlers ----------------------------------------------------
    ctx.data.register(DATA_KEYS.graph, async (params) => {
      return await getGraph(ctx, asString((params as { companyId?: unknown }).companyId));
    });

    ctx.data.register(DATA_KEYS.wikiPage, async (params) => {
      return await getWikiPage(ctx, asString((params as { slug?: unknown }).slug));
    });

    ctx.data.register(DATA_KEYS.wikiIndex, async (params) => {
      return await getWikiIndex(
        ctx,
        asString((params as { companyId?: unknown }).companyId),
      );
    });

    ctx.data.register(DATA_KEYS.ingestStats, async (params) => {
      return await getIngestStats(
        ctx,
        asString((params as { companyId?: unknown }).companyId),
      );
    });

    // --- Action handlers --------------------------------------------------
    ctx.actions.register(ACTION_KEYS.ingest, async (params) => {
      const p = params as { companyId?: unknown; sources?: unknown };
      return await runIngest(ctx, {
        companyId: asString(p.companyId),
        sources: asStringArray(p.sources),
      });
    });

    ctx.actions.register(ACTION_KEYS.lint, async (params) => {
      return await runLint(ctx, {
        companyId: asString((params as { companyId?: unknown }).companyId),
      });
    });

    ctx.actions.register(ACTION_KEYS.publishToMemfs, async (params) => {
      return await publishToMemfs(ctx, {
        companyId: asString((params as { companyId?: unknown }).companyId),
      });
    });
  },
});

export default plugin;

runWorker(plugin, import.meta.url);
