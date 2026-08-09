import { describe, expect, it, vi } from "vitest";
import { A2aClient, parseSseStream } from "./a2a-client.js";
import type { A2aMessage, A2aTask, A2aTaskStatusUpdateEvent } from "../shared/types.js";

describe("parseSseStream", () => {
  function streamFromChunks(chunks: string[]): ReadableStream {
    const encoder = new TextEncoder();
    return new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      },
    });
  }

  it("yields SSE data blocks as parsed JSON objects", async () => {
    const stream = streamFromChunks([
      'data: {"jsonrpc":"2.0","method":"status-update","params":{"taskId":"task-1","status":{"state":"WORKING"}}}\n\n',
      'data: {"jsonrpc":"2.0","method":"status-update","params":{"taskId":"task-1","status":{"state":"COMPLETED"}}}\n\n',
    ]);

    const results: unknown[] = [];
    for await (const obj of parseSseStream(stream)) {
      results.push(obj);
    }

    expect(results).toHaveLength(2);
    expect(results[0]).toHaveProperty("taskId", "task-1");
    expect(results[1]).toHaveProperty("taskId", "task-1");
  });

  it("handles multi-line data fields", async () => {
    // SSE spec: consecutive data: lines are joined with \n
    // Split the JSON at a comma so the rejoined payload is valid JSON
    const stream = streamFromChunks([
      'data: {"jsonrpc":"2.0",\n',
      'data: "method":"status-update","params": {"taskId":"t1","status":{"state":"WORKING"}}}\n\n',
    ]);

    const results: unknown[] = [];
    for await (const obj of parseSseStream(stream)) {
      results.push(obj);
    }

    expect(results).toHaveLength(1);
    expect(results[0]).toHaveProperty("taskId", "t1");
  });

  it("skips empty data and comment lines", async () => {
    const stream = streamFromChunks([
      ": this is a comment\n\n",
      "data: \n\n",
      'data: {"taskId":"t1","status":{"state":"WORKING"}}\n\n',
    ]);

    const results: unknown[] = [];
    for await (const obj of parseSseStream(stream)) {
      results.push(obj);
    }

    expect(results).toHaveLength(1);
    expect(results[0]).toHaveProperty("taskId", "t1");
  });

  it("yields { end: true } when data is true", async () => {
    const stream = streamFromChunks([
      "data: true\n\n",
    ]);

    const results: unknown[] = [];
    for await (const obj of parseSseStream(stream)) {
      results.push(obj);
    }

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ end: true });
  });
});

function makeMessage(): A2aMessage {
  return {
    messageId: crypto.randomUUID(),
    role: "user",
    parts: [{ type: "text", text: "Hello" }],
  };
}

