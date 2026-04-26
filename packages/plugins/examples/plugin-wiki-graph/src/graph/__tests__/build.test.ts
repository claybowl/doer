/**
 * Graph builder tests — Phase 1.5.
 */
import { strict as assert } from "node:assert";
import test from "node:test";

import { extractLinks } from "../../extract/links.js";
import { buildGraph, deriveStats } from "../build.js";

test("buildGraph — dedupes nodes and tags edges EXTRACTED", () => {
  const a = extractLinks({
    agentId: "agent-a",
    path: "a.md",
    content: "[[Shared]] and [[Solo-A]].",
    sha: "sha-a",
  });
  const b = extractLinks({
    agentId: "agent-a",
    path: "b.md",
    content: "[[Shared]] and [[Solo-B]].",
    sha: "sha-b",
  });

  const graph = buildGraph({
    companyId: "co-1",
    rawNodes: [...a.nodes, ...b.nodes],
    rawEdges: [...a.edges, ...b.edges],
  });

  // Two sources + three concepts (Shared deduped).
  const ids = graph.nodes.map((n) => n.id).sort();
  assert.deepEqual(ids, [
    "concept:shared",
    "concept:solo-a",
    "concept:solo-b",
    "source:agent-a-a-md",
    "source:agent-a-b-md",
  ]);

  for (const edge of graph.edges) {
    assert.equal(edge.tag, "EXTRACTED");
  }

  assert.equal(graph.edges.length, 4);
});

test("buildGraph — weighted degree counts incoming + outgoing", () => {
  const a = extractLinks({
    agentId: "agent-a",
    path: "hub.md",
    content: "[[X]] [[Y]] [[Z]]",
    sha: "sha-hub",
  });
  const graph = buildGraph({
    companyId: "co-1",
    rawNodes: a.nodes,
    rawEdges: a.edges,
  });

  const hub = graph.nodes.find((n) => n.id === "source:agent-a-hub-md")!;
  const x = graph.nodes.find((n) => n.id === "concept:x")!;
  assert.equal(hub.degree, 3);
  assert.equal(x.degree, 1);
});

test("buildGraph — sourceCount counts distinct source:* origins for concepts", () => {
  const a = extractLinks({
    agentId: "agent-a",
    path: "a.md",
    content: "[[Popular]]",
    sha: "sha-a",
  });
  const b = extractLinks({
    agentId: "agent-a",
    path: "b.md",
    content: "[[Popular]]",
    sha: "sha-b",
  });
  const c = extractLinks({
    agentId: "agent-b",
    path: "c.md",
    content: "[[Popular]] [[Popular]]", // dup within same source — counts once
    sha: "sha-c",
  });

  const graph = buildGraph({
    companyId: "co-1",
    rawNodes: [...a.nodes, ...b.nodes, ...c.nodes],
    rawEdges: [...a.edges, ...b.edges, ...c.edges],
  });

  const popular = graph.nodes.find((n) => n.id === "concept:popular")!;
  assert.equal(popular.sourceCount, 3);

  // Source-to-source links don't bump sourceCount.
  const hub = extractLinks({
    agentId: "agent-a",
    path: "idx.md",
    content: "[a](./a.md)",
    sha: "sha-idx",
  });
  const g2 = buildGraph({
    companyId: "co-1",
    rawNodes: hub.nodes,
    rawEdges: hub.edges,
  });
  const target = g2.nodes.find((n) => n.id === "source:agent-a-a-md")!;
  assert.equal(target.sourceCount, 0);
});

test("buildGraph — output is sorted deterministically", () => {
  const a = extractLinks({
    agentId: "agent-a",
    path: "z.md",
    content: "[[B]] [[A]]",
    sha: "sha-z",
  });
  const graph = buildGraph({
    companyId: "co-1",
    rawNodes: a.nodes,
    rawEdges: a.edges,
  });

  // Nodes sorted by id.
  const ids = graph.nodes.map((n) => n.id);
  assert.deepEqual(ids, [...ids].sort());

  // Edges sorted by (from, to, relation).
  for (let i = 1; i < graph.edges.length; i++) {
    const prev = graph.edges[i - 1];
    const cur = graph.edges[i];
    const prevKey = `${prev.from}\u0000${prev.to}\u0000${prev.relation}`;
    const curKey = `${cur.from}\u0000${cur.to}\u0000${cur.relation}`;
    assert.ok(prevKey <= curKey, `edges not sorted: ${prevKey} then ${curKey}`);
  }
});

test("deriveStats — counts source nodes + totals", () => {
  const a = extractLinks({
    agentId: "agent-a",
    path: "a.md",
    content: "[[X]] [b](./b.md)",
    sha: "sha-a",
  });
  const graph = buildGraph({
    companyId: "co-1",
    rawNodes: a.nodes,
    rawEdges: a.edges,
  });
  const stats = deriveStats(graph);
  // source:a.md + source:b.md = 2 sources; concept:x = 1 concept; total 3 nodes.
  assert.equal(stats.filesProcessed, 2);
  assert.equal(stats.nodesAdded, 3);
  assert.equal(stats.edgesAdded, 2);
});
