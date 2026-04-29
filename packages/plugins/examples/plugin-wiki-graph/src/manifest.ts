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
    // TODO (Phase 0): add "memfs.read" once ctx.memfs is exposed by the SDK.
    // Until then, worker reads directly via Node fs — flagged in plan as risk.
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
