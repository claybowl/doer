// packages/plugins/council/src/constants.ts

export const PLUGIN_ID = "doer.council";
export const PLUGIN_VERSION = "0.1.0";

export const JOB_KEYS = {
  heartbeat: "council:heartbeat",
  watchdog: "council:watchdog",
} as const;

export const STREAM_CHANNELS = {
  session: (sessionId: string) => `council:session:${sessionId}`,
} as const;

export const DATA_KEYS = {
  sessions: "council:sessions",
  session: "council:session",
  config: "council:config",
  agents: "council:agents",
} as const;

export const ACTION_KEYS = {
  trigger: "council:trigger",
  saveConfig: "council:saveConfig",
} as const;

export const SLOT_IDS = {
  page: "council-page",
  settingsPage: "council-settings",
} as const;

export const EXPORT_NAMES = {
  page: "CouncilPage",
  settingsPage: "CouncilSettingsPage",
} as const;

export const ENTITY_TYPE = "council-session" as const;
export const CONFIG_STATE_KEY = "council:config" as const;

export const DEFAULT_CONFIG = {
  enabledSessionTypes: ["full_council"] as string[],
  defaultSessionTypeId: "full_council",
  invocationMode: "parallel" as const,
  resolutionMode: "orchestrator" as const,
  agenda: {
    prompts: [
      "What is blocking progress on active goals?",
      "Where should we focus resources this week?",
      "What issues should be created to unblock the team?",
    ],
    perAgent: {} as Record<string, string>,
    outputConstraints: { minIssues: 2, maxIssues: 6 },
  },
  participants: {
    full_council: [] as { agentId: string; role: string }[],
  },
};
