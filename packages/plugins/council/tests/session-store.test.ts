// tests/session-store.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSessionStore } from "../src/session-store.js";
import type { CouncilSession, CouncilConfig } from "@doerai/shared";

function makeMockCtx() {
  const entities = new Map<string, Record<string, unknown>>();
  const state = new Map<string, unknown>();

  return {
    entities: {
      upsert: vi.fn(async (input: Record<string, unknown>) => {
        const id = (input.externalId as string) || "test-id";
        const record = { id, ...input, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        entities.set(id, record);
        return record;
      }),
      list: vi.fn(async ({ scopeId }: { scopeId?: string; externalId?: string; [k: string]: unknown }) => {
        return [...entities.values()].filter(
          (e) => !scopeId || e.scopeId === scopeId
        );
      }),
    },
    state: {
      set: vi.fn(async (_scope: unknown, value: unknown) => {
        const key = (_scope as { stateKey: string }).stateKey;
        state.set(key, value);
      }),
      get: vi.fn(async (scope: unknown) => {
        const key = (scope as { stateKey: string }).stateKey;
        return state.get(key) ?? null;
      }),
    },
  };
}

describe("session-store", () => {
  let ctx: ReturnType<typeof makeMockCtx>;
  let store: ReturnType<typeof createSessionStore>;

  beforeEach(() => {
    ctx = makeMockCtx();
    store = createSessionStore(ctx as never);
  });

  it("creates a session and retrieves it", async () => {
    const session = await store.createSession({
      companyId: "co-1",
      sessionTypeId: "full_council",
      invocationMode: "parallel",
      resolutionMode: "orchestrator",
      triggeredBy: "manual",
    });

    expect(session.companyId).toBe("co-1");
    expect(session.sessionTypeId).toBe("full_council");
    expect(session.status).toBe("pending");

    const retrieved = await store.getSession(session.id, "co-1");
    expect(retrieved?.id).toBe(session.id);
  });

  it("updates session status", async () => {
    const session = await store.createSession({
      companyId: "co-1",
      sessionTypeId: "full_council",
      invocationMode: "parallel",
      resolutionMode: "orchestrator",
      triggeredBy: "manual",
    });

    await store.updateSession(session.id, "co-1", { status: "running" });
    const updated = await store.getSession(session.id, "co-1");
    expect(updated?.status).toBe("running");
  });

  it("saves and loads config", async () => {
    const config: CouncilConfig = {
      companyId: "co-1",
      enabledSessionTypes: ["full_council"],
      defaultSessionTypeId: "full_council",
      invocationMode: "parallel",
      resolutionMode: "orchestrator",
      agenda: {
        prompts: ["What needs doing?"],
        perAgent: {},
        outputConstraints: { minIssues: 1, maxIssues: 5 },
      },
      participants: { full_council: [] },
    };

    await store.saveConfig("co-1", config);
    const loaded = await store.getConfig("co-1");
    expect(loaded?.participants).toEqual({ full_council: [] });
  });
});
