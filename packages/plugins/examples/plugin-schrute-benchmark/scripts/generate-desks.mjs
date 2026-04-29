#!/usr/bin/env node
/**
 * generate-desks.mjs
 *
 * Reads all 100 desk JSON files from desks/ and generates
 * src/desks.generated.ts — a fully-typed, bundleable TypeScript module.
 *
 * Run: node scripts/generate-desks.mjs
 */

import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const desksDir = join(root, "desks");
const outFile = join(root, "src", "desks.generated.ts");

const DEPT_DIRS = [
  "engineering",
  "product",
  "design",
  "sales",
  "marketing",
  "customer-success",
  "finance",
  "hr",
  "legal-ops",
  "executive",
];

const desks = [];

for (const dir of DEPT_DIRS) {
  const deptPath = join(desksDir, dir);
  let files;
  try {
    files = readdirSync(deptPath).filter((f) => f.endsWith(".json")).sort();
  } catch {
    console.warn(`Warning: could not read ${deptPath}, skipping`);
    continue;
  }
  for (const file of files) {
    const raw = readFileSync(join(deptPath, file), "utf8");
    desks.push(JSON.parse(raw));
  }
}

console.log(`Loaded ${desks.length} desk definitions`);

const ts = `// AUTO-GENERATED — do not edit by hand.
// Run: node scripts/generate-desks.mjs
// Source: desks/ (${desks.length} files across ${DEPT_DIRS.length} departments)

export interface DeskDeliverable {
  filename: string;
  description: string;
}

export interface DeskCitation {
  source: string;
  code?: string;
  url: string;
  quote: string;
}

export interface DeskRubric {
  completion: string[];
  quality: string[];
  accuracy: string[];
  handoff: string[];
}

export interface DeskDefinition {
  id: string;
  dept: string;
  level: number;
  title: string;
  name: string;
  timeBudgetMin: number;
  brief: string;
  deliverables: DeskDeliverable[];
  citations: DeskCitation[];
  upstreamDeskIds: string[];
  downstreamDeskIds: string[];
  rubric: DeskRubric;
}

export const ALL_DESKS: DeskDefinition[] = ${JSON.stringify(desks, null, 2)};

/** Unique department codes, in canonical order. */
export const DEPT_CODES = [
  "ENG", "PROD", "DES", "SALES", "MKT", "CS", "FIN", "HR", "LEGOPS", "EXEC",
] as const;
export type DeptCode = typeof DEPT_CODES[number];

/** Map from department folder name → DEPT code. */
export const FOLDER_TO_DEPT: Record<string, DeptCode> = {
  "engineering": "ENG",
  "product": "PROD",
  "design": "DES",
  "sales": "SALES",
  "marketing": "MKT",
  "customer-success": "CS",
  "finance": "FIN",
  "hr": "HR",
  "legal-ops": "LEGOPS",
  "executive": "EXEC",
};
`;

writeFileSync(outFile, ts, "utf8");
console.log(`Written → ${outFile}`);
