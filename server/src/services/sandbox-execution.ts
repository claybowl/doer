import { randomUUID } from "node:crypto";
import type { Db } from "@doerai/db";
import { heartbeatRuns } from "@doerai/db";
import { eq } from "drizzle-orm";
import { logger } from "../middleware/logger.js";

// --- Types ---

export type SandboxToolName = "bash_command" | "read_file" | "write_file" | "list_dir";

export interface SandboxToolCall {
  tool: SandboxToolName;
  params: Record<string, unknown>;
}

export interface SandboxToolResult {
  tool: SandboxToolName;
  stdout: string;
  stderr: string;
  exitCode: number;
  error?: string;
}

export interface SandboxRunOptions {
  agentId: string;
  companyId: string;
  command?: string;
  toolCalls?: SandboxToolCall[];
  env?: Record<string, string>;
  cwd?: string;
  timeoutSec?: number;
  memoryMb?: number;
}

export interface SandboxRunRecord {
  id: string;
  agentId: string;
  companyId: string;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  startedAt: Date | null;
  finishedAt: Date | null;
  toolResults: SandboxToolResult[];
  stdout: string;
  stderr: string;
  exitCode: number | null;
  error: string | null;
}

// --- Resource limits ---

const DEFAULT_TIMEOUT_SEC = 60;
const MAX_TIMEOUT_SEC = 300;
const DEFAULT_MEMORY_MB = 512;
const MAX_OUTPUT_BYTES = 64 * 1024; // 64 KB per stream
const APPROVED_TOOLS = new Set<SandboxToolName>(["bash_command", "read_file", "write_file", "list_dir"]);

// In-memory registry of active sandboxes for cancellation
const activeSandboxes = new Map<string, { kill: () => Promise<void> }>();

// --- Tool validation ---

function validateToolCall(call: SandboxToolCall): string | null {
  if (!APPROVED_TOOLS.has(call.tool)) {
    return `Tool "${call.tool}" is not in the approved tool list`;
  }
  if (call.tool === "bash_command" && typeof call.params.command !== "string") {
    return "bash_command requires params.command (string)";
  }
  if ((call.tool === "read_file" || call.tool === "write_file") && typeof call.params.path !== "string") {
    return `${call.tool} requires params.path (string)`;
  }
  if (call.tool === "write_file" && typeof call.params.content !== "string") {
    return "write_file requires params.content (string)";
  }
  return null;
}

function truncateOutput(text: string, limitBytes: number): string {
  const buf = Buffer.from(text, "utf8");
  if (buf.length <= limitBytes) return text;
  const truncated = buf.subarray(0, limitBytes).toString("utf8");
  return truncated + `\n[output truncated — ${buf.length - limitBytes} bytes omitted]`;
}

// --- E2B sandbox wrapper ---

interface E2BSandboxHandle {
  runCommand(cmd: string, opts?: { timeout?: number; env?: Record<string, string> }): Promise<{ stdout: string; stderr: string; exitCode: number }>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  listDir(path: string): Promise<string[]>;
  kill(): Promise<void>;
}

async function createE2BSandbox(opts: {
  apiKey: string;
  timeoutSec: number;
  env?: Record<string, string>;
}): Promise<E2BSandboxHandle> {
  // Lazy import to avoid crash if e2b is not installed
  const { Sandbox } = await import("e2b") as { Sandbox: any };

  const sandbox = await Sandbox.create({
    apiKey: opts.apiKey,
    timeoutMs: opts.timeoutSec * 1000,
    envs: opts.env ?? {},
  });

  return {
    async runCommand(cmd, runOpts) {
      const result = await sandbox.commands.run(cmd, {
        timeoutMs: (runOpts?.timeout ?? opts.timeoutSec) * 1000,
        envs: runOpts?.env ?? {},
      });
      return {
        stdout: truncateOutput(result.stdout ?? "", MAX_OUTPUT_BYTES),
        stderr: truncateOutput(result.stderr ?? "", MAX_OUTPUT_BYTES),
        exitCode: result.exitCode ?? 0,
      };
    },
    async readFile(path) {
      const content = await sandbox.files.read(path);
      return truncateOutput(content ?? "", MAX_OUTPUT_BYTES);
    },
    async writeFile(path, content) {
      await sandbox.files.write(path, content);
    },
    async listDir(path) {
      const entries = await sandbox.files.list(path);
      return (entries ?? []).map((e: { name: string }) => e.name);
    },
    async kill() {
      await sandbox.kill().catch(() => {});
    },
  };
}

// --- Execution engine ---

async function executeTool(
  sandbox: E2BSandboxHandle,
  call: SandboxToolCall,
  cwd: string,
): Promise<SandboxToolResult> {
  const base: Pick<SandboxToolResult, "tool"> = { tool: call.tool };
  try {
    if (call.tool === "bash_command") {
      const cmd = cwd ? `cd ${JSON.stringify(cwd)} && ${call.params.command as string}` : (call.params.command as string);
      const r = await sandbox.runCommand(cmd);
      return { ...base, stdout: r.stdout, stderr: r.stderr, exitCode: r.exitCode };
    }
    if (call.tool === "read_file") {
      const content = await sandbox.readFile(call.params.path as string);
      return { ...base, stdout: content, stderr: "", exitCode: 0 };
    }
    if (call.tool === "write_file") {
      await sandbox.writeFile(call.params.path as string, call.params.content as string);
      return { ...base, stdout: "OK", stderr: "", exitCode: 0 };
    }
    if (call.tool === "list_dir") {
      const targetPath = (call.params.path as string | undefined) ?? cwd ?? ".";
      const entries = await sandbox.listDir(targetPath);
      return { ...base, stdout: entries.join("\n"), stderr: "", exitCode: 0 };
    }
    return { ...base, stdout: "", stderr: `Unknown tool: ${call.tool}`, exitCode: 1, error: "unknown_tool" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ...base, stdout: "", stderr: msg, exitCode: 1, error: "tool_error" };
  }
}

