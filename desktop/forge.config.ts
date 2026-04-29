import { FuseV1Options, FuseVersion } from "@electron/fuses";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { PublisherS3 } from "@electron-forge/publisher-s3";
import type { ForgeConfig } from "@electron-forge/shared-types";

const config: ForgeConfig = {
	packagerConfig: {
		asar: true,
		name: "Doer",
		// Keep symlinks (pnpm structure) intact and include the bundled server
		// + UI dist alongside the app. Built into .electron-build/ by scripts/prebuild.mjs.
		derefSymlinks: false,
		extraResource: ["./.electron-build/server"],
	},
	hooks: {
		// Build server + UI artifacts and stage them into .electron-build/
		// before forge starts copying anything.
		generateAssets: async () => {
			const { execSync } = await import("node:child_process");
			execSync("node scripts/prebuild.mjs", { stdio: "inherit", cwd: import.meta.dirname });
		},
	},
	rebuildConfig: {},
	makers: [
		// Explicit name strips the @doer/ scope from package.json that Squirrel
		// can't handle (interprets the / as a path separator → ENOENT on .nuspec).
		new MakerSquirrel({ name: "doer-desktop" }),
		new MakerZIP({}, ["darwin"]),
	],
	publishers: [
		// Publishes to Cloudflare R2 (S3-compatible API). Requires:
		//   S3_ENDPOINT          https://<account>.r2.cloudflarestorage.com
		//   S3_BUCKET            doer-releases
		//   S3_ACCESS_KEY_ID     R2 access key
		//   S3_SECRET_ACCESS_KEY R2 secret
		// Skipped silently when env vars are missing so local `pnpm make` still works.
		...(process.env.S3_BUCKET
			? [
					new PublisherS3({
						bucket: process.env.S3_BUCKET,
						region: process.env.S3_REGION ?? "auto",
						endpoint: process.env.S3_ENDPOINT,
						accessKeyId: process.env.S3_ACCESS_KEY_ID,
						secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
						// R2-specific: doesn't support ACL headers (caused TLS bad_record_mac
						// in early testing) and prefers path-style URLs over virtual-host.
						omitAcl: true,
						s3ForcePathStyle: true,
						// Object key layout: <channel>/<platform>/<arch>/<filename>
						// e.g. beta/darwin/arm64/Doer-0.0.1-darwin-arm64.zip
						folder: process.env.S3_FOLDER ?? "beta",
					}),
				]
			: []),
	],
	// Allow Electron's bundled Node to be invoked as a plain Node runtime
	// for the spawned server process (fuse OFF so ELECTRON_RUN_AS_NODE works).
	plugins: [
		new VitePlugin({
			build: [
				{ entry: "src/main.ts", config: "vite.main.config.mts", target: "main" },
				{ entry: "src/preload.ts", config: "vite.preload.config.mts", target: "preload" },
			],
			renderer: [{ name: "main_window", config: "vite.renderer.config.mts" }],
		}),
		new FusesPlugin({
			version: FuseVersion.V1,
			// Must be true so ELECTRON_RUN_AS_NODE can be used to spawn
			// the bundled server with Electron's Node runtime.
			[FuseV1Options.RunAsNode]: true,
			[FuseV1Options.EnableCookieEncryption]: true,
			// True so the spawned server can pick up env vars (NODE_OPTIONS, etc.).
			[FuseV1Options.EnableNodeOptionsEnvironmentVariable]: true,
			[FuseV1Options.EnableNodeCliInspectArguments]: false,
			[FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
			[FuseV1Options.OnlyLoadAppFromAsar]: true,
		}),
	],
};

export default config;
