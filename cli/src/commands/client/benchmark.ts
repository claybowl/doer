import { createInterface } from "readline";
import { Command } from "commander";
import pc from "picocolors";
import {
  addCommonClientOptions,
  handleCommandError,
  printOutput,
  resolveCommandContext,
  type BaseClientOptions,
} from "./common.js";

// ── Types ──────────────────────────────────────────────────────────────────────

type RunMode = "full" | "single-dept" | "cross-section" | "custom";

interface BenchmarkRunOptions extends BaseClientOptions {
  agentId: string;
  agentName?: string;
  mode?: RunMode;
  dept?: string;
  level?: string;
  desks?: string;
  companyId?: string;
  yes?: boolean;
}

interface BenchmarkStatusOptions extends BaseClientOptions {
  runId: string;
  companyId?: string;
}

interface BenchmarkListOptions extends BaseClientOptions {
  companyId?: string;
  limit?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Prompt for confirmation in interactive TTY sessions. Returns true in non-TTY (CI). */
async function confirm(message: string): Promise<boolean> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return true;
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`${message} ${pc.dim("[y/N]")} `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "y");
    });
  });
}

/** Resolve the run body and validate mode-specific requirements. */
function buildRunBody(opts: BenchmarkRunOptions, companyId: string): Record<string, unknown> {
  const mode: RunMode = opts.mode ?? (opts.desks ? "custom" : "full");

  const body: Record<string, unknown> = {
    companyId,
    agentId: opts.agentId,
    mode,
  };

  if (opts.agentName) body.agentName = opts.agentName;

  switch (mode) {
    case "full":
      // No extra params needed
      break;

    case "single-dept": {
      if (!opts.dept)
        throw new Error("--mode single-dept requires --dept <code>  (e.g. ENG, PROD, SALES)");
      body.dept = opts.dept.toUpperCase();
      break;
    }

    case "cross-section": {
      const lvl = parseInt(opts.level ?? "", 10);
      if (!opts.level || isNaN(lvl) || lvl < 1 || lvl > 10)
        throw new Error("--mode cross-section requires --level <1-10>");
      body.level = lvl;
      break;
    }

    case "custom": {
      if (!opts.desks)
        throw new Error("--mode custom requires --desks <comma-separated desk IDs>");
      body.desks = opts.desks.split(",").map((d) => d.trim()).filter(Boolean);
      break;
    }
  }

  return body;
}

/** Human-readable description of what will run. */
function describeModeSelection(
  mode: RunMode,
  opts: BenchmarkRunOptions,
): { label: string; deskCount: string; warn: boolean } {
  switch (mode) {
    case "full":
      return { label: "Full benchmark — all 100 desks (10 depts × 10 levels)", deskCount: "100", warn: true };
    case "single-dept":
      return { label: `Single-dept — ${(opts.dept ?? "?").toUpperCase()} (10 desks)`, deskCount: "10", warn: false };
    case "cross-section": {
      const bands: Record<number, string> = {
        1: "IC I", 2: "IC II", 3: "Senior IC", 4: "Staff",
        5: "Lead", 6: "Manager", 7: "Sr. Manager", 8: "Director", 9: "VP", 10: "C-Suite",
      };
      const lvl = parseInt(opts.level ?? "0", 10);
      return { label: `Cross-section — Level ${lvl} (${bands[lvl] ?? "?"}) across all 10 depts`, deskCount: "10", warn: false };
    }
    case "custom": {
      const ids = opts.desks?.split(",") ?? [];
      return { label: `Custom — ${ids.length} desk${ids.length !== 1 ? "s" : ""}`, deskCount: String(ids.length), warn: ids.length >= 20 };
    }
  }
}

function dwBar(dw: number, max = 10): string {
  const filled = Math.round((Math.min(dw, max) / max) * 20);
  const bar = "█".repeat(filled) + "░".repeat(20 - filled);
  const color = dw / max >= 0.8 ? pc.green : dw / max >= 0.5 ? pc.yellow : pc.red;
  return color(bar);
}

