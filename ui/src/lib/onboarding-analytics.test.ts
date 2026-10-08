import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  trackOnboardingEvent,
  onboardingAnalytics,
  getOnboardingEvents,
  clearOnboardingEvents,
  getOnboardingSessionId,
  clearOnboardingSessionId,
  computeDropOffStats,
} from "./onboarding-analytics";

// Mock localStorage and sessionStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
});
Object.defineProperty(globalThis, "sessionStorage", {
  value: sessionStorageMock,
});

// Mock import.meta.env
vi.stubEnv("DEV", false);

describe("onboarding-analytics", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe("getOnboardingSessionId", () => {
    it("should generate a unique session ID", () => {
      const id = getOnboardingSessionId();
      expect(id).toMatch(/^ob_\d+_[a-z0-9]+$/);
    });

    it("should return the same session ID within a session", () => {
      const id1 = getOnboardingSessionId();
      const id2 = getOnboardingSessionId();
      expect(id1).toBe(id2);
    });

    it("should generate a new session ID after clearing", () => {
      const id1 = getOnboardingSessionId();
      clearOnboardingSessionId();
      const id2 = getOnboardingSessionId();
      expect(id1).not.toBe(id2);
    });
  });

  describe("onboardingAnalytics", () => {
    it("should track onboarding_started event", () => {
      onboardingAnalytics.started();
      const events = getOnboardingEvents();
      expect(events).toHaveLength(1);
      expect(events[0].name).toBe("onboarding_started");
      expect(events[0].step).toBe(0);
    });

    it("should track onboarding_step_reached event", () => {
      onboardingAnalytics.stepReached(2, 45);
      const events = getOnboardingEvents();
      expect(events).toHaveLength(1);
      expect(events[0].name).toBe("onboarding_step_reached");
      expect(events[0].step).toBe(2);
      expect(events[0].elapsedSec).toBe(45);
    });

    it("should track onboarding_step_completed event", () => {
      onboardingAnalytics.stepCompleted(1, 30);
      const events = getOnboardingEvents();
      expect(events).toHaveLength(1);
      expect(events[0].name).toBe("onboarding_step_completed");
      expect(events[0].step).toBe(1);
      expect(events[0].elapsedSec).toBe(30);
    });

    it("should track onboarding_completed event", () => {
      onboardingAnalytics.completed(180);
      const events = getOnboardingEvents();
      expect(events).toHaveLength(1);
      expect(events[0].name).toBe("onboarding_completed");
      expect(events[0].elapsedSec).toBe(180);
    });

    it("should track onboarding_skipped event", () => {
      onboardingAnalytics.skipped(2, 60);
      const events = getOnboardingEvents();
      expect(events).toHaveLength(1);
      expect(events[0].name).toBe("onboarding_skipped");
      expect(events[0].step).toBe(2);
      expect(events[0].elapsedSec).toBe(60);
    });

    it("should track onboarding_closed event", () => {
      onboardingAnalytics.closed(1, 15);
      const events = getOnboardingEvents();
      expect(events).toHaveLength(1);
      expect(events[0].name).toBe("onboarding_closed");
      expect(events[0].step).toBe(1);
      expect(events[0].elapsedSec).toBe(15);
    });

    it("should track onboarding_error event", () => {
      onboardingAnalytics.error(2, "Failed to create agent");
      const events = getOnboardingEvents();
      expect(events).toHaveLength(1);
      expect(events[0].name).toBe("onboarding_error");
      expect(events[0].step).toBe(2);
      expect(events[0].metadata).toEqual({ error: "Failed to create agent" });
    });
  });

  describe("event persistence", () => {
    it("should persist events to localStorage", () => {
      onboardingAnalytics.started();
      onboardingAnalytics.stepReached(1, 10);
      onboardingAnalytics.stepCompleted(1, 25);
      const events = getOnboardingEvents();
      expect(events).toHaveLength(3);
      expect(events[0].name).toBe("onboarding_started");
      expect(events[1].name).toBe("onboarding_step_reached");
      expect(events[2].name).toBe("onboarding_step_completed");
    });

    it("should cap events at 500", () => {
      for (let i = 0; i < 550; i++) {
        trackOnboardingEvent("onboarding_step_reached", { step: 0 });
      }
      const events = getOnboardingEvents();
      expect(events).toHaveLength(500);
    });

    it("should clear events", () => {
      onboardingAnalytics.started();
      clearOnboardingEvents();
      const events = getOnboardingEvents();
      expect(events).toHaveLength(0);
    });
  });

  describe("computeDropOffStats", () => {
    it("should compute stats from a single completed session", () => {
      // Simulate a full onboarding session
      onboardingAnalytics.started();
      onboardingAnalytics.stepReached(0, 0);
      onboardingAnalytics.stepCompleted(0, 5);
      onboardingAnalytics.stepReached(1, 5);
      onboardingAnalytics.stepCompleted(1, 30);
      onboardingAnalytics.stepReached(2, 30);
      onboardingAnalytics.stepCompleted(2, 90);
      onboardingAnalytics.stepReached(3, 90);
      onboardingAnalytics.stepCompleted(3, 120);
      onboardingAnalytics.stepReached(4, 120);
      onboardingAnalytics.completed(180);

      const stats = computeDropOffStats();
      expect(stats.started).toBe(1);
      expect(stats.completed).toBe(1);
      expect(stats.skipped).toBe(0);
      expect(stats.closed).toBe(0);
      expect(stats.completionRate).toBe(1);
      expect(stats.medianTimeToComplete).toBe(180);
    });

    it("should compute stats from a skipped session", () => {
      onboardingAnalytics.started();
      onboardingAnalytics.stepReached(0, 0);
      onboardingAnalytics.skipped(0, 10);

      const stats = computeDropOffStats();
      expect(stats.started).toBe(1);
      expect(stats.completed).toBe(0);
      expect(stats.skipped).toBe(1);
      expect(stats.completionRate).toBe(0);
    });

    it("should compute drop-off by step", () => {
      // Session 1: completes step 0 but drops off at step 1
      clearOnboardingSessionId();
      onboardingAnalytics.started();
      onboardingAnalytics.stepReached(0, 0);
      onboardingAnalytics.stepCompleted(0, 5);
      onboardingAnalytics.stepReached(1, 5);
      onboardingAnalytics.closed(1, 15);

      // Session 2: completes fully
      clearOnboardingSessionId();
      onboardingAnalytics.started();
      onboardingAnalytics.stepReached(0, 0);
      onboardingAnalytics.stepCompleted(0, 5);
      onboardingAnalytics.stepReached(1, 5);
      onboardingAnalytics.stepCompleted(1, 30);
      onboardingAnalytics.stepReached(2, 30);
      onboardingAnalytics.stepCompleted(2, 90);
      onboardingAnalytics.stepReached(3, 90);
      onboardingAnalytics.stepCompleted(3, 120);
      onboardingAnalytics.stepReached(4, 120);
      onboardingAnalytics.completed(180);

      const stats = computeDropOffStats();
      expect(stats.started).toBe(2);
      expect(stats.completed).toBe(1);
      expect(stats.completionRate).toBe(0.5);
      expect(stats.dropOffByStep[1]).toBe(1); // 1 user dropped off at step 1
    });
  });
});
