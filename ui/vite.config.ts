import path from "path";
import fs from "fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Read the desktop app version so the UI can display it at runtime.
// Falls back to the UI package version if the desktop manifest isn't found.
function resolveAppVersion(): string {
  const desktopManifest = path.resolve(__dirname, "../desktop/package.json");
  if (fs.existsSync(desktopManifest)) {
    const { version } = JSON.parse(fs.readFileSync(desktopManifest, "utf-8"));
    if (typeof version === "string") return version;
  }
  const uiManifest = path.resolve(__dirname, "package.json");
  const { version } = JSON.parse(fs.readFileSync(uiManifest, "utf-8"));
  return version ?? "0.0.0";
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(resolveAppVersion()),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      lexical: path.resolve(__dirname, "./node_modules/lexical/Lexical.mjs"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3100",
        ws: true,
      },
    },
  },
});
