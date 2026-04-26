import { createHash } from "node:crypto";
import {
  definePlugin,
  runWorker,
  type PaperclipPlugin,
  type PluginContext,
} from "@doerai/plugin-sdk";
import { ACTION_KEYS, DATA_KEYS, EDGE_TAGS } from "./constants.js";
import {
  extractLinks,
  type RawEdge,
  type RawNode,
} from "./extract/links.js";
import {
  buildGraph,
  deriveStats,
  type GraphEdge,
  type GraphNode,
  type GraphState,
} from "./graph/build.js";
import {
  loadGraph,
  loadIngestStats,
  saveGraph,
  saveIngestStats,
  type PersistedIngestStats,
} from "./graph/persist.js";
import {
  listAgentFiles,
  listAllAgentIds,
  readAgentFile,
  resolveMemfsRoot,
} from "./memfs/reader.js";

/**
 * plugin-wiki-graph worker.
 *
 * Phase 1.5 — link-only extraction lit up end-to-end.
 *
 * Flow on `runIngest`:
 *   1. Walk `~/.letta/agents/**` (constrained by company binding later).
 *   2. For each text file, SHA-256 + parse `[[wiki]]` and `[md](./link.md)`.
 *   3. Feed raw nodes+edges into `buildGraph` → deterministic `GraphState`.
 *   4. Persist under `ctx.state` (namespace="wiki-graph", stateKey="graph")
 *      and stash derived ingest stats for the UI panel.
 *   5. Activity-log the run so admin/oversight shows it.
 *
 * LLM-driven extraction (EXTRACTED | INFERRED | AMBIGUOUS tags beyond
 * EXTRACTED) lands in Phase 2. Wiki pages + publish-to-memfs land in Phase 4.
 *
 * @see doc/plans/2026-04-21-wiki-graph-plugin.md
 */

// ---------------------------------------------------------------------------
// Wire-format re-exports — GraphNode/Edge/State live in `graph/build.ts`.
// Wiki types remain here until Phase 2 promotes them to their own module.
// ---------------------------------------------------------------------------

export type { GraphEdge, GraphNode, GraphState };

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

export type IngestStats = PersistedIngestStats;

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
// Content helpers
// ---------------------------------------------------------------------------

function sha256(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * Cheap sniff — we only want to run the link extractor on files that look like
 * human-authored text. Binary blobs (images, parquet, etc.) waste cycles and
 * also choke the SHA pass if someone drops one in.
 */
function looksLikeText(relPath: string): boolean {
  return /\.(md|mdx|markdown|txt|json|yaml|yml|toml)$/i.test(relPath);
}

function emptyGraph(companyId: string): GraphState {
  return {
    companyId,
    nodes: [],
    edges: [],
    lastIngestAt: null,
    tokensSpent: 0,
    cacheHitRate: 0,
  };
}

function emptyStats(): IngestStats {
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
// Data handlers — read from `ctx.state`. Empty state falls back to defaults
// so the UI can render its first-run ingest panel.
// ---------------------------------------------------------------------------

async function getGraph(ctx: PluginContext, companyId: string): Promise<GraphState> {
  if (!companyId) return emptyGraph(companyId);
  const stored = await loadGraph(ctx, companyId);
  return stored ?? emptyGraph(companyId);
}

async function getWikiPage(ctx: PluginContext, slug: string): Promise<WikiPage | null> {
  void ctx;
  void slug;
  // Phase 4 — wiki rendering lands after LLM summaries.
  return null;
}

async function getWikiIndex(ctx: PluginContext, companyId: string): Promise<WikiIndexEntry[]> {
  void ctx;
  void companyId;
  return [];
}

async function getIngestStats(ctx: PluginContext, companyId: string): Promise<IngestStats> {
  if (!companyId) return emptyStats();
  const stored = await loadIngestStats(ctx, companyId);
  return stored ?? emptyStats();
}

// ---------------------------------------------------------------------------
// Action handlers
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
  const root = resolveMemfsRoot();
  const wantsMemfs = params.sources.length === 0 || params.sources.includes("memfs");

  let agentCount = 0;
  let fileCount = 0;
  let readFailures = 0;
  const rawNodes: RawNode[] = [];
  const rawEdges: RawEdge[] = [];

  if (wantsMemfs) {
    try {
      const agentIds = await listAllAgentIds();
      agentCount = agentIds.length;

      for (const agentId of agentIds) {
        const files = await listAgentFiles(agentId);
        for (const entry of files) {
          fileCount += 1;
          if (!looksLikeText(entry.path)) continue;
          let file;
          try {
            file = await readAgentFile(agentId, entry.path);
          } catch (err) {
            readFailures += 1;
            ctx.logger.warn("plugin-wiki-graph: readAgentFile failed", {
              agentId,
              path: entry.path,
              err: err instanceof Error ? err.message : String(err),
            });
            continue;
          }
          if (file == null) continue;
          const extracted = extractLinks({
            agentId,
            path: entry.path,
            content: file.content,
            sha: sha256(file.content),
          });
          rawNodes.push(...extracted.nodes);
          rawEdges.push(...extracted.edges);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      ctx.logger.error("plugin-wiki-graph: memfs walk failed", { root, err: message });
      await ctx.activity.log({
        companyId: params.companyId,
        message: `Wiki ingest failed: ${message}`,
        metadata: {
          runId,
          sources: params.sources,
          memfsRoot: root,
          kind: "wiki.ingest.error",
        },
      });
      return {
        runId,
        status: "error",
        message: `Memfs walk failed: ${message}`,
      };
    }
  }

  const lastIngestAt = new Date().toISOString();
  const graph = buildGraph({
    companyId: params.companyId,
    rawNodes,
    rawEdges,
    lastIngestAt,
    tokensSpent: 0,
    cacheHitRate: 0,
  });
  const stats = deriveStats(graph);

  if (params.companyId) {
    await saveGraph(ctx, params.companyId, graph);
    await saveIngestStats(ctx, params.companyId, {
      lastRun: lastIngestAt,
      filesProcessed: stats.filesProcessed,
      nodesAdded: stats.nodesAdded,
      edgesAdded: stats.edgesAdded,
      tokensSpent: 0,
      budgetUsd: 0,
      cacheHitRate: 0,
    });
  } else {
    ctx.logger.warn("plugin-wiki-graph: ingest without companyId — graph not persisted");
  }

  await ctx.activity.log({
    companyId: params.companyId,
    message: `Wiki ingest ok (agents=${agentCount}, files=${fileCount}, nodes=${stats.nodesAdded}, edges=${stats.edgesAdded})`,
    metadata: {
      runId,
      sources: params.sources,
      memfsRoot: root,
      memfsAgentCount: agentCount,
      memfsFileCount: fileCount,
      memfsReadFailures: readFailures,
      nodesAdded: stats.nodesAdded,
      edgesAdded: stats.edgesAdded,
      kind: "wiki.ingest.ok",
    },
  });

  return {
    runId,
    status: "ok",
    message: `Link-only ingest complete: ${stats.nodesAdded} node(s), ${stats.edgesAdded} edge(s) across ${stats.filesProcessed} source file(s).`,
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
    message: "Phase 1.5: lint pass not yet implemented. See plan Phase 4.",
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
      "Phase 1.5: publish is approval-gated and not yet implemented. See plan Phase 4.",
  };
}

// ---------------------------------------------------------------------------
// Plugin definition
// ---------------------------------------------------------------------------

const plugin: PaperclipPlugin = definePlugin({
  async setup(ctx) {
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
