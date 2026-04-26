/**
 * Graph persistence — thin wrapper over `ctx.state`.
 *
 * V1 persists the full GraphState JSON per company under a single key.
 * Good enough for link-only graphs (tens to low hundreds of nodes). Larger
 * graphs in Phase 3+ may warrant a splitter (nodes.json + edges.json + meta)
 * or a move to `ctx.entities` for queryable rows.
 *
 * @see doc/plans/2026-04-21-wiki-graph-plugin.md — "Schema changes"
 */
import type { PluginContext } from "@doerai/plugin-sdk";
import type { GraphState } from "./build.js";

const NAMESPACE = "wiki-graph";
const GRAPH_KEY = "graph";
const STATS_KEY = "ingest-stats";

export interface PersistedIngestStats {
  lastRun: string | null;
  filesProcessed: number;
  nodesAdded: number;
  edgesAdded: number;
  tokensSpent: number;
  budgetUsd: number;
  cacheHitRate: number;
}

export async function loadGraph(
  ctx: PluginContext,
  companyId: string,
): Promise<GraphState | null> {
  if (!companyId) return null;
  const raw = await ctx.state.get({
    scopeKind: "company",
    scopeId: companyId,
    namespace: NAMESPACE,
    stateKey: GRAPH_KEY,
  });
  if (!raw) return null;
  // Trust-but-verify: the shape is our own output, but guard against stale
  // writes from earlier phases.
  if (typeof raw !== "object") return null;
  const g = raw as GraphState;
  if (!Array.isArray(g.nodes) || !Array.isArray(g.edges)) return null;
  return g;
}

export async function saveGraph(
  ctx: PluginContext,
  companyId: string,
  graph: GraphState,
): Promise<void> {
  await ctx.state.set(
    {
      scopeKind: "company",
      scopeId: companyId,
      namespace: NAMESPACE,
      stateKey: GRAPH_KEY,
    },
    graph,
  );
}

export async function loadIngestStats(
  ctx: PluginContext,
  companyId: string,
): Promise<PersistedIngestStats | null> {
  if (!companyId) return null;
  const raw = await ctx.state.get({
    scopeKind: "company",
    scopeId: companyId,
    namespace: NAMESPACE,
    stateKey: STATS_KEY,
  });
  if (!raw || typeof raw !== "object") return null;
  return raw as PersistedIngestStats;
}

export async function saveIngestStats(
  ctx: PluginContext,
  companyId: string,
  stats: PersistedIngestStats,
): Promise<void> {
  await ctx.state.set(
    {
      scopeKind: "company",
      scopeId: companyId,
      namespace: NAMESPACE,
      stateKey: STATS_KEY,
    },
    stats,
  );
}
