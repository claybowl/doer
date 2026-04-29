export type DeskStatus = "pending" | "running" | "complete" | "failed" | "scored";
export type RunStatus = "pending" | "running" | "completed" | "failed";

/**
 * How many desks to include in a run.
 *
 * - "full"          — all 100 desks (10 depts × 10 levels)
 * - "single-dept"   — all 10 levels of one department (requires `dept`)
 * - "cross-section" — one desk per department at a given level (requires `level`)
 * - "custom"        — explicit list of desk IDs (requires `desks`)
 */
export type RunMode = "full" | "single-dept" | "cross-section" | "custom";

export interface DeskScores {
  completion: number;  // 0–100
  quality: number;     // 0–100
  accuracy: number;    // 0–100
  handoff: number;     // 0–100
}

/** Per-judge breakdown attached when ≥2 judges ran. */
export interface JudgeBreakdown {
  judge: "claude" | "gpt4o" | "gemini";
  scores: DeskScores;
  notes: string;
}

export interface DeskResult {
  deskId: string;
  issueId: string | null;
  status: DeskStatus;
  dw: number | null;       // 0–10 (weighted composite)
  scores: DeskScores | null;
  notes: string | null;
  /** True when any pair of judges differed by >25 pts on any dimension. */
  flaggedForReview: boolean;
  judgeBreakdown: JudgeBreakdown[] | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface BenchmarkRun {
  id: string;
  companyId: string;
  agentId: string;
  agentName: string;
  mode: RunMode;
  /** Dept code when mode = "single-dept". */
  dept: string | null;
  /** Level (1–10) when mode = "cross-section". */
  level: number | null;
  selectedDesks: string[];  // desk IDs
  status: RunStatus;
  startedAt: string;
  completedAt: string | null;
  totalDw: number | null;
  avgDw: number | null;
  desks: DeskResult[];
}

export interface StartRunParams {
  companyId: string;
  agentId: string;
  agentName?: string;
  mode?: RunMode;
  /** Required when mode = "single-dept". E.g. "ENG", "PROD". */
  dept?: string;
  /** Required when mode = "cross-section". 1–10. */
  level?: number;
  /** Required (or used) when mode = "custom". */
  desks?: string[];
}

export interface PollRunParams {
  runId: string;
  companyId: string;
}

export interface JudgeDeskParams {
  runId: string;
  companyId: string;
  deskId: string;
}
