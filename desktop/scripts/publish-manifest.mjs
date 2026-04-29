#!/usr/bin/env node
// Post-publish step: writes RELEASES.json next to each platform/arch zip on R2
// so update-electron-app's StaticStorage source has a manifest to poll.
//
// Why this exists: @electron-forge/publisher-s3 uploads the .zip artifacts but
// does NOT generate the JSON feed file that Squirrel.Mac (and update-electron-app
// on darwin) reads. Without this, the running app fetches RELEASES.json, gets a
// 404, and silently never updates.
//
// Run order (wired into the "release" script in package.json):
//   1. electron-forge publish   → builds + uploads zips to <bucket>/<S3_FOLDER>/<plat>/<arch>/
//   2. node scripts/publish-manifest.mjs → uploads RELEASES.json alongside each zip
//
// Manifest format (Squirrel.Mac feed response):
//   { url, name, notes, pub_date }
// update-electron-app reads `name` (= version) and skips the download when it
// matches app.getVersion() on the running client.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const desktopDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pkg = JSON.parse(readFileSync(path.join(desktopDir, "package.json"), "utf8"));
const version = pkg.version;

const {
	DOER_UPDATE_URL,
	S3_BUCKET,
	S3_ENDPOINT,
	S3_REGION = "auto",
	S3_ACCESS_KEY_ID,
	S3_SECRET_ACCESS_KEY,
	S3_FOLDER = "beta",
} = process.env;

if (!DOER_UPDATE_URL || !S3_BUCKET || !S3_ENDPOINT || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
	console.error(
		"[publish-manifest] missing env: need DOER_UPDATE_URL, S3_BUCKET, S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY",
	);
	process.exit(1);
}

// Targets we ship. Filename patterns must match what electron-forge makers produce.
// MakerZIP  (darwin) → Doer-darwin-arm64-{version}.zip
// MakerSquirrel (win32) → {appName}-{version} Setup.exe  (note the space)
const targets = [
	{
		platform: "darwin",
		arch: "arm64",
		filename: `Doer-darwin-arm64-${version}.zip`,
		// Path where MakerZIP drops the local file
		localPath: (outDir) =>
			path.join(outDir, "make", "zip", "darwin", "arm64", `Doer-darwin-arm64-${version}.zip`),
	},
	{
		platform: "win32",
		arch: "x64",
		filename: `Doer-${version} Setup.exe`,
		// Path where MakerSquirrel drops the local installer
		localPath: (outDir) =>
			path.join(outDir, "make", "squirrel.windows", "x64", `Doer-${version} Setup.exe`),
	},
];

const s3 = new S3Client({
	region: S3_REGION,
	endpoint: S3_ENDPOINT,
	credentials: {
		accessKeyId: S3_ACCESS_KEY_ID,
		secretAccessKey: S3_SECRET_ACCESS_KEY,
	},
	forcePathStyle: true,
});

const pubDate = new Date().toISOString();
const errors = [];

for (const t of targets) {
	const outDir = path.join(desktopDir, "out");
	const localFile = t.localPath(outDir);
	if (!existsSync(localFile)) {
		console.warn(`[publish-manifest] skip ${t.platform}/${t.arch} — local artifact not found at ${localFile}`);
		continue;
	}

	const zipUrl = `${DOER_UPDATE_URL}/${S3_FOLDER}/${t.platform}/${t.arch}/${encodeURIComponent(t.filename)}`;
	const manifest = {
		url: zipUrl,
		name: version,
		notes: `Doer ${version}`,
		pub_date: pubDate,
	};
	const key = `${S3_FOLDER}/${t.platform}/${t.arch}/RELEASES.json`;

	console.log(`[publish-manifest] PUT ${key}`);
	console.log(`                   url → ${zipUrl}`);

	try {
		await s3.send(
			new PutObjectCommand({
				Bucket: S3_BUCKET,
				Key: key,
				Body: JSON.stringify(manifest, null, 2),
				ContentType: "application/json",
				// no-cache so a fresh ship is visible to clients on their next poll
				CacheControl: "no-cache, must-revalidate",
			}),
		);
	} catch (err) {
		console.error(`[publish-manifest] failed to upload ${key}:`, err);
		errors.push({ target: `${t.platform}/${t.arch}`, err });
	}
}

if (errors.length > 0) {
	console.error(`[publish-manifest] ${errors.length} upload(s) failed`);
	process.exit(1);
}

console.log(`\x1b[32m[publish-manifest] done — version ${version}\x1b[0m`);