function deskLine(d: {
  deskId: string;
  status: string;
  dw: number | null;
  flaggedForReview?: boolean;
}): string {
  const statusColor =
    d.status === "scored" ? pc.green :
    d.status === "complete" ? pc.cyan :
    d.status === "running" ? pc.yellow :
    d.status === "failed" ? pc.red :
    pc.dim;
  const dwPart = d.dw != null ? pc.bold(`${d.dw.toFixed(2)} Dw`) : pc.dim("  —   ");
  const flagPart = d.flaggedForReview ? pc.yellow(" ⚑ review") : "";
  return `  ${d.deskId.padEnd(22)} ${statusColor(d.status.padEnd(10))}  ${dwPart}${flagPart}`;
}

// ── Command registration ────────────────────────────────────────────────────────

export function registerBenchmarkCommands(program: Command): void {
  const bench = program
    .command("benchmark")
    .alias("bench")
    .description("Schrute Benchmark — 100-desk AI office simulation");

  // ── benchmark run ──────────────────────────────────────────────────────────
  addCommonClientOptions(
    bench
      .command("run")
      .description("Start a new Schrute Benchmark run against an agent")
      .requiredOption("--agent-id <id>", "Agent ID to benchmark")
      .option("--agent-name <name>", "Display name for the agent")
      .option(
        "--mode <mode>",
        "Run mode: full | single-dept | cross-section | custom  (default: full)",
      )
      .option("--dept <code>",  "Dept code for single-dept mode  (e.g. ENG, PROD, SALES)")
      .option("--level <n>",    "Seniority level 1–10 for cross-section mode")
      .option("--desks <ids>",  "Comma-separated desk IDs for custom mode")
      .option("-y, --yes",      "Skip cost-confirmation prompt")
      .option("-C, --company-id <id>", "Company ID"),
    { includeCompany: false },
  ).action(async (opts: BenchmarkRunOptions) => {
    try {
      const ctx = resolveCommandContext(opts, { requireCompany: true });
      const body = buildRunBody(opts, ctx.companyId!);
      const mode = body.mode as RunMode;
      const { label, deskCount, warn } = describeModeSelection(mode, opts);

      // Cost-confirmation gate
      if (warn && !opts.yes && !ctx.json) {
        console.log(`\n${pc.bold("Schrute Benchmark")} — ${pc.cyan(label)}`);
        console.log(pc.dim(`${deskCount} Doer issues will be created and assigned to agent ${pc.bold(opts.agentId)}.`));
        console.log(pc.yellow("⚠  Full runs consume significant agent compute budget."));
        const ok = await confirm("Proceed?");
        if (!ok) {
          console.log(pc.dim("Aborted."));
          process.exit(0);
        }
      }

      const result = await ctx.api.post(
        "/plugins/doer-schrute-benchmark/actions/benchmark.start",
        body,
      );

      if (ctx.json) {
        printOutput(result, { json: true });
        return;
      }

      const run = result as {
        id: string;
        status: string;
        mode: string;
        dept: string | null;
        level: number | null;
        desks: Array<{ deskId: string; issueId: string | null; status: string }>;
      };

      console.log(`\n${pc.bold("Benchmark run started")}  ${pc.dim(run.id)}`);
      console.log(`Mode:    ${pc.cyan(run.mode)}${run.dept ? `  dept=${pc.bold(run.dept)}` : ""}${run.level ? `  level=${pc.bold(String(run.level))}` : ""}`);
      console.log(`Status:  ${pc.green(run.status)}`);

      const dispatched = run.desks.filter((d) => d.status === "running");
      const pending = run.desks.filter((d) => d.status === "pending");

      console.log(`\nDispatched (${dispatched.length}):`);
      for (const d of dispatched) {
        console.log(`  ${d.deskId.padEnd(22)} ${pc.cyan(d.status)}  issue: ${pc.dim(d.issueId ?? "—")}`);
      }
      if (pending.length > 0) {
        console.log(`Pending (${pending.length}) — awaiting upstream:`);
        for (const d of pending.slice(0, 5)) {
          console.log(`  ${pc.dim(d.deskId)}`);
        }
        if (pending.length > 5) console.log(pc.dim(`  … and ${pending.length - 5} more`));
      }

      console.log(`\nNext: ${pc.bold(`doerai benchmark status --run-id ${run.id}`)}`);
    } catch (err) {
      handleCommandError(err);
    }
  });

  // ── benchmark status ───────────────────────────────────────────────────────
  addCommonClientOptions(
    bench
      .command("status")
      .description("Poll and display status of a benchmark run (also unblocks DAG-pending desks)")
      .requiredOption("--run-id <id>", "Benchmark run ID")
      .option("-C, --company-id <id>", "Company ID"),
    { includeCompany: false },
  ).action(async (opts: BenchmarkStatusOptions) => {
    try {
      const ctx = resolveCommandContext(opts, { requireCompany: true });
      const result = await ctx.api.post(
        "/plugins/doer-schrute-benchmark/actions/benchmark.poll",
        { runId: opts.runId, companyId: ctx.companyId },
      );

      if (ctx.json) {
        printOutput(result, { json: true });
        return;
      }

      const run = result as {
        id: string;
        agentName: string;
        mode: string;
        dept: string | null;
        level: number | null;
        status: string;
        totalDw: number | null;
        avgDw: number | null;
        selectedDesks: string[];
        desks: Array<{ deskId: string; status: string; dw: number | null; flaggedForReview?: boolean }>;
      };

      const scored = run.desks.filter((d) => d.dw != null);
      const flagged = run.desks.filter((d) => d.flaggedForReview);
      const statusColor = run.status === "completed" ? pc.green : run.status === "running" ? pc.yellow : pc.dim;

      console.log(`\n${pc.bold("Schrute Benchmark")}  ${pc.dim(run.id)}`);
      console.log(`Agent:   ${pc.bold(run.agentName)}`);
      console.log(`Mode:    ${pc.cyan(run.mode)}${run.dept ? ` · dept=${pc.bold(run.dept)}` : ""}${run.level != null ? ` · level=${pc.bold(String(run.level))}` : ""}`);
      console.log(`Status:  ${statusColor(run.status)}  (${run.selectedDesks.length} desks)`);

      if (run.totalDw != null) {
        console.log(`\n${pc.bold("Score:")}  ${pc.yellow(run.totalDw.toFixed(2))} Dw total  ·  ${(run.avgDw ?? 0).toFixed(2)} Dw avg`);
        console.log(`         ${dwBar(run.totalDw, run.selectedDesks.length * 10)}`);
      }

      if (flagged.length > 0) {
        console.log(pc.yellow(`\n⚑ ${flagged.length} desk${flagged.length !== 1 ? "s" : ""} flagged for human review`));
      }

      // Group by status
      const groups: Record<string, typeof run.desks> = {};
      for (const d of run.desks) {
        (groups[d.status] ??= []).push(d);
      }

      const ORDER = ["running", "pending", "complete", "scored", "failed"];
      console.log("\nDesks:");
      for (const status of ORDER) {
        const group = groups[status];
        if (!group?.length) continue;
        console.log(pc.dim(`  ── ${status} (${group.length}) ──`));
        for (const d of group) {
          console.log(deskLine(d));
        }
      }

      if (run.status === "running") {
        console.log(`\n${pc.dim("Poll again:")} doerai benchmark status --run-id ${run.id}`);
      }
    } catch (err) {
      handleCommandError(err);
    }
  });

  // ── benchmark list ─────────────────────────────────────────────────────────
  addCommonClientOptions(
    bench
      .command("list")
      .description("List benchmark runs for the current company")
      .option("-C, --company-id <id>", "Company ID")
      .option("-n, --limit <n>", "Max runs to show (default: 20)"),
    { includeCompany: false },
  ).action(async (opts: BenchmarkListOptions) => {
    try {
      const ctx = resolveCommandContext(opts, { requireCompany: true });
      const result = await ctx.api.get(
        `/plugins/doer-schrute-benchmark/data/benchmark.runs?companyId=${encodeURIComponent(ctx.companyId ?? "")}`,
      );

      if (ctx.json) {
        printOutput(result, { json: true });
        return;
      }

      const limit = parseInt(opts.limit ?? "20", 10);
      const runs = (result as Array<{
        id: string;
        status: string;
        mode: string;
        dept: string | null;
        level: number | null;
        agentName: string;
        selectedDesks: string[];
        totalDw: number | null;
        startedAt: string;
      }>).slice(0, limit);

      if (!runs.length) {
        console.log(pc.dim("No benchmark runs yet. Run: doerai benchmark run --agent-id <id>"));
        return;
      }

      console.log(`\n${pc.bold("Benchmark runs")}  (${runs.length} shown)\n`);
      for (const run of runs) {
        const modeTag = run.mode === "single-dept" && run.dept
          ? `single-dept:${run.dept}`
          : run.mode === "cross-section" && run.level != null
            ? `cross-section:L${run.level}`
            : run.mode;
        const statusColor = run.status === "completed" ? pc.green : run.status === "running" ? pc.yellow : pc.dim;
        const dwPart = run.totalDw != null ? pc.bold(`${run.totalDw.toFixed(2)} Dw`) : pc.dim("  —   ");
        console.log(
          `  ${pc.dim(run.id.slice(-10))}  ${statusColor(run.status.padEnd(10))}  ` +
          `${run.agentName.padEnd(22)}  ${pc.cyan(modeTag.padEnd(18))}  ` +
          `${dwPart.padEnd(9)}  ${pc.dim(run.startedAt.slice(0, 10))}`,
        );
      }
    } catch (err) {
      handleCommandError(err);
    }
  });

  // ── benchmark results ──────────────────────────────────────────────────────
  addCommonClientOptions(
    bench
      .command("results")
      .description("Show detailed scoring results for a completed benchmark run")
      .requiredOption("--run-id <id>", "Benchmark run ID"),
    { includeCompany: false },
  ).action(async (opts: BenchmarkStatusOptions) => {
    try {
      const ctx = resolveCommandContext(opts);
      const result = await ctx.api.get(
        `/plugins/doer-schrute-benchmark/data/benchmark.run?runId=${encodeURIComponent(opts.runId)}`,
      );

      if (ctx.json) {
        printOutput(result, { json: true });
        return;
      }

      const run = result as {
        id: string;
        agentName: string;
        mode: string;
        dept: string | null;
        level: number | null;
        status: string;
        totalDw: number | null;
        avgDw: number | null;
        selectedDesks: string[];
        desks: Array<{
          deskId: string;
          dw: number | null;
          scores: Record<string, number> | null;
          notes: string | null;
          flaggedForReview?: boolean;
          judgeBreakdown?: Array<{ judge: string; scores: Record<string, number> }> | null;
        }>;
      };

      console.log(`\n${pc.bold("Schrute Benchmark — Results")}  ${pc.dim(run.id)}`);
      console.log(`Agent:   ${pc.bold(run.agentName)}`);
      console.log(`Mode:    ${pc.cyan(run.mode)}${run.dept ? ` · dept=${pc.bold(run.dept)}` : ""}${run.level != null ? ` · level=${pc.bold(String(run.level))}` : ""}`);
      console.log(`Status:  ${run.status}`);

      if (run.totalDw != null) {
        const maxDw = run.selectedDesks.length * 10;
        console.log(`\nTotal:   ${pc.yellow(pc.bold(run.totalDw.toFixed(2)))} / ${maxDw} Dw`);
        console.log(`Avg/desk: ${(run.avgDw ?? 0).toFixed(2)} Dw`);
        console.log(`         ${dwBar(run.totalDw, maxDw)}`);
      }

      // Group desks by dept (prefix before first hyphen after dept code)
      const byDept = new Map<string, typeof run.desks>();
      for (const d of run.desks) {
        const dept = d.deskId.split("-")[0] ?? "??";
        (byDept.get(dept) ?? (byDept.set(dept, []), byDept.get(dept)!)).push(d);
      }

      console.log("\nDesk results:");
      for (const [dept, desks] of byDept) {
        const deptDw = desks.reduce((a, d) => a + (d.dw ?? 0), 0);
        console.log(pc.dim(`\n  ── ${dept} (${deptDw.toFixed(2)} Dw) ──`));
        for (const d of desks) {
          if (d.scores) {
            const flag = d.flaggedForReview ? pc.yellow(" ⚑") : "";
            console.log(
              `  ${d.deskId.padEnd(24)} ${pc.bold((d.dw ?? 0).toFixed(2))} Dw${flag}` +
              `  C=${d.scores.completion} Q=${d.scores.quality} A=${d.scores.accuracy} H=${d.scores.handoff}`,
            );
            // Show judge breakdown if present and non-trivial
            if (d.judgeBreakdown?.length) {
              for (const j of d.judgeBreakdown) {
                console.log(
                  pc.dim(`    ${j.judge.padEnd(8)} C=${j.scores.completion} Q=${j.scores.quality} A=${j.scores.accuracy} H=${j.scores.handoff}`),
                );
              }
            }
          } else {
            console.log(`  ${pc.dim(d.deskId.padEnd(24))} ${pc.dim("— not yet scored")}`);
          }
        }
      }

      const flagged = run.desks.filter((d) => d.flaggedForReview);
      if (flagged.length > 0) {
        console.log(pc.yellow(`\n⚑ ${flagged.length} desk${flagged.length !== 1 ? "s" : ""} flagged for human review:`));
        for (const d of flagged) {
          console.log(`  ${d.deskId}`);
          if (d.notes) {
            // Show first line of notes only
            const firstLine = d.notes.split("\n").find((l) => l.trim().length > 0) ?? "";
            if (firstLine) console.log(pc.dim(`    ${firstLine.slice(0, 80)}…`));
          }
        }
      }
    } catch (err) {
      handleCommandError(err);
    }
  });

  // ── benchmark desks ────────────────────────────────────────────────────────
  addCommonClientOptions(
    bench
      .command("desks")
      .description("List available desk definitions (useful for building custom runs)")
      .option("--dept <code>",  "Filter by department code")
      .option("--level <n>",    "Filter by level 1–10"),
    { includeCompany: false },
  ).action(async (opts: { dept?: string; level?: string } & BaseClientOptions) => {
    try {
      const ctx = resolveCommandContext(opts);
      const params = new URLSearchParams();
      if (opts.dept) params.set("dept", opts.dept.toUpperCase());
      if (opts.level) params.set("level", opts.level);

      const result = await ctx.api.post(
        "/plugins/doer-schrute-benchmark/actions/benchmark.desks.list",
        Object.fromEntries(params),
      );

      if (ctx.json) {
        printOutput(result, { json: true });
        return;
      }

      const desks = result as Array<{ id: string; dept: string; level: number; name: string; title: string }>;
      if (!Array.isArray(desks) || !desks[0]?.id) {
        // Received ID list rather than objects
        console.log((result as string[]).join("\n"));
        return;
      }

      console.log(`\n${pc.bold("Available desks")}  (${desks.length})\n`);
      let lastDept = "";
      for (const d of desks) {
        if (d.dept !== lastDept) {
          console.log(pc.dim(`  ── ${d.dept} ──`));
          lastDept = d.dept;
        }
        console.log(`  ${d.id.padEnd(24)}  L${String(d.level).padStart(2)}  ${d.name.padEnd(14)}  ${pc.dim(d.title)}`);
      }
    } catch (err) {
      handleCommandError(err);
    }
  });
}
