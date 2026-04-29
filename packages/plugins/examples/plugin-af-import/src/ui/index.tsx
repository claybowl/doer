import * as React from "react";

/**
 * UI entry point for the .af-import plugin.
 *
 * Tonight: a placeholder dashboard widget so the plugin is discoverable
 * in the UI and so the host loader has a concrete export to mount.
 *
 * Session 3: replace with the real ImportPanel — file picker, target
 * directory chooser, options checkboxes, Import button → progress →
 * success state with "Hire as agent" CTA wired to FernwehNewAgent.
 */
export function ImportPanelWidget() {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 8,
        border: "1px solid var(--line, #e4e4e7)",
        background: "var(--bg-raised, #fff)",
        color: "var(--ink, #1b1c20)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 16 }}>📦</span>
        <strong style={{ fontSize: 14 }}>Letta Agent Importer</strong>
        <span
          style={{
            marginLeft: "auto",
            padding: "1px 6px",
            borderRadius: 4,
            fontSize: 10,
            background: "var(--bg-sunken, #f4f4f5)",
            color: "var(--ink-dim, #71717a)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          scaffold
        </span>
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 12,
          color: "var(--ink-dim, #71717a)",
          lineHeight: 1.5,
        }}
      >
        Import a Letta <code>.af</code> agent file into the local
        filesystem (Letta-Code layout). Roadmap in{" "}
        <code>doc/plans/2026-04-26-af-import-plugin.md</code>.
      </p>
      <p
        style={{
          margin: 0,
          fontSize: 11,
          color: "var(--ink-faint, #a1a1aa)",
          fontStyle: "italic",
        }}
      >
        Import flow lands in Session 3. Today this is a scaffold —
        manifest mounts, worker boots, parser + unpacker stubs are
        unit-testable.
      </p>
    </div>
  );
}
