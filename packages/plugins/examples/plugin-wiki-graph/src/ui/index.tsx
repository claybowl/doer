import { useMemo, type CSSProperties } from "react";
import {
  usePluginData,
  type PluginPageProps,
  type PluginSidebarProps,
} from "@doerai/plugin-sdk/ui";
import { DATA_KEYS } from "../constants.js";
import { GraphView } from "./GraphView.js";

// ---------------------------------------------------------------------------
// Types mirror the worker wire-format. Keep in sync with worker.ts.
// ---------------------------------------------------------------------------

type GraphNode = {
  id: string;
  kind: "entity" | "concept" | "agent" | "task" | "source";
  title: string;
  degree: number;
  community: number | null;
  sourceCount: number;
};

type GraphEdge = {
  from: string;
  to: string;
  tag: "EXTRACTED" | "INFERRED" | "AMBIGUOUS";
  relation: string;
  sourceSha: string;
};

type GraphState = {
  companyId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  lastIngestAt: string | null;
  tokensSpent: number;
  cacheHitRate: number;
};

type IngestStats = {
  lastRun: string | null;
  filesProcessed: number;
  nodesAdded: number;
  edgesAdded: number;
  tokensSpent: number;
  budgetUsd: number;
  cacheHitRate: number;
};

// ---------------------------------------------------------------------------
// Styles — dark-first, matches Paperclip's aesthetic
// ---------------------------------------------------------------------------

const container: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
  padding: 24,
  color: "#e5e7eb",
  background: "#0a0a0b",
  minHeight: "100%",
};

const card: CSSProperties = {
  background: "#14151a",
  border: "1px solid #27272a",
  borderRadius: 10,
  padding: 16,
};

const emptyState: CSSProperties = {
  ...card,
  textAlign: "center",
  padding: 32,
  color: "#9ca3af",
};

const statRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 12,
};

const stat: CSSProperties = {
  ...card,
  padding: 12,
};

const statValue: CSSProperties = { fontSize: 22, fontWeight: 600, color: "#fafafa" };
const statLabel: CSSProperties = { fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5 };

// ---------------------------------------------------------------------------
// Page — main wiki + graph view. Phase 1: show empty-state + ingest stats only.
// ---------------------------------------------------------------------------

export function WikiGraphPage(props: PluginPageProps) {
  const companyId = props.context.companyId ?? "";
  const graph = usePluginData<GraphState>(DATA_KEYS.graph, { companyId });
  const stats = usePluginData<IngestStats>(DATA_KEYS.ingestStats, { companyId });

  const hasGraph = useMemo(() => {
    const data = graph.data;
    return data != null && data.nodes.length > 0;
  }, [graph.data]);

  return (
    <div style={container}>
      <header>
        <h1 style={{ margin: 0, fontSize: 24 }}>Wiki & Graph</h1>
        <p style={{ margin: "4px 0 0 0", color: "#9ca3af", fontSize: 13 }}>
          Karpathy-style wiki + Graphify-style knowledge graph across memfs memory
          and gremlin outputs.
        </p>
      </header>

      <section style={statRow}>
        <Stat label="Nodes" value={graph.data?.nodes.length ?? 0} />
        <Stat label="Edges" value={graph.data?.edges.length ?? 0} />
        <Stat label="Tokens spent" value={stats.data?.tokensSpent ?? 0} />
        <Stat
          label="Cache hit %"
          value={Math.round((stats.data?.cacheHitRate ?? 0) * 100)}
        />
      </section>

      {!hasGraph && (
        <section style={emptyState}>
          <h2 style={{ marginTop: 0 }}>No graph yet</h2>
          <p>
            Run an ingest to walk memfs memory + gremlin outputs, extract
            concepts, and build the first graph. Phase 1 skeleton is wired; the
            extraction pipeline lands in Phase 2.
          </p>
          <p style={{ fontSize: 12, color: "#6b7280", marginTop: 16 }}>
            See <code>doc/plans/2026-04-21-wiki-graph-plugin.md</code>.
          </p>
        </section>
      )}

      {hasGraph && graph.data && (
        <section style={card}>
          <GraphView nodes={graph.data.nodes} edges={graph.data.edges} />
          {graph.data.lastIngestAt && (
            <p style={{ color: "#6b7280", fontSize: 11, margin: "12px 0 0 0" }}>
              Last ingest: {new Date(graph.data.lastIngestAt).toLocaleString()} ·{" "}
              {graph.data.nodes.length} node(s), {graph.data.edges.length} edge(s).
            </p>
          )}
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={stat}>
      <div style={statValue}>{value.toLocaleString()}</div>
      <div style={statLabel}>{label}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar link
// ---------------------------------------------------------------------------

export function WikiGraphSidebarLink(props: PluginSidebarProps) {
  const companyId = props.context.companyId ?? "";
  const graph = usePluginData<GraphState>(DATA_KEYS.graph, { companyId });
  const badge = graph.data?.nodes.length ?? 0;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
      <span>Wiki & Graph</span>
      {badge > 0 && (
        <span
          style={{
            fontSize: 10,
            padding: "2px 6px",
            background: "#27272a",
            borderRadius: 10,
            color: "#a1a1aa",
          }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}
