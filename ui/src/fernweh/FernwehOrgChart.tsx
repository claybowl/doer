import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useCompany } from "@/context/CompanyContext";
import { agentsApi } from "@/api/agents";
import { queryKeys } from "@/lib/queryKeys";
import {
  Avatar,
  StatusDot,
  formatCents,
  type FwStatus,
} from "./utils";
import type { Agent } from "@doerai/shared";

/* ------------------------------------------------------------------
   Tree assembly from the flat agents[] + reportsTo edges.
   - Roots = agents whose reportsTo is null OR points at a missing id
   - Orphans (reportsTo references a non-existent agent) are treated
     as roots so nothing disappears from the chart.
------------------------------------------------------------------ */
interface OrgNode {
  agent: Agent;
  children: OrgNode[];
  depth: number;
}

function buildForest(agents: Agent[]): OrgNode[] {
  const byId = new Map<string, Agent>();
  for (const a of agents) byId.set(a.id, a);

  const nodesById = new Map<string, OrgNode>();
  for (const a of agents) nodesById.set(a.id, { agent: a, children: [], depth: 0 });

  const roots: OrgNode[] = [];
  for (const a of agents) {
    const node = nodesById.get(a.id)!;
    const parentId = a.reportsTo && byId.has(a.reportsTo) ? a.reportsTo : null;
    if (!parentId) {
      roots.push(node);
    } else {
      nodesById.get(parentId)!.children.push(node);
    }
  }

  // Assign depth via BFS so we can group by level if needed.
  const queue: OrgNode[] = roots.map((r) => ({ ...r }));
  const stack: OrgNode[] = [...roots];
  while (stack.length > 0) {
    const n = stack.pop()!;
    for (const c of n.children) {
      c.depth = n.depth + 1;
      stack.push(c);
    }
  }

  // Stable sort roots + children by name for deterministic layout.
  const byName = (a: OrgNode, b: OrgNode) => a.agent.name.localeCompare(b.agent.name);
  roots.sort(byName);
  const sortRec = (n: OrgNode) => {
    n.children.sort(byName);
    n.children.forEach(sortRec);
  };
  roots.forEach(sortRec);

  // Silence unused warning on `queue` (kept for future horizontal layout).
  void queue;

  return roots;
}

function pulseStatus(agent: Agent): FwStatus {
  if (agent.status === "running" || agent.status === "active") return "running";
  if (agent.status === "paused" || agent.status === "terminated" || agent.status === "pending_approval") return "paused";
  if (agent.status === "error") return "error";
  return "idle";
}

