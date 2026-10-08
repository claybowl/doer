// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  formatDuration,
  formatDurationCompact,
  getWeekStart,
  getWeekEnd,
  formatDateKey,
  getWeekDayKeys,
  shortDayName,
} from "./time-format";

describe("formatDuration", () => {
  it("formats seconds", () => {
    expect(formatDuration(0)).toBe("0s");
    expect(formatDuration(500)).toBe("0s");
    expect(formatDuration(1000)).toBe("1s");
    expect(formatDuration(47000)).toBe("47s");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(60000)).toBe("1m");
    expect(formatDuration(65000)).toBe("1m 5s");
    expect(formatDuration(312000)).toBe("5m 12s");
  });

  it("formats hours and minutes", () => {
    expect(formatDuration(3600000)).toBe("1h");
    expect(formatDuration(9240000)).toBe("2h 34m");
    expect(formatDuration(3900000)).toBe("1h 5m");
  });

  it("handles negative values", () => {
    expect(formatDuration(-1000)).toBe("0s");
    expect(formatDuration(-3600000)).toBe("0s");
  });
});

describe("formatDurationCompact", () => {
  it("returns most significant unit only", () => {
    expect(formatDurationCompact(47000)).toBe("47s");
    expect(formatDurationCompact(312000)).toBe("5m");
    expect(formatDurationCompact(9240000)).toBe("2h");
  });

  it("handles zero and negative", () => {
    expect(formatDurationCompact(0)).toBe("0s");
    expect(formatDurationCompact(-1000)).toBe("0s");
  });
});

describe("getWeekStart", () => {
  it("returns Monday for a Wednesday", () => {
    // Wednesday, September 10, 2025
    const wed = new Date("2025-09-10T15:30:00Z");
    const monday = getWeekStart(wed);
    expect(monday.getDay()).toBe(1); // Monday
    expect(monday.getDate()).toBe(8); // Sept 8
    expect(monday.getHours()).toBe(0);
  });

  it("returns Monday for a Sunday", () => {
    // Sunday, September 14, 2025
    const sun = new Date("2025-09-14T10:00:00Z");
    const monday = getWeekStart(sun);
    expect(monday.getDay()).toBe(1);
    expect(monday.getDate()).toBe(8);
  });

  it("returns Monday for a Monday", () => {
    const mon = new Date("2025-09-08T08:00:00Z");
    const monday = getWeekStart(mon);
    expect(monday.getDay()).toBe(1);
    expect(monday.getDate()).toBe(8);
  });
});

describe("getWeekEnd", () => {
  it("returns the following Monday (exclusive end)", () => {
    const wed = new Date("2025-09-10T15:30:00Z");
    const end = getWeekEnd(wed);
    expect(end.getDay()).toBe(1);
    expect(end.getDate()).toBe(15); // Next Monday
  });
});

describe("formatDateKey", () => {
  it("formats as YYYY-MM-DD", () => {
    const d = new Date("2025-09-10T15:30:00Z");
    expect(formatDateKey(d)).toBe("2025-09-10");
  });
});

describe("getWeekDayKeys", () => {
  it("returns 7 consecutive day keys starting from weekStart", () => {
    const monday = new Date("2025-09-08T00:00:00Z");
    const keys = getWeekDayKeys(monday);
    expect(keys).toHaveLength(7);
    expect(keys[0]).toBe("2025-09-08");
    expect(keys[6]).toBe("2025-09-14");
  });
});

describe("shortDayName", () => {
  it("returns short day name from date key", () => {
    expect(shortDayName("2025-09-08")).toBe("Mon");
    expect(shortDayName("2025-09-10")).toBe("Wed");
    expect(shortDayName("2025-09-14")).toBe("Sun");
  });
});
