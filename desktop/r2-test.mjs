import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { createReadStream, statSync, readdirSync } from "node:fs";
import https from "node:https";
import path from "node:path";

const zipDir = "out/make/zip/darwin/arm64";
const zip = readdirSync(zipDir).find((f) => f.endsWith(".zip"));
const zipPath = path.join(zipDir, zip);
const stat = statSync(zipPath);
console.log(`Multipart upload: ${zipPath} (${(stat.size / 1024 / 1024).toFixed(1)} MB)`);

const client = new S3Client({
	region: "auto",
	endpoint: process.env.S3_ENDPOINT,
	credentials: {
		accessKeyId: process.env.S3_ACCESS_KEY_ID,
		secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
	},
	forcePathStyle: true,
	requestHandler: new NodeHttpHandler({
		httpsAgent: new https.Agent({ keepAlive: true }),
		// Aggressive timeouts so we fail fast
		connectionTimeout: 10_000,
		socketTimeout: 60_000,
	}),
	maxAttempts: 3,
});

try {
	const upload = new Upload({
		client,
		params: {
			Bucket: process.env.S3_BUCKET,
			Key: `beta/test/${zip}`,
			Body: createReadStream(zipPath, { highWaterMark: 1 * 1024 * 1024 }), // 1 MB stream chunks
		},
		queueSize: 1, // sequential parts — eliminates concurrency-related TLS issues
		partSize: 5 * 1024 * 1024, // 5 MB minimum allowed by R2
		leavePartsOnError: false,
	});
	upload.on("httpUploadProgress", (p) => {
		const pct = ((p.loaded ?? 0) / stat.size * 100).toFixed(0);
		process.stdout.write(`\rprogress: ${pct}% (${(p.loaded / 1024 / 1024).toFixed(1)} MB)`);
	});
	await upload.done();
	console.log("\n✅ multipart upload ok");
} catch (e) {
	console.log("\n❌", e.name, e.message);
	if (e.$metadata) console.log("metadata:", e.$metadata);
}
