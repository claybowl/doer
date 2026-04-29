import type { AfFile } from "./types.js";

/**
 * Parse + validate a .af file.
 *
 * Pure function — no I/O, no side effects. Caller reads the file, passes
 * the content here, gets back a typed AfFile or an error.
 *
 * Tonight: minimal validation. Session 2 will add deeper schema checks
 * and return a proper Result<AfFile, ParseError[]> so the UI can show
 * field-level diagnostics.
 */
export function parseAfFile(content: string): AfFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    throw new Error(
      `Could not parse .af content as JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(".af content is not a JSON object");
  }
  const obj = parsed as Record<string, unknown>;

  // Minimal required-field checks. Session 2 will be much stricter.
  const agent = obj.agent;
  if (!agent || typeof agent !== "object" || Array.isArray(agent)) {
    throw new Error(".af is missing required 'agent' object");
  }
  const agentObj = agent as Record<string, unknown>;
  if (typeof agentObj.name !== "string" || agentObj.name.trim().length === 0) {
    throw new Error(".af agent is missing required 'name' field");
  }
  if (typeof agentObj.system !== "string") {
    throw new Error(".af agent is missing required 'system' field");
  }

  const blocks = obj.memory_blocks;
  if (!Array.isArray(blocks)) {
    throw new Error(".af is missing required 'memory_blocks' array");
  }

  // We trust the rest of the structure for now — pass it through verbatim.
  // Round-tripping (re-export to .af) requires preserving unknown keys.
  return parsed as AfFile;
}
