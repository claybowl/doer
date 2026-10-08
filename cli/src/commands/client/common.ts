import pc from "picocolors";
import type { Command } from "commander";
import { getStoredBoardCredential, loginBoardCli } from "../../client/board-auth.js";
import { buildCliCommandLabel } from "../../client/command-label.js";
import { readConfig } from "../../config/store.js";
import { readContext, resolveProfile, type ClientContextProfile } from "../../client/context.js";
import { ApiRequestError, PaperclipApiClient } from "../../client/http.js";

export type OutputFormat = "json" | "table" | "text";

export interface BaseClientOptions {
  config?: string;
  dataDir?: string;
  context?: string;
  profile?: string;
  apiBase?: string;
  apiKey?: string;
  companyId?: string;
  json?: boolean;
  format?: string;
}

export interface ResolvedClientContext {
  api: PaperclipApiClient;
  companyId?: string;
  profileName: string;
  profile: ClientContextProfile;
  json: boolean;
  format: OutputFormat;
}

export function addCommonClientOptions(command: Command, opts?: { includeCompany?: boolean }): Command {
  command
    .option("-c, --config <path>", "Path to Doer config file")
    .option("-d, --data-dir <path>", "Doer data directory root (isolates state from ~/.doer)")
    .option("--context <path>", "Path to CLI context file")
    .option("--profile <name>", "CLI context profile name")
    .option("--api-base <url>", "Base URL for the Doer API")
    .option("--api-key <token>", "Bearer token for agent-authenticated calls")
    .option("--json", "Output raw JSON (shorthand for --format json)")
    .option("-f, --format <format>", "Output format: json, table, or text", "text");

  if (opts?.includeCompany) {
    command.option("-C, --company-id <id>", "Company ID (overrides context default)");
  }

  return command;
}

export function resolveCommandContext(
  options: BaseClientOptions,
  opts?: { requireCompany?: boolean },
): ResolvedClientContext {
  const context = readContext(options.context);
  const { name: profileName, profile } = resolveProfile(context, options.profile);

  const apiBase =
    options.apiBase?.trim() ||
    process.env.DOER_API_URL?.trim() ||
    profile.apiBase ||
    inferApiBaseFromConfig(options.config);

  const explicitApiKey =
    options.apiKey?.trim() ||
    process.env.DOER_API_KEY?.trim() ||
    readKeyFromProfileEnv(profile);
  const storedBoardCredential = explicitApiKey ? null : getStoredBoardCredential(apiBase);
  const apiKey = explicitApiKey || storedBoardCredential?.token;

  const companyId =
    options.companyId?.trim() ||
    process.env.DOER_COMPANY_ID?.trim() ||
    profile.companyId;

  if (opts?.requireCompany && !companyId) {
    throw new Error(
      "Company ID is required. Pass --company-id, set DOER_COMPANY_ID, or set context profile companyId via `doerai context set`.",
    );
  }

  const api = new PaperclipApiClient({
    apiBase,
    apiKey,
    recoverAuth: explicitApiKey || !canAttemptInteractiveBoardAuth()
      ? undefined
      : async ({ error }) => {
          const requestedAccess = error.message.includes("Instance admin required")
            ? "instance_admin_required"
            : "board";
          if (!shouldRecoverBoardAuth(error)) {
            return null;
          }
          const login = await loginBoardCli({
            apiBase,
            requestedAccess,
            requestedCompanyId: companyId ?? null,
            command: buildCliCommandLabel(),
          });
          return login.token;
        },
  });
  const format: OutputFormat = options.json
    ? "json"
    : (options.format as OutputFormat) || "text";

  return {
    api,
    companyId,
    profileName,
    profile,
    json: format === "json",
    format,
  };
}

function shouldRecoverBoardAuth(error: ApiRequestError): boolean {
  if (error.status === 401) return true;
  if (error.status !== 403) return false;
  return error.message.includes("Board access required") || error.message.includes("Instance admin required");
}

