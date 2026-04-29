#!/usr/bin/env node
// Uploads built Electron artifacts to Cloudflare R2.
//
// Strategy: generate a presigned PUT URL (pure local HMAC signing — no network call),
// then shell out to curl for the actual transfer. curl uses macOS LibreSSL, not
// Node's OpenSSL, which avoids the "bad record mac" TLS error that plagues
// large streaming uploads from the AWS SDK to R2.
//
// Run order (wired into the "release" script in package.json):
//   1. electron-forge make   → builds + packages artifacts into out/make/
//   2. node scripts/upload-artifacts.mjs → uploads artifacts to R2 via curl
//   3. node scripts/publish-manifest.mjs → uploads RELEASES.json

import { execSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const desktopDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pkg = JSON.parse(readFileSync(path.join(desktopDir, "package.json"), "utf8"));
const version = pkg.version;

const {
	S3_BUCKET,
	S3_ENDPOINT,
	S3_REGION = "auto",
	S3_ACCESS_KEY_ID,
	S3_SECRET_ACCESS_KEY,
	S3_FOLDER = "beta",
} = process.env;

if (!S3_BUCKET || !S3_ENDPOINT || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
	console.error(
		"[upload-artifacts] missing env: need S3_BUCKET, S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY",
	);
	process.exit(1);
}

// S3 client is only used to sign URLs — no actual uploads go through Node TLS
const s3 = new S3Client({
	region: S3_REGION,
	endpoint: S3_ENDPOINT,
	credentials: {
		accessKeyId: S3_ACCESS_KEY_ID,
		secretAccessKey: S3_SECRET_ACCESS_KEY,
	},
	forcePathStyle: true,
});

const outDir = path.join(desktopDir, "out", "make");

const artifacts = [
	{
		localPath: path.join(outDir, "zip", "darwin", "arm64", `Doer-darwin-arm64-${version}.zip`),
		s3Key: `${S3_FOLDER}/darwin/arm64/Doer-darwin-arm64-${version}.zip`,
		contentType: "application/zip",
	},
	{
		localPath: path.join(outDir, "squirrel.windows", "x64", `Doer-${version} Setup.exe`),
		s3Key: `${S3_FOLDER}/win32/x64/Doer-${version} Setup.exe`,
		contentType: "application/octet-stream",
	},
];

let uploaded = 0;
let skipped = 0;
const errors = [];

for (const artifact of artifacts) {
	if (!existsSync(artifact.localPath)) {
		console.log(`[upload-artifacts] skip — not found: ${artifact.localPath}`);
		skipped++;
		continue;
	}

	const sizeMb = (statSync(artifact.localPath).size / 1024 / 1024).toFixed(1);
	console.log(`[upload-artifacts] signing ${artifact.s3Key}`);

	try {
		// Generate presigned URL — purely local HMAC math, no network call
		const presignedUrl = await getSignedUrl(
			s3,
			new PutObjectCommand({
				Bucket: S3_BUCKET,
				Key: artifact.s3Key,
				ContentType: artifact.contentType,
			}),
			{ expiresIn: 3600 },
		);

		console.log(`[upload-artifacts] uploading ${artifact.s3Key} (${sizeMb} MB) via curl`);

		// curl uses macOS/system TLS — bypasses Node OpenSSL entirely
		execSync(
			`curl --fail --progress-bar -X PUT \
  -H "Content-Type: ${artifact.contentType}" \
  -T "${artifact.localPath}" \
  "${presignedUrl}"`,
			{ stdio: "inherit" },
		);

		console.log(`[upload-artifacts] ✓ uploaded ${artifact.s3Key}`);
		uploaded++;
	} catch (err) {
		console.error(`[upload-artifacts] ✗ failed to upload ${artifact.s3Key}:`, err.message);
		errors.push({ key: artifact.s3Key, err });
	}
}

console.log(
	`[upload-artifacts] done — ${uploaded} uploaded, ${skipped} skipped, ${errors.length} errors`,
);

if (errors.length > 0) {
	process.exit(1);
}
