import { existsSync, readFileSync } from "node:fs";
import { resolvePaperclipConfigPath, resolvePaperclipEnvPath } from "./paths.js";
import type { DeploymentExposure, DeploymentMode } from "@doerai/shared";

import { parse as parseEnvFileContents } from "dotenv";

type UiMode = "none" | "static" | "vite-dev";

type ExternalPostgresInfo = {
  mode: "external-postgres";
  connectionString: string;
};

type EmbeddedPostgresInfo = {
  mode: "embedded-postgres";
  dataDir: string;
  port: number;
};

type StartupBannerOptions = {
  host: string;
  deploymentMode: DeploymentMode;
  deploymentExposure: DeploymentExposure;
  authReady: boolean;
  requestedPort: number;
  listenPort: number;
  uiMode: UiMode;
  db: ExternalPostgresInfo | EmbeddedPostgresInfo;
  migrationSummary: string;
  heartbeatSchedulerEnabled: boolean;
  heartbeatSchedulerIntervalMs: number;
  databaseBackupEnabled: boolean;
  databaseBackupIntervalMinutes: number;
  databaseBackupRetentionDays: number;
  databaseBackupDir: string;
};

const ansi = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
  brightGreen: "\x1b[92m",
  brightCyan: "\x1b[96m",
  brightBlue: "\x1b[94m",
};

function color(text: string, c: keyof typeof ansi): string {
  return `${ansi[c]}${text}${ansi.reset}`;
}

// ── DOER art: green D, cyan gear-O, blue "er" (brand gradient) ──────────────

const ART_D = [
  "██████╗ ",
  "██╔══██╗",
  "██║  ██║",
  "██║  ██║",
  "██████╔╝",
  "╚═════╝ ",
] as const;

const ART_ER = [
  "███████╗██████╗ ",
  "██╔════╝██╔══██╗",
  "█████╗  ██████╔╝",
  "██╔══╝  ██╔══██╗",
  "███████╗██║  ██║",
  "╚══════╝╚═╝  ╚═╝",
] as const;

function artO(hub: string): string[] {
  return [
    " ██████╗ ",
    "██╔═══██╗",
    `██║ ${hub} ██║`,
    "██║   ██║",
    "╚██████╔╝",
    " ╚═════╝ ",
  ];
}

// The gear hub spins through these as the banner boots up.
const GEAR_SPIN = ["─", "\\", "│", "/"] as const;
const GEAR_HUB_RESTING = "¤";

/**
 * Build the 6-line DOER art. `pulse` lights one letter group bright
 * (0 = D, 1 = O, 2 = ER) for the Daft Punk chase; -1 = steady state.
 */
