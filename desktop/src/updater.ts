import path from "node:path";
import { createWriteStream } from "node:fs";
import { chmod } from "node:fs/promises";
import { Readable } from "node:stream";
import { app, BrowserWindow, dialog, shell } from "electron";
import {
	type ReleaseManifest,
	type UpdateInfo,
	evaluateManifest,
	manifestUrl,
} from "./updater-core";

// ─── Custom in-app updater ────────────────────────────────────────────────────
// Squirrel.Mac can't auto-update an *unsigned* app, so we don't use it. Instead
// we poll the R2 RELEASES.json feed (the same one the release pipeline publishes),
// and when a newer version exists we show an in-app dialog. "Update Now"
// downloads the installer and opens it (Windows: runs Setup.exe; macOS/Linux:
// reveals the downloaded file). Works for unsigned builds with no signing cert.
//
// Pure version logic lives in updater-core.ts (Electron-free, unit-tested).

const CHECK_DELAY_MS = 12_000; // let the window settle before the first check
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // hourly

async function fetchManifest(baseUrl: string): Promise<ReleaseManifest | null> {
	try {
		const url = manifestUrl(baseUrl, process.platform, process.arch);
		const res = await fetch(url, { cache: "no-store" });
		if (!res.ok) return null;
		return (await res.json()) as ReleaseManifest;
	} catch {
		return null;
	}
}

async function downloadAsset(url: string, onLog: (m: string) => void): Promise<string> {
	const filename = decodeURIComponent(url.split("/").pop() || `Doer-update`);
	const dest = path.join(app.getPath("downloads"), filename);
	const res = await fetch(url);
	if (!res.ok || !res.body) throw new Error(`download failed: HTTP ${res.status}`);
	await new Promise<void>((resolve, reject) => {
		const file = createWriteStream(dest);
		Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0])
			.pipe(file)
			.on("finish", () => resolve())
			.on("error", reject);
	});
	onLog(`[updater] downloaded ${filename} -> ${dest}`);
	return dest;
}

/** Run/reveal the downloaded asset per platform. */
async function installAsset(filePath: string): Promise<void> {
	if (process.platform === "win32") {
		// Squirrel/NSIS installer — running it updates over the top.
		await shell.openPath(filePath);
		app.quit();
		return;
	}
	if (process.platform === "linux") {
		await chmod(filePath, 0o755).catch(() => {});
	}
	// macOS (unsigned) + Linux: reveal the file so the user can finish the swap.
	shell.showItemInFolder(filePath);
}

async function promptAndInstall(update: UpdateInfo, onLog: (m: string) => void): Promise<void> {
	const win = BrowserWindow.getAllWindows()[0] ?? null;
	const notes = update.notes ? `\n\n${update.notes.slice(0, 500)}` : "";
	const opts = {
		type: "info" as const,
		buttons: ["Update Now", "Later"],
		defaultId: 0,
		cancelId: 1,
		title: "Update available",
		message: `Doer ${update.version} is available.`,
		detail: `You're on ${app.getVersion()}.${notes}`,
	};
	const { response } = win
		? await dialog.showMessageBox(win, opts)
		: await dialog.showMessageBox(opts);
	if (response !== 0) return;

	try {
		const file = await downloadAsset(update.url, onLog);
		await installAsset(file);
		if (process.platform !== "win32") {
			const w = BrowserWindow.getAllWindows()[0] ?? null;
			const msg = {
				type: "info" as const,
				buttons: ["OK"],
				title: "Download complete",
				message: `Doer ${update.version} downloaded to your Downloads folder.`,
				detail:
					process.platform === "darwin"
						? "Open it, drag Doer into Applications (replacing the old one), then relaunch."
						: "Make it executable if needed and run it to finish updating.",
			};
			if (w) await dialog.showMessageBox(w, msg);
			else await dialog.showMessageBox(msg);
		}
	} catch (err) {
		onLog(`[updater] install failed: ${err instanceof Error ? err.message : String(err)}`);
	}
}

/** Check once; show the dialog if an update is available. */
export async function checkForUpdateOnce(baseUrl: string, onLog: (m: string) => void): Promise<void> {
	const manifest = await fetchManifest(baseUrl);
	if (!manifest) {
		onLog("[updater] no manifest (offline, or feed not reachable)");
		return;
	}
	const update = evaluateManifest(manifest, app.getVersion());
	if (!update) {
		onLog(`[updater] up to date (${app.getVersion()})`);
		return;
	}
	onLog(`[updater] update available: ${update.version} (have ${app.getVersion()})`);
	await promptAndInstall(update, onLog);
}

/** Start the in-app updater: check shortly after launch, then hourly. */
export function startInAppUpdater(baseUrl: string, onLog: (m: string) => void): void {
	if (!app.isPackaged) {
		onLog("[updater] skipped — not packaged (dev mode)");
		return;
	}
	if (!baseUrl) {
		onLog("[updater] disabled — DOER_UPDATE_URL was not set at build time");
		return;
	}
	setTimeout(() => void checkForUpdateOnce(baseUrl, onLog), CHECK_DELAY_MS);
	setInterval(() => void checkForUpdateOnce(baseUrl, onLog), CHECK_INTERVAL_MS);
}
