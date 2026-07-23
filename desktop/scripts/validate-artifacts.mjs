#!/usr/bin/env node
// Fail before publishing if a packaged artifact is missing or malformed.
// In particular, a truncated ZIP can otherwise be uploaded and distributed as
// a seemingly successful release.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const desktopDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pkg = JSON.parse(readFileSync(path.join(desktopDir, "package.json"), "utf8"));
const outDir = path.join(desktopDir, "out", "make");

const required = [
  {
    label: "macOS Apple Silicon ZIP",
    path: path.join(outDir, "zip", "darwin", "arm64", `Doer-darwin-arm64-${pkg.version}.zip`),
    kind: "zip",
  },
];

const failures = [];
for (const artifact of required) {
  if (!existsSync(artifact.path)) {
    failures.push(`${artifact.label}: file not found at ${artifact.path}`);
    continue;
  }

  const size = statSync(artifact.path).size;
  if (size === 0) {
    failures.push(`${artifact.label}: file is empty`);
    continue;
  }

  if (artifact.kind === "zip") {
    try {
      execFileSync("unzip", ["-t", artifact.path], { stdio: "pipe" });
    } catch (error) {
      const detail = error?.stderr?.toString().trim().split("\n").at(-1) || "invalid ZIP structure";
      failures.push(`${artifact.label}: ${detail}`);
    }
  }
}

if (failures.length > 0) {
  console.error("[validate-artifacts] release blocked:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`[validate-artifacts] OK — ${required.length} release artifact(s) passed integrity checks`);
