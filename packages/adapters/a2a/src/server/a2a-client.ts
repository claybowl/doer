// ─── A2A Client — JSON-RPC 2.0 + SSE ────────────────────────────────────────
//
// Minimal A2A JSON-RPC 2.0 client using native fetch.
// Handles both non-streaming (message/send) and streaming (message/stream)
// via Server-Sent Events (SSE).
//
// No external dependencies — relies on Node 20+ native fetch + ReadableStream.

import type {
  A2aAdapterConfig,
  A2aAgentCard,
  A2aAgentInfo,
  A2aJsonRpcRequest,
  A2aJsonRpcResponse,
  A2aMessage,
  A2aStreamEvent,
  A2aTask,
  A2aTaskState,
} from "../shared/types.js";

const JSON_RPC_VERSION = "2.0" as const;
const A2A_METHOD_MESSAGE_SEND = "message/send";
const A2A_METHOD_MESSAGE_STREAM = "message/stream";
const A2A_METHOD_TASKS_GET = "tasks/get";
const A2A_METHOD_TASKS_CANCEL = "tasks/cancel";
const A2A_METHOD_AGENT_GET = "agent/get";

/** JSON-RPC error codes */
const A2A_ERROR_CODES: Record<string, string> = {
  // Standard JSON-RPC
  "-32700": "Parse error",
  "-32600": "Invalid Request",
  "-32601": "Method not found",
  "-32602": "Invalid params",
  "-32603": "Internal error",
  // A2A / server errors
  "-32000": "Bad request",
  "-32001": "Authentication required",
  "-32002": "Authorization failed",
  "-32003": "Resource exhausted",
  "-32004": "Rate limit exceeded",
  "-32005": "Agent error",
  "-32006": "Client error",
  "-32007": "Server error",
  "-32010": "Method not supported",
  "-32099": "Unimplemented error",
};

function buildHeaders(config: A2aAdapterConfig): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (config.authToken) {
    headers.Authorization = `Bearer ${config.authToken}`;
  }
  return headers;
}

function encodeSseData(line: string): string | null {
  // Strip comment lines and retry fields, extract data: payload
  if (line.startsWith(":") || line.startsWith("retry:")) return null;
  if (line.startsWith("data:")) {
    return line.slice(5).trimStart();
  }
  return null;
}

/** Parse an SSE byte stream from a fetch Response into A2A stream events. */
export async function* parseSseStream(
  response: Response | ReadableStream,
  onSseComment: (comment: string) => void = () => {},
): AsyncGenerator<A2aStreamEvent | { end: true } | { error: Error }> {
  let bodyStream: ReadableStream;
  if ("body" in response && response.body) {
    bodyStream = response.body;
  } else if (response instanceof ReadableStream) {
    bodyStream = response;
  } else {
    yield { error: new Error("SSE response has no body") };
    return;
  }

  const reader = bodyStream.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  /** Parse a single SSE data payload and yield corresponding events. */
  function* parsePayload(payload: string): Generator<A2aStreamEvent | { end: true }> {
    if (!payload) return;
    try {
      const obj = JSON.parse(payload);
      if (obj === true) {
        yield { end: true };
      } else if ("jsonrpc" in obj && "method" in obj && "params" in obj) {
        // A2A SSE uses JSON-RPC 2.0 notification format: {jsonrpc, method, params}
        yield obj.params as A2aStreamEvent;
      } else if ("taskId" in obj && "status" in obj) {
        yield obj as A2aStreamEvent;
      } else if ("taskId" in obj && "artifact" in obj) {
        yield obj as A2aStreamEvent;
      }
    } catch {
      /* ignore parse errors on partial data */
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        // Flush any remaining buffer
        if (buffer.trim()) {
          yield* parsePayload(buffer.trim());
        }
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      // Process complete SSE blocks (separated by blank lines)
      const blocks = buffer.split("\n\n");
      buffer = blocks.pop() ?? ""; // remainder (incomplete)
      for (const block of blocks) {
        const lines = block.split("\n");
        let dataLines: string[] = [];
        for (const line of lines) {
          if (line === "") continue;
          if (line.startsWith(":")) {
            onSseComment(line.slice(1));
            continue;
          }
          if (line.startsWith("data:")) {
            dataLines.push(line.slice(5).trimStart());
          }
        }
        const payload = dataLines.join("\n");
        if (!payload) continue;
        yield* parsePayload(payload);
      }
    }
  } catch (err: unknown) {
    yield { error: err instanceof Error ? err : new Error(String(err)) };
  } finally {
    reader.releaseLock();
  }
}

export class A2aClient {
  readonly config: A2aAdapterConfig;
  private cachedCard: A2aAgentInfo | null = null;
  /** Injectable fetch implementation for testability. Defaults to global fetch. */
  readonly fetchImpl: typeof globalThis.fetch;

