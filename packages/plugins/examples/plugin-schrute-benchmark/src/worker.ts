import { definePlugin, runWorker, type PluginContext } from "@doerai/plugin-sdk";
import { ACTION_KEYS, DATA_KEYS, ALL_DESKS } from "./constants.js";
import type { DeskDefinition } from "./constants.js";
import type {
  BenchmarkRun,
  DeskResult,
  DeskScores,
  JudgeBreakdown,
  StartRunParams,
  PollRunParams,
  JudgeDeskParams,
  RunMode,
} from "./types.js";

// ── Desk selection ─────────────────────────────────────────────────────────

function selectDesks(params: StartRunParams): DeskDefinition[] {
  const mode: RunMode = params.mode ?? "custom";

  switch (mode) {
    case "full":
      return [...ALL_DESKS];

    case "single-dept": {
      const dept = params.dept?.toUpperCase();
      if (!dept) throw new Error("mode=single-dept requires `dept` param (e.g. 'ENG')");
      const matched = ALL_DESKS.filter((d) => d.dept === dept);
      if (matched.length === 0) throw new Error(`Unknown dept: ${dept}`);
      return matched;
    }

    case "cross-section": {
      const level = params.level;
      if (!level || level < 1 || level > 10)
        throw new Error("mode=cross-section requires `level` param (1–10)");
      const matched = ALL_DESKS.filter((d) => d.level === level);
      if (matched.length === 0) throw new Error(`No desks at level ${level}`);
      return matched;
    }

    case "custom":
    default: {
      const ids = params.desks;
      if (!ids || ids.length === 0) throw new Error("mode=custom requires `desks` param (array of desk IDs)");
      const byId = new Map(ALL_DESKS.map((d) => [d.id, d]));
      const matched: DeskDefinition[] = [];
      for (const id of ids) {
        const desk = byId.get(id);
        if (!desk) throw new Error(`Unknown desk ID: ${id}`);
        matched.push(desk);
      }
      return matched;
    }
  }
}

// ── DAG helpers ────────────────────────────────────────────────────────────

/**
 * Topological sort of desks in the run set.
 * Desks with no upstream deps in the run set come first.
 * Circular deps are silently tolerated (unresolved desks appended at end).
 */
