import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applyDataDirOverride } from "../config/data-dir.js";

const ORIGINAL_ENV = { ...process.env };

describe("applyDataDirOverride", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.DOER_HOME;
    delete process.env.DOER_CONFIG;
    delete process.env.DOER_CONTEXT;
    delete process.env.DOER_INSTANCE_ID;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("sets DOER_HOME and isolated default config/context paths", () => {
    const home = applyDataDirOverride({
      dataDir: "~/doer-data",
      config: undefined,
      context: undefined,
    }, { hasConfigOption: true, hasContextOption: true });

    const expectedHome = path.resolve(os.homedir(), "doer-data");
    expect(home).toBe(expectedHome);
    expect(process.env.DOER_HOME).toBe(expectedHome);
    expect(process.env.DOER_CONFIG).toBe(
      path.resolve(expectedHome, "instances", "default", "config.json"),
    );
    expect(process.env.DOER_CONTEXT).toBe(path.resolve(expectedHome, "context.json"));
    expect(process.env.DOER_INSTANCE_ID).toBe("default");
  });

  it("uses the provided instance id when deriving default config path", () => {
    const home = applyDataDirOverride({
      dataDir: "/tmp/doer-alt",
      instance: "dev_1",
      config: undefined,
      context: undefined,
    }, { hasConfigOption: true, hasContextOption: true });

    expect(home).toBe(path.resolve("/tmp/doer-alt"));
    expect(process.env.DOER_INSTANCE_ID).toBe("dev_1");
    expect(process.env.DOER_CONFIG).toBe(
      path.resolve("/tmp/doer-alt", "instances", "dev_1", "config.json"),
    );
  });

  it("does not override explicit config/context settings", () => {
    process.env.DOER_CONFIG = "/env/config.json";
    process.env.DOER_CONTEXT = "/env/context.json";

    applyDataDirOverride({
      dataDir: "/tmp/doer-alt",
      config: "/flag/config.json",
      context: "/flag/context.json",
    }, { hasConfigOption: true, hasContextOption: true });

    expect(process.env.DOER_CONFIG).toBe("/env/config.json");
    expect(process.env.DOER_CONTEXT).toBe("/env/context.json");
  });

  it("only applies defaults for options supported by the command", () => {
    applyDataDirOverride(
      {
        dataDir: "/tmp/doer-alt",
      },
      { hasConfigOption: false, hasContextOption: false },
    );

    expect(process.env.DOER_HOME).toBe(path.resolve("/tmp/doer-alt"));
    expect(process.env.DOER_CONFIG).toBeUndefined();
    expect(process.env.DOER_CONTEXT).toBeUndefined();
  });
});
