import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PluginLoader } from "./plugin-loader.js";
import { logger } from "../middleware/logger.js";

type Logger = typeof logger;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function installBundledPlugins(
  loader: PluginLoader,
  log: Logger = logger,
): Promise<void> {
  const bundledPluginsDir = path.resolve(__dirname, "../../bundled-plugins");

  if (!fs.existsSync(bundledPluginsDir)) {
    // Dev mode — no bundled-plugins dir, nothing to do.
    return;
  }

  let slugs: string[];
  try {
    slugs = fs.readdirSync(bundledPluginsDir);
  } catch (err) {
    log.error({ err }, "bundled-plugin-installer: failed to read bundled-plugins dir");
    return;
  }

  let installed = 0;

  for (const slug of slugs) {
    const srcDir = path.join(bundledPluginsDir, slug);

    // Skip non-directories.
    try {
      if (!fs.statSync(srcDir).isDirectory()) continue;
    } catch {
      continue;
    }

    const pkgJsonPath = path.join(srcDir, "package.json");
    if (!fs.existsSync(pkgJsonPath)) {
      log.warn({ slug }, "bundled-plugin-installer: no package.json, skipping");
      continue;
    }

    let pkgName: string;
    try {
      const raw = fs.readFileSync(pkgJsonPath, "utf-8");
      pkgName = (JSON.parse(raw) as { name?: string }).name ?? slug;
    } catch (err) {
      log.error({ err, slug }, "bundled-plugin-installer: failed to parse package.json, skipping");
      continue;
    }

    const dest = path.join(os.homedir(), ".doer", "plugins", slug);

    try {
      fs.cpSync(srcDir, dest, { recursive: true, force: true });
    } catch (err) {
      log.error({ err, slug, dest }, "bundled-plugin-installer: failed to copy plugin, skipping");
      continue;
    }

    try {
      await loader.installPlugin({ localPath: dest });
      log.info({ slug, pkgName, dest }, "bundled-plugin-installer: installed");
      installed++;
    } catch (err) {
      log.error({ err, slug, dest }, "bundled-plugin-installer: installPlugin failed");
    }
  }

  log.info({ count: installed }, "bundled-plugin-installer: done");
}