  constructor(config: A2aAdapterConfig, fetchImpl?: typeof globalThis.fetch) {
    this.config = {
      ...config,
      endpointUrl: config.endpointUrl.replace(/\/+$/, ""),
    };
    this.fetchImpl = fetchImpl ?? globalThis.fetch;
  }

  /** Build the URL for a specific A2A JSON-RPC method (HTTP binding). */
  private methodUrl(method: string): string {
    // A2A JSON-RPC HTTP binding uses REST-style paths:
    //   message:send   → POST {base}/message:send
    //   message:stream → POST {base}/message:stream
    //   tasks/get      → POST {base}/tasks:get
    //   agent/get      → GET  {base}/agent:get  (or the agent card URL)
    return `${this.config.endpointUrl}/${method.replace("/", ":")}`;
  }

  private async rpcRequest<T>(
    method: string,
    params: unknown,
    signal?: AbortSignal,
  ): Promise<T> {
    const body: A2aJsonRpcRequest = {
      jsonrpc: JSON_RPC_VERSION,
      id: crypto.randomUUID(),
      method,
      params,
    };

    const url = this.methodUrl(method);
    const response = await this.fetchImpl(url, {
      method: "POST",
      headers: buildHeaders(this.config),
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const code = String(response.status);
      const text = await response.text().catch(() => "");
      const label = A2A_ERROR_CODES[code] ?? `HTTP ${code}`;
      throw new Error(`${label}: ${text || response.statusText}`);
    }

    const json: A2aJsonRpcResponse = await response.json();
    if (json.error) {
      const label = A2A_ERROR_CODES[String(json.error.code)] ?? "Unknown error";
      throw new Error(`${label} (${json.error.code}): ${json.error.message}`);
    }
    if (!json.result) {
      throw new Error("JSON-RPC response missing result");
    }
    return json.result as T;
  }

  /** Fetch and cache the remote agent's Agent Card. */
  async fetchAgentCard(): Promise<A2aAgentInfo> {
    if (this.cachedCard) return this.cachedCard;

    const cardUrl = this.config.agentCardUrl
      || `${this.config.endpointUrl}/.well-known/agent-card.json`;

    const response = await this.fetchImpl(cardUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Agent Card fetch failed: HTTP ${response.status} — ${cardUrl}`);
    }

    const card = (await response.json()) as A2aAgentCard;
    this.cachedCard = {
      card,
      capabilities: {
        streaming: !!card.capabilities?.streaming,
        pushNotifications: !!card.capabilities?.pushNotifications,
        extendedAgentCard: !!card.capabilities?.extendedAgentCard,
      },
      skills: card.skills ?? [],
    };
    return this.cachedCard;
  }

  /** Non-streaming: send a message and get the task response. */
  async sendMessage(
    message: A2aMessage,
    signal?: AbortSignal,
  ): Promise<A2aTask> {
    return this.rpcRequest<A2aTask>(
      A2A_METHOD_MESSAGE_SEND,
      { message },
      signal,
    );
  }

  /**
   * Streaming: send a message and yield SSE events as they arrive.
   * Returns when the stream ends ({ end: true }) or errors ({ error }).
   */
  async *streamMessage(
    message: A2aMessage,
    signal?: AbortSignal,
  ): AsyncGenerator<A2aStreamEvent | { end: true } | { error: Error }> {
    const body: A2aJsonRpcRequest = {
      jsonrpc: JSON_RPC_VERSION,
      id: crypto.randomUUID(),
      method: A2A_METHOD_MESSAGE_STREAM,
      params: { message },
    };

    const url = this.methodUrl(A2A_METHOD_MESSAGE_STREAM);
    const response = await this.fetchImpl(url, {
      method: "POST",
      headers: {
        ...buildHeaders(this.config),
        Accept: "text/event-stream",
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      const code = String(response.status);
      const label = A2A_ERROR_CODES[code] ?? `HTTP ${code}`;
      yield { error: new Error(`${label}: ${text || response.statusText}`) };
      return;
    }

    yield* parseSseStream(response);
  }

  /** Cancel an in-progress task. */
  async cancelTask(taskId: string, signal?: AbortSignal): Promise<void> {
    await this.rpcRequest<void>(
      A2A_METHOD_TASKS_CANCEL,
      { taskId },
      signal,
    );
  }

  /** Get task status. */
  async getTask(taskId: string, includeHistory = false, signal?: AbortSignal): Promise<A2aTask> {
    return this.rpcRequest<A2aTask>(
      A2A_METHOD_TASKS_GET,
      { taskId, historyLength: includeHistory ? 10 : 0 },
      signal,
    );
  }

  /** Convenience: check if the cached agent card supports streaming. */
  supportsStreaming(): boolean {
    return this.cachedCard?.capabilities.streaming ?? false;
  }
}

export { A2A_METHOD_MESSAGE_SEND, A2A_METHOD_MESSAGE_STREAM, A2A_ERROR_CODES };
export type { A2aTaskState };
