import { definePlugin, runWorker } from "@doerai/plugin-sdk";

const PLUGIN_NAME = "af-import";
const HEALTH_MESSAGE =
  ".af-import plugin loaded — UI surface mounted; import job stubbed (Session 2-3 will wire it).";

/**
 * Worker lifecycle for the .af-import plugin.
 *
 * Tonight: no-op except for setup logging + health probe response.
 * Session 2: add the importAfFile job (parse + unpack + optional git init).
 * Session 3: wire UI to call into the job and surface progress.
 */
const plugin = definePlugin({
  async setup(ctx) {
    ctx.logger.info(`${PLUGIN_NAME} plugin setup complete`);
    ctx.logger.info(
      "see doc/plans/2026-04-26-af-import-plugin.md for implementation roadmap",
    );
  },

  async onHealth() {
    return { status: "ok", message: HEALTH_MESSAGE };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
