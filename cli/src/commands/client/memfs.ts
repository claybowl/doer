import { Command } from "commander";
import type {
  MemfsBindingDTO,
  MemfsPermission,
  MemfsRootDTO,
  MemfsRootKind,
  MemfsStrategy,
} from "@paperclipai/shared";
import {
  addCommonClientOptions,
  formatInlineRecord,
  handleCommandError,
  printOutput,
  resolveCommandContext,
  type BaseClientOptions,
} from "./common.js";

interface RootAddOptions extends BaseClientOptions {
  label?: string;
  kind?: string;
}

interface BindOptions extends BaseClientOptions {
  agentId: string;
  rootId: string;
  pathPrefix: string;
  strategy?: string;
  permission?: string;
  mountAs?: string;
  label?: string;
}

interface BindingsListOptions extends BaseClientOptions {
  agentId?: string;
}

const VALID_ROOT_KINDS: readonly MemfsRootKind[] = ["local-fs", "mcp", "git-hosted"];
const VALID_STRATEGIES: readonly MemfsStrategy[] = [
  "native-letta",
  "fs-mount",
  "mcp-server",
  "tool-callable",
  "system-prompt-inject",
  "none",
];
const VALID_PERMISSIONS: readonly MemfsPermission[] = ["read", "read-write"];

function validateEnum<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  label: string,
): T | undefined {
  if (value === undefined) return undefined;
  if (!(allowed as readonly string[]).includes(value)) {
    throw new Error(
      `Invalid ${label}: "${value}". Expected one of: ${allowed.join(", ")}`,
    );
  }
  return value as T;
}

export function registerMemfsCommands(program: Command): void {
  const memfs = program.command("memfs").description("Memory filesystem (memfs) roots and bindings");

  // ---- roots ----
  const roots = memfs.command("roots").description("Manage company-level memfs roots");

  addCommonClientOptions(
    roots
      .command("list")
      .description("List memory roots for the company")
      .action(async (opts: BaseClientOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const rows =
            (await ctx.api.get<MemfsRootDTO[]>(
              `/api/companies/${ctx.companyId}/memfs/roots`,
            )) ?? [];
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
                label: row.label,
                kind: row.kind,
                rootPath: row.rootPath,
              }),
            );
          }
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: true },
  );

  addCommonClientOptions(
    roots
      .command("add")
      .description("Add a memory root for the company")
      .argument("<rootPath>", "Filesystem path or URI to expose as a root")
      .option("--label <label>", "Human-readable label for the root", "letta")
      .option(
        "--kind <kind>",
        `Root kind (one of: ${VALID_ROOT_KINDS.join(", ")})`,
        "local-fs",
      )
      .action(async (rootPath: string, opts: RootAddOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const kind =
            validateEnum(opts.kind, VALID_ROOT_KINDS, "kind") ?? "local-fs";
          const body = {
            rootPath,
            label: opts.label ?? "letta",
            kind,
          };
          const row = await ctx.api.post<MemfsRootDTO>(
            `/api/companies/${ctx.companyId}/memfs/roots`,
            body,
          );
          printOutput(row, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: true },
  );

  addCommonClientOptions(
    roots
      .command("remove")
      .description("Remove a memory root by id")
      .argument("<rootId>", "Memory root id")
      .action(async (rootId: string, opts: BaseClientOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          await ctx.api.delete<void>(
            `/api/companies/${ctx.companyId}/memfs/roots/${rootId}`,
          );
          printOutput({ ok: true, id: rootId }, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: true },
  );

  // ---- bindings ----
  const bindings = memfs.command("bindings").description("Manage agent memfs bindings");

  addCommonClientOptions(
    bindings
      .command("list")
      .description("List bindings for the company (or an agent)")
      .option("-a, --agent-id <id>", "Restrict to a single agent")
      .action(async (opts: BindingsListOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const path = opts.agentId
            ? `/api/companies/${ctx.companyId}/agents/${opts.agentId}/memfs/bindings`
            : `/api/companies/${ctx.companyId}/memfs/bindings`;
          const rows = (await ctx.api.get<MemfsBindingDTO[]>(path)) ?? [];
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
                agentId: row.agentId,
                rootId: row.rootId,
                pathPrefix: row.pathPrefix,
                strategy: row.strategy,
                permission: row.permission,
                mountAs: row.mountAs ?? "-",
                label: row.label ?? "-",
              }),
            );
          }
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: true },
  );

  addCommonClientOptions(
    bindings
      .command("bind")
      .description("Create a binding between an agent and a memory root")
      .requiredOption("-a, --agent-id <id>", "Agent id")
      .requiredOption("-r, --root-id <id>", "Memory root id")
      .requiredOption("-p, --path-prefix <path>", "Relative path prefix under the root")
      .option(
        "--strategy <strategy>",
        `Strategy (one of: ${VALID_STRATEGIES.join(", ")})`,
        "fs-mount",
      )
      .option(
        "--permission <permission>",
        `Permission (one of: ${VALID_PERMISSIONS.join(", ")})`,
        "read",
      )
      .option("--mount-as <path>", "Override mount path inside run cwd")
      .option("--label <label>", "Label for the binding")
      .action(async (opts: BindOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const strategy =
            validateEnum(opts.strategy, VALID_STRATEGIES, "strategy") ?? "fs-mount";
          const permission =
            validateEnum(opts.permission, VALID_PERMISSIONS, "permission") ?? "read";
          const body = {
            agentId: opts.agentId,
            rootId: opts.rootId,
            pathPrefix: opts.pathPrefix,
            strategy,
            permission,
            mountAs: opts.mountAs ?? null,
            label: opts.label ?? null,
          };
          const row = await ctx.api.post<MemfsBindingDTO>(
            `/api/companies/${ctx.companyId}/memfs/bindings`,
            body,
          );
          printOutput(row, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: true },
  );

  addCommonClientOptions(
    bindings
      .command("unbind")
      .description("Remove a binding by id")
      .argument("<bindingId>", "Binding id")
      .action(async (bindingId: string, opts: BaseClientOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          await ctx.api.delete<void>(
            `/api/companies/${ctx.companyId}/memfs/bindings/${bindingId}`,
          );
          printOutput({ ok: true, id: bindingId }, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: true },
  );
}
