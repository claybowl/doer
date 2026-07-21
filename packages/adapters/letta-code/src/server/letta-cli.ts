import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

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
