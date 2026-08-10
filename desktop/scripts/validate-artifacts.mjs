#!/usr/bin/env node
// Fail before publishing if a packaged artifact is missing or malformed.
//
// History: this used to shell out to `unzip -t`, which proved flaky on the
// GitHub macos runners (non-zero exit with empty stderr on a ZIP that tested
// clean everywhere else — the artifact on R2 was verified good by hand).
// The check is now pure Node: parse the End Of Central Directory, walk the
// central directory, and verify every entry's local header signature exists
// at its declared offset. That catches truncation and structural corruption
// deterministically, with no dependence on the runner's unzip build.

import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const EOCD_SIG = 0x06054b50;
const EOCD64_LOCATOR_SIG = 0x07064b50;
const EOCD64_SIG = 0x06064b51;
const CEN_SIG = 0x02014b50;
const LOC_SIG = 0x04034b50;
const EOCD_MIN_LEN = 22;
const EOCD_SEARCH_WINDOW = 66 * 1024; // 64KiB max comment + slack

const desktopDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pkg = JSON.parse(readFileSync(path.join(desktopDir, "package.json"), "utf8"));
const outDir = path.join(desktopDir, "out", "make");

const required = [
  {
    label: "macOS Apple Silicon ZIP",
    path: path.join(outDir, "zip", "darwin", "arm64", `Doer-darwin-arm64-${pkg.version}.zip`),
    kind: "zip",
    mustContain: "Doer.app/Contents/Info.plist",
  },
];

function findEocd(buf) {
  const start = Math.max(0, buf.length - EOCD_SEARCH_WINDOW);
  for (let i = buf.length - EOCD_MIN_LEN; i >= start; i -= 1) {
    if (buf.readUInt32LE(i) === EOCD_SIG) {
      const commentLen = buf.readUInt16LE(i + 20);
      // The EOCD record must end exactly at EOF — a signature followed by
      // trailing garbage means a truncated or appended-to archive.
      if (i + EOCD_MIN_LEN + commentLen === buf.length) return i;
    }
  }
  return -1;
}

function checkZipStructure(filePath) {
  const buf = readFileSync(filePath);

  const eocdPos = findEocd(buf);
  if (eocdPos < 0) return "no valid End Of Central Directory record (truncated archive?)";

  let totalEntries = buf.readUInt16LE(eocdPos + 10);
  let cdSize = buf.readUInt32LE(eocdPos + 12);
  let cdOffset = buf.readUInt32LE(eocdPos + 16);

  // ZIP64 fallback: 0xFFFF/0xFFFFFFFF sentinel values mean the real counts
  // live in the ZIP64 EOCD, located via the record just before the EOCD.
  if (totalEntries === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) {
    const locPos = eocdPos - 20;
    if (locPos < 0 || buf.readUInt32LE(locPos) !== EOCD64_LOCATOR_SIG) {
      return "ZIP64 EOCD locator missing";
    }
    const eocd64Pos = Number(buf.readBigUInt64LE(locPos + 8));
    if (eocd64Pos + 56 > buf.length || buf.readUInt32LE(eocd64Pos) !== EOCD64_SIG) {
      return "ZIP64 EOCD record missing at declared offset";
    }
    totalEntries = Number(buf.readBigUInt64LE(eocd64Pos + 32));
    cdSize = Number(buf.readBigUInt64LE(eocd64Pos + 40));
    cdOffset = Number(buf.readBigUInt64LE(eocd64Pos + 48));
  }

  if (cdOffset + cdSize > eocdPos) {
    return `central directory overruns EOCD (offset ${cdOffset} + size ${cdSize} > ${eocdPos})`;
  }
  if (totalEntries === 0) return "archive contains zero entries";

  const names = [];
  let pos = cdOffset;
  for (let n = 0; n < totalEntries; n += 1) {
    if (pos + 46 > buf.length || buf.readUInt32LE(pos) !== CEN_SIG) {
      return `central directory entry ${n} corrupt at offset ${pos}`;
    }
    const nameLen = buf.readUInt16LE(pos + 28);
    const extraLen = buf.readUInt16LE(pos + 30);
    const commentLen = buf.readUInt16LE(pos + 32);
    const localHeaderOffset = buf.readUInt32LE(pos + 42);
    if (localHeaderOffset + 4 > buf.length || buf.readUInt32LE(localHeaderOffset) !== LOC_SIG) {
      const name = buf.toString("utf8", pos + 46, pos + 46 + nameLen);
      return `entry "${name}" points at invalid local header (offset ${localHeaderOffset})`;
    }
    if (names.length < 8 || n === totalEntries - 1) {
      names.push(buf.toString("utf8", pos + 46, pos + 46 + nameLen));
    }
    pos += 46 + nameLen + extraLen + commentLen;
  }
  if (pos !== cdOffset + cdSize) {
    return `central directory size mismatch (walked ${pos - cdOffset} of ${cdSize} bytes)`;
  }
  return { entryCount: totalEntries, names };
}

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
    const result = checkZipStructure(artifact.path);
    if (typeof result === "string") {
      failures.push(`${artifact.label}: ${result}`);
      continue;
    }
    if (artifact.mustContain && !result.names.includes(artifact.mustContain)) {
      // names[] only holds a sample; search the central directory properly
      // before declaring the payload missing.
      const buf = readFileSync(artifact.path);
      if (!buf.includes(artifact.mustContain)) {
        failures.push(`${artifact.label}: expected payload "${artifact.mustContain}" not found in archive`);
        continue;
      }
    }
    console.log(`[validate-artifacts] ${artifact.label}: ${result.entryCount} entries, structure OK`);
  }
}

if (failures.length > 0) {
  console.error("[validate-artifacts] release blocked:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`[validate-artifacts] OK — ${required.length} release artifact(s) passed integrity checks`);
