import { LettaAgentClient, type CreateAgentOptions } from "@letta-ai/letta-agent-sdk";
import path from "node:path";
import type { LettaCodePermissionMode } from "../shared/types.js";

export interface LettaImportSnapshot {
  name: string;
  model?: string;
  systemPrompt?: string;
  blocks: Array<{
    label: string;
    value: string;
    description?: string;
    readOnly?: boolean;
    limit?: number;
  }>;
}

export interface LettaLocalImportOptions {
  memoryDir: string;
  stateDir?: string;
  cwd?: string;
  permissionMode?: LettaCodePermissionMode;
}

export interface LettaLocalImportClient {
  createAgent(options: CreateAgentOptions): Promise<string>;
}

export async function createLocalAgentFromSnapshot(
  snapshot: LettaImportSnapshot,
  options: LettaLocalImportOptions,
  createClient: () => LettaLocalImportClient = () => new LettaAgentClient({
    backend: "local",
    transport: "app-server",
    appServer: { harnessBackend: "local" },
  }),
): Promise<string> {
  const memoryDir = options.memoryDir.trim();
  if (!memoryDir) throw new Error("A Doer MemFS directory is required for Letta migration");
  const env = {
    MEMORY_DIR: memoryDir,
    LETTA_MEMORY_DIR: memoryDir,
    LETTA_MEMORY_DIR_EXPLICIT: "1",
    LETTA_LOCAL_BACKEND_DIR: options.stateDir?.trim()
      ? path.join(options.stateDir, "letta-local-backend")
      : path.join(path.dirname(memoryDir), ".letta-local-backend"),
  };
  const createOptions = {
    name: snapshot.name,
    ...(snapshot.model ? { model: snapshot.model } : {}),
    ...(snapshot.systemPrompt ? { systemPrompt: snapshot.systemPrompt } : {}),
    memory: snapshot.blocks.map((block) => ({
      label: block.label,
      value: block.value,
      ...(block.description ? { description: block.description } : {}),
      ...(block.readOnly === undefined ? {} : { read_only: block.readOnly }),
      ...(block.limit === undefined ? {} : { limit: block.limit }),
    })),
    memfs: true,
    ...(options.cwd ? { cwd: options.cwd } : {}),
    permissionMode: options.permissionMode ?? "standard",
    env,
  } as CreateAgentOptions;
  const localAgentId = await createClient().createAgent(createOptions);
  if (!localAgentId.startsWith("agent-local-")) {
    throw new Error(`Expected a local Letta agent ID, received ${localAgentId}`);
  }
  return localAgentId;
}
