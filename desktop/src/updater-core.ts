// ─── Updater core (Electron-free, unit-testable) ──────────────────────────────
// Pure version logic for the in-app updater. Kept separate from updater.ts so it
// can be tested in a plain Node environment without importing "electron".
//
// The feed is the SAME R2 RELEASES.json the release pipeline already publishes
// (desktop/scripts/publish-manifest.mjs): one manifest per platform/arch at
//   {DOER_UPDATE_URL}/{platform}/{arch}/RELEASES.json
// shaped like { url, name, notes, pub_date } — `name` is the version string.
// Reading R2 (public) means this works even though the GitHub repo is private.

export interface ReleaseManifest {
	/** Direct download URL of the installer/zip for this platform+arch. */
	url: string;
	/** Version string, e.g. "0.1.6". */
	name: string;
	notes?: string;
	pub_date?: string;
}

export interface UpdateInfo {
	version: string;
	notes: string;
	url: string;
}

/** Parse a version string ("v0.1.6" / "0.1.6") into numeric segments. */
export function parseVersion(raw: string): number[] {
	return raw.replace(/^v/i, "").split(/[.\-+]/).map((p) => parseInt(p, 10) || 0);
}

/** True if `latest` is strictly newer than `current` (segment-wise semver). */
export function isNewer(latest: string, current: string): boolean {
	const a = parseVersion(latest);
	const b = parseVersion(current);
	const len = Math.max(a.length, b.length);
	for (let i = 0; i < len; i++) {
		const x = a[i] ?? 0;
		const y = b[i] ?? 0;
		if (x !== y) return x > y;
	}
	return false;
}

/** Build the per-platform manifest URL from the configured base. */
export function manifestUrl(baseUrl: string, platform: NodeJS.Platform, arch: string): string {
	return `${baseUrl.replace(/\/$/, "")}/${platform}/${arch}/RELEASES.json`;
}

/** Decide whether a manifest describes an installable update. Pure. */
export function evaluateManifest(manifest: ReleaseManifest, currentVersion: string): UpdateInfo | null {
	if (!manifest?.name || !manifest?.url || !isNewer(manifest.name, currentVersion)) return null;
	return {
		version: manifest.name.replace(/^v/i, ""),
		notes: (manifest.notes ?? "").trim(),
		url: manifest.url,
	};
}
