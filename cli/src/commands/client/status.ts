import { Command } from "commander";
import pc from "picocolors";
import type { DashboardSummary } from "@doerai/shared";
import {
  addCommonClientOptions,
  handleCommandError,
  resolveCommandContext,
  type BaseClientOptions,
} from "./common.js";

interface StatusOptions extends BaseClientOptions {
  companyId?: string;
}

function formatCents(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1000) {
    return `$${(dollars / 1000).toFixed(1)}k`;
  }
  return `$${dollars.toFixed(2)}`;
}

function statusIcon(ok: boolean): string {
  return ok ? pc.green("●") : pc.red("●");
}

export function formatStatusOutput(summary: DashboardSummary): void {
  // ─── Agents ───────────────────────────────────────────────
  const totalAgents = summary.agents.active + summary.agents.running + summary.agents.paused + summary.agents.error;
  console.log(pc.bold("\n  Agents"));
  console.log(pc.dim("  ──────────────────────────────"));
  console.log(`  ${statusIcon(summary.agents.error === 0)} Active   ${pc.cyan(String(summary.agents.active))}`);
  if (summary.agents.running > 0) {
    console.log(`  ${pc.green("▶")} Running  ${pc.green(pc.bold(String(summary.agents.running)))}`);
  }
  if (summary.agents.paused > 0) {
    console.log(`  ${pc.yellow("⏸")} Paused   ${pc.yellow(String(summary.agents.paused))}`);
  }
  if (summary.agents.error > 0) {
    console.log(`  ${pc.red("✗")} Error    ${pc.red(pc.bold(String(summary.agents.error)))}`);
  }
  console.log(pc.dim(`  Total: ${totalAgents}`));

  // ─── Tasks ────────────────────────────────────────────────
  console.log(pc.bold("\n  Tasks"));
  console.log(pc.dim("  ──────────────────────────────"));
  console.log(`  Open        ${pc.cyan(String(summary.tasks.open))}`);
  console.log(`  In Progress ${summary.tasks.inProgress > 0 ? pc.yellow(String(summary.tasks.inProgress)) : String(summary.tasks.inProgress)}`);
  console.log(`  Blocked     ${summary.tasks.blocked > 0 ? pc.red(String(summary.tasks.blocked)) : String(summary.tasks.blocked)}`);
  console.log(`  Done        ${pc.green(String(summary.tasks.done))}`);

  // ─── Costs ────────────────────────────────────────────────
  console.log(pc.bold("\n  Costs (this month)"));
  console.log(pc.dim("  ──────────────────────────────"));
  console.log(`  Spend     ${pc.cyan(formatCents(summary.costs.monthSpendCents))}`);
  if (summary.costs.monthBudgetCents > 0) {
    const util = summary.costs.monthUtilizationPercent;
    const utilColor = util >= 100 ? pc.red : util >= 80 ? pc.yellow : pc.green;
    console.log(`  Budget    ${formatCents(summary.costs.monthBudgetCents)}`);
    console.log(`  Used      ${utilColor(`${util.toFixed(1)}%`)}`);
  } else {
    console.log(pc.dim("  Budget    (not set)"));
  }

  // ─── Approvals ────────────────────────────────────────────
  console.log(pc.bold("\n  Approvals"));
  console.log(pc.dim("  ──────────────────────────────"));
  if (summary.pendingApprovals > 0) {
    console.log(`  ${pc.yellow("⏳")} Pending  ${pc.yellow(pc.bold(String(summary.pendingApprovals)))}`);
  } else {
    console.log(pc.dim("  No pending approvals"));
  }

  // ─── Budget Incidents ─────────────────────────────────────
  if (summary.budgets.activeIncidents > 0 || summary.budgets.pausedAgents > 0 || summary.budgets.pausedProjects > 0) {
    console.log(pc.bold("\n  Budget Alerts"));
    console.log(pc.dim("  ──────────────────────────────"));
    if (summary.budgets.activeIncidents > 0) {
      console.log(`  ${pc.red("⚠")} Active Incidents  ${pc.red(String(summary.budgets.activeIncidents))}`);
    }
    if (summary.budgets.pausedAgents > 0) {
      console.log(`  ${pc.yellow("⏸")} Paused Agents     ${pc.yellow(String(summary.budgets.pausedAgents))}`);
    }
    if (summary.budgets.pausedProjects > 0) {
      console.log(`  ${pc.yellow("⏸")} Paused Projects   ${pc.yellow(String(summary.budgets.pausedProjects))}`);
    }
  }

  // ─── Health Summary ───────────────────────────────────────
  const hasErrors = summary.agents.error > 0;
  const hasBlocked = summary.tasks.blocked > 0;
  const hasPendingApprovals = summary.pendingApprovals > 0;
  const hasBudgetIncidents = summary.budgets.activeIncidents > 0;
  const allGood = !hasErrors && !hasBlocked && !hasPendingApprovals && !hasBudgetIncidents;

  console.log("");
  if (allGood) {
    console.log(pc.green("  ✓ All systems operational"));
  } else {
    const issues: string[] = [];
    if (hasErrors) issues.push(`${summary.agents.error} agent error(s)`);
    if (hasBlocked) issues.push(`${summary.tasks.blocked} blocked task(s)`);
    if (hasPendingApprovals) issues.push(`${summary.pendingApprovals} pending approval(s)`);
    if (hasBudgetIncidents) issues.push(`${summary.budgets.activeIncidents} budget incident(s)`);
    console.log(pc.yellow(`  ! Attention needed: ${issues.join(", ")}`));
  }
  console.log("");
}

export async function fetchAndPrintStatus(opts: StatusOptions): Promise<void> {
  const ctx = resolveCommandContext(opts, { requireCompany: true });
  const summary = await ctx.api.get<DashboardSummary>(
    `/api/companies/${ctx.companyId}/dashboard`,
  );
  if (!summary) {
    console.log(pc.red("No dashboard data returned."));
    return;
  }
  if (ctx.json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }
  formatStatusOutput(summary);
}

export function registerStatusCommands(program: Command): void {
  const status = program.command("status").description("Quick overview of your Doer instance");

  addCommonClientOptions(
    status
      .command("get")
      .description("Show agents, costs, approvals, tasks, and budget status")
      .requiredOption("-C, --company-id <id>", "Company ID")
      .action(async (opts: StatusOptions) => {
        try {
          await fetchAndPrintStatus(opts);
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: false },
  );
}
