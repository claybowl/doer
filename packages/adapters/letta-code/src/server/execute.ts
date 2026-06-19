import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import Letta from "@letta-ai/letta-client";
import type { AdapterExecutionContext, AdapterExecutionResult } from "@doerai/adapter-utils";
import type {
  LettaCodeAdapterConfig,
  LettaCodeOfflineConfig,
  LettaCodeOnlineConfig,
  LettaCodeMemoryBlock,
  LettaCodeMemoryUpdate,
} from "../shared/types.js";

// ── Emit helpers ──────────────────────────────────────────────────────────
// Emits JSON lines in the same format as letta-cloud so the existing
// parseLettaCloudStdoutLine UI parser handles this adapter without changes.

async function emit(ctx: AdapterExecutionContext, payload: Record<string, unknown>): Promise<void> {
  await ctx.onLog("stdout", JSON.stringify(payload) + "\n");
}

function safeStringify(value: unknown): string {
  try { return JSON.stringify(value); } catch { return String(value); }
}

function parseToolArgs(args: unknown): unknown {
  if (typeof args !== "string") return args ?? {};
  try { return JSON.parse(args); } catch { return { raw: args }; }
}

function extractTextContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((p: unknown) => {
        if (typeof p === "string") return p;
        const r = p as Record<string, unknown> | null;
        return r && typeof r.text === "string" ? r.text : "";
      })
      .filter(Boolean)
      .join("");
  }
  return "";
}

// ── User message builder ──────────────────────────────────────────────────

function buildUserMessage(
  ctx: AdapterExecutionContext,
  heartbeatPrompt: string | undefined,
): string {
  if (typeof ctx.context.message === "string" && ctx.context.message) return ctx.context.message;
  if (typeof ctx.context.prompt === "string" && ctx.context.prompt) return ctx.context.prompt;
  return heartbeatPrompt?.trim() || "Hello";
}

// ─────────────────────────────────────────────────────────────────────────────
// ONLINE MODE — delegates to the Letta server (api.letta.com or self-hosted)
// ─────────────────────────────────────────────────────────────────────────────

const LETTA_CLOUD_BASE = "https://api.letta.com";

function getLettaClient(config: LettaCodeOnlineConfig): Letta {
  const raw = config.baseUrl?.trim() || LETTA_CLOUD_BASE;
  // Strip trailing /v1 — the SDK appends its own version path
  const baseURL = raw.replace(/\/v\d+\/?$/, "");
  const isLocal = baseURL.includes("localhost") || baseURL.includes("127.0.0.1");
  return new Letta({
    apiKey: config.apiKey || (isLocal ? "sk-local" : ""),
    baseURL,
  });
}

