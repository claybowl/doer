import { Router } from "express";
import type { Db } from "@doerai/db";
import {
  startTimeEntrySchema,
  stopTimeEntrySchema,
  updateTimeEntrySchema,
  timeEntryListQuerySchema,
  timesheetQuerySchema,
} from "@doerai/shared";
import { validate } from "../middleware/validate.js";
import { timeTrackingService, logActivity } from "../services/index.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";

export function timeTrackingRoutes(db: Db) {
  const router = Router();
  const svc = timeTrackingService(db);

  // ─── Start a manual timer ──────────────────────────────────────────
  router.post(
    "/companies/:companyId/time-entries/start",
    validate(startTimeEntrySchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);

      const actor = getActorInfo(req);
      const userId = req.actor.type === "board" ? req.actor.userId ?? "board" : actor.actorId;

      const entry = await svc.startManualTimer({
        companyId,
        issueId: req.body.issueId,
        userId,
        description: req.body.description,
        billable: req.body.billable,
        billingCode: req.body.billingCode,
      });

      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        action: "time_entry.started",
        entityType: "time_entry",
        entityId: entry.id,
        details: { issueId: req.body.issueId },
      });

      res.status(201).json(entry);
    },
  );

  // ─── Stop a running timer ──────────────────────────────────────────
  router.post(
    "/companies/:companyId/time-entries/:entryId/stop",
    validate(stopTimeEntrySchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);

      const entry = await svc.stopTimer(companyId, req.params.entryId, req.body.description);

      const actor = getActorInfo(req);
      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        action: "time_entry.stopped",
        entityType: "time_entry",
        entityId: entry.id,
        details: { durationMs: entry.durationMs },
      });

      res.json(entry);
    },
  );

  // ─── List time entries ─────────────────────────────────────────────
  router.get("/companies/:companyId/time-entries", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const parsed = timeEntryListQuerySchema.safeParse({
      issueId: req.query.issueId,
      agentId: req.query.agentId,
      projectId: req.query.projectId,
      source: req.query.source,
      status: req.query.status,
      billable: req.query.billable === "true" ? true : req.query.billable === "false" ? false : undefined,
      from: req.query.from,
      to: req.query.to,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      offset: req.query.offset ? Number(req.query.offset) : undefined,
    });

    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const entries = await svc.list({
      companyId,
      ...parsed.data,
      from: parsed.data.from ? new Date(parsed.data.from) : undefined,
      to: parsed.data.to ? new Date(parsed.data.to) : undefined,
    });

    res.json(entries);
  });

  // ─── Get a single time entry ───────────────────────────────────────
  router.get("/companies/:companyId/time-entries/:entryId", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const entry = await svc.getById(companyId, req.params.entryId);
    if (!entry) {
      res.status(404).json({ error: "Time entry not found" });
      return;
    }
    res.json(entry);
  });

  // ─── Update a time entry ───────────────────────────────────────────
  router.patch(
    "/companies/:companyId/time-entries/:entryId",
    validate(updateTimeEntrySchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);

      const entry = await svc.updateEntry(companyId, req.params.entryId, req.body);
      res.json(entry);
    },
  );

  // ─── Delete a time entry ───────────────────────────────────────────
  router.delete("/companies/:companyId/time-entries/:entryId", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const deleted = await svc.deleteEntry(companyId, req.params.entryId);
    if (!deleted) {
      res.status(404).json({ error: "Time entry not found" });
      return;
    }
    res.status(204).send();
  });

  // ─── Time summary ──────────────────────────────────────────────────
  router.get("/companies/:companyId/time-tracking/summary", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const from = req.query.from ? new Date(req.query.from as string) : undefined;
    const to = req.query.to ? new Date(req.query.to as string) : undefined;

    const summary = await svc.getSummary(companyId, from, to);
    res.json(summary);
  });

  // ─── Time by agent ─────────────────────────────────────────────────
  router.get("/companies/:companyId/time-tracking/by-agent", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const from = req.query.from ? new Date(req.query.from as string) : undefined;
    const to = req.query.to ? new Date(req.query.to as string) : undefined;

    const data = await svc.getByAgent(companyId, from, to);
    res.json(data);
  });

  // ─── Time by project ───────────────────────────────────────────────
  router.get("/companies/:companyId/time-tracking/by-project", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const from = req.query.from ? new Date(req.query.from as string) : undefined;
    const to = req.query.to ? new Date(req.query.to as string) : undefined;

    const data = await svc.getByProject(companyId, from, to);
    res.json(data);
  });

  // ─── Time by issue ─────────────────────────────────────────────────
  router.get("/companies/:companyId/time-tracking/by-issue", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const from = req.query.from ? new Date(req.query.from as string) : undefined;
    const to = req.query.to ? new Date(req.query.to as string) : undefined;

    const data = await svc.getByIssue(companyId, from, to);
    res.json(data);
  });

  // ─── Weekly timesheet ──────────────────────────────────────────────
  router.get("/companies/:companyId/time-tracking/timesheet", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const parsed = timesheetQuerySchema.safeParse({
      userId: req.query.userId,
      weekStart: req.query.weekStart,
    });

    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const timesheet = await svc.getWeeklyTimesheet(companyId, parsed.data.userId, parsed.data.weekStart);
    res.json(timesheet);
  });

  // ─── Issue time total ──────────────────────────────────────────────
  router.get("/companies/:companyId/issues/:issueId/time", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const time = await svc.getIssueTime(companyId, req.params.issueId);
    res.json(time);
  });

  // ─── Running timers (for nav bar indicator) ────────────────────────
  router.get("/companies/:companyId/time-tracking/running", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const timers = await svc.getRunningTimers(companyId);
    res.json(timers);
  });

  return router;
}
