import { Command } from "commander";
import { describe, expect, it } from "vitest";
import { registerWorkspaceCommands } from "../commands/client/workspace.js";

describe("registerWorkspaceCommands", () => {
  it("registers workspace subcommands without errors", () => {
    const program = new Command();
    expect(() => registerWorkspaceCommands(program)).not.toThrow();

    const workspace = program.commands.find((cmd) => cmd.name() === "workspace");
    expect(workspace).toBeDefined();

    const subcommands = workspace!.commands.map((cmd) => cmd.name());
    expect(subcommands).toContain("ls");
    expect(subcommands).toContain("list");
    expect(subcommands).toContain("get");
    expect(subcommands).toContain("use");
    expect(subcommands).toContain("create");
  });

  it("workspace use takes a workspaceId argument", () => {
    const program = new Command();
    registerWorkspaceCommands(program);
    const workspace = program.commands.find((cmd) => cmd.name() === "workspace")!;
    const use = workspace.commands.find((cmd) => cmd.name() === "use")!;
    expect(use._args).toHaveLength(1);
    expect(use._args[0].name()).toBe("workspaceId");
  });

  it("workspace create has required --name option", () => {
    const program = new Command();
    registerWorkspaceCommands(program);
    const workspace = program.commands.find((cmd) => cmd.name() === "workspace")!;
    const create = workspace.commands.find((cmd) => cmd.name() === "create")!;
    expect(create.options.filter((opt) => opt.long === "--name")).toHaveLength(1);
  });

  it("workspace ls and list are both registered (alias)", () => {
    const program = new Command();
    registerWorkspaceCommands(program);
    const workspace = program.commands.find((cmd) => cmd.name() === "workspace")!;
    const ls = workspace.commands.find((cmd) => cmd.name() === "ls");
    const list = workspace.commands.find((cmd) => cmd.name() === "list");
    expect(ls).toBeDefined();
    expect(list).toBeDefined();
  });

  it("all workspace commands support --format option", () => {
    const program = new Command();
    registerWorkspaceCommands(program);
    const workspace = program.commands.find((cmd) => cmd.name() === "workspace")!;
    for (const cmd of workspace.commands) {
      if (cmd.name() === "help") continue;
      const formatOpts = cmd.options.filter((opt) => opt.long === "--format");
      expect(formatOpts).toHaveLength(1);
    }
  });
});
