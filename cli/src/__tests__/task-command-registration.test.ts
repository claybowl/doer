import { Command } from "commander";
import { describe, expect, it } from "vitest";
import { registerTaskCommands } from "../commands/client/task.js";
import { registerAgentCommands } from "../commands/client/agent.js";

describe("registerTaskCommands", () => {
  it("registers task subcommands without errors", () => {
    const program = new Command();
    expect(() => registerTaskCommands(program)).not.toThrow();

    const task = program.commands.find((cmd) => cmd.name() === "task");
    expect(task).toBeDefined();

    const subcommands = task!.commands.map((cmd) => cmd.name());
    expect(subcommands).toContain("ls");
    expect(subcommands).toContain("list");
    expect(subcommands).toContain("create");
    expect(subcommands).toContain("get");
    expect(subcommands).toContain("update");
    expect(subcommands).toContain("run");
    expect(subcommands).toContain("watch");
  });

  it("task create has required --title option", () => {
    const program = new Command();
    registerTaskCommands(program);
    const task = program.commands.find((cmd) => cmd.name() === "task")!;
    const create = task.commands.find((cmd) => cmd.name() === "create")!;
    expect(create.options.filter((opt) => opt.long === "--title")).toHaveLength(1);
  });

  it("task run has required --agent-id option", () => {
    const program = new Command();
    registerTaskCommands(program);
    const task = program.commands.find((cmd) => cmd.name() === "task")!;
    const run = task.commands.find((cmd) => cmd.name() === "run")!;
    expect(run.options.filter((opt) => opt.long === "--agent-id")).toHaveLength(1);
  });
});

describe("registerAgentCommands — create subcommand", () => {
  it("registers agent create subcommand", () => {
    const program = new Command();
    expect(() => registerAgentCommands(program)).not.toThrow();

    const agent = program.commands.find((cmd) => cmd.name() === "agent");
    expect(agent).toBeDefined();

    const create = agent!.commands.find((cmd) => cmd.name() === "create");
    expect(create).toBeDefined();
    expect(create!.options.filter((opt) => opt.long === "--name")).toHaveLength(1);
    expect(create!.options.filter((opt) => opt.long === "--role")).toHaveLength(1);
    expect(create!.options.filter((opt) => opt.long === "--adapter-type")).toHaveLength(1);
  });
});
