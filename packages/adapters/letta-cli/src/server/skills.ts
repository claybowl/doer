import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import type {
  AdapterSkillContext,
  AdapterSkillSnapshot,
} from "@doerai/adapter-utils";
import {
  asString,
  buildPersistentSkillSnapshot,
  ensurePaperclipSkillSymlink,
  readPaperclipRuntimeSkillEntries,
  readInstalledSkillTargets,
  resolvePaperclipDesiredSkillNames,
} from "@doerai/adapter-utils/server-utils";

const execFileAsync = promisify(execFile);
const __moduleDir = path.dirname(fileURLToPath(import.meta.url));

// Letta Code's own native skill system (`letta skills list/delete`) also lives
// under the MemFS "skills" root. Doer-managed skills go in a clearly separate
// subdirectory so the two systems never collide or stomp on each other.
const DOER_SKILLS_SUBDIR = "doer-managed";

function resolveLettaCliMemoryDir(config: Record<string, unknown>): string | null {
  const agentId = asString(config.agentId, "");
  if (!agentId) return null;
  const backend = asString(config.backend, "api");
  const home = os.homedir();
  return backend === "local"
    ? path.join(home, ".letta", "lc-local-backend", "memfs", agentId, "memory")
    : path.join(home, ".letta", "agents", agentId, "memory");
}

function resolveLettaCliSkillsHome(config: Record<string, unknown>): string | null {
  const memoryDir = resolveLettaCliMemoryDir(config);
  return memoryDir ? path.join(memoryDir, "skills", DOER_SKILLS_SUBDIR) : null;
}

async function commitMemfsChange(memoryDir: string, message: string): Promise<void> {
  try {
    await execFileAsync("git", ["add", "-A"], { cwd: memoryDir });
    await execFileAsync("git", ["commit", "-q", "-m", message, "--no-verify"], { cwd: memoryDir });
  } catch {
    // Best-effort: MemFS clone may not exist locally yet, or there's nothing to commit.
  }
}

async function buildLettaCliSkillSnapshot(config: Record<string, unknown>): Promise<AdapterSkillSnapshot> {
  const availableEntries = await readPaperclipRuntimeSkillEntries(config, __moduleDir);
  const desiredSkills = resolvePaperclipDesiredSkillNames(config, availableEntries);
  const skillsHome = resolveLettaCliSkillsHome(config);
  const installed = skillsHome ? await readInstalledSkillTargets(skillsHome) : new Map();
  const backend = asString(config.backend, "api");

  return buildPersistentSkillSnapshot({
    adapterType: "letta_cli",
    availableEntries,
    desiredSkills,
    installed,
    skillsHome: skillsHome ?? "",
    locationLabel:
      backend === "local"
        ? "~/.letta/lc-local-backend/memfs/<agent>/memory/skills/doer-managed"
        : "~/.letta/agents/<agent>/memory/skills/doer-managed",
    missingDetail: "Configured but not currently linked into the agent's MemFS skills directory.",
    externalConflictDetail: "Skill name is occupied by an external installation.",
    externalDetail: "Installed outside Doer management.",
  });
}

export async function listLettaCliSkills(ctx: AdapterSkillContext): Promise<AdapterSkillSnapshot> {
  return buildLettaCliSkillSnapshot(ctx.config);
}

export async function syncLettaCliSkills(
  ctx: AdapterSkillContext,
  desiredSkills: string[],
): Promise<AdapterSkillSnapshot> {
  const availableEntries = await readPaperclipRuntimeSkillEntries(ctx.config, __moduleDir);
  const desiredSet = new Set([
    ...desiredSkills,
    ...availableEntries.filter((entry) => entry.required).map((entry) => entry.key),
  ]);
  const memoryDir = resolveLettaCliMemoryDir(ctx.config);
  const skillsHome = resolveLettaCliSkillsHome(ctx.config);

  if (memoryDir && skillsHome) {
    await fs.mkdir(skillsHome, { recursive: true });
    const installed = await readInstalledSkillTargets(skillsHome);
    const availableByRuntimeName = new Map(availableEntries.map((entry) => [entry.runtimeName, entry]));

    let changed = false;
    for (const available of availableEntries) {
      if (!desiredSet.has(available.key)) continue;
      const target = path.join(skillsHome, available.runtimeName);
      const result = await ensurePaperclipSkillSymlink(available.source, target);
      if (result !== "skipped") changed = true;
    }

    for (const [name, installedEntry] of installed.entries()) {
      const available = availableByRuntimeName.get(name);
      if (!available) continue;
      if (desiredSet.has(available.key)) continue;
      if (installedEntry.targetPath !== available.source) continue;
      await fs.unlink(path.join(skillsHome, name)).catch(() => {});
      changed = true;
    }

    if (changed) {
      await commitMemfsChange(
        memoryDir,
        `Sync Doer-managed skills: ${[...desiredSet].join(", ") || "(none)"}`,
      );
    }
  }

  return buildLettaCliSkillSnapshot(ctx.config);
}
