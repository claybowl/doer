import { type ChildProcess, spawn } from "node:child_process";
import path from "node:path";

const SERVER_LISTENING_PATTERN = /Server listening on \S+:(\d+)/;
const READY_TIMEOUT_MS = 90_000;

export type ServerHandle = {
	port: number;
	url: string;
	child: ChildProcess;
};

/**
 * Dev-mode only: spawns Doer's Express server from the monorepo source tree.
 *
 * Packaged-mode (.app / .exe) is not yet supported — needs the server bundled
 * into extraResources first. Tracked as K3-prod in doc/RELEASING-ELECTRON.md.
 */
export function startDevServer(): Promise<ServerHandle> {
	// Walk up from .vite/build/ (or wherever main.js lives) to find the monorepo root.
	// Heuristic: nearest ancestor that contains a "server" directory.
	let serverDir = "";
	let dir = __dirname;
	for (let i = 0; i < 6; i++) {
		const candidate = path.join(dir, "../server");
		try {
			require("node:fs").statSync(candidate);
			serverDir = path.resolve(candidate);
			break;
		} catch {
			dir = path.dirname(dir);
		}
	}
	if (!serverDir) {
		return Promise.reject(new Error(`Could not locate server/ from ${__dirname}`));
	}
	console.log(`[main] serverDir resolved to ${serverDir}`);

	// Resolve pnpm from common install locations — Electron's hardened runtime
	// blocks shell-based spawn and may have a stripped PATH.
	const pnpmBin = process.env.PNPM_BIN ?? "/opt/homebrew/bin/pnpm";
	const child = spawn(pnpmBin, ["dev"], {
		cwd: serverDir,
		env: { ...process.env, FORCE_COLOR: "0" },
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
