import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdapterExecutionContext } from "@doerai/adapter-utils";
import { captureRunOutputs, kindForFilename } from "./output-sweep.js";

const ISSUE_UUID = "123e4567-e89b-42d3-a456-426614174000";

function makeCtx(overrides: Record<string, unknown> = {}): AdapterExecutionContext {
  return {
    runId: "run-1",
    authToken: "tok-1",
    agent: { id: "agent-1", companyId: "company-1", name: "Builder", adapterType: "letta_code", adapterConfig: {} },
    runtime: { sessionId: null, sessionParams: null, sessionDisplayId: null, taskKey: null },
    config: {},
    context: { issueId: ISSUE_UUID },
    onLog: vi.fn(async () => undefined),
    ...overrides,
  } as AdapterExecutionContext;
}

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "output-sweep-"));
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 201 })));
});

afterEach(async () => {
  vi.unstubAllGlobals();
  await fs.rm(tmpDir, { recursive: true, force: true });
});

function fetchMock(): ReturnType<typeof vi.fn> {
  return fetch as unknown as ReturnType<typeof vi.fn>;
}

describe("kindForFilename", () => {
  it("maps known extensions to deliverable kinds", () => {
    expect(kindForFilename("report.md")).toBe("md");
    expect(kindForFilename("chart.PNG")).toBe("png");
    expect(kindForFilename("data.csv")).toBe("csv");
    expect(kindForFilename("page.html")).toBe("html");
    expect(kindForFilename("brief.pdf")).toBe("pdf");
    expect(kindForFilename("book.xlsx")).toBe("xlsx");
  });

  it("falls back to other for unknown or missing extensions", () => {
    expect(kindForFilename("notes.txt")).toBe("other");
    expect(kindForFilename("archive.zip")).toBe("other");
    expect(kindForFilename("README")).toBe("other");
  });
});

describe("captureRunOutputs", () => {
  it("uploads files written into outputs/ during the run window", async () => {
    await fs.mkdir(path.join(tmpDir, "outputs"));
    await fs.writeFile(path.join(tmpDir, "outputs", "report.md"), "# hello");
    const runStartMs = Date.now() - 1_000;

    const result = await captureRunOutputs(makeCtx(), tmpDir, runStartMs);

    expect(result).toEqual({ captured: 1, failed: 0 });
    expect(fetchMock()).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock().mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/api/companies/company-1/deliverables");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok-1");
    expect((init.headers as Record<string, string>)["X-Doer-Run-Id"]).toBe("run-1");
    const form = init.body as FormData;
    expect(form.get("kind")).toBe("md");
    expect(form.get("filename")).toBe("report.md");
    expect(form.get("issueId")).toBe(ISSUE_UUID);
    expect(form.get("description")).toBe("Auto-captured from outputs/report.md");
  });

  it("ignores files written before the run started", async () => {
    await fs.mkdir(path.join(tmpDir, "outputs"));
    const oldFile = path.join(tmpDir, "outputs", "old.md");
    await fs.writeFile(oldFile, "stale");
    const past = new Date(Date.now() - 60_000);
    await fs.utimes(oldFile, past, past);

    const result = await captureRunOutputs(makeCtx(), tmpDir, Date.now());

    expect(result).toEqual({ captured: 0, failed: 0 });
    expect(fetchMock()).not.toHaveBeenCalled();
  });

  it("scans deliverables/ recursively but skips node_modules", async () => {
    await fs.mkdir(path.join(tmpDir, "deliverables", "deep", "nested"), { recursive: true });
    await fs.writeFile(path.join(tmpDir, "deliverables", "deep", "nested", "chart.png"), "png-bytes");
    await fs.mkdir(path.join(tmpDir, "outputs", "node_modules"), { recursive: true });
    await fs.writeFile(path.join(tmpDir, "outputs", "node_modules", "junk.md"), "junk");

    const result = await captureRunOutputs(makeCtx(), tmpDir, Date.now() - 1_000);

    expect(result).toEqual({ captured: 1, failed: 0 });
    const [, init] = fetchMock().mock.calls[0] as unknown as [string, RequestInit];
    expect((init.body as FormData).get("filename")).toBe("chart.png");
    expect((init.body as FormData).get("kind")).toBe("png");
  });

  it("omits issueId when the wake-context id is not a UUID", async () => {
    await fs.mkdir(path.join(tmpDir, "outputs"));
    await fs.writeFile(path.join(tmpDir, "outputs", "report.md"), "# hello");
    const ctx = makeCtx({ context: { issueId: "DON-2213" } });

    const result = await captureRunOutputs(ctx, tmpDir, Date.now() - 1_000);

    expect(result.captured).toBe(1);
    const [, init] = fetchMock().mock.calls[0] as unknown as [string, RequestInit];
    expect((init.body as FormData).get("issueId")).toBeNull();
  });

  it("tolerates upload failures without throwing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 500 })));
    await fs.mkdir(path.join(tmpDir, "outputs"));
    await fs.writeFile(path.join(tmpDir, "outputs", "report.md"), "# hello");
    const ctx = makeCtx();

    const result = await captureRunOutputs(ctx, tmpDir, Date.now() - 1_000);

    expect(result).toEqual({ captured: 0, failed: 1 });
    expect(ctx.onLog).toHaveBeenCalledWith("stderr", expect.stringContaining("Failed to capture outputs/report.md"));
  });

  it("returns zeroes when no scan directories exist", async () => {
    const result = await captureRunOutputs(makeCtx(), tmpDir, Date.now() - 1_000);

    expect(result).toEqual({ captured: 0, failed: 0 });
    expect(fetchMock()).not.toHaveBeenCalled();
  });
});
