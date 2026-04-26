/**
 * Link extractor — Phase 1 (link-only, no LLM).
 *
 * Pure function: given a memfs file's content, emit the source node it
 * represents plus any outbound edges derived from:
 *
 *   - `[[Wiki Link]]` / `[[target|display]]`  → concept nodes
 *   - `[display](./relative.md)`              → source nodes (if resolvable)
 *
 * External `http(s)` links are ignored for V1 — they rarely belong in an
 * internal knowledge graph and add noise. Anchor-only links (`#section`) and
 * pure mailto links are ignored for the same reason.
 *
 * Slugs are stable across runs: `${kind}:${slug}`. Titles are preserved from
 * the user-visible text so the UI can render them faithfully; the slug is the
 * deduping key.
 *
 * @see doc/plans/2026-04-21-wiki-graph-plugin.md — Phase 1.5 spec
 */
import path from "node:path";

// ---------------------------------------------------------------------------
// Input / output shapes
// ---------------------------------------------------------------------------

export interface SourceFileInput {
  agentId: string;
  /** Forward-slashed path relative to the agent root (from memfs reader). */
  path: string;
  /** UTF-8 contents. */
  content: string;
  /** SHA-256 of the content — passed along to edges for cache-bust in later phases. */
  sha: string;
}

export type NodeKind = "entity" | "concept" | "agent" | "task" | "source";

export interface RawNode {
  id: string;
  kind: NodeKind;
  title: string;
}

export interface RawEdge {
  from: string;
  to: string;
  relation: string;
  sourceSha: string;
}

export interface ExtractedLinks {
  /** Always includes the source node for this file itself. */
  nodes: RawNode[];
  edges: RawEdge[];
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export function extractLinks(input: SourceFileInput): ExtractedLinks {
  const sourceNode = sourceNodeFor(input.agentId, input.path);
  const nodes: RawNode[] = [sourceNode];
  const edges: RawEdge[] = [];
  const seenEdge = new Set<string>();

  // 1. [[wiki links]] first — they don't overlap the md-link regex below.
  for (const m of iterateWikiLinks(input.content)) {
    const target = conceptNode(m.target);
    nodes.push(target);
    pushEdge(edges, seenEdge, {
      from: sourceNode.id,
      to: target.id,
      relation: "mentions",
      sourceSha: input.sha,
    });
  }

  // 2. [text](url) — skip wiki-links (already handled) and skip lines inside
  //    fenced code blocks (naive but cheap; better tokenizer can land in V2).
  const stripped = stripCodeFences(input.content);
  for (const m of iterateMarkdownLinks(stripped)) {
    if (!isInternalMarkdownTarget(m.url)) continue;
    const resolvedRelPath = resolveRelative(input.path, m.url);
    if (resolvedRelPath == null) continue;
    const target = sourceNodeFor(input.agentId, resolvedRelPath);
    nodes.push(target);
    pushEdge(edges, seenEdge, {
      from: sourceNode.id,
      to: target.id,
      relation: "links",
      sourceSha: input.sha,
    });
  }

  return { nodes, edges };
}

// ---------------------------------------------------------------------------
// Node helpers
// ---------------------------------------------------------------------------

export function sourceNodeFor(agentId: string, relPath: string): RawNode {
  const normPath = normalizeRelPath(relPath);
  return {
    id: `source:${slugify(`${agentId}/${normPath}`)}`,
    kind: "source",
    title: `${agentId}/${normPath}`,
  };
}

export function conceptNode(title: string): RawNode {
  const clean = title.trim();
  return {
    id: `concept:${slugify(clean)}`,
    kind: "concept",
    title: clean,
  };
}

/**
 * Reduce a string to a stable slug: lower-case, collapse any non-alphanum run
 * into a single dash, trim leading/trailing dashes. Deliberately aggressive —
 * `My Cool Page` and `my-cool-page!!` collapse to the same id.
 */
export function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------------------------------------------------------------------------
// Link iterators
// ---------------------------------------------------------------------------

// Matches [[target]] or [[target|display]]. Non-greedy, no nested brackets.
const WIKI_LINK_RE = /\[\[([^\[\]\n]+?)\]\]/g;

export function* iterateWikiLinks(
  content: string,
): Generator<{ target: string; display: string }> {
  WIKI_LINK_RE.lastIndex = 0;
  for (const m of content.matchAll(WIKI_LINK_RE)) {
    const inner = m[1];
    const pipe = inner.indexOf("|");
    if (pipe >= 0) {
      const target = inner.slice(0, pipe).trim();
      const display = inner.slice(pipe + 1).trim();
      if (target.length > 0) yield { target, display: display || target };
    } else {
      const target = inner.trim();
      if (target.length > 0) yield { target, display: target };
    }
  }
}

// Matches [text](url). Parentheses inside url are not supported — good enough
// for our corpus. Negative-lookbehind for `!` filters out image syntax.
const MD_LINK_RE = /(?<!!)\[([^\[\]\n]*?)\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g;

export function* iterateMarkdownLinks(
  content: string,
): Generator<{ text: string; url: string }> {
  MD_LINK_RE.lastIndex = 0;
  for (const m of content.matchAll(MD_LINK_RE)) {
    yield { text: m[1].trim(), url: m[2].trim() };
  }
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function pushEdge(
  out: RawEdge[],
  seen: Set<string>,
  edge: RawEdge,
): void {
  // Dedupe by (from, to, relation) within a single file — repeated mentions
  // count once per source. Cross-source dedupe is the graph builder's job.
  const key = `${edge.from}\u0000${edge.to}\u0000${edge.relation}`;
  if (seen.has(key)) return;
  seen.add(key);
  out.push(edge);
}

export function isInternalMarkdownTarget(url: string): boolean {
  if (url.length === 0) return false;
  // Skip external schemes.
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return false;
  // Skip anchor-only / protocol-relative / absolute paths outside agent dir.
  if (url.startsWith("#")) return false;
  if (url.startsWith("//")) return false;
  // Only care about markdown targets; link-only phase ignores non-md refs.
  const [pathOnly] = url.split("#");
  return /\.mdx?$/i.test(pathOnly);
}

export function resolveRelative(sourcePath: string, url: string): string | null {
  const [pathOnly] = url.split("#");
  if (pathOnly.length === 0) return null;
  const sourceDir = path.posix.dirname(toPosix(sourcePath));
  const base = pathOnly.startsWith("/")
    ? pathOnly.slice(1)
    : path.posix.join(sourceDir, pathOnly);
  const normalized = path.posix.normalize(base);
  if (normalized.startsWith("..")) return null;
  return normalized;
}

function normalizeRelPath(p: string): string {
  return path.posix.normalize(toPosix(p)).replace(/^\.\//, "");
}

function toPosix(p: string): string {
  return p.replace(/\\/g, "/");
}

/**
 * Strip triple-backtick fenced code blocks so we don't extract links inside
 * code samples. Tilde fences are rare in agent memory; support if needed.
 */
function stripCodeFences(content: string): string {
  return content.replace(/```[\s\S]*?```/g, "");
}
