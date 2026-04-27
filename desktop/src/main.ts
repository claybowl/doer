import path from "node:path";
import { app, BrowserWindow } from "electron";
import { type ServerHandle, startDevServer, stopServer } from "./server-process";

// eslint-disable-next-line @typescript-eslint/no-var-requires
if (require("electron-squirrel-startup")) app.quit();

declare const MAIN_WINDOW_VITE_NAME: string;

let serverHandle: ServerHandle | null = null;

function loadingHtmlDataUrl(message: string): string {
	const html = `<!doctype html><html><head><meta charset="utf-8"><title>Doer</title>
<style>
body { font-family: system-ui, sans-serif; background: #0e1116; color: #e6e6e6;
       display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
.box { text-align: center; }
h1 { margin: 0 0 0.5rem 0; font-weight: 500; }
p { opacity: 0.6; margin: 0; font-size: 0.9rem; }
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
			additionalArguments: serverUrl ? [`--doer-server-url=${serverUrl}`] : [],
		},
	});

	if (serverUrl) {
		win.loadURL(serverUrl);
	} else {
		win.loadURL(loadingHtmlDataUrl("Server failed to start. See terminal for logs."));
	}
}

async function bootstrap() {
	if (!app.isPackaged) {
		try {
			console.log("[main] Spawning dev server...");
			serverHandle = await startDevServer();
			console.log(`[main] Server ready at ${serverHandle.url}`);
		} catch (err) {
			console.error("[main] Failed to start dev server:", err);
		}
	} else {
		console.warn("[main] Packaged mode: server bundling not yet implemented (K3-prod).");
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

// Keep this referenced so the bundler doesn't tree-shake the renderer build entry.
void MAIN_WINDOW_VITE_NAME;
