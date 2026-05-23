// packages/plugins/council/src/parse-proposals.ts
import type { IssueProposal } from "@doerai/shared";

/**
 * Extracts structured issue proposals from an agent's response.
 *
 * Agents are instructed to output proposals in a fenced ```json block.
 * This parser finds the last such block and attempts to parse it as
 * IssueProposal[]. Returns [] on any failure so the session degrades
 * gracefully rather than erroring.
 */
export function parseProposals(response: string): IssueProposal[] {
  const blocks = [...response.matchAll(/```json\s*([\s\S]*?)```/g)];
  if (blocks.length === 0) return [];

  const lastBlock = blocks[blocks.length - 1]!;
  const raw = lastBlock[1]?.trim() ?? "";

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  const valid: IssueProposal[] = [];
  for (const item of parsed) {
    if (
      typeof item === "object" &&
      item !== null &&
      typeof (item as Record<string, unknown>).title === "string"
    ) {
      const entry = item as Record<string, unknown>;
      valid.push({
        title: entry.title as string,
        description:
          typeof entry.description === "string" ? entry.description : undefined,
        priority: ["critical", "high", "medium", "low"].includes(
          String(entry.priority),
        )
          ? (entry.priority as IssueProposal["priority"])
          : undefined,
        assigneeAgentId:
          typeof entry.assigneeAgentId === "string"
            ? entry.assigneeAgentId
            : undefined,
        goalId:
          typeof entry.goalId === "string" ? entry.goalId : undefined,
      });
    }
  }
  return valid;
}
