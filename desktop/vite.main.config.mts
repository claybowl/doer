import { defineConfig } from "vite";

// Bake build-time constants into the main process bundle.
// DOER_UPDATE_URL is the public base URL of the R2 bucket where releases live.
// Empty string → auto-updater disabled at runtime.
const updateUrl = process.env.DOER_UPDATE_URL ?? "";

export default defineConfig({
	define: {
		__DOER_UPDATE_URL__: JSON.stringify(updateUrl),
	},
});