describe("A2aClient", () => {
  describe("constructor", () => {
    it("parses endpointUrl", () => {
      const client = new A2aClient({
        endpointUrl: "https://agents.example.com/a2a",
      });
      expect(client.config.endpointUrl).toBe("https://agents.example.com/a2a");
    });

    it("strips trailing slash from endpointUrl", () => {
      const client = new A2aClient({
        endpointUrl: "https://agents.example.com/a2a/",
      });
      expect(client.config.endpointUrl).toBe("https://agents.example.com/a2a");
    });
  });

  describe("sendMessage (non-streaming)", () => {
    it("sends a JSON-RPC 2.0 message/send request", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          jsonrpc: "2.0",
          result: { id: "task-1", kind: "task", contextId: "ctx-1", status: { state: "COMPLETED" } } as unknown as A2aTask,
        }),
      });

      const client = new A2aClient(
        { endpointUrl: "https://agents.example.com/a2a" },
        mockFetch,
      );

      const task = await client.sendMessage(makeMessage());

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toBe("https://agents.example.com/a2a/message:send");
      expect(opts.method).toBe("POST");

      const body = JSON.parse(opts.body);
      expect(body.jsonrpc).toBe("2.0");
      expect(body.method).toBe("message/send");
      expect(body.id).toBeTruthy();
      expect(body.params.message).toBeDefined();

      expect(task.id).toBe("task-1");
    });

    it("throws on non-200 response", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve("Unauthorized"),
      });

      const client = new A2aClient(
        { endpointUrl: "https://agents.example.com/a2a" },
        mockFetch,
      );

      await expect(client.sendMessage(makeMessage())).rejects.toThrow(/Unauthorized/);
    });
  });

  describe("streamMessage (SSE)", () => {
    it("yields parsed SSE events from the event stream", async () => {
      const sseData = [
        'data: {"jsonrpc":"2.0","method":"status-update","params":{"taskId":"task-1","status":{"state":"WORKING"}}}\n\n',
        'data: {"jsonrpc":"2.0","method":"status-update","params":{"taskId":"task-1","status":{"state":"COMPLETED"}}}\n\n',
      ].join("");

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(sseData));
            controller.close();
          },
        }),
      });

      const client = new A2aClient(
        { endpointUrl: "https://agents.example.com/a2a" },
        mockFetch,
      );

      const events: unknown[] = [];
      for await (const evt of client.streamMessage(makeMessage())) {
        events.push(evt);
      }

      expect(events).toHaveLength(2);
      const update1 = events[0] as A2aTaskStatusUpdateEvent;
      expect(update1.taskId).toBe("task-1");
      const update2 = events[1] as A2aTaskStatusUpdateEvent;
      expect(update2.taskId).toBe("task-1");
    });

    it("yields error when response is not ok", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Internal Error"),
      });

      const client = new A2aClient(
        { endpointUrl: "https://agents.example.com/a2a" },
        mockFetch,
      );

      const events: unknown[] = [];
      for await (const evt of client.streamMessage(makeMessage())) {
        events.push(evt);
      }

      expect(events).toHaveLength(1);
      expect(events[0]).toHaveProperty("error");
    });
  });

  describe("supportsStreaming", () => {
    it("returns true when agent card declares streaming", () => {
      const client = new A2aClient({
        endpointUrl: "https://agents.example.com/a2a",
        agentCardUrl: "https://agents.example.com/.well-known/agent-card.json",
      });
      client["cachedCard"] = {
        card: {
          name: "TestAgent",
          url: "https://agents.example.com/a2a",
          version: "1.0.0",
          defaultInputModes: ["text"],
          defaultOutputModes: ["text"],
          capabilities: { streaming: true },
          skills: [],
        },
        capabilities: { streaming: true, pushNotifications: false, extendedAgentCard: false },
        skills: [],
      };
      expect(client.supportsStreaming()).toBe(true);
    });

    it("returns false when streaming is not declared", () => {
      const client = new A2aClient({
        endpointUrl: "https://agents.example.com/a2a",
      });
      expect(client.supportsStreaming()).toBe(false);
    });
  });

  describe("cancelTask", () => {
    it("sends a tasks/cancel JSON-RPC request", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          jsonrpc: "2.0",
          result: { id: "task-1", status: { state: "CANCELED" } } as unknown as Partial<A2aTask>,
        }),
      });

      const client = new A2aClient(
        { endpointUrl: "https://agents.example.com/a2a" },
        mockFetch,
      );

      await client.cancelTask("task-1");

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.method).toBe("tasks/cancel");
      expect(body.params.taskId).toBe("task-1");
    });
  });

  describe("getTask", () => {
    it("sends a tasks/get JSON-RPC request", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          jsonrpc: "2.0",
          result: { id: "task-42", status: { state: "COMPLETED" } } as unknown as A2aTask,
        }),
      });

      const client = new A2aClient(
        { endpointUrl: "https://agents.example.com/a2a" },
        mockFetch,
      );

      const task = await client.getTask("task-42");

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.method).toBe("tasks/get");
      expect(body.params.taskId).toBe("task-42");
      expect(task.id).toBe("task-42");
    });
  });
});
