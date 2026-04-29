/**
 * Bulk-sets adapterConfig.model = 'opencode-go/kimi-k2.6' on every opencode_local agent.
 * Preserves all other adapterConfig fields via JSONB merge (||).
 *
 * Usage (from repo root):
 *   DATABASE_URL=<url> pnpm --filter @doerai/db set-opencode-model
 *   DATABASE_URL=<url> pnpm --filter @doerai/db set-opencode-model -- --dry-run
 */

import { eq, sql } from "drizzle-orm";
import { createDb } from "./client.js";
import { agents } from "./schema/index.js";

const TARGET_MODEL = "opencode-go/kimi-k2.6";
const isDryRun = process.argv.includes("--dry-run");

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");

const db = createDb(url);

// ── 1. Find all opencode_local agents ─────────────────────────────────────────

const targets = await db
  .select({
    id: agents.id,
    name: agents.name,
    companyId: agents.companyId,
    adapterConfig: agents.adapterConfig,
  })
  .from(agents)
  .where(eq(agents.adapterType, "opencode_local"));

if (targets.length === 0) {
  console.log("No opencode_local agents found — nothing to do.");
  process.exit(0);
}

// ── 2. Preview ────────────────────────────────────────────────────────────────

console.log(`\nFound ${targets.length} opencode_local agent(s):\n`);
for (const agent of targets) {
  const currentModel = (agent.adapterConfig as Record<string, unknown>)?.model ?? "(none)";
  const arrow =
    currentModel === TARGET_MODEL
      ? "  (already correct)"
      : `  ${String(currentModel)} → ${TARGET_MODEL}`;
  console.log(`  • [${agent.id.slice(0, 8)}] ${agent.name}${arrow}`);
}

const alreadyCorrect = targets.filter(
  (a) => (a.adapterConfig as Record<string, unknown>)?.model === TARGET_MODEL,
).length;

const toUpdate = targets.length - alreadyCorrect;

if (toUpdate === 0) {
  console.log(`\nAll agents already have model="${TARGET_MODEL}" — nothing to update.`);
  process.exit(0);
}

if (isDryRun) {
  console.log(`\n[dry-run] Would update ${toUpdate} agent(s). Re-run without --dry-run to apply.`);
  process.exit(0);
}

// ── 3. Apply JSONB merge update ───────────────────────────────────────────────
// Uses Postgres || operator to merge only the model key — all other config preserved.

const result = await db
  .update(agents)
  .set({
    adapterConfig: sql`${agents.adapterConfig} || ${JSON.stringify({ model: TARGET_MODEL })}::jsonb`,
    updatedAt: new Date(),
  })
  .where(eq(agents.adapterType, "opencode_local"))
  .returning({ id: agents.id, name: agents.name });

console.log(`\n✓ Updated ${result.length} agent(s) → model="${TARGET_MODEL}"`);
for (const r of result) {
  console.log(`  • [${r.id.slice(0, 8)}] ${r.name}`);
}

process.exit(0);
