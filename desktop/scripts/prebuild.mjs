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
run("pnpm -F 'server...' build", repoRoot);
run("pnpm -F ui build", repoRoot);

// 2. Reset .electron-build/
if (existsSync(buildDir)) rmSync(buildDir, { recursive: true, force: true });
mkdirSync(buildDir, { recursive: true });

// 3. pnpm deploy server with prod-only deps into .electron-build/server
run(`pnpm --filter server deploy --prod ${serverOut}`, repoRoot);

// 4. Copy ui-dist into <server>/ui-dist (server's published-location convention)
cpSync(path.join(repoRoot, "ui/dist"), uiOut, { recursive: true });

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
