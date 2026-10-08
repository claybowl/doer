// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";

// Mock @/lib/router to avoid CompanyProvider dependency
vi.mock("@/lib/router", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement("a", { href }, children),
  useRouter: () => ({ push: vi.fn() }),
}));

import { TimerButton, TimeEntryList, TimeSummaryCard } from "./TimeTracker";

describe("TimerButton", () => {
  it("renders start button when not running", () => {
    const html = renderToStaticMarkup(
      React.createElement(TimerButton, { isRunning: false, onStart: () => {}, onStop: () => {} }),
    );
    expect(html).toContain("Start Timer");
    expect(html).toContain("Play");
  });

  it("renders stop button when running", () => {
    const html = renderToStaticMarkup(
      React.createElement(TimerButton, { isRunning: true, onStart: () => {}, onStop: () => {} }),
    );
    expect(html).toContain("Stop Timer");
    expect(html).toContain("Square");
  });

  it("renders disabled state", () => {
    const html = renderToStaticMarkup(
      React.createElement(TimerButton, {
        isRunning: false,
        onStart: () => {},
        onStop: () => {},
        disabled: true,
      }),
    );
    expect(html).toContain("disabled");
  });
});

describe("TimeEntryList", () => {
  it("renders empty state when no entries", () => {
    const html = renderToStaticMarkup(
      React.createElement(TimeEntryList, { entries: [] }),
    );
    expect(html).toContain("No time entries yet");
  });

  it("renders entries with source badges", () => {
    const entries = [
      {
        id: "1",
        source: "agent",
        status: "completed",
        description: "Compiled design",
        startedAt: "2025-09-05T10:00:00Z",
        endedAt: "2025-09-05T11:00:00Z",
        durationMs: 3600000,
        agentName: "Maker",
      },
      {
        id: "2",
        source: "human",
        status: "completed",
        description: null,
        startedAt: "2025-09-05T12:00:00Z",
        endedAt: "2025-09-05T12:30:00Z",
        durationMs: 1800000,
        userName: "Clay",
      },
    ];
    const html = renderToStaticMarkup(
      React.createElement(TimeEntryList, { entries }),
    );
    expect(html).toContain("Agent");
    expect(html).toContain("Human");
    expect(html).toContain("Compiled design");
    expect(html).toContain("1h");
    expect(html).toContain("30m");
  });

  it("shows Running... for running entries", () => {
    const entries = [
      {
        id: "1",
        source: "agent",
        status: "running",
        description: null,
        startedAt: new Date().toISOString(),
        endedAt: null,
        durationMs: null,
      },
    ];
    const html = renderToStaticMarkup(
      React.createElement(TimeEntryList, { entries }),
    );
    expect(html).toContain("Running...");
  });
});

describe("TimeSummaryCard", () => {
  it("renders total time", () => {
    const html = renderToStaticMarkup(
      React.createElement(TimeSummaryCard, { totalMs: 9240000 }),
    );
    expect(html).toContain("Total time");
    expect(html).toContain("2h 34m");
  });

  it("shows estimate when provided", () => {
    const html = renderToStaticMarkup(
      React.createElement(TimeSummaryCard, {
        totalMs: 3600000,
        estimatedMs: 1800000,
      }),
    );
    expect(html).toContain("Est:");
    expect(html).toContain("30m");
    expect(html).toContain("over");
  });

  it("shows entry count when provided", () => {
    const html = renderToStaticMarkup(
      React.createElement(TimeSummaryCard, {
        totalMs: 3600000,
        entryCount: 5,
      }),
    );
    expect(html).toContain("5 entries");
  });

  it("shows singular entry count", () => {
    const html = renderToStaticMarkup(
      React.createElement(TimeSummaryCard, {
        totalMs: 3600000,
        entryCount: 1,
      }),
    );
    expect(html).toContain("1 entry");
  });

  it("uses custom label", () => {
    const html = renderToStaticMarkup(
      React.createElement(TimeSummaryCard, {
        totalMs: 3600000,
        label: "Agent time",
      }),
    );
    expect(html).toContain("Agent time");
    expect(html).not.toContain("Total time");
  });
});
