export const PLUGIN_ID = "doer-delivered";
export const PLUGIN_VERSION = "0.1.0";
export const PAGE_ROUTE = "delivered";

export const SLOT_IDS = {
  page: "delivered-page",
  sidebar: "delivered-sidebar-link",
} as const;

export const EXPORT_NAMES = {
  page: "DeliveredPage",
  sidebar: "DeliveredSidebarLink",
} as const;

export const DATA_KEYS = {
  completions: "completions",
} as const;

export const DEFAULT_WINDOW_DAYS = 7;
export const WINDOW_OPTIONS = [1, 3, 7, 14, 30, 90] as const;
