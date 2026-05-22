import * as React from "react";
import { useCompany } from "@/context/CompanyContext";
import { usePluginSlots, PluginSlotMount } from "@/plugins/slots";
import { Icon, I } from "./utils";

/* ============================================================
   FernwehCouncil — Fernweh page shell for the Council plugin.
   Route: /:companyPrefix/council

   - Plugin installed + ready → renders the plugin's page slot inline
   - Plugin not installed → install card pointing to Plugin Manager
   - Plugin installed but loading → skeleton
============================================================ */

const PLUGIN_KEY = "doer.council";

export function FernwehCouncil() {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.id ?? null;

  const { slots, isLoading } = usePluginSlots({
    slotTypes: ["page"],
    companyId,
    enabled: !!companyId,
  });

  const councilSlot = slots.find(
    (s) => s.pluginKey === PLUGIN_KEY && s.type === "page",
  );

  const context = { companyId };

  // ── not yet installed ──
  if (!isLoading && !councilSlot) {
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
          <Icon d={I.agents} size={26} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span
            className="fw-display"
            style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)" }}
          >
            Council
          </span>
          <p style={{ fontSize: 13, color: "var(--ink-dim)", lineHeight: 1.6, maxWidth: 480 }}>
            Multi-agent deliberation sessions. Convene a Full Council, run a 1:1 Interview, or hold a Bidding session. Install the plugin to get started.
          </p>
        </div>

        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            ["🏛️", "Full Council", "All agents deliberate in parallel or sequence, orchestrator synthesises a decision"],
            ["🎙️", "1:1 Interview", "Deep-dive conversation between orchestrator and a single agent"],
            ["🎯", "Bidding", "Agents compete with proposals, orchestrator or user picks the winner"],
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
            Install Council
          </a>
        </div>

        <p style={{ fontSize: 11, color: "var(--ink-faint)" }}>
          Plugin ID: <span className="fw-mono">doer.council</span>
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
        slot={councilSlot!}
        context={context}
        missingBehavior="placeholder"
      />
    </div>
  );
}
