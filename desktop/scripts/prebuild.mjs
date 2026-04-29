#!/usr/bin/env node
// Stages everything we need to bundle into .electron-build/ for forge to copy.
// Idempotent — safe to run repeatedly.

import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const desktopDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const repoRoot = path.resolve(desktopDir, "..");
const buildDir = path.join(desktopDir, ".electron-build");
const serverOut = path.join(buildDir, "server");
// Server resolves UI from `<server>/ui-dist` first (published location).
// Stage it there so server's static-serve path works without code changes.
const uiOut = path.join(serverOut, "ui-dist");

function run(cmd, cwd) {
	console.log(`\x1b[36m[prebuild]\x1b[0m ${cmd}  (cwd=${cwd})`);
	execSync(cmd, { stdio: "inherit", cwd });
}

console.log(`[prebuild] desktopDir=${desktopDir}`);
console.log(`[prebuild] repoRoot=${repoRoot}`);

// 1. Build server + transitive deps (skips unrelated plugin examples that
//    sometimes fail and aren't needed for the bundle).
run("pnpm -F server... build", repoRoot);
run("pnpm -F ui build", repoRoot);

// 2. Reset .electron-build/
if (existsSync(buildDir)) rmSync(buildDir, { recursive: true, force: true });
mkdirSync(buildDir, { recursive: true });

// 3. pnpm deploy server with prod-only deps into .electron-build/server.
//    Force install of platform-specific optional deps (notably the right
//    @embedded-postgres/<os>-<arch>) for the target we're packaging for.
//    Override via DOER_TARGET_OS / DOER_TARGET_CPU; defaults to host platform.
const targetOs = process.env.DOER_TARGET_OS ?? process.platform;     // darwin | win32 | linux
const targetCpu = process.env.DOER_TARGET_CPU ?? process.arch;       // arm64 | x64
console.log(`[prebuild] target: ${targetOs}/${targetCpu}`);
run(
	`pnpm --filter server deploy --prod ` +
		`--config.supportedArchitectures.os[]=${targetOs} ` +
		`--config.supportedArchitectures.cpu[]=${targetCpu} ` +
		serverOut,
	repoRoot,
);

// 4. Copy ui-dist into <server>/ui-dist (server's published-location convention)
cpSync(path.join(repoRoot, "ui/dist"), uiOut, { recursive: true });

// 4b. If cross-bundling for a different platform than the host, fetch and
//     copy the right @embedded-postgres/<os>-<cpu> native package separately
//     (pnpm deploy only installs optional deps for the host platform).
const isCrossPlatform = targetOs !== process.platform || targetCpu !== process.arch;
if (isCrossPlatform) {
	// embedded-postgres uses 'windows' instead of Node's 'win32'.
	const epOsName = targetOs === "win32" ? "windows" : targetOs;
	const epPkg = `@embedded-postgres/${epOsName}-${targetCpu}`;
	console.log(`[prebuild] cross-platform target — fetching ${epPkg} natively`);
	const epVersion = (() => {
		// Crib version from the host install so versions stay aligned.
		const hostEpJson = path.join(serverOut, "node_modules", "embedded-postgres", "package.json");
		const j = JSON.parse(readFileSync(hostEpJson, "utf8"));
		return j.version;
	})();
	const epStaging = path.join(buildDir, ".ep-fetch");
	rmSync(epStaging, { recursive: true, force: true });
	mkdirSync(epStaging, { recursive: true });
	writeFileSync(path.join(epStaging, "package.json"), JSON.stringify({
		name: "ep-fetch",
		version: "1.0.0",
		dependencies: { [epPkg]: epVersion },
	}));
	// --force bypasses npm's host-platform check (we WANT the cross-platform binary)
	run(`npm install --no-audit --no-fund --force --silent`, epStaging);
	const epSource = path.join(epStaging, "node_modules", ...epPkg.split("/"));
	const epDest = path.join(serverOut, "node_modules", ...epPkg.split("/"));
	mkdirSync(path.dirname(epDest), { recursive: true });
	cpSync(epSource, epDest, { recursive: true });
	console.log(`[prebuild] copied ${epPkg}@${epVersion} → ${epDest}`);
}

// 5. Apply publishConfig to all workspace @doerai/* packages so they resolve
//    to compiled dist/*.js instead of source dist/*.ts (the dev convention).
//    Also follow pnpm's symlink to .pnpm/ to patch the real file.
function realPath(p) {
	try { return execSync(`readlink -f ${JSON.stringify(p)}`, { encoding: "utf8" }).trim(); } catch { return p; }
}
const doeraiDir = path.join(serverOut, "node_modules", "@doerai");
let patched = 0;
for (const name of readdirSync(doeraiDir)) {
	const linkPath = path.join(doeraiDir, name, "package.json");
	const real = realPath(linkPath);
	const pkg = JSON.parse(readFileSync(real, "utf8"));
	if (pkg.publishConfig && (pkg.publishConfig.exports || pkg.publishConfig.main)) {
		const merged = { ...pkg, ...pkg.publishConfig };
		delete merged.publishConfig;
		writeFileSync(real, JSON.stringify(merged, null, 2));
		patched++;
	}
}
console.log(`[prebuild] patched ${patched} @doerai/* package.json files with publishConfig`);

console.log("\x1b[32m[prebuild] done\x1b[0m");
