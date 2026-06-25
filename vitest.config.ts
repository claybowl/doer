import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      "packages/db",
      "packages/adapters/claude-local",
      "packages/adapters/opencode-local",
      "packages/adapters/letta-code",
      "server",
      "ui",
      "cli",
      "desktop",
    ],
  },
});
