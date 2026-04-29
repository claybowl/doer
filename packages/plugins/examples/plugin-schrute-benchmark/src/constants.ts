export { ALL_DESKS, DEPT_CODES, FOLDER_TO_DEPT } from "./desks.generated.js";
export type { DeskDefinition, DeskDeliverable, DeskCitation, DeskRubric, DeptCode } from "./desks.generated.js";

export const PLUGIN_ID = "doer-schrute-benchmark";
export const PLUGIN_VERSION = "0.2.0";
export const PAGE_ROUTE = "benchmark";

export const SLOT_IDS = {
  page: "schrute-benchmark-page",
} as const;

export const EXPORT_NAMES = {
  page: "SchruteBenchmarkPage",
} as const;

export const DATA_KEYS = {
  runs: "benchmark.runs",
  run: "benchmark.run",
  desks: "benchmark.desks",
} as const;

export const ACTION_KEYS = {
  startRun: "benchmark.start",
  pollRun: "benchmark.poll",
  judgeDesk: "benchmark.judge",
  listDesks: "benchmark.desks.list",
} as const;
