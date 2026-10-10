import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Locate the Letta CLI that the Agent SDK will actually run.
 *
 * The SDK resolves its sibling `@letta-ai/letta-code` package by relative path
 * (see its `../../@letta-ai/letta-code/letta.js` fallbacks) and does NOT depend on
 * `PATH`. A bare `execFile("letta")` here therefore reports the CLI missing on a
 * perfectly working packaged install, and tells users to install Letta Code when
 * Doer already bundles it.
 *
 * Mirroring the SDK's own resolution keeps the environment check honest: bundled
 * first, PATH only as a fallback for users who installed Letta separately.
 */
function resolveBundledLettaCli(): string | null {
  try {
    const require = createRequire(import.meta.url);
    const sdkEntry = require.resolve("@letta-ai/letta-agent-sdk");
    // Resolve from the SDK's own location so pnpm's nested layout is followed.
    // `@letta-ai/letta-code`'s main entry IS letta.js, so resolving the package
    // yields the executable directly (a "./letta.js" subpath is not in exports).
    const sdkRequire = createRequire(sdkEntry);
    return sdkRequire.resolve("@letta-ai/letta-code");
  } catch {
    return null;
  }
}

async function readCliVersion(entry: string): Promise<string | null> {
  try {
    // ELECTRON_RUN_AS_NODE makes an Electron binary behave as plain node, which is
    // how Doer's bundled letta.js is meant to be executed inside the desktop app.
    const { stdout, stderr } = await execFileAsync(process.execPath, [entry, "--version"], {
      timeout: 5_000,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
    });
    return parseLettaCliVersion(`${stdout}\n${stderr}`);
  } catch {
    return null;
  }
}

export interface LettaModDiagnostic {
  name: string;
  status: "loaded" | "failed" | "unknown";
  version?: string;
  error?: string;
}

export interface LettaModInventory {
  mods: LettaModDiagnostic[];
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function parseLettaCliVersion(output: string): string | null {
  return output.match(/(?:^|\s|v)(\d+\.\d+\.\d+(?:[-+][\w.-]+)?)(?:\s|$)/)?.[1] ?? null;
}

export function parseModDiagnostics(text: string): LettaModInventory {
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return { mods: [] }; }
  const root = record(parsed);
  const mods: LettaModDiagnostic[] = [];

  const append = (value: unknown, fallbackStatus: LettaModDiagnostic["status"]) => {
    if (!Array.isArray(value)) return;
    for (const entry of value) {
      if (typeof entry === "string") {
        mods.push({ name: entry, status: fallbackStatus });
        continue;
      }
      const item = record(entry);
      const name = stringValue(item.name) ?? stringValue(item.id) ?? stringValue(item.path);
      if (!name) continue;
      const rawStatus = stringValue(item.status);
      const status = rawStatus === "loaded" || rawStatus === "failed" ? rawStatus : fallbackStatus;
      mods.push({
        name,
        status,
        ...(stringValue(item.version) ? { version: stringValue(item.version) } : {}),
        ...(stringValue(item.error) ? { error: stringValue(item.error) } : {}),
      });
    }
  };

  append(root.mods, "unknown");
  append(root.loaded, "loaded");
  append(root.failed, "failed");
  return { mods };
}

export async function discoverLettaCliVersion(): Promise<string | null> {
  // Bundled first — this is what the SDK will actually execute.
  const bundled = resolveBundledLettaCli();
  if (bundled) {
    const version = await readCliVersion(bundled);
    if (version) return version;
  }
  // Fall back to PATH for users who installed Letta Code separately.
  try {
    const { stdout, stderr } = await execFileAsync("letta", ["--version"], { timeout: 5_000 });
    return parseLettaCliVersion(`${stdout}\n${stderr}`);
  } catch {
    return null;
  }
}

export async function readLettaModDiagnostics(home = homedir()): Promise<LettaModInventory | null> {
  try {
    const contents = await readFile(path.join(home, ".letta", "mods", "diagnostics", "latest.json"), "utf8");
    return parseModDiagnostics(contents);
  } catch {
    return null;
  }
}