// --- Public API ---

export function sandboxExecutionService(db: Db) {
  async function startRun(opts: SandboxRunOptions): Promise<string> {
    const apiKey = process.env.E2B_API_KEY ?? "";
    if (!apiKey) {
      throw new Error("E2B_API_KEY is not configured — cannot create sandbox");
    }

    const timeoutSec = Math.min(opts.timeoutSec ?? DEFAULT_TIMEOUT_SEC, MAX_TIMEOUT_SEC);
    const runId = randomUUID();

    // Validate tool calls before creating the sandbox
    const toolCalls = opts.toolCalls ?? [];
    if (opts.command) {
      toolCalls.push({ tool: "bash_command", params: { command: opts.command } });
    }
    for (const call of toolCalls) {
      const err = validateToolCall(call);
      if (err) throw new Error(`Tool validation failed: ${err}`);
    }

    // Persist run record
    await db.insert(heartbeatRuns).values({
      id: runId,
      companyId: opts.companyId,
      agentId: opts.agentId,
      invocationSource: "e2b_sandbox",
      status: "queued",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Run async — do not await
    runSandbox(db, runId, opts, toolCalls, apiKey, timeoutSec).catch((err) => {
      logger.error({ runId, err }, "sandbox-execution: unhandled error");
    });

    return runId;
  }

  async function getRunStatus(runId: string): Promise<SandboxRunRecord | null> {
    const row = await db
      .select()
      .from(heartbeatRuns)
      .where(eq(heartbeatRuns.id, runId))
      .then((rows) => rows[0] ?? null);
    if (!row) return null;
    if (row.invocationSource !== "e2b_sandbox") return null;

    const resultJson = row.resultJson as Record<string, unknown> | null;
    return {
      id: row.id,
      agentId: row.agentId,
      companyId: row.companyId,
      status: row.status as SandboxRunRecord["status"],
      startedAt: row.startedAt ?? null,
      finishedAt: row.finishedAt ?? null,
      toolResults: (resultJson?.toolResults as SandboxToolResult[]) ?? [],
      stdout: row.stdoutExcerpt ?? "",
      stderr: row.stderrExcerpt ?? "",
      exitCode: row.exitCode ?? null,
      error: row.error ?? null,
    };
  }

  async function cancelRun(runId: string): Promise<boolean> {
    const handle = activeSandboxes.get(runId);
    if (!handle) return false;
    await handle.kill();
    activeSandboxes.delete(runId);
    await db
      .update(heartbeatRuns)
      .set({
        status: "failed",
        error: "Cancelled by request",
        errorCode: "cancelled",
        finishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(heartbeatRuns.id, runId));
    return true;
  }

  return { startRun, getRunStatus, cancelRun };
}

// --- Internal async sandbox runner ---

async function runSandbox(
  db: Db,
  runId: string,
  opts: SandboxRunOptions,
  toolCalls: SandboxToolCall[],
  apiKey: string,
  timeoutSec: number,
): Promise<void> {
  const startedAt = new Date();
  await db
    .update(heartbeatRuns)
    .set({ status: "running", startedAt, updatedAt: new Date() })
    .where(eq(heartbeatRuns.id, runId));

  let sandbox: E2BSandboxHandle | null = null;

  try {
    sandbox = await createE2BSandbox({
      apiKey,
      timeoutSec,
      env: opts.env,
    });

    activeSandboxes.set(runId, sandbox);

    const toolResults: SandboxToolResult[] = [];
    const cwd = opts.cwd ?? "/home/user";

    // If a cwd is specified, ensure it exists
    if (opts.cwd) {
      await sandbox.runCommand(`mkdir -p ${JSON.stringify(cwd)}`);
    }

    for (const call of toolCalls) {
      const result = await executeTool(sandbox, call, cwd);
      toolResults.push(result);
    }

    const stdoutAll = toolResults.map((r) => r.stdout).join("\n").trim();
    const stderrAll = toolResults.map((r) => r.stderr).join("\n").trim();
    const lastExitCode = toolResults.at(-1)?.exitCode ?? 0;
    const failed = toolResults.some((r) => r.exitCode !== 0);

    await db
      .update(heartbeatRuns)
      .set({
        status: failed ? "failed" : "succeeded",
        finishedAt: new Date(),
        exitCode: lastExitCode,
        stdoutExcerpt: truncateOutput(stdoutAll, 8 * 1024),
        stderrExcerpt: truncateOutput(stderrAll, 8 * 1024),
        resultJson: { toolResults },
        updatedAt: new Date(),
      })
      .where(eq(heartbeatRuns.id, runId));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ runId, err }, "sandbox-execution: run failed");
    await db
      .update(heartbeatRuns)
      .set({
        status: "failed",
        error: msg,
        finishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(heartbeatRuns.id, runId));
  } finally {
    activeSandboxes.delete(runId);
    if (sandbox) {
      await sandbox.kill().catch(() => {});
    }
  }
}
