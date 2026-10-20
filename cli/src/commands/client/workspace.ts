import { Command } from "commander";
import pc from "picocolors";
import {
  addCommonClientOptions,
  formatInlineRecord,
  handleCommandError,
  printOutput,
  resolveCommandContext,
  type BaseClientOptions,
} from "./common.js";
import { resolveProfile, upsertProfile, type ClientContextProfile } from "../../client/context.js";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface WorkspaceListOptions extends BaseClientOptions {}

interface WorkspaceGetOptions extends BaseClientOptions {
  workspaceId: string;
}

interface WorkspaceUseOptions extends BaseClientOptions {
  workspaceId: string;
  profile?: string;
}

interface WorkspaceCreateOptions extends BaseClientOptions {
  name: string;
  slug?: string;
  description?: string;
}

export function registerWorkspaceCommands(program: Command): void {
  const workspace = program.command("workspace").description("Workspace operations");

  // workspace ls / workspace list
  addCommonClientOptions(
    workspace
      .command("ls")
      .description("List accessible workspaces")
      .action(async (opts: WorkspaceListOptions) => {
        try {
          const ctx = resolveCommandContext(opts);
          const rows = (await ctx.api.get<Workspace[]>("/api/workspaces")) ?? [];

          if (ctx.format === "table") {
            printOutput(rows, { format: "table" });
            return;
          }

          if (ctx.json) {
            printOutput(rows, { json: true });
            return;
          }

          if (rows.length === 0) {
            printOutput([], { json: false });
            return;
          }

          for (const row of rows) {
            console.log(
              formatInlineRecord({
                id: row.id,
                name: row.name,
                slug: row.slug,
                status: row.status,
                description: row.description,
              }),
            );
          }
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );

  // alias: workspace list
  addCommonClientOptions(
    workspace
      .command("list")
      .description("List accessible workspaces (alias for ls)")
      .action(async (opts: WorkspaceListOptions) => {
        try {
          const ctx = resolveCommandContext(opts);
          const rows = (await ctx.api.get<Workspace[]>("/api/workspaces")) ?? [];

          if (ctx.format === "table") {
            printOutput(rows, { format: "table" });
            return;
          }

          if (ctx.json) {
            printOutput(rows, { json: true });
            return;
          }

          if (rows.length === 0) {
            printOutput([], { json: false });
            return;
          }

          for (const row of rows) {
            console.log(
              formatInlineRecord({
                id: row.id,
                name: row.name,
                slug: row.slug,
                status: row.status,
                description: row.description,
              }),
            );
          }
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );

  // workspace get <workspaceId>
  addCommonClientOptions(
    workspace
      .command("get")
      .description("Get a workspace by ID")
      .argument("<workspaceId>", "Workspace ID")
      .action(async (workspaceId: string, opts: BaseClientOptions) => {
        try {
          const ctx = resolveCommandContext(opts);
          const row = await ctx.api.get<Workspace>(`/api/workspaces/${workspaceId}`);
          printOutput(row, { json: ctx.json, format: ctx.format });
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );

  // workspace use <workspaceId>
  addCommonClientOptions(
    workspace
      .command("use")
      .description("Set active workspace (updates context profile companyId)")
      .argument("<workspaceId>", "Workspace ID")
      .action(async (workspaceId: string, opts: WorkspaceUseOptions) => {
        try {
          const ctx = resolveCommandContext(opts);

          // Verify the workspace exists
          const ws = await ctx.api.get<Workspace>(`/api/workspaces/${workspaceId}`);
          if (!ws) {
            throw new Error(`Workspace not found: ${workspaceId}`);
          }

          // Update the context profile's companyId
          const profileName = opts.profile?.trim() || ctx.profileName;
          upsertProfile(profileName, { companyId: ws.id }, opts.context);

          if (ctx.json) {
            printOutput(
              {
                profile: profileName,
                workspaceId: ws.id,
                workspaceName: ws.name,
                workspaceSlug: ws.slug,
              },
              { json: true },
            );
            return;
          }

          console.log(
            pc.green(
              `Active workspace set to '${ws.name}' (${ws.slug}) for profile '${profileName}'.`,
            ),
          );
          console.log(pc.dim(`  id: ${ws.id}`));
          console.log(pc.dim(`  Run 'doerai context show' to verify.`));
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );

  // workspace create
  addCommonClientOptions(
    workspace
      .command("create")
      .description("Create a new workspace")
      .requiredOption("--name <name>", "Workspace name")
      .option("--slug <slug>", "Workspace slug (uppercase letters/numbers, max 10 chars)")
      .option("--description <text>", "Workspace description")
      .action(async (opts: WorkspaceCreateOptions) => {
        try {
          const ctx = resolveCommandContext(opts);
          const payload: Record<string, unknown> = { name: opts.name };
          if (opts.slug) payload.slug = opts.slug;
          if (opts.description !== undefined) payload.description = opts.description;

          const created = await ctx.api.post<Workspace>("/api/workspaces", payload);
          printOutput(created, { json: ctx.json, format: ctx.format });
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );
}
