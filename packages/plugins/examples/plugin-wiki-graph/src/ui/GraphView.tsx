import { useMemo, useState, type CSSProperties } from "react";

/**
 * GraphView — Phase 1.5 render.
 *
 * Deliberately dependency-free. A circle-packed layout is enough to validate
 * plumbing for the first demoable slice:
 *   - source nodes go in an outer ring (files authored by agents)
 *   - concept nodes go in an inner ring (the wiki's actual subject graph)
 *   - edges are straight lines; color + opacity encode edge tag
 *   - node radius encodes degree (hubs get bigger)
 *
 * vis-network / d3-force physics land in Phase 2 when the graph earns it.
 */

export type GraphViewNode = {
  id: string;
  kind: "entity" | "concept" | "agent" | "task" | "source";
  title: string;
  degree: number;
  community: number | null;
  sourceCount: number;
};

export type GraphViewEdge = {
  from: string;
  to: string;
  tag: "EXTRACTED" | "INFERRED" | "AMBIGUOUS";
  relation: string;
  sourceSha: string;
};

export interface GraphViewProps {
  nodes: GraphViewNode[];
  edges: GraphViewEdge[];
  /** Optional fixed width/height; defaults to responsive fill. */
  width?: number;
  height?: number;
}

type LaidOutNode = GraphViewNode & { x: number; y: number; r: number };

const KIND_COLORS: Record<GraphViewNode["kind"], string> = {
  concept: "#60a5fa", // blue — the graph's "subjects"
  source: "#a78bfa", // violet — memfs files
  entity: "#34d399", // green — named entities
  agent: "#f59e0b", // amber — agent actors
  task: "#f87171", // red — work items
};

const TAG_STROKES: Record<GraphViewEdge["tag"], string> = {
  EXTRACTED: "#4b5563", // solid mid-gray — high confidence
  INFERRED: "#6b7280aa", // translucent
  AMBIGUOUS: "#b45309aa", // amber — needs review
};