function topoSort(desks: DeskDefinition[]): DeskDefinition[] {
  const inSet = new Set(desks.map((d) => d.id));
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>(); // upstream → list of dependents

  for (const d of desks) {
    const upstreamInSet = d.upstreamDeskIds.filter((id) => inSet.has(id));
    inDegree.set(d.id, upstreamInSet.length);
    adj.set(d.id, adj.get(d.id) ?? []);
    for (const up of upstreamInSet) {
      const list = adj.get(up) ?? [];
      list.push(d.id);
      adj.set(up, list);
    }
  }

  const queue: string[] = [];
  for (const d of desks) {
    if ((inDegree.get(d.id) ?? 0) === 0) queue.push(d.id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    sorted.push(id);
    for (const dep of (adj.get(id) ?? [])) {
      const deg = (inDegree.get(dep) ?? 1) - 1;
      inDegree.set(dep, deg);
      if (deg === 0) queue.push(dep);
    }
  }

  // Append any unresolved desks (cycles) at the end
  const sortedSet = new Set(sorted);
  for (const d of desks) {
    if (!sortedSet.has(d.id)) sorted.push(d.id);
  }

  const byId = new Map(desks.map((d) => [d.id, d]));
  return sorted.map((id) => byId.get(id)!);
}

/**
 * Returns true if all upstream deps for `desk` (within the run's selected set)
 * are complete (scored or failed).
 */
function upstreamComplete(desk: DeskDefinition, deskResults: DeskResult[], selectedIds: Set<string>): boolean {
  const relevantUpstream = desk.upstreamDeskIds.filter((id) => selectedIds.has(id));
  if (relevantUpstream.length === 0) return true;
  const resultMap = new Map(deskResults.map((r) => [r.deskId, r]));
  return relevantUpstream.every((id) => {
    const r = resultMap.get(id);
    return r?.status === "scored" || r?.status === "failed";
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────

function makeId(): string {
  return `bench-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Compute Dw from raw scores. Weights: completion 40%, quality 35%, accuracy 15%, handoff 10% */
function scoreToDw(scores: DeskScores): number {
  const raw =
    scores.completion * 0.4 +
    scores.quality * 0.35 +
    scores.accuracy * 0.15 +
    scores.handoff * 0.1;
  return Math.round((raw / 100) * 10 * 100) / 100;
}

/** Median of three numbers. */
function median3(a: number, b: number, c: number): number {
  return [a, b, c].sort((x, y) => x - y)[1]!;
}

/** True when any pair of scores differ by >25 on any dimension. */
function hasConflict(breakdowns: JudgeBreakdown[]): boolean {
  if (breakdowns.length < 2) return false;
  const dims: (keyof DeskScores)[] = ["completion", "quality", "accuracy", "handoff"];
  for (let i = 0; i < breakdowns.length; i++) {
    for (let j = i + 1; j < breakdowns.length; j++) {
      for (const dim of dims) {
        if (Math.abs(breakdowns[i]!.scores[dim] - breakdowns[j]!.scores[dim]) > 25) {
          return true;
        }
      }
    }
  }
  return false;
}

// ── State helpers ──────────────────────────────────────────────────────────

const RUNS_KEY = (companyId: string) => `benchmark.runs.${companyId}`;
const RUN_KEY = (runId: string) => `benchmark.run.${runId}`;

async function getRuns(ctx: PluginContext, companyId: string): Promise<BenchmarkRun[]> {
  const stored = await ctx.state.get({
    scopeKind: "company",
    scopeId: companyId,
    stateKey: RUNS_KEY(companyId),
  });
  return (stored as BenchmarkRun[] | null) ?? [];
}

async function getRun(ctx: PluginContext, runId: string): Promise<BenchmarkRun | null> {
  const stored = await ctx.state.get({
    scopeKind: "instance",
    stateKey: RUN_KEY(runId),
  });
  return (stored as BenchmarkRun | null) ?? null;
}

async function saveRun(ctx: PluginContext, run: BenchmarkRun): Promise<void> {
  await ctx.state.set({ scopeKind: "instance", stateKey: RUN_KEY(run.id) }, run);
  const runs = await getRuns(ctx, run.companyId);
  const idx = runs.findIndex((r) => r.id === run.id);
  if (idx >= 0) runs[idx] = run;
  else runs.unshift(run);
  await ctx.state.set(
    { scopeKind: "company", scopeId: run.companyId, stateKey: RUNS_KEY(run.companyId) },
    runs,
  );
}

// ── Issue creation ─────────────────────────────────────────────────────────

async function createDeskIssue(
  ctx: PluginContext,
  params: { companyId: string; agentId: string; desk: DeskDefinition; runId: string },
): Promise<string> {
  const { desk } = params;

  const deliverableList = desk.deliverables
    .map((d) => `- \`${d.filename}\` — ${d.description}`)
    .join("\n");

  const title = `[Schrute Bench ${params.runId.slice(-6)}] ${desk.id} — ${desk.name} (${desk.title})`;
  const description = [
    desk.brief,
    "",
    "---",
    "**Deliverables:**",
    deliverableList,
    "",
    `_Benchmark run: \`${params.runId}\` · Desk: \`${desk.id}\` · Level ${desk.level} · Dept ${desk.dept}_`,
    `_Time budget: ${desk.timeBudgetMin} min_`,
  ].join("\n");

  const issue = await ctx.issues.create({
    companyId: params.companyId,
    title,
    description,
    assigneeAgentId: params.agentId,
    priority: "medium",
  });

  return issue.id;
}

// ── Judge ──────────────────────────────────────────────────────────────────

/**
 * Rubric-aware judge stub.
 *
 * Phase 2: returns rubric questions as structured notes so a human reviewer
 * can score against them. When ANTHROPIC_API_KEY / OPENAI_API_KEY /
 * GOOGLE_API_KEY secrets are configured on the plugin, a future Phase 5 update
 * will call all three LLMs and use the median score per dimension.
 */
async function judgeDesk(
  _ctx: PluginContext,
  _run: BenchmarkRun,
  deskResult: DeskResult,
): Promise<{ scores: DeskScores; notes: string; breakdown: JudgeBreakdown[] | null; flagged: boolean }> {
  const desk = ALL_DESKS.find((d) => d.id === deskResult.deskId);
  if (!desk) {
    return {
      scores: { completion: 0, quality: 0, accuracy: 0, handoff: 0 },
      notes: `Desk definition not found for ${deskResult.deskId}. Score manually.`,
      breakdown: null,
      flagged: true,
    };
  }

  // Format rubric for human reviewer
  const rubricText = [
    "## Rubric — score each dimension 0–100",
    "",
    "### Completion (×0.40 weight)",
    desk.rubric.completion.map((q) => `- [ ] ${q}`).join("\n"),
    "",
    "### Quality (×0.35 weight)",
    desk.rubric.quality.map((q) => `- [ ] ${q}`).join("\n"),
    "",
    "### Accuracy (×0.15 weight)",
    desk.rubric.accuracy.map((q) => `- [ ] ${q}`).join("\n"),
    "",
    "### Handoff (×0.10 weight)",
    desk.rubric.handoff.map((q) => `- [ ] ${q}`).join("\n"),
    "",
    "---",
    `**Sources used:** ${desk.citations.map((c) => `${c.source} (${c.code ?? c.url})`).join(", ")}`,
    "",
    "_3-judge LLM consensus (Phase 5) will replace this stub once API keys are configured._",
  ].join("\n");

  return {
    scores: { completion: 0, quality: 0, accuracy: 0, handoff: 0 },
    notes: rubricText,
    breakdown: null,
    flagged: true,
  };
}

// ── Plugin ─────────────────────────────────────────────────────────────────

const plugin = definePlugin({
  async setup(ctx) {
    ctx.logger.info("plugin-schrute-benchmark v0.2 setup", {
      deskCount: ALL_DESKS.length,
    });

    // ── DATA: list all desk definitions ──────────────────────────────────
    ctx.data.register(DATA_KEYS.desks, async (params) => {
      const p = params as { dept?: string; level?: number };
      let desks = ALL_DESKS;
      if (p.dept) { const dept = p.dept.toUpperCase(); desks = desks.filter((d) => d.dept === dept); }
      if (p.level) desks = desks.filter((d) => d.level === p.level);
      return desks.map(({ id, dept, level, title, name, timeBudgetMin, upstreamDeskIds, downstreamDeskIds }) => ({
        id, dept, level, title, name, timeBudgetMin, upstreamDeskIds, downstreamDeskIds,
      }));
    });

    // ── DATA: list runs for a company ─────────────────────────────────────
    ctx.data.register(DATA_KEYS.runs, async (params) => {
      const p = params as { companyId?: string };
      if (!p.companyId) return [];
      return getRuns(ctx, p.companyId);
    });

    // ── DATA: single run ──────────────────────────────────────────────────
    ctx.data.register(DATA_KEYS.run, async (params) => {
      const p = params as { runId?: string };
      if (!p.runId) return null;
      return getRun(ctx, p.runId);
    });

    // ── ACTION: list desks ────────────────────────────────────────────────
    ctx.actions.register(ACTION_KEYS.listDesks, async (params) => {
      const p = params as { dept?: string; level?: number; mode?: string };
      if (p.mode === "full") return ALL_DESKS.map((d) => d.id);
      if (p.mode === "single-dept" && p.dept) {
        const dept = p.dept.toUpperCase();
        return ALL_DESKS.filter((d) => d.dept === dept).map((d) => d.id);
      }
      if (p.mode === "cross-section" && p.level) {
        return ALL_DESKS.filter((d) => d.level === p.level).map((d) => d.id);
      }
      return ALL_DESKS.map((d) => ({ id: d.id, dept: d.dept, level: d.level, name: d.name, title: d.title }));
    });

    // ── ACTION: start a benchmark run ─────────────────────────────────────
    ctx.actions.register(ACTION_KEYS.startRun, async (params) => {
      const p = params as unknown as StartRunParams;
      const mode = p.mode ?? "custom";

      const selectedDeskDefs = selectDesks(p);
      // Topologically sort so upstream desks come before downstream ones
      const sortedDeskDefs = topoSort(selectedDeskDefs);
      const selectedIds = new Set(sortedDeskDefs.map((d) => d.id));

      const run: BenchmarkRun = {
        id: makeId(),
        companyId: p.companyId,
        agentId: p.agentId,
        agentName: p.agentName ?? p.agentId,
        mode,
        dept: p.dept?.toUpperCase() ?? null,
        level: p.level ?? null,
        selectedDesks: sortedDeskDefs.map((d) => d.id),
        status: "running",
        startedAt: new Date().toISOString(),
        completedAt: null,
        totalDw: null,
        avgDw: null,
        desks: sortedDeskDefs.map((desk) => ({
          deskId: desk.id,
          issueId: null,
          status: "pending" as const,
          dw: null,
          scores: null,
          notes: null,
          flaggedForReview: false,
          judgeBreakdown: null,
          startedAt: null,
          completedAt: null,
        })),
      };

      // Create Doer issues only for desks whose upstream deps are already complete
      // (initially: desks with no upstream in the selected set)
      for (const desk of sortedDeskDefs) {
        const deskResult = run.desks.find((d) => d.deskId === desk.id)!;
        if (!upstreamComplete(desk, run.desks, selectedIds)) {
          // Waiting on upstream — stay "pending"
          continue;
        }
        try {
          const issueId = await createDeskIssue(ctx, {
            companyId: p.companyId,
            agentId: p.agentId,
            desk,
            runId: run.id,
          });
          deskResult.issueId = issueId;
          deskResult.status = "running";
          deskResult.startedAt = new Date().toISOString();
        } catch (err) {
          deskResult.status = "failed";
          deskResult.notes = err instanceof Error ? err.message : String(err);
        }
      }

      await saveRun(ctx, run);
      ctx.logger.info("benchmark run started", { runId: run.id, mode, deskCount: selectedDeskDefs.length });
      return run;
    });

    // ── ACTION: poll run ──────────────────────────────────────────────────
    // Checks issue statuses, unblocks downstream desks when upstream completes.
    ctx.actions.register(ACTION_KEYS.pollRun, async (params) => {
      const p = params as unknown as PollRunParams;
      const run = await getRun(ctx, p.runId);
      if (!run) throw new Error(`Run ${p.runId} not found`);

      const selectedIds = new Set(run.selectedDesks);

      // 1. Update statuses of running desks from their issues
      for (const deskResult of run.desks) {
        if (!deskResult.issueId || deskResult.status === "scored" || deskResult.status === "failed") continue;
        if (deskResult.status !== "running") continue;

        try {
          const issue = await ctx.issues.get(deskResult.issueId, run.companyId);
          if (issue && (issue.status === "done" || issue.status === "cancelled")) {
            deskResult.status = "complete";
            deskResult.completedAt = new Date().toISOString();
          }
        } catch {
          // Issue fetch failed — leave as-is
        }
      }

      // 2. Unblock pending desks whose upstream is now complete
      const deskDefsById = new Map(ALL_DESKS.map((d) => [d.id, d]));
      for (const deskResult of run.desks) {
        if (deskResult.status !== "pending") continue;
        const deskDef = deskDefsById.get(deskResult.deskId);
        if (!deskDef) continue;
        if (!upstreamComplete(deskDef, run.desks, selectedIds)) continue;

        // Upstream done — create the issue and start this desk
        try {
          const issueId = await createDeskIssue(ctx, {
            companyId: run.companyId,
            agentId: run.agentId,
            desk: deskDef,
            runId: run.id,
          });
          deskResult.issueId = issueId;
          deskResult.status = "running";
          deskResult.startedAt = new Date().toISOString();
        } catch (err) {
          deskResult.status = "failed";
          deskResult.notes = err instanceof Error ? err.message : String(err);
        }
      }

      // 3. Check if run is finished
      const allDone = run.desks.every(
        (d) => d.status === "scored" || d.status === "failed" || d.status === "complete",
      );
      if (allDone && run.status === "running") {
        run.status = "completed";
        run.completedAt = new Date().toISOString();
        const scoredDesks = run.desks.filter((d) => d.dw !== null);
        if (scoredDesks.length > 0) {
          run.totalDw = scoredDesks.reduce((acc, d) => acc + (d.dw ?? 0), 0);
          run.avgDw = run.totalDw / scoredDesks.length;
        }
      }

      await saveRun(ctx, run);
      return run;
    });

    // ── ACTION: judge a desk ──────────────────────────────────────────────
    ctx.actions.register(ACTION_KEYS.judgeDesk, async (params) => {
      const p = params as unknown as JudgeDeskParams;
      const run = await getRun(ctx, p.runId);
      if (!run) throw new Error(`Run ${p.runId} not found`);

      const deskResult = run.desks.find((d) => d.deskId === p.deskId);
      if (!deskResult) throw new Error(`Desk ${p.deskId} not in run ${p.runId}`);
      if (deskResult.status !== "complete")
        throw new Error(`Desk ${p.deskId} is not complete (status: ${deskResult.status})`);

      const { scores, notes, breakdown, flagged } = await judgeDesk(ctx, run, deskResult);

      // If 3-judge breakdown present, compute median per dimension
      let finalScores = scores;
      if (breakdown && breakdown.length === 3) {
        finalScores = {
          completion: median3(breakdown[0]!.scores.completion, breakdown[1]!.scores.completion, breakdown[2]!.scores.completion),
          quality: median3(breakdown[0]!.scores.quality, breakdown[1]!.scores.quality, breakdown[2]!.scores.quality),
          accuracy: median3(breakdown[0]!.scores.accuracy, breakdown[1]!.scores.accuracy, breakdown[2]!.scores.accuracy),
          handoff: median3(breakdown[0]!.scores.handoff, breakdown[1]!.scores.handoff, breakdown[2]!.scores.handoff),
        };
      }

      deskResult.scores = finalScores;
      deskResult.notes = notes;
      deskResult.dw = scoreToDw(finalScores);
      deskResult.status = "scored";
      deskResult.flaggedForReview = flagged || (breakdown ? hasConflict(breakdown) : false);
      deskResult.judgeBreakdown = breakdown;

      // Recompute run totals
      const scoredDesks = run.desks.filter((d) => d.dw !== null);
      run.totalDw = scoredDesks.reduce((acc, d) => acc + (d.dw ?? 0), 0);
      run.avgDw = scoredDesks.length > 0 ? run.totalDw / scoredDesks.length : null;

      await saveRun(ctx, run);
      return run;
    });
  },

  async onHealth() {
    return { status: "ok", deskCount: ALL_DESKS.length };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
