import path from "node:path";
import { createWriteStream, mkdirSync, type WriteStream } from "node:fs";
import { app, BrowserWindow } from "electron";
import { type ServerHandle, startServer, stopServer } from "./server-process";
import { startInAppUpdater } from "./updater";

// eslint-disable-next-line @typescript-eslint/no-var-requires
if (require("electron-squirrel-startup")) app.quit();

declare const MAIN_WINDOW_VITE_NAME: string;
declare const __DOER_UPDATE_URL__: string;

let serverHandle: ServerHandle | null = null;

// ─── Logging ────────────────────────────────────────────────────────────────
// On Windows, packaged Electron apps have no visible console. We write startup
// logs to a file so users (and support) can find them even when the UI fails.

let logDir = "";
let logStream: WriteStream | null = null;

function initLogging(): void {
	logDir = path.join(app.getPath("userData"), "logs");
	try { mkdirSync(logDir, { recursive: true }); } catch { /* best effort */ }
	const logPath = path.join(logDir, `doer-${Date.now()}.log`);
	try {
		logStream = createWriteStream(logPath, { flags: "a" });
		logStream.write(`[${new Date().toISOString()}] Doer startup — userData=${app.getPath("userData")} platform=${process.platform} arch=${process.arch}\n`);
	} catch { /* best effort */ }
}

function log(msg: string): void {
	console.log(msg);
	try { logStream?.write(`${msg}\n`); } catch { /* best effort */ }
}

function logError(msg: string): void {
	console.error(msg);
	try { logStream?.write(`${msg}\n`); } catch { /* best effort */ }
}

// ─── Error display ──────────────────────────────────────────────────────────

// Collected server errors so we can show them on the failure screen.
let serverError = "";

function loadingHtmlDataUrl(message: string, detail?: string): string {
	const safeMessage = message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
	const safeDetail = detail
		? detail.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")
		: "";
	const detailHtml = safeDetail
		? `<div style="margin-top:1rem;padding:0.75rem;background:#1a1d24;border-radius:6px;font-family:monospace;font-size:0.8rem;text-align:left;max-width:520px;max-height:320px;overflow-y:auto;word-break:break-all;opacity:0.8">${safeDetail}</div>`
		: "";
	const logHint = logDir
		? `<p style="margin-top:1.2rem;font-size:0.75rem;opacity:0.4">Full logs: <code style="background:#1a1d24;padding:0.15rem 0.35rem;border-radius:3px">${logDir}</code></p>`
		: "";
	const html = `<!doctype html><html><head><meta charset="utf-8"><title>Doer</title>
<style>
body { font-family: system-ui, sans-serif; background: #0e1116; color: #e6e6e6;
       display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
.box { text-align: center; padding: 2rem; max-width: 600px; }
h1 { margin: 0 0 0.5rem 0; font-weight: 500; }
p { opacity: 0.6; margin: 0; font-size: 0.9rem; }
</style></head><body><div class="box"><h1>Doer</h1><p>${safeMessage}</p>${detailHtml}${logHint}</div></body></html>`;
	return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

function createWindow(serverUrl: string | null) {
	const win = new BrowserWindow({
		width: 1400,
		height: 900,
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			contextIsolation: true,
			nodeIntegration: false,
		},
	});
	if (serverUrl) {
		win.loadURL(serverUrl);
	} else {
		win.loadURL(loadingHtmlDataUrl("Server failed to start.", serverError));
	}
}

async function bootstrap() {
	initLogging();
	log(`[main] Doer starting — packaged=${app.isPackaged} version=${app.getVersion()}`);
	// Note: the old Squirrel-based maybeStartAutoUpdater() is intentionally not
	// called — Squirrel.Mac can't update an unsigned app. The custom in-app
	// updater (startInAppUpdater, below) replaces it on all platforms.

	try {
		log("[main] Spawning server...");
		serverHandle = await startServer({
			isPackaged: app.isPackaged,
			resourcesPath: process.resourcesPath,
			execPath: process.execPath,
			userDataPath: app.getPath("userData"),
			logStream,
		});
		log(`[main] Server ready at ${serverHandle.url}`);
	} catch (err) {
		serverError = err instanceof Error ? err.message : String(err);
		logError(`[main] Failed to start server: ${serverError}`);
		// Also capture any stderr that was written before the failure
		if (serverHandle === null && (err as any)?.stderr) {
			serverError += "\n\nServer stderr:\n" + (err as any).stderr;
		}
	}

	createWindow(serverHandle?.url ?? null);

	// Custom in-app updater — polls the R2 RELEASES.json feed and shows a dialog
	// when a newer version exists. Works for unsigned builds (unlike Squirrel.Mac).
	startInAppUpdater(__DOER_UPDATE_URL__, log);
}

app.whenReady().then(bootstrap);

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) createWindow(serverHandle?.url ?? null);
});

app.on("before-quit", () => {
	stopServer(serverHandle);
	try { logStream?.end(); } catch { /* best effort */ }
});

void MAIN_WINDOW_VITE_NAME;
