import esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, "..");

// Bundle worker — all deps inlined so the plugin runs outside the workspace
await esbuild.build({
  entryPoints: [path.join(packageRoot, "src/worker.ts")],
  outfile: path.join(packageRoot, "dist/worker.js"),
  bundle: true,
  format: "esm",
  platform: "node",
  target: ["node20"],
  sourcemap: true,
  external: [],          // inline everything — the SDK has no native deps
  logLevel: "info",
});

// Manifest as CJS — bypasses Electron's ESM import cache so routePath
// validation always sees the latest constants (no stale cached module).
// Footer unwraps esbuild's default-export wrapper so `require(path)` returns
// the manifest object directly (not `{ default: manifest, __esModule: true }`).
await esbuild.build({
  entryPoints: [path.join(packageRoot, "src/manifest.ts")],
  outfile: path.join(packageRoot, "dist/manifest.cjs"),
  bundle: true,
  format: "cjs",
  platform: "node",
  target: ["node20"],
  external: [],
  footer: { js: "if (module.exports && module.exports.default) module.exports = module.exports.default;" },
  logLevel: "info",
});

// Bundle UI — React externalized (host provides it)
await esbuild.build({
  entryPoints: [path.join(packageRoot, "src/ui/index.tsx")],
  outfile: path.join(packageRoot, "dist/ui/index.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  sourcemap: true,
  external: [
    "react",
    "react-dom",
    "react/jsx-runtime",
    "@doerai/plugin-sdk/ui",
  ],
  logLevel: "info",
});
