// packages/plugins/council/src/worker.ts
// Stub — full implementation in Task 6
import { definePlugin, runWorker } from "@doerai/plugin-sdk";
import type { PluginContext } from "@doerai/plugin-sdk";

const plugin = definePlugin({
  async setup(_ctx: PluginContext) {
    // TODO: implement in Task 6
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
