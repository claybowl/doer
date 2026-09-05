import { describe, expect, it, vi } from "vitest";
import type { AdapterExecutionContext } from "@doerai/adapter-utils";
import { buildDoerAgentTools } from "./doer-tools.js";

describe("buildDoerAgentTools", () => {
  it("registers the existing issue and fleet operations as local SDK tools", () => {
    const tools = buildDoerAgentTools({} as AdapterExecutionContext);
    expect(tools.map((tool) => tool.name)).toEqual(expect.arrayContaining([
      "create_paperclip_issue",
      "read_paperclip_issues",
      "read_paperclip_issue",
      "update_paperclip_issue",
      "post_issue_comment",
      "write_output",
      "get_fleet_status",
      "schedule_council",
      "emergency_pause_agent",
      "generate_weekly_brief",
    ]));
    expect(new Set(tools.map((tool) => tool.name)).size).toBe(tools.length);
    expect(tools.every((tool) => tool.parameters && typeof tool.execute === "function")).toBe(true);
  });
});

describe("write_output tool", () => {
  function makeCtx(): AdapterExecutionContext {
    return {
      runId: "run-1",
      authToken: "tok-1",
      agent: { id: "agent-1", companyId: "company-1", name: "Builder", adapterType: "letta_code", adapterConfig: {} },
      runtime: { sessionId: null, sessionParams: null, sessionDisplayId: null, taskKey: null },
      config: {},
      context: {},
      onLog: vi.fn(async () => undefined),
    } as AdapterExecutionContext;
  }

  function resultText(out: unknown): Record<string, unknown> {
    const content = (out as { content: Array<{ text: string }> }).content;
    return JSON.parse(content[0]!.text) as Record<string, unknown>;
  }

  it("posts deliverable content to the agent-tools write-output endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ deliverableId: "d-1", filename: "2026-08-10-brief.md" }), { status: 200 })),
    );
    try {
      const tool = buildDoerAgentTools(makeCtx()).find((t) => t.name === "write_output")!;
      const out = await tool.execute("call-1", {
        title: "Brief",
        content: "# Hi",
        kind: "md",
        issue_id: "123e4567-e89b-42d3-a456-426614174000",
      });

      const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as unknown as [string, RequestInit];
      expect(url).toContain("/api/companies/company-1/agent-tools/write-output");
      expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok-1");
      expect(JSON.parse(String(init.body))).toMatchObject({
        title: "Brief",
        content: "# Hi",
        kind: "md",
        issueId: "123e4567-e89b-42d3-a456-426614174000",
        projectId: null,
      });
      expect(resultText(out)).toMatchObject({ deliverableId: "d-1" });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("rejects calls missing title or content without hitting the API", async () => {
    vi.stubGlobal("fetch", vi.fn());
    try {
      const tool = buildDoerAgentTools(makeCtx()).find((t) => t.name === "write_output")!;
      const out = await tool.execute("call-1", { title: "", content: "" });
      expect(resultText(out)).toMatchObject({ success: false });
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("produce_deliverable tool", () => {
  function makeCtx(): AdapterExecutionContext {
    return {
      runId: "run-1",
      authToken: "tok-1",
      agent: { id: "agent-1", companyId: "company-1", name: "Builder", adapterType: "letta_code", adapterConfig: {} },
      runtime: { sessionId: null, sessionParams: null, sessionDisplayId: null, taskKey: null },
      config: {},
      context: {},
      onLog: vi.fn(async () => undefined),
    } as AdapterExecutionContext;
  }

  function resultText(out: unknown): Record<string, unknown> {
    const content = (out as { content: Array<{ text: string }> }).content;
    return JSON.parse(content[0]!.text) as Record<string, unknown>;
  }

  it("decodes base64 content and posts it as multipart to the deliverables endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ id: "d-9", filename: "note.md" }), { status: 201 })),
    );
    try {
      const tool = buildDoerAgentTools(makeCtx()).find((t) => t.name === "produce_deliverable")!;
      const out = await tool.execute("call-1", {
        kind: "md",
        filename: "note.md",
        title: "Note",
        file_content_base64: Buffer.from("hello file").toString("base64"),
        issue_id: "123e4567-e89b-42d3-a456-426614174000",
      });

      const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as unknown as [string, RequestInit];
      expect(url).toContain("/api/companies/company-1/deliverables");
      expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok-1");
      expect((init.headers as Record<string, string>)["X-Doer-Run-Id"]).toBe("run-1");
      const form = init.body as FormData;
      expect(form.get("kind")).toBe("md");
      expect(form.get("filename")).toBe("note.md");
      expect(form.get("title")).toBe("Note");
      expect(form.get("issueId")).toBe("123e4567-e89b-42d3-a456-426614174000");
      expect(await (form.get("file") as File).text()).toBe("hello file");
      expect(resultText(out)).toMatchObject({ success: true, deliverableId: "d-9" });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("rejects calls missing required fields without hitting the API", async () => {
    vi.stubGlobal("fetch", vi.fn());
    try {
      const tool = buildDoerAgentTools(makeCtx()).find((t) => t.name === "produce_deliverable")!;
      const out = await tool.execute("call-1", { kind: "md", filename: "note.md" });
      expect(resultText(out)).toMatchObject({ success: false });
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
