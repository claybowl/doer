import { describe, expect, it } from "vitest";
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
      "get_fleet_status",
      "schedule_council",
      "emergency_pause_agent",
      "generate_weekly_brief",
    ]));
    expect(new Set(tools.map((tool) => tool.name)).size).toBe(tools.length);
    expect(tools.every((tool) => tool.parameters && typeof tool.execute === "function")).toBe(true);
  });
});
