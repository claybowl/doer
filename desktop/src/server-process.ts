import { type ChildProcess, spawn } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import type { WriteStream } from "node:fs";
import path from "node:path";

const SERVER_LISTENING_PATTERN = /Server listening on \S+:(\d+)/;
const READY_TIMEOUT_MS = 90_000;

export type ServerHandle = {
	port: number;
	url: string;
	child: ChildProcess;
};

type SpawnTarget = {
	command: string;
	args: string[];
	cwd: string;
	extraEnv: Record<string, string>;
};

/**
 * Resolves what to spawn based on whether we're in dev or packaged mode.
 * - Dev: spawn `pnpm dev` from the monorepo's server/ source.
 * - Packaged: spawn the bundled server with Electron's bundled Node
 *   (ELECTRON_RUN_AS_NODE=1 → process.execPath behaves as plain Node).
 */
function resolveSpawnTarget(opts: { isPackaged: boolean; resourcesPath: string; execPath: string }): SpawnTarget {
	if (opts.isPackaged) {
		const serverDir = path.join(opts.resourcesPath, "server");
		const entry = path.join(serverDir, "dist", "index.js");
		if (!existsSync(entry)) {
			// On Windows, check if the whole server dir is missing (bad Squirrel install)
			const serverDirExists = existsSync(serverDir);
			const distDir = path.join(serverDir, "dist");
			const distExists = serverDirExists && existsSync(distDir);
			const msg = [
				`Bundled server entry not found at ${entry}`,
				`  serverDir exists: ${serverDirExists}`,
				`  dist/ exists: ${distExists}`,
				serverDirExists && distExists
					? `  Files in dist/: ${tryListDir(distDir)}`
					: "",
				process.platform === "win32"
					? "  HINT: This can happen when the Squirrel installer is blocked by antivirus. Try reinstalling with Defender temporarily disabled."
					: "",
			].filter(Boolean).join("\n");
			throw new Error(msg);
		}
		return {
			command: opts.execPath,
			args: [entry],
			cwd: serverDir,
			extraEnv: { ELECTRON_RUN_AS_NODE: "1" },
		};
	}

	// Dev: walk up from __dirname looking for sibling server/ dir
	let serverDir = "";
	let dir = __dirname;
	for (let i = 0; i < 6; i++) {
		const candidate = path.join(dir, "../server");
		try {
			statSync(candidate);
			serverDir = path.resolve(candidate);
			break;
		} catch {
			dir = path.dirname(dir);
		}
	}
	if (!serverDir) throw new Error(`Could not locate server/ from ${__dirname}`);
	const pnpmBin = process.env.PNPM_BIN ?? "/opt/homebrew/bin/pnpm";
	return {
		command: pnpmBin,
		args: ["dev"],
		cwd: serverDir,
		extraEnv: {},
	};
}

function tryListDir(dirPath: string): string {
	try {
		const { readdirSync } = require("node:fs") as typeof import("node:fs");
		return readdirSync(dirPath).slice(0, 10).join(", ");
	} catch {
		return "(unable to list)";
	}
}

export type StartOptions = {
	isPackaged: boolean;
	resourcesPath: string;
	execPath: string;
	userDataPath: string;
	logStream?: WriteStream | null;
};

/**
 * A richer error that also carries any stderr the server emitted before dying,
 * so the UI can show it to the user.
 */
class ServerStartError extends Error {
	stderr = "";
	constructor(message: string, stderr?: string) {
		super(message);
		this.name = "ServerStartError";
		if (stderr) this.stderr = stderr;
	}
}

function log(msg: string, stream?: WriteStream | null): void {
	console.log(msg);
	try { stream?.write(`${msg}\n`); } catch { /* best effort */ }
}

