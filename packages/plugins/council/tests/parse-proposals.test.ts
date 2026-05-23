import { describe, it, expect } from "vitest";
import { parseProposals } from "../src/parse-proposals.js";

describe("parseProposals", () => {
  it("extracts JSON proposals from agent response", () => {
    const response = `Here are my issue proposals:

\`\`\`json
[
  {"title": "Fix auth bug", "description": "Token refresh fails", "priority": "high"},
  {"title": "Add pagination", "priority": "medium"}
]
\`\`\`

That's what I recommend.`;

    const proposals = parseProposals(response);
    expect(proposals).toHaveLength(2);
    expect(proposals[0]!.title).toBe("Fix auth bug");
    expect(proposals[0]!.priority).toBe("high");
    expect(proposals[1]!.title).toBe("Add pagination");
  });

  it("returns empty array when no JSON block", () => {
    expect(parseProposals("No structured output here")).toEqual([]);
  });

  it("returns empty array on invalid JSON", () => {
    expect(parseProposals("```json\nnot valid\n```")).toEqual([]);
  });

  it("filters out entries with no title", () => {
    const response = '```json\n[{"title": "Good one"}, {"description": "no title"}]\n```';
    const proposals = parseProposals(response);
    expect(proposals).toHaveLength(1);
    expect(proposals[0]!.title).toBe("Good one");
  });
});
