import { z } from "zod";

export const TIME_ENTRY_SOURCES = ["agent_auto", "manual"] as const;
export const TIME_ENTRY_STATUSES = ["running", "stopped"] as const;

/** Start a manual timer on an issue */
export const startTimeEntrySchema = z.object({
  issueId: z.string().uuid(),
  description: z.string().optional(),
  billable: z.boolean().optional().default(true),
  billingCode: z.string().optional().nullable(),
});

export type StartTimeEntry = z.infer<typeof startTimeEntrySchema>;

/** Stop a running timer */
export const stopTimeEntrySchema = z.object({
  description: z.string().optional(),
});

export type StopTimeEntry = z.infer<typeof stopTimeEntrySchema>;

/** Update a time entry (edit description, billable flag, etc.) */
export const updateTimeEntrySchema = z.object({
  description: z.string().optional().nullable(),
  billable: z.boolean().optional(),
  billingCode: z.string().optional().nullable(),
  durationMs: z.number().int().nonnegative().optional(),
});

export type UpdateTimeEntry = z.infer<typeof updateTimeEntrySchema>;

/** Query params for listing time entries */
export const timeEntryListQuerySchema = z.object({
  issueId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  source: z.enum(TIME_ENTRY_SOURCES).optional(),
  status: z.enum(TIME_ENTRY_STATUSES).optional(),
  billable: z.boolean().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(500).optional().default(100),
  offset: z.number().int().nonnegative().optional().default(0),
});

export type TimeEntryListQuery = z.infer<typeof timeEntryListQuerySchema>;

/** Query params for timesheet view */
export const timesheetQuerySchema = z.object({
  userId: z.string().optional(),
  weekStart: z.string().optional(), // ISO date (Monday)
});

export type TimesheetQuery = z.infer<typeof timesheetQuerySchema>;