function buildArt(hub: string, pulse: number): string[] {
  const dColor = pulse === 0 ? "brightGreen" : "green";
  const oColor = pulse === 1 ? "brightCyan" : "cyan";
  const erColor = pulse === 2 ? "brightBlue" : "blue";
  const o = artO(hub);
  return ART_D.map(
    (d, i) => color(d, dColor) + color(o[i] ?? "", oColor) + color(ART_ER[i] ?? "", erColor),
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Spin the gear: redraw the art in place while the hub rotates and a
 * bright pulse chases across the letters. Leaves the cursor back at the
 * top of the art block so the final static art prints over the last frame.
 */
async function animateBanner(): Promise<void> {
  const out = process.stdout;
  const totalFrames = 16;
  const frameMs = 70;
  out.write("\x1b[?25l"); // hide cursor
  try {
    for (let frame = 0; frame < totalFrames; frame++) {
      const hub = GEAR_SPIN[frame % GEAR_SPIN.length] ?? GEAR_HUB_RESTING;
      const art = buildArt(hub, frame % 4);
      out.write(`${art.join("\n")}\n`);
      await sleep(frameMs);
      out.write(`\x1b[${art.length}A`); // cursor back to top of art
    }
  } finally {
    out.write("\x1b[?25h"); // show cursor
  }
}

function row(label: string, value: string): string {
  return `${color(label.padEnd(16), "dim")} ${value}`;
}

function redactConnectionString(raw: string): string {
  try {
    const u = new URL(raw);
    const user = u.username || "user";
    const auth = `${user}:***@`;
    return `${u.protocol}//${auth}${u.host}${u.pathname}`;
  } catch {
    return "<invalid DATABASE_URL>";
  }
}

function resolveAgentJwtSecretStatus(
  envFilePath: string,
): {
  status: "pass" | "warn";
  message: string;
} {
  const envValue = process.env.DOER_AGENT_JWT_SECRET?.trim();
  if (envValue) {
    return {
      status: "pass",
      message: "set",
    };
  }

  if (existsSync(envFilePath)) {
    const parsed = parseEnvFileContents(readFileSync(envFilePath, "utf-8"));
    const fileValue = typeof parsed.DOER_AGENT_JWT_SECRET === "string" ? parsed.DOER_AGENT_JWT_SECRET.trim() : "";
    if (fileValue) {
      return {
        status: "warn",
        message: `found in ${envFilePath} but not loaded`,
      };
    }
  }

  return {
    status: "warn",
    message: "missing (run `pnpm doerai onboard`)",
  };
}

export async function printStartupBanner(opts: StartupBannerOptions): Promise<void> {
  const baseHost = opts.host === "0.0.0.0" ? "localhost" : opts.host;
  const baseUrl = `http://${baseHost}:${opts.listenPort}`;
  const apiUrl = `${baseUrl}/api`;
  const uiUrl = opts.uiMode === "none" ? "disabled" : baseUrl;
  const configPath = resolvePaperclipConfigPath();
  const envFilePath = resolvePaperclipEnvPath();
  const agentJwtSecret = resolveAgentJwtSecretStatus(envFilePath);

  const dbMode =
    opts.db.mode === "embedded-postgres"
      ? color("embedded-postgres", "green")
      : color("external-postgres", "yellow");
  const uiMode =
    opts.uiMode === "vite-dev"
      ? color("vite-dev-middleware", "cyan")
      : opts.uiMode === "static"
        ? color("static-ui", "magenta")
        : color("headless-api", "yellow");

  const portValue =
    opts.requestedPort === opts.listenPort
      ? `${opts.listenPort}`
      : `${opts.listenPort} ${color(`(requested ${opts.requestedPort})`, "dim")}`;

  const dbDetails =
    opts.db.mode === "embedded-postgres"
      ? `${opts.db.dataDir} ${color(`(pg:${opts.db.port})`, "dim")}`
      : redactConnectionString(opts.db.connectionString);

  const heartbeat = opts.heartbeatSchedulerEnabled
    ? `enabled ${color(`(${opts.heartbeatSchedulerIntervalMs}ms)`, "dim")}`
    : color("disabled", "yellow");
  const dbBackup = opts.databaseBackupEnabled
    ? `enabled ${color(`(every ${opts.databaseBackupIntervalMinutes}m, keep ${opts.databaseBackupRetentionDays}d)`, "dim")}`
    : color("disabled", "yellow");

  // Spin the gear on real terminals; CI/pipes/opt-out get the static banner.
  const animate = process.stdout.isTTY === true && process.env.DOER_BANNER !== "static";
  console.log("");
  if (animate) {
    await animateBanner();
  }

  const art = buildArt(GEAR_HUB_RESTING, -1);

  const tagline =
    "  " +
    [
      color("Harder", "brightGreen"),
      color("Better", "brightCyan"),
      color("Faster", "brightBlue"),
      color("Stronger", "magenta"),
    ].join(color(" · ", "dim"));

  const lines = [
    ...art,
    tagline,
    color("  ───────────────────────────────────────────────────────", "blue"),
    row("Mode", `${dbMode}  |  ${uiMode}`),
    row("Deploy", `${opts.deploymentMode} (${opts.deploymentExposure})`),
    row("Auth", opts.authReady ? color("ready", "green") : color("not-ready", "yellow")),
    row("Server", portValue),
    row("API", `${apiUrl} ${color(`(health: ${apiUrl}/health)`, "dim")}`),
    row("UI", uiUrl),
    row("Database", dbDetails),
    row("Migrations", opts.migrationSummary),
    row(
      "Agent JWT",
      agentJwtSecret.status === "pass"
        ? color(agentJwtSecret.message, "green")
        : color(agentJwtSecret.message, "yellow"),
    ),
    row("Heartbeat", heartbeat),
    row("DB Backup", dbBackup),
    row("Backup Dir", opts.databaseBackupDir),
    row("Config", configPath),
    agentJwtSecret.status === "warn"
      ? color("  ───────────────────────────────────────────────────────", "yellow")
      : null,
    color("  ───────────────────────────────────────────────────────", "blue"),
    "",
  ];

  console.log(lines.filter((line): line is string => line !== null).join("\n"));
}