export function GraphView(props: GraphViewProps) {
  const { nodes, edges, width = 720, height = 520 } = props;

  const [selected, setSelected] = useState<string | null>(null);

  const laidOut = useMemo(() => layout(nodes, width, height), [nodes, width, height]);
  const byId = useMemo(() => {
    const m = new Map<string, LaidOutNode>();
    for (const n of laidOut) m.set(n.id, n);
    return m;
  }, [laidOut]);

  const selectedNode = selected ? byId.get(selected) ?? null : null;
  const selectedEdges = useMemo(() => {
    if (!selected) return [];
    return edges.filter((e) => e.from === selected || e.to === selected);
  }, [edges, selected]);

  return (
    <div style={wrapper}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ background: "#0f1014", borderRadius: 8, display: "block" }}
      >
        <g>
          {edges.map((e, i) => {
            const from = byId.get(e.from);
            const to = byId.get(e.to);
            if (!from || !to) return null;
            const dim =
              selected != null && e.from !== selected && e.to !== selected;
            return (
              <line
                key={`${e.from}->${e.to}::${e.relation}::${i}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={TAG_STROKES[e.tag]}
                strokeWidth={dim ? 0.5 : 1}
                opacity={dim ? 0.25 : 0.9}
              />
            );
          })}
        </g>
        <g>
          {laidOut.map((n) => {
            const isSelected = n.id === selected;
            const dim = selected != null && !isSelected && !hasEdge(edges, selected, n.id);
            return (
              <g
                key={n.id}
                transform={`translate(${n.x},${n.y})`}
                onClick={() => setSelected(isSelected ? null : n.id)}
                style={{ cursor: "pointer" }}
              >
                <circle
                  r={n.r}
                  fill={KIND_COLORS[n.kind]}
                  fillOpacity={dim ? 0.2 : 0.95}
                  stroke={isSelected ? "#fafafa" : "#0f1014"}
                  strokeWidth={isSelected ? 2 : 1}
                />
                {(isSelected || n.degree >= 3) && (
                  <text
                    x={0}
                    y={n.r + 10}
                    textAnchor="middle"
                    fontSize={10}
                    fill={dim ? "#6b7280" : "#e5e7eb"}
                    style={{ pointerEvents: "none" }}
                  >
                    {truncate(n.title, 28)}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      <aside style={inspector}>
        <div style={legend}>
          {Object.entries(KIND_COLORS).map(([kind, color]) => (
            <span key={kind} style={legendItem}>
              <span style={{ ...dot, background: color }} />
              {kind}
            </span>
          ))}
        </div>

        {selectedNode ? (
          <div>
            <div style={inspectorTitle}>{selectedNode.title}</div>
            <div style={inspectorMeta}>
              {selectedNode.kind} · degree {selectedNode.degree} ·{" "}
              {selectedNode.sourceCount} source{selectedNode.sourceCount === 1 ? "" : "s"}
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={inspectorSubhead}>
                Edges ({selectedEdges.length})
              </div>
              <ul style={edgeList}>
                {selectedEdges.slice(0, 25).map((e, i) => (
                  <li key={i} style={edgeItem}>
                    <span style={{ color: "#9ca3af" }}>
                      {e.from === selectedNode.id ? "→ " : "← "}
                    </span>
                    {(e.from === selectedNode.id ? byId.get(e.to) : byId.get(e.from))?.title ??
                      "?"}
                    <span style={{ color: "#6b7280", marginLeft: 6 }}>
                      [{e.relation}]
                    </span>
                  </li>
                ))}
                {selectedEdges.length > 25 && (
                  <li style={{ ...edgeItem, color: "#6b7280" }}>
                    … {selectedEdges.length - 25} more
                  </li>
                )}
              </ul>
            </div>
          </div>
        ) : (
          <div style={{ color: "#6b7280", fontSize: 12 }}>
            Click a node to inspect its edges.
          </div>
        )}
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

function layout(nodes: GraphViewNode[], width: number, height: number): LaidOutNode[] {
  const cx = width / 2;
  const cy = height / 2;
  const sources = nodes.filter((n) => n.kind === "source");
  const others = nodes.filter((n) => n.kind !== "source");

  const outerR = Math.min(width, height) / 2 - 40;
  const innerR = Math.max(outerR - 140, outerR * 0.55);

  const out: LaidOutNode[] = [];
  sources.forEach((n, i) => {
    const theta = (i / Math.max(sources.length, 1)) * Math.PI * 2;
    out.push({
      ...n,
      x: cx + outerR * Math.cos(theta),
      y: cy + outerR * Math.sin(theta),
      r: radiusForDegree(n.degree),
    });
  });
  others.forEach((n, i) => {
    const theta =
      (i / Math.max(others.length, 1)) * Math.PI * 2 + Math.PI / others.length;
    out.push({
      ...n,
      x: cx + innerR * Math.cos(theta),
      y: cy + innerR * Math.sin(theta),
      r: radiusForDegree(n.degree),
    });
  });
  return out;
}

function radiusForDegree(degree: number): number {
  return 4 + Math.min(Math.sqrt(Math.max(degree, 0)) * 2.2, 14);
}

function hasEdge(edges: GraphViewEdge[], a: string, b: string): boolean {
  for (const e of edges) {
    if ((e.from === a && e.to === b) || (e.from === b && e.to === a)) return true;
  }
  return false;
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const wrapper: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 260px",
  gap: 16,
  alignItems: "start",
};

const inspector: CSSProperties = {
  background: "#14151a",
  border: "1px solid #27272a",
  borderRadius: 8,
  padding: 12,
  color: "#e5e7eb",
  minHeight: 520,
  overflow: "hidden",
};

const legend: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  paddingBottom: 10,
  marginBottom: 10,
  borderBottom: "1px solid #27272a",
  fontSize: 11,
  color: "#9ca3af",
};

const legendItem: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
};

const dot: CSSProperties = {
  display: "inline-block",
  width: 8,
  height: 8,
  borderRadius: 8,
};

const inspectorTitle: CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: "#fafafa",
  wordBreak: "break-word",
};

const inspectorMeta: CSSProperties = {
  fontSize: 11,
  color: "#9ca3af",
  marginTop: 2,
};

const inspectorSubhead: CSSProperties = {
  fontSize: 11,
  color: "#9ca3af",
  textTransform: "uppercase",
  letterSpacing: 0.5,
  marginBottom: 6,
};

const edgeList: CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  maxHeight: 360,
  overflowY: "auto",
};

const edgeItem: CSSProperties = {
  fontSize: 12,
  padding: "3px 0",
  borderBottom: "1px solid #1f2024",
};
