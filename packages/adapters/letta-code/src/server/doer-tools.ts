import type { AnyAgentTool } from "@letta-ai/letta-agent-sdk";
import type { AdapterExecutionContext } from "@doerai/adapter-utils";
import {
  ANALYZE_ISSUE_PATTERNS_TOOL_NAME,
  AUDIT_AGENT_COMPLIANCE_TOOL_NAME,
  BUILD_DEPENDENCY_GRAPH_TOOL_NAME,
  BULK_DISPATCH_TOOL_NAME,
  CLONE_FROM_TEMPLATE_TOOL_NAME,
  CREATE_GOAL_TOOL_NAME,
  CREATE_PAPERCLIP_ISSUE_TOOL_NAME,
  CREATE_PROJECT_TOOL_NAME,
  EMERGENCY_PAUSE_AGENT_TOOL_NAME,
  FORECAST_CAPACITY_TOOL_NAME,
  GENERATE_WEEKLY_BRIEF_TOOL_NAME,
  GET_FLEET_STATUS_TOOL_NAME,
  POST_ISSUE_COMMENT_TOOL_NAME,
  PRODUCE_DELIVERABLE_TOOL_NAME,
  READ_GOALS_TOOL_NAME,
  READ_PAPERCLIP_ISSUE_TOOL_NAME,
  READ_PAPERCLIP_ISSUES_TOOL_NAME,
  READ_PROJECTS_TOOL_NAME,
  REASSIGN_TASK_TOOL_NAME,
  SCAN_FLEET_ANOMALIES_TOOL_NAME,
  SCHEDULE_COUNCIL_TOOL_NAME,
  UPDATE_GOAL_STATUS_TOOL_NAME,
  UPDATE_PAPERCLIP_ISSUE_TOOL_NAME,
  UPDATE_PROJECT_TOOL_NAME,
  WRITE_OUTPUT_TOOL_NAME,
  interceptAnalyzeIssuePatterns,
  interceptAuditAgentCompliance,
  interceptBuildDependencyGraph,
  interceptBulkDispatch,
  interceptCloneFromTemplate,
  interceptCreateGoal,
  interceptCreatePaperclipIssue,
  interceptCreateProject,
  interceptEmergencyPauseAgent,
  interceptForecastCapacity,
  interceptGenerateWeeklyBrief,
  interceptGetFleetStatus,
  interceptPostIssueComment,
  interceptProduceDeliverable,
  interceptReadGoals,
  interceptReadPaperclipIssue,
  interceptReadPaperclipIssues,
  interceptReadProjects,
  interceptReassignTask,
  interceptScanFleetAnomalies,
  interceptScheduleCouncil,
  interceptUpdateGoalStatus,
  interceptUpdatePaperclipIssue,
  interceptUpdateProject,
  interceptWriteOutput,
} from "./tool-intercepts.js";

type Handler = (ctx: AdapterExecutionContext, args: Record<string, unknown>) => Promise<string | void>;

