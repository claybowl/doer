import { describe, expect, it } from "vitest";
import {
  AGENT_ADAPTER_TYPES,
  CREATABLE_AGENT_ADAPTER_TYPES,
  LEGACY_AGENT_ADAPTER_TYPES,
} from "@doerai/shared";
import { findUIAdapter, listCreatableUIAdapters, LEGACY_LETTA_ADAPTER_TYPES } from "./registry";

describe("Agent adapter registry consistency", () => {
  it("keeps legacy parsers registered while keeping supported adapters creatable", () => {
    // Existing agents must keep resolving even though the type is deprecated.
    expect(findUIAdapter("letta_cloud")?.type).toBe("letta_cloud");
    expect(findUIAdapter("letta_cli")?.type).toBe("letta_cli");
    // agent_file is first-class, not a migration target.
    expect(findUIAdapter("agent_file")?.type).toBe("agent_file");

    const creatable = listCreatableUIAdapters().map((adapter) => adapter.type);
    expect(creatable).toContain("letta_code");
    expect(creatable).toContain("agent_file");
    expect(creatable).toContain("hermes_local");
    expect(creatable).toContain("a2a");
    expect(creatable).not.toContain("letta_cloud");
    expect(creatable).not.toContain("letta_cli");
  });

  // Each of these assertions corresponds to a real drift that shipped.
  it("never offers a deprecated adapter as a creation target", () => {
    for (const legacy of LEGACY_AGENT_ADAPTER_TYPES) {
      expect(CREATABLE_AGENT_ADAPTER_TYPES).not.toContain(legacy);
      expect(listCreatableUIAdapters().map((a) => a.type)).not.toContain(legacy);
    }
  });

  it("offers every creatable adapter and nothing else", () => {
    const creatable = listCreatableUIAdapters().map((a) => a.type).sort();
    expect(creatable).toEqual([...CREATABLE_AGENT_ADAPTER_TYPES].sort());
  });

  it("lists every creatable and legacy adapter in the canonical AGENT_ADAPTER_TYPES", () => {
    // a2a was registered on the server and offered in the picker while missing
    // from AGENT_ADAPTER_TYPES, so anything iterating the canonical list
    // silently skipped it.
    const canonical = new Set<string>(AGENT_ADAPTER_TYPES);
    for (const type of [...CREATABLE_AGENT_ADAPTER_TYPES, ...LEGACY_AGENT_ADAPTER_TYPES]) {
      expect(canonical.has(type)).toBe(true);
    }
  });

  it("resolves every canonical adapter to a registered UI adapter", () => {
    for (const type of AGENT_ADAPTER_TYPES) {
      expect(findUIAdapter(type)?.type, `no UI adapter registered for '${type}'`).toBe(type);
    }
  });

  it("mirrors the shared legacy list rather than re-declaring it", () => {
    expect([...LEGACY_LETTA_ADAPTER_TYPES].sort()).toEqual([...LEGACY_AGENT_ADAPTER_TYPES].sort());
  });
});