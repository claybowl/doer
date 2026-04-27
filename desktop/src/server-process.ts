import { type ChildProcess, spawn } from "node:child_process";
import { existsSync, statSync } from "node:fs";
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
			throw new Error(`Bundled server entry not found at ${entry}`);
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

export type StartOptions = {
	isPackaged: boolean;
	resourcesPath: string;
	execPath: string;
	userDataPath: string;
};

export function startServer(options: StartOptions): Promise<ServerHandle> {
	const target = resolveSpawnTarget(options);
	console.log(`[main] spawn target: ${target.command} ${target.args.join(" ")} (cwd=${target.cwd})`);

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
	});

	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			child.kill("SIGTERM");
			reject(new Error(`Server did not become ready within ${READY_TIMEOUT_MS}ms`));
		}, READY_TIMEOUT_MS);

		child.on("error", (err) => {
			clearTimeout(timer);
			reject(new Error(`Failed to spawn server: ${err.message}`));
		});

		const onLine = (chunk: Buffer) => {
			const text = chunk.toString();
			process.stdout.write(`[server] ${text}`);
			const match = text.match(SERVER_LISTENING_PATTERN);
			if (match) {
				clearTimeout(timer);
				const port = Number.parseInt(match[1], 10);
				resolve({ port, url: `http://127.0.0.1:${port}`, child });
			}
		};
		child.stdout?.on("data", onLine);
		child.stderr?.on("data", (chunk: Buffer) => {
			process.stderr.write(`[server] ${chunk.toString()}`);
		});

		child.on("exit", (code, signal) => {
			clearTimeout(timer);
			reject(new Error(`Server exited before ready (code=${code}, signal=${signal})`));
		});
	});
}

export function stopServer(handle: ServerHandle | null): void {
	if (!handle) return;
	if (handle.child.killed) return;
	handle.child.kill("SIGTERM");
}