const TOOL_SPECS: Array<[name: string, description: string, handler: Handler]> = [
  [READ_GOALS_TOOL_NAME, "List company goals with optional level and status filters.", interceptReadGoals],
  [CREATE_GOAL_TOOL_NAME, "Create a goal in the current Doer company.", interceptCreateGoal],
  [UPDATE_GOAL_STATUS_TOOL_NAME, "Update a Doer goal status.", interceptUpdateGoalStatus],
  [READ_PROJECTS_TOOL_NAME, "List projects in the current Doer company.", interceptReadProjects],
  [CREATE_PROJECT_TOOL_NAME, "Create a goal-linked project in the current Doer company.", interceptCreateProject],
  [UPDATE_PROJECT_TOOL_NAME, "Update a Doer project.", interceptUpdateProject],
  [CREATE_PAPERCLIP_ISSUE_TOOL_NAME, "Create a company-scoped Doer issue.", interceptCreatePaperclipIssue],
  [READ_PAPERCLIP_ISSUES_TOOL_NAME, "List and filter company-scoped Doer issues.", interceptReadPaperclipIssues],
  [READ_PAPERCLIP_ISSUE_TOOL_NAME, "Read one Doer issue by ID or identifier.", interceptReadPaperclipIssue],
  [UPDATE_PAPERCLIP_ISSUE_TOOL_NAME, "Update a Doer issue's fields or status.", interceptUpdatePaperclipIssue],
  [POST_ISSUE_COMMENT_TOOL_NAME, "Post a comment to a Doer issue.", interceptPostIssueComment],
  [WRITE_OUTPUT_TOOL_NAME, "Publish a text deliverable to the company Outputs page (creates a downloadable file record).", interceptWriteOutput],
  [PRODUCE_DELIVERABLE_TOOL_NAME, "Produce a binary deliverable file (base64 content) and register it on the company Outputs page.", interceptProduceDeliverable],
  [GET_FLEET_STATUS_TOOL_NAME, "Read current Doer agent fleet status and spend.", interceptGetFleetStatus],
  [SCHEDULE_COUNCIL_TOOL_NAME, "Schedule a governed Doer council run.", interceptScheduleCouncil],
  [EMERGENCY_PAUSE_AGENT_TOOL_NAME, "Pause an agent in an operational emergency.", interceptEmergencyPauseAgent],
  [CLONE_FROM_TEMPLATE_TOOL_NAME, "Clone an agent or team from a Doer template.", interceptCloneFromTemplate],
  [BULK_DISPATCH_TOOL_NAME, "Dispatch multiple Doer tasks in one operation.", interceptBulkDispatch],
  [REASSIGN_TASK_TOOL_NAME, "Reassign a Doer task to another agent.", interceptReassignTask],
  [FORECAST_CAPACITY_TOOL_NAME, "Forecast available capacity across the Doer fleet.", interceptForecastCapacity],
  [BUILD_DEPENDENCY_GRAPH_TOOL_NAME, "Build a dependency graph for Doer issues.", interceptBuildDependencyGraph],
  [ANALYZE_ISSUE_PATTERNS_TOOL_NAME, "Analyze recurring patterns in Doer issues.", interceptAnalyzeIssuePatterns],
  [SCAN_FLEET_ANOMALIES_TOOL_NAME, "Scan the Doer fleet for operational anomalies.", interceptScanFleetAnomalies],
  [AUDIT_AGENT_COMPLIANCE_TOOL_NAME, "Audit Doer agents against governance requirements.", interceptAuditAgentCompliance],
  [GENERATE_WEEKLY_BRIEF_TOOL_NAME, "Generate a weekly Doer operating brief.", interceptGenerateWeeklyBrief],
];

const PARAMETERS = {
  type: "object",
  properties: {
    issue_id: { type: "string", description: "Issue ID or identifier when applicable" },
    title: { type: "string" },
    description: { type: "string" },
    status: { type: "string" },
    priority: { type: "string" },
    body: { type: "string", description: "Comment or request body" },
    content: { type: "string", description: "Full text content for write_output deliverables" },
    kind: { type: "string", description: "Deliverable kind for write_output: md | html | csv | json | txt | other" },
    filename: { type: "string", description: "Output filename for produce_deliverable" },
    file_content_base64: { type: "string", description: "Base64-encoded file bytes for produce_deliverable" },
    agent_id: { type: "string" },
    assignee_agent_id: { type: "string" },
    goalId: { type: "string" },
    goal_id: { type: "string" },
    projectId: { type: "string" },
    project_id: { type: "string" },
    parentId: { type: "string" },
    parent_id: { type: "string" },
    goalIds: { type: "array", items: { type: "string" } },
    goal_ids: { type: "array", items: { type: "string" } },
    name: { type: "string" },
    level: { type: "string" },
    targetDate: { type: "string" },
    target_date: { type: "string" },
    leadAgentId: { type: "string" },
    lead_agent_id: { type: "string" },
  },
  additionalProperties: true,
} as const;

function toLabel(name: string): string {
  return name.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

/** SDK external tools execute in Doer's process; no operation runs in a Cloud sandbox. */
export function buildDoerAgentTools(ctx: AdapterExecutionContext): AnyAgentTool[] {
  return TOOL_SPECS.map(([name, description, handler]) => ({
    name,
    label: toLabel(name),
    description,
    parameters: PARAMETERS,
    execute: async (_toolCallId, value) => {
      const args = value && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
      const output = await handler(ctx, args);
      return {
        content: [{ type: "text", text: output || JSON.stringify({ success: true }) }],
        details: { toolName: name },
      };
    },
  }));
}
