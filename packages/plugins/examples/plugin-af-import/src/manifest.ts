import type { PaperclipPluginManifestV1 } from "@doerai/plugin-sdk";

const PLUGIN_ID = "doer.af-import";
const PLUGIN_VERSION = "0.0.1";

const manifest: PaperclipPluginManifestV1 = {
  id: PLUGIN_ID,
  apiVersion: 1,
  version: PLUGIN_VERSION,
  displayName: "Letta Agent Importer (.af)",
  description:
    "Import Letta .af agent files into the local filesystem in Letta-Code layout. Optional git init. Surfaces a 'hire as agent' CTA so unpacked agents can run inside Doer.",
  author: "Doer",
  categories: ["automation", "ui"],
  capabilities: [
    // Read-only for now — actual fs.write + shell.exec capabilities will
    // be requested when the import job is implemented (Session 2-3).
    "ui.dashboardWidget.register",
  ],
  entrypoints: {
    worker: "./dist/worker.js",
    ui: "./dist/ui",
  },
  ui: {
    slots: [
      {
        type: "dashboardWidget",
        id: "af-import-widget",
        displayName: "Letta Agent Importer",
        exportName: "ImportPanelWidget",
      },
    ],
  },
};

export default manifest;
