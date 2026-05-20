// packages/plugins/council/src/manifest.ts
import type { PaperclipPluginManifestV1 } from "@doerai/plugin-sdk";
import { EXPORT_NAMES, JOB_KEYS, PLUGIN_ID, PLUGIN_VERSION, SLOT_IDS } from "./constants.js";

const manifest: PaperclipPluginManifestV1 = {
  id: PLUGIN_ID,
  apiVersion: 1,
  version: PLUGIN_VERSION,
  displayName: "Council",
  description: "Orchestrate multi-agent council sessions. Agents deliberate, an orchestrator decides, issues are created.",
  author: "Donjon Intelligence Systems",
  categories: ["automation"],
  capabilities: [
    "companies.read",
    "issues.read",
    "issues.create",
    "agents.read",
    "agents.invoke",
    "agent.sessions.create",
    "agent.sessions.list",
    "agent.sessions.send",
    "agent.sessions.close",
    "goals.read",
    "activity.log.write",
    "plugin.state.read",
    "plugin.state.write",
    "jobs.schedule",
    "ui.page.register",
  ],
  entrypoints: {
    worker: "./dist/worker.js",
    ui: "./dist/ui",
  },
  jobs: [
    {
      jobKey: JOB_KEYS.heartbeat,
      displayName: "Council Heartbeat",
      description: "Fires scheduled council sessions.",
      schedule: "0 */6 * * *",
    },
    {
      jobKey: JOB_KEYS.watchdog,
      displayName: "Council Watchdog",
      description: "Resets stale running sessions to failed.",
      schedule: "*/15 * * * *",
    },
  ],
  ui: {
    slots: [
      {
        type: "page",
        id: SLOT_IDS.page,
        displayName: "Council",
        exportName: EXPORT_NAMES.page,
        routePath: "/council",
      },
      {
        type: "settingsPage",
        id: SLOT_IDS.settingsPage,
        displayName: "Council Settings",
        exportName: EXPORT_NAMES.settingsPage,
      },
    ],
  },
};

export default manifest;