async function executeOnline(
  ctx: AdapterExecutionContext,
  config: LettaCodeOnlineConfig,
): Promise<AdapterExecutionResult> {
  if (!config.agentId || !config.apiKey) {
    await ctx.onLog("stderr", "[letta-code/online] Missing agentId or apiKey\n");
    return { exitCode: 1, signal: null, timedOut: false, errorMessage: "agentId and apiKey required for online mode" };
  }

  const userMessage = buildUserMessage(ctx, config.heartbeatPrompt);

  await ctx.onMeta?.({
    adapterType: "letta_code",
    command: "letta-code/online",
    prompt: userMessage,
    context: { mode: "online", agentId: config.agentId, baseUrl: config.baseUrl ?? LETTA_CLOUD_BASE },
  });

  await emit(ctx, { type: "user_message", content: userMessage });

  const client = getLettaClient(config);
  let inputTokens = 0;
  let outputTokens = 0;
  let stepCount = 0;

  // Stream-token accumulator — merges consecutive same-kind chunks so the UI
  // doesn't split words across separate transcript nodes.
  type StreamKind = "assistant" | "reasoning";
  type StreamBuffer = { kind: StreamKind; messageId: string | null; text: string };
  let streamBuffer: StreamBuffer | null = null;

  async function flushStreamBuffer(): Promise<void> {
    if (!streamBuffer || streamBuffer.text.length === 0) { streamBuffer = null; return; }
    await emit(ctx, {
      type: streamBuffer.kind === "assistant" ? "assistant_message" : "reasoning_message",
      content: streamBuffer.text,
    });
    streamBuffer = null;
  }

  async function appendToStreamBuffer(kind: StreamKind, messageId: string | null, text: string): Promise<void> {
    if (!text) return;
    if (streamBuffer && (streamBuffer.kind !== kind || streamBuffer.messageId !== messageId)) {
      await flushStreamBuffer();
    }
    if (!streamBuffer) streamBuffer = { kind, messageId, text: "" };
    streamBuffer.text += text;
  }

  const STREAMABLE_TYPES = new Set(["assistant_message", "reasoning_message"]);

  try {
    const stream = await client.agents.messages.create(config.agentId, {
      messages: [{ role: "user", content: userMessage }],
      streaming: true,
      stream_tokens: true,
    });

    for await (const chunk of stream) {
      const rec = chunk as unknown as Record<string, unknown>;
      const messageType = String(rec.message_type ?? "");

      if (!STREAMABLE_TYPES.has(messageType) && streamBuffer) {
        await flushStreamBuffer();
      }

      switch (messageType) {
        case "assistant_message": {
          const text = extractTextContent(rec.content);
          const mid = typeof rec.id === "string" ? rec.id : null;
          await appendToStreamBuffer("assistant", mid, text);
          break;
        }
        case "reasoning_message": {
          const text = typeof rec.reasoning === "string" ? rec.reasoning : "";
          const mid = typeof rec.id === "string" ? rec.id : null;
          await appendToStreamBuffer("reasoning", mid, text);
          break;
        }
        case "tool_call_message": {
          const toolCalls = rec.tool_calls ?? (rec.tool_call ? [rec.tool_call] : []);
          if (Array.isArray(toolCalls)) {
            for (const tc of toolCalls) {
              const call = tc as Record<string, unknown>;
              const name = typeof call.name === "string" ? call.name : "unknown";
              const toolCallId = typeof call.tool_call_id === "string" ? call.tool_call_id : undefined;
              const input = parseToolArgs(call.arguments ?? call.input);
              await emit(ctx, { type: "tool_call_message", name, input, toolCallId });
            }
          }
          break;
        }
        case "tool_return_message": {
          const toolReturn = typeof rec.tool_return === "string" ? rec.tool_return : safeStringify(rec.tool_return);
          const toolCallId = typeof rec.tool_call_id === "string" ? rec.tool_call_id : "";
          const status = typeof rec.status === "string" ? rec.status : "success";
          await emit(ctx, {
            type: "tool_return_message",
            content: toolReturn,
            toolCallId,
            isError: status === "error" || rec.is_err === true,
          });
          break;
        }
        case "usage_statistics": {
          inputTokens = typeof rec.prompt_tokens === "number" ? rec.prompt_tokens : inputTokens;
          outputTokens = typeof rec.completion_tokens === "number" ? rec.completion_tokens : outputTokens;
          stepCount = typeof rec.step_count === "number" ? rec.step_count : stepCount;
          await emit(ctx, {
            type: "usage_statistics",
            inputTokens,
            outputTokens,
            totalTokens: inputTokens + outputTokens,
            stepCount,
          });
          break;
        }
        case "error_message": {
          const errMsg = typeof rec.message === "string" ? rec.message : "Unknown Letta error";
          await ctx.onLog("stderr", `[letta-code/online] ${errMsg}\n`);
          break;
        }
        case "stop_reason":
          await emit(ctx, { type: "stop_reason", reason: rec.stop_reason ?? "unknown" });
          break;
        case "ping":
          break;
        default:
          await emit(ctx, { type: "unknown", messageType, raw: safeStringify(rec) });
      }
    }

    if (streamBuffer) await flushStreamBuffer();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await ctx.onLog("stderr", `[letta-code/online] Error: ${message}\n`);
    return { exitCode: 1, signal: null, timedOut: false, errorMessage: message };
  }

  return {
    exitCode: 0,
    signal: null,
    timedOut: false,
    model: config.model,
    provider: "letta",
    usage: { inputTokens, outputTokens },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// OFFLINE MODE — pure in-process, local .md files + any LLM backend
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_MODEL = "claude-sonnet-4-6";
const DEFAULT_MAX_TOKENS = 8192;

// ── Provider presets ────────────────────────────────────────────────────────
// Groq, NVIDIA NIM, Ollama (local + cloud), OpenCode Zen and OpenAI all speak
// the same /v1/chat/completions contract. One fetch path + this table covers
// every one of them. Anthropic is the only backend with its own SDK shape.
interface ProviderPreset {
  baseUrl: string;
  /** Env var holding the key. null = no key required (local Ollama). */
  envKey: string | null;
  label: string;
}

const OPENAI_COMPAT_PRESETS: Record<string, ProviderPreset> = {
  openai:       { baseUrl: "https://api.openai.com/v1",           envKey: "OPENAI_API_KEY",   label: "OpenAI" },
  groq:         { baseUrl: "https://api.groq.com/openai/v1",      envKey: "GROQ_API_KEY",     label: "Groq" },
  nvidia:       { baseUrl: "https://integrate.api.nvidia.com/v1", envKey: "NVIDIA_API_KEY",   label: "NVIDIA NIM" },
  opencode_zen: { baseUrl: "https://opencode.ai/zen/v1",          envKey: "OPENCODE_API_KEY", label: "OpenCode Zen" },
  ollama_cloud: { baseUrl: "https://ollama.com/v1",               envKey: "OLLAMA_API_KEY",   label: "Ollama Cloud" },
  ollama:       { baseUrl: "http://localhost:11434/v1",           envKey: null,               label: "Ollama (local)" },
};

export interface ResolvedProvider {
  kind: "anthropic" | "openai_compat";
  baseUrl: string;
  /** null when a key is required but unset — caller surfaces the error. */
  apiKey: string | null;
  envKey: string | null;
  label: string;
}

/**
 * Resolve a provider config → concrete base URL + key. Key precedence:
 *   adapterConfig.apiKey → Doer env binding → process env → (ollama: placeholder)
 */
export function resolveProvider(
  config: { provider?: string; baseUrl?: string; apiKey?: string },
  env: Record<string, string>,
): ResolvedProvider {
  const provider = config.provider || "anthropic";
  if (provider === "anthropic") {
    return {
      kind: "anthropic",
      baseUrl: "https://api.anthropic.com",
      apiKey: config.apiKey || env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || null,
      envKey: "ANTHROPIC_API_KEY",
      label: "Anthropic",
    };
  }
  const preset = OPENAI_COMPAT_PRESETS[provider] ?? OPENAI_COMPAT_PRESETS.openai;
  const fromEnv = preset.envKey ? env[preset.envKey] || process.env[preset.envKey] || "" : "";
  // Local Ollama needs no key; send a harmless placeholder so the header exists.
  const apiKey = config.apiKey || fromEnv || (preset.envKey === null ? "ollama" : "");
  return {
    kind: "openai_compat",
    baseUrl: config.baseUrl?.trim() || preset.baseUrl,
    apiKey: apiKey || null,
    envKey: preset.envKey,
    label: preset.label,
  };
}

/** Stream an OpenAI-compatible /chat/completions response. */
async function streamOpenAICompat(
  ctx: AdapterExecutionContext,
  resolved: ResolvedProvider,
  args: { model: string; maxTokens: number; temperature?: number; systemPrompt: string; userMessage: string },
): Promise<{ fullResponse: string; inputTokens: number; outputTokens: number }> {
  const url = `${resolved.baseUrl.replace(/\/$/, "")}/chat/completions`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(resolved.apiKey ? { Authorization: `Bearer ${resolved.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: args.model,
      max_tokens: args.maxTokens,
      temperature: args.temperature,
      stream: true,
      stream_options: { include_usage: true },
      messages: [
        { role: "system", content: args.systemPrompt },
        { role: "user", content: args.userMessage },
      ],
    }),
  });

  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    throw new Error(`${resolved.label} HTTP ${res.status}: ${body.slice(0, 300)}`);
  }

  let fullResponse = "";
  let inputTokens = 0;
  let outputTokens = 0;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      let json: Record<string, unknown>;
      try { json = JSON.parse(data); } catch { continue; }
      const choices = json.choices as Array<{ delta?: { content?: string } }> | undefined;
      const delta = choices?.[0]?.delta?.content;
      if (typeof delta === "string" && delta) {
        fullResponse += delta;
        await emit(ctx, { type: "assistant_message", content: delta });
      }
      const usage = json.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined;
      if (usage) {
        inputTokens = usage.prompt_tokens ?? inputTokens;
        outputTokens = usage.completion_tokens ?? outputTokens;
      }
    }
  }
  return { fullResponse, inputTokens, outputTokens };
}

/**
 * Resolve the offline memory directory. Precedence:
 *   1. explicit adapterConfig.memoryDir
 *   2. LETTA_MEMFS_DIR  — symlink in the workspace from a memory binding
 *   3. DOER_AGENT_MEMORY_DIR — native agent workspace memory folder
 * Doer injects (2) and (3) onto ctx.config.env at run time.
 */
export function resolveOfflineMemoryDir(
  ctx: AdapterExecutionContext,
  config: LettaCodeOfflineConfig,
): string | undefined {
  const explicit = config.memoryDir?.trim();
  if (explicit) return explicit;
  const env = ((ctx.config as Record<string, unknown>).env ?? {}) as Record<string, string>;
  const bound = env.LETTA_MEMFS_DIR?.trim() || env.DOER_AGENT_MEMORY_DIR?.trim();
  return bound || undefined;
}

async function loadMemoryBlocks(memoryDir: string): Promise<LettaCodeMemoryBlock[]> {
  if (!existsSync(memoryDir)) {
    await mkdir(memoryDir, { recursive: true });
    return [];
  }
  const entries = await readdir(memoryDir, { withFileTypes: true });
  const mdFiles = entries
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .sort((a, b) => a.name.localeCompare(b.name));

  const blocks: LettaCodeMemoryBlock[] = [];
  for (const entry of mdFiles) {
    const filePath = path.join(memoryDir, entry.name);
    const content = await readFile(filePath, "utf-8");
    blocks.push({ label: entry.name.replace(/\.md$/, ""), content, filePath });
  }
  return blocks;
}

async function writeMemoryBlock(block: LettaCodeMemoryBlock, content: string): Promise<void> {
  await mkdir(path.dirname(block.filePath), { recursive: true });
  await writeFile(block.filePath, content, "utf-8");
}

function parseMemoryUpdates(text: string): LettaCodeMemoryUpdate[] {
  const updates: LettaCodeMemoryUpdate[] = [];
  const regex = /<memory_update\s+label="([^"]+)">([\s\S]*?)<\/memory_update>/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    updates.push({ label: match[1], content: match[2].replace(/^\n/, "").replace(/\n$/, "") });
  }
  return updates;
}

function buildOfflineSystemPrompt(basePrompt: string, blocks: LettaCodeMemoryBlock[]): string {
  const parts: string[] = [basePrompt.trim() || "You are a helpful AI agent."];

  if (blocks.length > 0) {
    parts.push("\n\n## Memory\n");
    parts.push("These are your persistent memory blocks. Read them first, then respond.\n");
    for (const block of blocks) {
      parts.push(`### ${block.label}\n${block.content.trim()}`);
    }
    parts.push("\n## Memory Update Protocol");
    parts.push(
      "To persist a change to memory, include in your response:\n" +
      '<memory_update label="BLOCK_LABEL">\nnew content\n</memory_update>\n' +
      "Available blocks: " + blocks.map((b) => b.label).join(", ") + "\n" +
      "You may create new blocks by using a new label.",
    );
  }

  return parts.join("\n");
}

async function executeOffline(
  ctx: AdapterExecutionContext,
  config: LettaCodeOfflineConfig,
): Promise<AdapterExecutionResult> {
  // memoryDir may be set explicitly in adapterConfig, OR provided implicitly by
  // a Doer memory binding. The memfs layer mounts the bound folder and exposes
  // it via LETTA_MEMFS_DIR (symlink in the workspace → live source dir, so
  // writes persist) or DOER_AGENT_MEMORY_DIR (native workspace fallback).
  const memoryDir = resolveOfflineMemoryDir(ctx, config);
  if (!memoryDir) {
    await ctx.onLog(
      "stderr",
      "[letta-code/offline] No memory directory — set adapterConfig.memoryDir or attach a memory binding (provides LETTA_MEMFS_DIR)\n",
    );
    return { exitCode: 1, signal: null, timedOut: false, errorMessage: "memoryDir not configured" };
  }

  const model = config.model || DEFAULT_MODEL;
  const maxTokens = config.maxTokens ?? DEFAULT_MAX_TOKENS;
  // Resolve the LLM backend: anthropic (native SDK) or any OpenAI-compatible
  // provider (Groq, Ollama, NVIDIA, OpenCode Zen, …) via preset base URL.
  const offlineEnv = ((ctx.config as Record<string, unknown>).env ?? {}) as Record<string, string>;
  const resolved = resolveProvider(config, offlineEnv);

  if (!resolved.apiKey) {
    await ctx.onLog(
      "stderr",
      `[letta-code/offline] No API key for ${resolved.label} — set ${resolved.envKey} or adapterConfig.apiKey\n`,
    );
    return { exitCode: 1, signal: null, timedOut: false, errorMessage: `Missing API key (${resolved.label})` };
  }

  let blocks: LettaCodeMemoryBlock[] = [];
  try {
    blocks = await loadMemoryBlocks(memoryDir);
    await ctx.onLog("stdout", `[letta-code/offline] ${blocks.length} block(s) from ${memoryDir}\n`);
  } catch (err) {
    await ctx.onLog("stderr", `[letta-code/offline] Failed to load blocks: ${err instanceof Error ? err.message : String(err)}\n`);
    return { exitCode: 1, signal: null, timedOut: false, errorMessage: "Memory block load failed" };
  }

  const systemPrompt = buildOfflineSystemPrompt(config.systemPrompt ?? "", blocks);
  const userMessage = buildUserMessage(ctx, config.heartbeatPrompt);

  await ctx.onMeta?.({
    adapterType: "letta_code",
    command: "letta-code/offline",
    prompt: userMessage,
    context: { mode: "offline", provider: resolved.label, model, memoryDir, blocks: blocks.length },
  });

  await emit(ctx, { type: "user_message", content: userMessage });

  let fullResponse = "";
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    if (resolved.kind === "anthropic") {
      const client = new Anthropic({ apiKey: resolved.apiKey });
      const stream = client.messages.stream({
        model,
        max_tokens: maxTokens,
        temperature: config.temperature,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      });

      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          fullResponse += event.delta.text;
          await emit(ctx, { type: "assistant_message", content: event.delta.text });
        }
        if (event.type === "message_start" && event.message.usage) {
          inputTokens = event.message.usage.input_tokens ?? 0;
        }
        if (event.type === "message_delta" && event.usage) {
          outputTokens = event.usage.output_tokens ?? 0;
        }
      }
    } else {
      const out = await streamOpenAICompat(ctx, resolved, {
        model,
        maxTokens,
        temperature: config.temperature,
        systemPrompt,
        userMessage,
      });
      fullResponse = out.fullResponse;
      inputTokens = out.inputTokens;
      outputTokens = out.outputTokens;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await ctx.onLog("stderr", `[letta-code/offline] ${resolved.label} error: ${message}\n`);
    return { exitCode: 1, signal: null, timedOut: false, errorMessage: message };
  }

  await emit(ctx, {
    type: "usage_statistics",
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    stepCount: 1,
  });

  // Persist any memory updates the LLM emitted
  const updates = parseMemoryUpdates(fullResponse);
  for (const update of updates) {
    const existing = blocks.find((b) => b.label === update.label);
    const filePath = existing?.filePath ?? path.join(memoryDir, `${update.label}.md`);
    try {
      await writeMemoryBlock({ label: update.label, content: update.content, filePath }, update.content);
      await emit(ctx, { type: "tool_call_message", name: "memory_update", input: { label: update.label } });
      await ctx.onLog("stdout", `[letta-code/offline] updated block "${update.label}"\n`);
    } catch (err) {
      await ctx.onLog("stderr", `[letta-code/offline] write block "${update.label}" failed: ${err instanceof Error ? err.message : String(err)}\n`);
    }
  }

  await emit(ctx, { type: "stop_reason", reason: "end_turn" });

  return {
    exitCode: 0,
    signal: null,
    timedOut: false,
    model,
    provider: config.provider || "anthropic",
    usage: { inputTokens, outputTokens },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────────────────────────────────────

export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const config = ctx.config as unknown as LettaCodeAdapterConfig;
  const mode = (config as unknown as Record<string, unknown>).mode ?? "offline";

  if (mode === "online") {
    return executeOnline(ctx, config as LettaCodeOnlineConfig);
  }
  return executeOffline(ctx, config as LettaCodeOfflineConfig);
}
