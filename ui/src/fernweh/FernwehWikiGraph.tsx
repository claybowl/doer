import * as React from "react";
import { NavLink } from "@/lib/router";
import { useCompany } from "@/context/CompanyContext";
import { usePluginSlots, PluginSlotMount } from "@/plugins/slots";
import { Icon, I } from "./utils";

/* ============================================================
   FernwehWikiGraph — Fernweh page shell for the Wiki & Graph plugin.
   Route: /:companyPrefix/fernweh/wiki

   - Plugin installed + ready → renders the plugin's page slot inline
   - Plugin not installed → install card pointing to Plugin Manager
   - Plugin installed but loading → skeleton
============================================================ */

const PLUGIN_KEY = "doer-wiki-graph";

export function FernwehWikiGraph() {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id ?? null;

  const { slots, isLoading } = usePluginSlots({
    slotTypes: ["page"],
    companyId,
    enabled: !!companyId,
  });

  const wikiSlot = slots.find(
    (s) => s.pluginKey === PLUGIN_KEY && s.type === "page",
  );

  const context = { companyId };

  // ── not yet installed ──
  if (!isLoading && !wikiSlot) {
    return (
      <div
        style={{
          maxWidth: 640,
          margin: "60px auto",
          padding: "0 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          textAlign: "center",
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "var(--bg-raised)",
            border: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--accent)",
          }}
        >
          <Icon d={I.brain} size={26} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span
            className="fw-display"
            style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)" }}
          >
            Wiki &amp; Graph
          </span>
          <p style={{ fontSize: 13, color: "var(--ink-dim)", lineHeight: 1.6, maxWidth: 480 }}>
            Karpathy-style wiki + Graphify-style knowledge graph across memfs memory
            and gremlin outputs. Install the plugin to get started.
          </p>
        </div>

        {/* What it does */}
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {[
            ["🧠", "Agent memory graph", "Builds a navigable knowledge graph from memfs memory blocks"],
            ["📄", "LLM wiki", "Auto-generates wiki pages per concept, entity, and agent"],
            ["🔗", "Gremlin output indexing", "Indexes delivered work outputs and links them into the graph"],
            ["🔍", "Search", "Full-text + semantic search across all wiki pages"],
          ].map(([icon, title, desc]) => (
            <div
              key={title}
              className="fw-card"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: "12px 14px",
                border: "1px solid var(--line)",
                background: "var(--bg-raised)",
                textAlign: "left",
              }}
            >
              <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{title}</div>
                <div style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 2 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <a
            href="/instance/settings/plugins"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "9px 18px",
              borderRadius: 8,
              background: "var(--accent)",
              color: "var(--bg)",
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
              border: "1px solid var(--accent)",
            }}
          >
            <Icon d={I.plus} size={12} />
            Install Wiki &amp; Graph
          </a>
          <a
            href="https://github.com/donjonorg/donjon-paperclip/tree/main/packages/plugins/examples/plugin-wiki-graph"
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "9px 18px",
              borderRadius: 8,
              background: "transparent",
              color: "var(--ink-dim)",
              fontSize: 13,
              textDecoration: "none",
              border: "1px solid var(--line)",
            }}
          >
            View source ↗
          </a>
        </div>

        <p style={{ fontSize: 11, color: "var(--ink-faint)" }}>
          Plugin ID: <span className="fw-mono">doer-wiki-graph</span>
          {" · "}
          See <span className="fw-mono">doc/plans/2026-04-21-wiki-graph-plugin.md</span>
        </p>
      </div>
    );
  }

  // ── loading skeleton ──
  if (isLoading) {
    return (
      <div
        style={{
          maxWidth: 860,
          margin: "0 auto",
          padding: "28px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {[80, 180, 120].map((h, i) => (
          <div
            key={i}
            style={{
              height: h,
              borderRadius: 10,
              background: "var(--bg-raised)",
              border: "1px solid var(--line)",
              animation: "fw-pulse 1.4s ease-in-out infinite",
            }}
          />
        ))}
      </div>
    );
  }

  // ── plugin installed + ready ──
  return (
    <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
      <PluginSlotMount
        slot={wikiSlot!}
        context={context}
        missingBehavior="placeholder"
      />
    </div>
  );
}
