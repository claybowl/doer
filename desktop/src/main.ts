import path from "node:path";
import { app, BrowserWindow } from "electron";
import { type ServerHandle, startDevServer, stopServer } from "./server-process";

// eslint-disable-next-line @typescript-eslint/no-var-requires
if (require("electron-squirrel-startup")) app.quit();

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

let serverHandle: ServerHandle | null = null;

function createWindow(serverUrl: string | null) {
	const win = new BrowserWindow({
		width: 1200,
		height: 800,
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			contextIsolation: true,
			nodeIntegration: false,
			additionalArguments: serverUrl ? [`--doer-server-url=${serverUrl}`] : [],
		},
	});

	if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
		win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
	} else {
		win.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
	}
}

async function bootstrap() {
	const isPackaged = app.isPackaged;
	let serverUrl: string | null = null;

	if (!isPackaged) {
		try {
			console.log("[main] Spawning dev server...");
			serverHandle = await startDevServer();
			serverUrl = serverHandle.url;
			console.log(`[main] Server ready at ${serverUrl}`);
		} catch (err) {
			console.error("[main] Failed to start dev server:", err);
		}
	} else {
		console.warn("[main] Packaged mode: server bundling not yet implemented (K3-prod).");
	}

	createWindow(serverUrl);
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
