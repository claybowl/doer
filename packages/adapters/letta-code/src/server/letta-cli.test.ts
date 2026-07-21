import { describe, expect, it } from "vitest";
import { parseLettaCliVersion, parseModDiagnostics } from "./letta-cli.js";

describe("Letta CLI companion discovery", () => {
  it("parses common CLI version output", () => {
    expect(parseLettaCliVersion("letta-code 0.27.30\n")).toBe("0.27.30");
    expect(parseLettaCliVersion("v0.27.30")).toBe("0.27.30");
    expect(parseLettaCliVersion("unknown")).toBeNull();
  });

  it("normalizes loaded and failed mod diagnostics", () => {
    expect(parseModDiagnostics(JSON.stringify({
      loaded: [{ name: "memory-tools", version: "1.2.0" }],
      failed: [{ name: "broken-mod", error: "missing export" }],
    }))).toEqual({
      mods: [
        { name: "memory-tools", status: "loaded", version: "1.2.0" },
        { name: "broken-mod", status: "failed", error: "missing export" },
      ],
    });
  });

  it("returns an empty inventory for malformed diagnostics", () => {
    expect(parseModDiagnostics("not-json")).toEqual({ mods: [] });
  });
});
