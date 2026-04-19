import type { PaperclipPluginManifestV1 } from "@doerai/plugin-sdk";

const manifest: PaperclipPluginManifestV1 = {
	id: "donjon.letta-bridge",
	apiVersion: 1,
	version: "0.1.0",
	displayName: "Letta Import",
	description: "Import Letta agents into Doer",
	author: "Donjon Intelligence",
	categories: ["connector", "automation"],
	capabilities: [
		// Core
		"http.outbound",
		"plugin.state.read",
		"plugin.state.write",
		"secrets.read-ref",
		"events.subscribe",
		// UI
		"ui.page.register",
		"ui.action.register",
		"ui.detailTab.register",
		"ui.dashboardWidget.register",
		// Agents
		"agents.invoke",
		"agent.sessions.create",
		"agent.sessions.send",
		"agent.sessions.close",
		// Jobs
		"jobs.schedule"
	],
	entrypoints: {
		worker: "./dist/worker.js",
		ui: "./dist/ui"
	},
	ui: {
		slots: [
			{
				type: "page",
				id: "agent-browser",
				displayName: "Letta Agent Browser",
				exportName: "AgentBrowserPage",
				routePath: "/letta-agents"
			},
			{
				type: "settingsPage",
				id: "settings",
				displayName: "Letta Connection",
				exportName: "SettingsPage"
			},
			{
				type: "dashboardWidget",
				id: "connection-status",
				displayName: "Letta Connection",
				exportName: "ConnectionWidget"
			},
			{
				type: "detailTab",
				id: "letta-memory",
				displayName: "Memory",
				exportName: "MemoryTab",
				entityTypes: ["agent"]
			},
			{
				type: "toolbarButton",
				id: "import-agent",
				displayName: "Import from Letta",
				exportName: "ImportAgentButton",
				entityTypes: ["project"]
			}
		]
	},
	jobs: [
		{
			jobKey: "sync-letta-agents",
			displayName: "Sync Letta Agents",
			description: "Hourly sync of agents from Letta cloud",
			schedule: "0 * * * *"
		}
	]
};

export default manifest;
