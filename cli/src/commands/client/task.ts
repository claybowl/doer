/**
 * `task` command group — user-friendly aliases for issue/heartbeat operations.
 *
 * DON-710 requires: task create/ls/run/watch
 * This wraps the existing `issue` commands with task-friendly naming and
 * adds `task run` (heartbeat run) and `task watch` (heartbeat run with live streaming).
 */

import { Command } from "commander";
import {
  addIssueCommentSchema,
  checkoutIssueSchema,
  createIssueSchema,
  updateIssueSchema,
  type Issue,
} from "@doerai/shared";
import {
  addCommonClientOptions,
  formatInlineRecord,
  handleCommandError,
  printOutput,
  resolveCommandContext,
  type BaseClientOptions,
} from "./common.js";
import { heartbeatRun } from "../../commands/heartbeat-run.js";

interface TaskListOptions extends BaseClientOptions {
  companyId?: string;
  status?: string;
  assigneeAgentId?: string;
  projectId?: string;
  match?: string;
}

interface TaskCreateOptions extends BaseClientOptions {
  companyId?: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assigneeAgentId?: string;
  projectId?: string;
  goalId?: string;
  parentId?: string;
  requestDepth?: string;
  billingCode?: string;
}

interface TaskRunOptions extends BaseClientOptions {
  agentId: string;
  source?: string;
  trigger?: string;
  timeoutMs?: string;
  debug?: boolean;
}

interface TaskUpdateOptions extends BaseClientOptions {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assigneeAgentId?: string;
  projectId?: string;
  goalId?: string;
  parentId?: string;
  requestDepth?: string;
  billingCode?: string;
  comment?: string;
  hiddenAt?: string;
}