export function startServer(options: StartOptions): Promise<ServerHandle> {
	const target = resolveSpawnTarget(options);
	log(`[main] spawn target: ${target.command} ${target.args.join(" ")} (cwd=${target.cwd})`, options.logStream);
	log(`[main] platform=${process.platform} arch=${process.arch} packaged=${options.isPackaged}`, options.logStream);

	const child = spawn(target.command, target.args, {
		cwd: target.cwd,
		env: {
			...process.env,
			FORCE_COLOR: "0",
			DOER_UI_DEV_MIDDLEWARE: options.isPackaged ? "false" : "true",
			SERVE_UI: "true",
			// Keep all writable state under the OS-blessed userData dir.
			// In dev this still points to ~/.doer (server's own default).
			...(options.isPackaged ? { DOER_HOME: options.userDataPath } : {}),
			...target.extraEnv,
		},
		stdio: ["ignore", "pipe", "pipe"],
		// On Windows, detach from the parent console so the server doesn't
		// inherit a hidden console window that blocks the app from quitting.
		...(process.platform === "win32" ? { windowsHide: true } : {}),
	});

	// Collect stderr so we can surface it on failure
	let stderrBuf = "";

	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			child.kill("SIGTERM");
			const msg = `Server did not become ready within ${READY_TIMEOUT_MS / 1000}s`;
			log(`[main] ${msg}`, options.logStream);
			if (stderrBuf) log(`[main] Server stderr before timeout:\n${stderrBuf}`, options.logStream);
			reject(new ServerStartError(msg, stderrBuf));
		}, READY_TIMEOUT_MS);

		child.on("error", (err) => {
			clearTimeout(timer);
			const msg = `Failed to spawn server process: ${err.message}`;
			log(`[main] ${msg}`, options.logStream);
			if (process.platform === "win32") {
				const hints = [
					"",
					"Common Windows causes:",
					"  - Missing VC++ Redistributable (download 'Visual C++ Redistributable 2015-2022 x64')",
					"  - Antivirus blocked the server process (add Doer to exclusions)",
					"  - Corrupted install (reinstall with antivirus temporarily disabled)",
				].join("\n");
				reject(new ServerStartError(msg + hints, stderrBuf));
			} else {
				reject(new ServerStartError(msg, stderrBuf));
			}
		});

		const onLine = (chunk: Buffer) => {
			const text = chunk.toString();
			process.stdout.write(`[server] ${text}`);
			try { options.logStream?.write(`[server] ${text}`); } catch { /* best effort */ }
			const match = text.match(SERVER_LISTENING_PATTERN);
			if (match) {
				clearTimeout(timer);
				const port = Number.parseInt(match[1], 10);
				resolve({ port, url: `http://127.0.0.1:${port}`, child });
			}
		};
		child.stdout?.on("data", onLine);

		child.stderr?.on("data", (chunk: Buffer) => {
			const text = chunk.toString();
			stderrBuf += text;
			process.stderr.write(`[server] ${text}`);
			try { options.logStream?.write(`[server:err] ${text}`); } catch { /* best effort */ }
		});

		child.on("exit", (code, signal) => {
			clearTimeout(timer);
			const msg = `Server exited before ready (code=${code}, signal=${signal})`;
			log(`[main] ${msg}`, options.logStream);
			if (stderrBuf) log(`[main] Server stderr:\n${stderrBuf}`, options.logStream);

			// On Windows, exit code 3221225781 (0xC0000135, STATUS_DLL_NOT_FOUND) means a
			// required DLL is missing — almost always the VC++ runtime.
			if (process.platform === "win32" && code === 3221225781) {
				const hint = [
					"",
					"Exit code 0xC0000135 (STATUS_DLL_NOT_FOUND) means a required DLL is missing.",
					"This is almost always the Visual C++ Redistributable.",
					"winget install Microsoft.VCRedist.2015.x64",
					"or download: https://aka.ms/vs/17/release/vc_redist.x64.exe",
					"Install it, then relaunch Doer.",
				].join("\n");
				reject(new ServerStartError(msg + hint, stderrBuf));
			} else {
				reject(new ServerStartError(msg, stderrBuf));
			}
		});
	});
}

export function stopServer(handle: ServerHandle | null): void {
	if (!handle) return;
	if (handle.child.killed) return;
	handle.child.kill("SIGTERM");
}
