import path from "node:path";
import { app, BrowserWindow } from "electron";
import { UpdateSourceType, updateElectronApp } from "update-electron-app";
import { type ServerHandle, startServer, stopServer } from "./server-process";

// eslint-disable-next-line @typescript-eslint/no-var-requires
if (require("electron-squirrel-startup")) app.quit();

declare const MAIN_WINDOW_VITE_NAME: string;
declare const __DOER_UPDATE_URL__: string;

let serverHandle: ServerHandle | null = null;

function loadingHtmlDataUrl(message: string): string {
	const html = `<!doctype html><html><head><meta charset="utf-8"><title>Doer</title>
<style>
body { font-family: system-ui, sans-serif; background: #0e1116; color: #e6e6e6;
       display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
.box { text-align: center; padding: 2rem; }
h1 { margin: 0 0 0.5rem 0; font-weight: 500; }
p { opacity: 0.6; margin: 0; font-size: 0.9rem; max-width: 420px; }
</style></head><body><div class="box"><h1>Doer</h1><p>${message}</p></div></body></html>`;
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
	if (serverUrl) win.loadURL(serverUrl);
	else win.loadURL(loadingHtmlDataUrl("Server failed to start. Check console for logs."));
}

function maybeStartAutoUpdater() {
	if (!app.isPackaged) return;
	const baseUrl = __DOER_UPDATE_URL__;
	if (!baseUrl) {
		console.log("[main] auto-updater disabled — DOER_UPDATE_URL was not set at build time");
		return;
	}
	try {
		updateElectronApp({
			updateSource: {
				type: UpdateSourceType.StaticStorage,
				baseUrl: `${baseUrl}/${process.platform}/${process.arch}`,
			},
			updateInterval: "1 hour",
			logger: console,
			notifyUser: true,
		});
		console.log(`[main] auto-updater enabled — checking ${baseUrl}/${process.platform}/${process.arch}`);
	} catch (err) {
		console.error("[main] auto-updater init failed:", err);
	}
}

async function bootstrap() {
	maybeStartAutoUpdater();
	try {
		console.log("[main] Spawning server...");
		serverHandle = await startServer({
			isPackaged: app.isPackaged,
			resourcesPath: process.resourcesPath,
			execPath: process.execPath,
			userDataPath: app.getPath("userData"),
		});
		console.log(`[main] Server ready at ${serverHandle.url}`);
	} catch (err) {
		console.error("[main] Failed to start server:", err);
	}
	createWindow(serverHandle?.url ?? null);
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
});

void MAIN_WINDOW_VITE_NAME;