/* ------------------------------------------------------------------
   Agent card — compact, info-dense, designed for tight tree layouts.
------------------------------------------------------------------ */
function AgentCard({ agent }: { agent: Agent }) {
  const status = pulseStatus(agent);
  return (
    <div
      className="fw-card"
      style={{
        padding: 10,
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: 240,
        minHeight: 60,
      }}
    >
      <Avatar name={agent.name} size={32} />
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
        <span
          style={{
            fontWeight: 500,
            fontSize: 13,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {agent.name}
        </span>
        <span
          style={{
            fontSize: 10,
            color: "var(--ink-dim)",
            textTransform: "capitalize",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {agent.title ?? agent.role}
        </span>
        <span style={{ fontSize: 10, color: "var(--ink-faint)", fontFamily: "var(--fw-font-mono)" }}>
          {formatCents(agent.spentMonthlyCents)} / {formatCents(agent.budgetMonthlyCents)}
        </span>
      </div>
      <StatusDot status={status} />
    </div>
  );
}

/* ------------------------------------------------------------------
   Tree renderer — recursive. Each subtree is a column:
     [ AgentCard ]
           |       <- vertical connector
     [ row of children subtrees ]  <- horizontal connector above the row
------------------------------------------------------------------ */
function SubTree({ node }: { node: OrgNode }) {
  const hasChildren = node.children.length > 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0,
      }}
    >
      <AgentCard agent={node.agent} />

      {hasChildren ? (
        <>
          {/* vertical line down from the parent card */}
          <div
            style={{
              width: 1,
              height: 20,
              background: "var(--line)",
            }}
          />
          {/* children row with a horizontal connector drawn across the top */}
          <div
            style={{
              display: "flex",
              gap: 24,
              position: "relative",
              paddingTop: 20,
            }}
          >
            {/* horizontal line spanning children centers */}
            {node.children.length > 1 ? (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: "calc(120px)",               // half card width
                  right: "calc(120px)",              // half card width
                  height: 1,
                  background: "var(--line)",
                }}
              />
            ) : null}
            {node.children.map((child) => (
              <div key={child.agent.id} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                {/* vertical line from horizontal bar down to child card */}
                <div
                  style={{
                    width: 1,
                    height: 20,
                    marginTop: -20,
                    background: "var(--line)",
                  }}
                />
                <SubTree node={child} />
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------
   Page
------------------------------------------------------------------ */
export function FernwehOrgChart() {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id;

  const agentsQuery = useQuery({
    queryKey: companyId ? queryKeys.agents.list(companyId) : ["agents", "none"],
    queryFn: () => agentsApi.list(companyId!),
    enabled: !!companyId,
    refetchInterval: 30_000,
  });

  // NOTE: all hooks must run on every render (React hooks rule). Keep them
  // above any conditional return.
  const agents = agentsQuery.data ?? [];
  const forest = React.useMemo(() => buildForest(agents), [agents]);
  const maxDepth = React.useMemo(() => {
    let m = 0;
    const walk = (n: OrgNode) => {
      if (n.depth > m) m = n.depth;
      n.children.forEach(walk);
    };
    forest.forEach(walk);
    return m;
  }, [forest]);

  if (!selectedCompany) {
    return (
      <div style={{ padding: 40, color: "var(--ink-dim)" }}>
        <p>Select a company to view the org chart.</p>
      </div>
    );
  }

  const totalAgents = agents.length;
  const runningCount = agents.filter((a) => a.status === "running" || a.status === "active").length;
  const rootCount = forest.length;

  return (
    <div
      style={{
        padding: "32px 36px 60px",
        display: "flex",
        flexDirection: "column",
        gap: 24,
        maxWidth: 1600,
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="fw-uc" style={{ color: "var(--ink-faint)" }}>
            Org chart
          </span>
          <h1 className="fw-display" style={{ fontSize: 28, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>
            {selectedCompany.name}
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="fw-chip">{totalAgents} agents</span>
          <span className="fw-chip pulse">
            <span className="fw-dot pulsing" /> {runningCount} running
          </span>
          <span className="fw-chip">
            {rootCount} root{rootCount === 1 ? "" : "s"} · depth {maxDepth + 1}
          </span>
        </div>
      </header>

      {/* Chart */}
      {totalAgents === 0 ? (
        <div className="fw-card" style={{ padding: 40, textAlign: "center", color: "var(--ink-dim)" }}>
          No agents yet. Hire one from the Agents tab to see your org take shape.
        </div>
      ) : (
        <div
          className="fw-card"
          style={{
            padding: "36px 24px",
            overflowX: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 48,
              minWidth: "min-content",
              alignItems: "flex-start",
            }}
          >
            {forest.map((root) => (
              <SubTree key={root.agent.id} node={root} />
            ))}
          </div>
        </div>
      )}

      {/* Legend / hint */}
      <footer
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "12px 0",
          borderTop: "1px solid var(--line-soft)",
          color: "var(--ink-faint)",
          fontSize: 11,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <StatusDot status="running" size={6} /> running
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <StatusDot status="idle" size={6} /> idle
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <StatusDot status="paused" size={6} /> paused
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <StatusDot status="error" size={6} /> error
        </span>
        <span style={{ marginLeft: "auto" }}>
          Live — refetches every 30s.
        </span>
      </footer>
    </div>
  );
}
