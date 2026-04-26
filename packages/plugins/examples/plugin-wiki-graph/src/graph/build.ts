/**
 * Graph builder — Phase 1 (link-only).
 *
 * Takes extracted nodes + edges from one or more source files and produces a
 * stable `GraphState`:
 *   - Nodes deduped by id. Latest-wins on title (should be stable anyway).
 *   - Edges deduped by (from, to, relation). Weighted degree uses dedup count.
 *   - `sourceCount` = number of distinct `source:*` nodes that have an outbound
 *     edge to this node. For source nodes themselves, `sourceCount` = 0.
 *   - All Phase-1 edges are tagged `EXTRACTED` — wiki-links and md-links are
 *     explicit, not inferred.
 *
 * Communities + god-node scoring land in Phase 3.
 *
 * @see doc/plans/2026-04-21-wiki-graph-plugin.md
 */
import { EDGE_TAGS } from "../constants.js";
import type { RawEdge, RawNode } from "../extract/links.js";

// ---------------------------------------------------------------------------
// Wire-format re-exports — mirror worker.ts GraphNode/GraphEdge/GraphState
// ---------------------------------------------------------------------------

export type GraphNode = {
  id: string;
  kind: RawNode["kind"];
  title: string;
  degree: number;
  community: number | null;
  sourceCount: number;
};

export type GraphEdge = {
  from: string;
  to: string;
  tag: (typeof EDGE_TAGS)[number];
  relation: string;
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

export interface BuildGraphInput {
  companyId: string;
  rawNodes: RawNode[];
  rawEdges: RawEdge[];
  lastIngestAt?: string | null;
  tokensSpent?: number;
  cacheHitRate?: number;
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export function buildGraph(input: BuildGraphInput): GraphState {
  const nodeMap = new Map<string, GraphNode>();
  for (const raw of input.rawNodes) {
    if (!nodeMap.has(raw.id)) {
      nodeMap.set(raw.id, {
        id: raw.id,
        kind: raw.kind,
        title: raw.title,
        degree: 0,
        community: null,
        sourceCount: 0,
      });
    }
  }

  const edgeMap = new Map<string, GraphEdge>();
  for (const raw of input.rawEdges) {
    const key = `${raw.from}\u0000${raw.to}\u0000${raw.relation}`;
    if (edgeMap.has(key)) continue;
    // Ensure both endpoints exist as nodes even if the extractor didn't emit
    // them (defensive — in practice the extractor always emits both).
    ensureNode(nodeMap, raw.from);
    ensureNode(nodeMap, raw.to);
    edgeMap.set(key, {
      from: raw.from,
      to: raw.to,
      tag: "EXTRACTED",
      relation: raw.relation,
      sourceSha: raw.sourceSha,
    });
  }

  // Compute degree: each edge adds 1 to both endpoints.
  // Compute sourceCount: for non-source targets, count distinct source:* origins.
  const sourcesPerTarget = new Map<string, Set<string>>();
  for (const edge of edgeMap.values()) {
    const fromNode = nodeMap.get(edge.from)!;
    const toNode = nodeMap.get(edge.to)!;
    fromNode.degree += 1;
    toNode.degree += 1;

    if (edge.from.startsWith("source:") && !edge.to.startsWith("source:")) {
      let set = sourcesPerTarget.get(edge.to);
      if (!set) {
        set = new Set();
        sourcesPerTarget.set(edge.to, set);
      }
      set.add(edge.from);
    }
  }
  for (const [targetId, sources] of sourcesPerTarget) {
    const node = nodeMap.get(targetId);
    if (node) node.sourceCount = sources.size;
  }

  const nodes = [...nodeMap.values()].sort((a, b) => a.id.localeCompare(b.id));
  const edges = [...edgeMap.values()].sort((a, b) => {
    const f = a.from.localeCompare(b.from);
    if (f !== 0) return f;
    const t = a.to.localeCompare(b.to);
    if (t !== 0) return t;
    return a.relation.localeCompare(b.relation);
  });

  return {
    companyId: input.companyId,
    nodes,
    edges,
    lastIngestAt: input.lastIngestAt ?? null,
    tokensSpent: input.tokensSpent ?? 0,
    cacheHitRate: input.cacheHitRate ?? 0,
  };
}

/**
 * Derived stats for the UI ingest panel. Computed from a GraphState so the
 * UI and worker agree on what "files processed" means without persisting it
 * separately.
 */
export function deriveStats(graph: GraphState): {
  filesProcessed: number;
  nodesAdded: number;
  edgesAdded: number;
} {
  const filesProcessed = graph.nodes.filter((n) => n.kind === "source").length;
  return {
    filesProcessed,
    nodesAdded: graph.nodes.length,
    edgesAdded: graph.edges.length,
  };
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function ensureNode(nodeMap: Map<string, GraphNode>, id: string): void {
  if (nodeMap.has(id)) return;
  // Fabricate a minimal placeholder when the extractor didn't emit one.
  // Kind is inferred from the id prefix; title falls back to the slug part.
  const [prefix, slug] = splitId(id);
  nodeMap.set(id, {
    id,
    kind: (prefix as GraphNode["kind"]) ?? "concept",
    title: slug,
    degree: 0,
    community: null,
    sourceCount: 0,
  });
}

function splitId(id: string): [string, string] {
  const colon = id.indexOf(":");
  if (colon < 0) return ["concept", id];
  return [id.slice(0, colon), id.slice(colon + 1)];
}
