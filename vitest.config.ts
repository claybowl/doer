import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      "packages/db",
      "packages/adapter-utils",
      "packages/adapters/claude-local",
      "packages/adapters/opencode-local",
      "packages/adapters/letta-code",
      "packages/adapters/letta-cloud",
      "packages/adapters/a2a",
      "server",
      "ui",
      "cli",
      "desktop",
    ],
  },
});
