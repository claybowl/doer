import { describe, it, expect } from "vitest";
import { parseVersion, isNewer, manifestUrl, evaluateManifest, type ReleaseManifest } from "./updater-core";

describe("parseVersion", () => {
	it("strips a leading v and splits into numbers", () => {
		expect(parseVersion("v0.1.6")).toEqual([0, 1, 6]);
		expect(parseVersion("0.1.62")).toEqual([0, 1, 62]);
	});
});

describe("isNewer", () => {
	it("compares segment-wise", () => {
		expect(isNewer("0.1.7", "0.1.6")).toBe(true);
		expect(isNewer("v0.2.0", "0.1.9")).toBe(true);
		expect(isNewer("0.1.6", "0.1.6")).toBe(false);
		expect(isNewer("0.1.5", "0.1.6")).toBe(false);
	});
	it("is numeric, not lexical (0.1.62 > 0.1.7)", () => {
		expect(isNewer("0.1.62", "0.1.7")).toBe(true);
		expect(isNewer("0.1.7", "0.1.62")).toBe(false);
	});
});

describe("manifestUrl", () => {
	it("builds the per-platform RELEASES.json path", () => {
		expect(manifestUrl("https://pub-x.r2.dev/beta", "darwin", "arm64")).toBe(
			"https://pub-x.r2.dev/beta/darwin/arm64/RELEASES.json",
		);
	});
	it("tolerates a trailing slash on the base", () => {
		expect(manifestUrl("https://pub-x.r2.dev/beta/", "win32", "x64")).toBe(
			"https://pub-x.r2.dev/beta/win32/x64/RELEASES.json",
		);
	});
});

describe("evaluateManifest", () => {
	const manifest: ReleaseManifest = {
		url: "https://pub-x.r2.dev/beta/darwin/arm64/Doer-darwin-arm64-0.1.7.zip",
		name: "0.1.7",
		notes: "Doer 0.1.7",
		pub_date: "2026-06-21T00:00:00.000Z",
	};

	it("returns update info when newer", () => {
		const u = evaluateManifest(manifest, "0.1.6");
		expect(u).not.toBeNull();
		expect(u!.version).toBe("0.1.7");
		expect(u!.url).toBe(manifest.url);
		expect(u!.notes).toBe("Doer 0.1.7");
	});

	it("returns null when already up to date or older", () => {
		expect(evaluateManifest(manifest, "0.1.7")).toBeNull();
		expect(evaluateManifest(manifest, "0.2.0")).toBeNull();
	});

	it("returns null on a malformed manifest", () => {
		expect(evaluateManifest({ url: "", name: "0.1.7" }, "0.1.6")).toBeNull();
		expect(evaluateManifest({ url: "u", name: "" }, "0.1.6")).toBeNull();
	});
});
