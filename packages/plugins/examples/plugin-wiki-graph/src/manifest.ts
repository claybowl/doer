import type { PaperclipPluginManifestV1 } from "@doerai/plugin-sdk";
import {
  EXPORT_NAMES,
  PAGE_ROUTE,
  PLUGIN_ID,
  PLUGIN_VERSION,
  SLOT_IDS,
} from "./constants.js";

const manifest: PaperclipPluginManifestV1 = {
  id: PLUGIN_ID,
  apiVersion: 1,
  version: PLUGIN_VERSION,
  displayName: "Wiki & Graph",
  description:
    "Karpathy-style LLM wiki and Graphify-style knowledge graph over Doer memfs memory and gremlin work outputs. Bridges agent minds (memfs) and agent hands (delivered work) into one navigable view per company.",
  author: "Donjon Intelligence Systems",
  categories: ["ui"],
  capabilities: [
    "companies.read",
    "projects.read",
    "issues.read",
    "agents.read",
    "goals.read",
    "activity.log.write",
    "plugin.state.read",
    "plugin.state.write",
    "secrets.read-ref",
    "http.outbound",
    "ui.page.register",
    "ui.sidebar.register",
    "metrics.write",
    "jobs.schedule",
    // "memfs.read" — documented capability; not host-enforced in V1.
    // Worker reads ~/.letta/agents/** directly via Node fs (decision
    // 2026-04-22, doc/plans/2026-04-21-wiki-graph-plugin.md "Where memfs
    // bytes actually come from — resolved"). Upgrades to capability-gated
    // client when third-party plugin isolation lands.
    "memfs.read",
  ],
  entrypoints: {
    worker: "./dist/worker.js",
    ui: "./dist/ui",
  },
  ui: {
    slots: [
      {
        type: "page",
        id: SLOT_IDS.page,
        displayName: "Wiki & Graph",
        exportName: EXPORT_NAMES.page,
        routePath: PAGE_ROUTE,
      },
      {
        type: "sidebar",
        id: SLOT_IDS.sidebar,
        displayName: "Wiki & Graph",
        exportName: EXPORT_NAMES.sidebar,
      },
    ],
  },
};

export default manifest;
