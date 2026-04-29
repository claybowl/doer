import type { PaperclipPluginManifestV1 } from "@doerai/plugin-sdk";
import { EXPORT_NAMES, PAGE_ROUTE, PLUGIN_ID, PLUGIN_VERSION, SLOT_IDS } from "./constants.js";

const manifest: PaperclipPluginManifestV1 = {
  id: PLUGIN_ID,
  apiVersion: 1,
  version: PLUGIN_VERSION,
  displayName: "Schrute Benchmark",
  description: "Run the Dwight-100 AI office simulation — 10 departments × 10 seniority levels — against your Doer agent team. Score in Dw units (1.0 Dw = 1 human knowledge-worker day).",
  author: "Donjon Intelligence Systems",
  categories: ["ui"],
  capabilities: [
    "companies.read",
    "agents.read",
    "issues.read",
    "issues.create",
    "issues.update",
    "plugin.state.read",
    "plugin.state.write",
    "ui.page.register",
    "metrics.write",
    "http.outbound",
    "activity.log.write",
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
        routePath: PAGE_ROUTE,
        exportName: EXPORT_NAMES.page,
        displayName: "Schrute Benchmark",
      },
    ],
  },
};

export default manifest;