export function registerTaskCommands(program: Command): void {
  const task = program.command("task").description("Task operations (aliases for issue/heartbeat commands)");

  // task ls — list tasks
  registerTaskListCommand(task, "ls");
  registerTaskListCommand(task, "list");

  // task create
  addCommonClientOptions(
    task
      .command("create")
      .description("Create a new task (issue)")
      .requiredOption("-C, --company-id <id>", "Company ID")
      .requiredOption("--title <title>", "Task title")
      .option("--description <text>", "Task description")
      .option("--status <status>", "Task status")
      .option("--priority <priority>", "Task priority")
      .option("--assignee-agent-id <id>", "Assignee agent ID")
      .option("--project-id <id>", "Project ID")
      .option("--goal-id <id>", "Goal ID")
      .option("--parent-id <id>", "Parent issue ID")
      .option("--request-depth <n>", "Request depth integer")
      .option("--billing-code <code>", "Billing code")
      .action(async (opts: TaskCreateOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const payload = createIssueSchema.parse({
            title: opts.title,
            description: opts.description,
            status: opts.status,
            priority: opts.priority,
            assigneeAgentId: opts.assigneeAgentId,
            projectId: opts.projectId,
            goalId: opts.goalId,
            parentId: opts.parentId,
            requestDepth: parseOptionalInt(opts.requestDepth),
            billingCode: opts.billingCode,
          });
          const created = await ctx.api.post<Issue>(`/api/companies/${ctx.companyId}/issues`, payload);
          printOutput(created, { json: ctx.json, format: ctx.format });
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: false },
  );

  // task get
  addCommonClientOptions(
    task
      .command("get")
      .description("Get a task by UUID or identifier (e.g. DON-12)")
      .argument("<idOrIdentifier>", "Task ID or identifier")
      .action(async (idOrIdentifier: string, opts: BaseClientOptions) => {
        try {
          const ctx = resolveCommandContext(opts);
          const row = await ctx.api.get<Issue>(`/api/issues/${idOrIdentifier}`);
          printOutput(row, { json: ctx.json, format: ctx.format });
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );

  // task update
  addCommonClientOptions(
    task
      .command("update")
      .description("Update a task (issue)")
      .argument("<taskId>", "Task ID")
      .option("--title <title>", "Task title")
      .option("--description <text>", "Task description")
      .option("--status <status>", "Task status")
      .option("--priority <priority>", "Task priority")
      .option("--assignee-agent-id <id>", "Assignee agent ID")
      .option("--project-id <id>", "Project ID")
      .option("--goal-id <id>", "Goal ID")
      .option("--parent-id <id>", "Parent issue ID")
      .option("--request-depth <n>", "Request depth integer")
      .option("--billing-code <code>", "Billing code")
      .option("--comment <text>", "Optional comment to add with update")
      .option("--hidden-at <iso8601|null>", "Set hiddenAt timestamp or literal 'null'")
      .action(async (taskId: string, opts: TaskUpdateOptions) => {
        try {
          const ctx = resolveCommandContext(opts);
          const payload = updateIssueSchema.parse({
            title: opts.title,
            description: opts.description,
            status: opts.status,
            priority: opts.priority,
            assigneeAgentId: opts.assigneeAgentId,
            projectId: opts.projectId,
            goalId: opts.goalId,
            parentId: opts.parentId,
            requestDepth: parseOptionalInt(opts.requestDepth),
            billingCode: opts.billingCode,
            comment: opts.comment,
            hiddenAt: parseHiddenAt(opts.hiddenAt),
          });
          const updated = await ctx.api.patch<Issue>(`/api/issues/${taskId}`, payload);
          printOutput(updated, { json: ctx.json, format: ctx.format });
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );

  // task run — run an agent heartbeat to execute a task
  addCommonClientOptions(
    task
      .command("run")
      .description("Run an agent heartbeat to execute a task (streams live logs)")
      .requiredOption("-a, --agent-id <agentId>", "Agent ID to invoke")
      .option("--source <source>", "Invocation source (timer | assignment | on_demand | automation)", "on_demand")
      .option("--trigger <trigger>", "Trigger detail (manual | ping | callback | system)", "manual")
      .option("--timeout-ms <ms>", "Max time to wait before giving up", "0")
      .option("--debug", "Show raw adapter stdout/stderr JSON chunks")
      .action(async (opts: TaskRunOptions) => {
        await heartbeatRun({
          agentId: opts.agentId,
          config: opts.config,
          context: opts.context,
          profile: opts.profile,
          apiBase: opts.apiBase,
          apiKey: opts.apiKey,
          source: opts.source ?? "on_demand",
          trigger: opts.trigger ?? "manual",
          timeoutMs: opts.timeoutMs ?? "0",
          json: opts.json,
          debug: opts.debug,
        });
      }),
  );

  // task watch — watch an agent heartbeat execution (streams live logs)
  addCommonClientOptions(
    task
      .command("watch")
      .description("Watch an agent heartbeat execution (streams live logs)")
      .requiredOption("-a, --agent-id <agentId>", "Agent ID to watch")
      .option("--source <source>", "Invocation source", "on_demand")
      .option("--trigger <trigger>", "Trigger detail", "manual")
      .option("--timeout-ms <ms>", "Max time to wait before giving up", "0")
      .option("--debug", "Show raw adapter stdout/stderr JSON chunks")
      .action(async (opts: TaskRunOptions) => {
        await heartbeatRun({
          agentId: opts.agentId,
          config: opts.config,
          context: opts.context,
          profile: opts.profile,
          apiBase: opts.apiBase,
          apiKey: opts.apiKey,
          source: opts.source ?? "on_demand",
          trigger: opts.trigger ?? "manual",
          timeoutMs: opts.timeoutMs ?? "0",
          json: opts.json,
          debug: opts.debug,
        });
      }),
  );
}

// --- Helpers ---

function registerTaskListCommand(task: Command, name: string): void {
  addCommonClientOptions(
    task
      .command(name)
      .description("List tasks (issues) for a company")
      .option("-C, --company-id <id>", "Company ID")
      .option("--status <csv>", "Comma-separated statuses")
      .option("--assignee-agent-id <id>", "Filter by assignee agent ID")
      .option("--project-id <id>", "Filter by project ID")
      .option("--match <text>", "Local text match on identifier/title/description")
      .action(async (opts: TaskListOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const params = new URLSearchParams();
          if (opts.status) params.set("status", opts.status);
          if (opts.assigneeAgentId) params.set("assigneeAgentId", opts.assigneeAgentId);
          if (opts.projectId) params.set("projectId", opts.projectId);

          const query = params.toString();
          const path = `/api/companies/${ctx.companyId}/issues${query ? `?${query}` : ""}`;
          const rows = (await ctx.api.get<Issue[]>(path)) ?? [];

          const filtered = filterTaskRows(rows, opts.match);

          if (ctx.format === "table") {
            printOutput(filtered, { format: "table" });
            return;
          }

          if (ctx.json) {
            printOutput(filtered, { json: true });
            return;
          }

          if (filtered.length === 0) {
            printOutput([], { json: false });
            return;
          }

          for (const item of filtered) {
            console.log(
              formatInlineRecord({
                identifier: item.identifier,
                id: item.id,
                status: item.status,
                priority: item.priority,
                assigneeAgentId: item.assigneeAgentId,
                title: item.title,
                projectId: item.projectId,
              }),
            );
          }
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: false },
  );
}

function parseOptionalInt(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid integer value: ${value}`);
  }
  return parsed;
}

function parseHiddenAt(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value.trim().toLowerCase() === "null") return null;
  return value;
}

function filterTaskRows(rows: Issue[], match: string | undefined): Issue[] {
  if (!match?.trim()) return rows;
  const needle = match.trim().toLowerCase();
  return rows.filter((row) => {
    const text = [row.identifier, row.title, row.description]
      .filter((part): part is string => Boolean(part))
      .join("\n")
      .toLowerCase();
    return text.includes(needle);
  });
}
