import { definePlugin, runWorker } from "@doerai/plugin-sdk";

import type { AfImportJobInput, AfImportJobResult } from "./af/types.js";
import { parseAfFile } from "./af/parse.js";
import { buildLecoFileMap } from "./af/unpack.js";
import { writeLecoToDisk } from "./af/write.js";

const PLUGIN_NAME = "af-import";
const ACTION_KEY = "import-af-file";

/**
 * Worker lifecycle for the .af-import plugin.
 *
 * Registers a single action (`import-af-file`) that the UI invokes to
 * unpack a .af file into a target directory. The action runs the full
 * pipeline (parse → file map → disk) and returns an AfImportJobResult
 * with success state, file count, warnings, and the unpacked agent's
 * metadata.
 *
 * Pure functions (`parseAfFile`, `buildLecoFileMap`) are also exported
 * from `index.ts` for direct use without going through the action — the
 * adapter `letta-af-opencode` can keep using them internally.
 */
const plugin = definePlugin({
  async setup(ctx) {
    ctx.logger.info(`${PLUGIN_NAME} plugin setup complete`);

    ctx.actions.register(ACTION_KEY, async (params): Promise<AfImportJobResult> => {
      const input = params as unknown as AfImportJobInput;

      if (typeof input.afContent !== "string" || input.afContent.length === 0) {
        throw new Error(`'afContent' is required and must be a non-empty string`);
      }
      if (typeof input.targetDirectory !== "string" || input.targetDirectory.length === 0) {
        throw new Error(`'targetDirectory' is required and must be a non-empty string`);
      }

      const options = input.options ?? {};

      const parsed = parseAfFile(input.afContent);
      const fileMap = buildLecoFileMap(parsed.af, {
        excludeMessages: options.excludeMessages ?? true,
      });
      const written = await writeLecoToDisk(fileMap, input.targetDirectory, {
        overwrite: options.overwrite ?? false,
      });

      const warnings = [...parsed.warnings, ...written.warnings];
      if (warnings.length > 0) {
        ctx.logger.warn(
          `${PLUGIN_NAME}: imported '${parsed.af.agent.name}' with ${warnings.length} warning(s)`,
        );
        for (const w of warnings) {
          ctx.logger.warn(`  ${w}`);
        }
      }

      return {
        success: true,
        unpackedTo: written.unpackedTo,
        fileCount: written.fileCount,
        warnings,
        agentMetadata: {
          name: parsed.af.agent.name,
          model: parsed.af.agent.model ?? null,
          toolCount: (parsed.af.tools ?? []).length,
          blockCount: parsed.af.memory_blocks.length,
        },
      };
    });

    ctx.logger.info(`${PLUGIN_NAME}: action '${ACTION_KEY}' registered`);
  },

  async onHealth() {
    return {
      status: "ok",
      message: `.af-import plugin ready — action '${ACTION_KEY}' registered`,
    };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