function canAttemptInteractiveBoardAuth(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

export function printOutput(
  data: unknown,
  opts: { json?: boolean; format?: OutputFormat; label?: string } = {},
): void {
  const fmt: OutputFormat = opts.json ? "json" : (opts.format ?? "text");

  if (fmt === "json") {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (opts.label) {
    console.log(pc.bold(opts.label));
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      console.log(pc.dim("(empty)"));
      return;
    }
    if (fmt === "table") {
      printTable(data);
      return;
    }
    for (const item of data) {
      if (typeof item === "object" && item !== null) {
        console.log(formatInlineRecord(item as Record<string, unknown>));
      } else {
        console.log(String(item));
      }
    }
    return;
  }

  if (typeof data === "object" && data !== null) {
    if (fmt === "table") {
      printTable([data]);
      return;
    }
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (data === undefined || data === null) {
    console.log(pc.dim("(null)"));
    return;
  }

  console.log(String(data));
}

/**
 * Print an array of records as a formatted table with column headers.
 */
function printTable(rows: unknown[]): void {
  if (rows.length === 0) {
    console.log(pc.dim("(empty)"));
    return;
  }

  // Collect all keys across all rows, preserving insertion order
  const keySet = new Set<string>();
  for (const row of rows) {
    if (typeof row === "object" && row !== null) {
      for (const key of Object.keys(row as Record<string, unknown>)) {
        keySet.add(key);
      }
    }
  }

  const keys = [...keySet];
  if (keys.length === 0) {
    for (const row of rows) console.log(String(row));
    return;
  }

  // Build column widths
  const widths: Record<string, number> = {};
  for (const key of keys) {
    widths[key] = key.length;
  }
  const cellTexts: string[][] = [];
  for (const row of rows) {
    const cells: string[] = [];
    const record = (typeof row === "object" && row !== null ? row : {}) as Record<string, unknown>;
    for (const key of keys) {
      const text = renderTableCell(record[key]);
      cells.push(text);
      if (text.length > widths[key]) widths[key] = text.length;
    }
    cellTexts.push(cells);
  }

  // Cap column widths to keep the table readable
  const MAX_COL_WIDTH = 40;
  for (const key of keys) {
    if (widths[key] > MAX_COL_WIDTH) widths[key] = MAX_COL_WIDTH;
  }

  // Print header
  const headerCells = keys.map((key) => pc.bold(padOrTruncate(key, widths[key])));
  console.log(headerCells.join("  "));
  console.log(keys.map((key) => pc.dim("-".repeat(widths[key]))).join("  "));

  // Print rows
  for (const cells of cellTexts) {
    const rowCells = cells.map((cell, i) => padOrTruncate(cell, widths[keys[i]]));
    console.log(rowCells.join("  "));
  }
}

function renderTableCell(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") {
    const compact = value.replace(/\s+/g, " ").trim();
    return compact.length > 40 ? `${compact.slice(0, 37)}...` : compact;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "[object]";
}

function padOrTruncate(text: string, width: number): string {
  if (text.length > width) return text.slice(0, width - 3) + "...";
  return text + " ".repeat(width - text.length);
}

export function formatInlineRecord(record: Record<string, unknown>): string {
  const keyOrder = ["identifier", "id", "name", "status", "priority", "title", "action"];
  const seen = new Set<string>();
  const parts: string[] = [];

  for (const key of keyOrder) {
    if (!(key in record)) continue;
    parts.push(`${key}=${renderValue(record[key])}`);
    seen.add(key);
  }

  for (const [key, value] of Object.entries(record)) {
    if (seen.has(key)) continue;
    if (typeof value === "object") continue;
    parts.push(`${key}=${renderValue(value)}`);
  }

  return parts.join(" ");
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") {
    const compact = value.replace(/\s+/g, " ").trim();
    return compact.length > 90 ? `${compact.slice(0, 87)}...` : compact;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "[object]";
}

function inferApiBaseFromConfig(configPath?: string): string {
  const envHost = process.env.DOER_SERVER_HOST?.trim() || "localhost";
  let port = Number(process.env.DOER_SERVER_PORT || "");

  if (!Number.isFinite(port) || port <= 0) {
    try {
      const config = readConfig(configPath);
      port = Number(config?.server?.port ?? 3100);
    } catch {
      port = 3100;
    }
  }

  if (!Number.isFinite(port) || port <= 0) {
    port = 3100;
  }

  return `http://${envHost}:${port}`;
}

function readKeyFromProfileEnv(profile: ClientContextProfile): string | undefined {
  if (!profile.apiKeyEnvVarName) return undefined;
  return process.env[profile.apiKeyEnvVarName]?.trim() || undefined;
}

export function handleCommandError(error: unknown): never {
  if (error instanceof ApiRequestError) {
    const detailSuffix = error.details !== undefined ? ` details=${JSON.stringify(error.details)}` : "";
    console.error(pc.red(`API error ${error.status}: ${error.message}${detailSuffix}`));
    process.exit(1);
  }

  const message = error instanceof Error ? error.message : String(error);
  console.error(pc.red(message));
  process.exit(1);
}
