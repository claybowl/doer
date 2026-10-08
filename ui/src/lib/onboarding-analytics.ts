/**
 * Onboarding Analytics — lightweight event tracking for the onboarding flow.
 *
 * Tracks step transitions, completion, skip/drop-off, and time-to-complete.
 * Events are stored in localStorage and can be upgraded to a backend endpoint
 * by replacing the `persist` function with a fetch call.
 *
 * Events:
 *   onboarding_started       — fired when the wizard opens (step 0)
 *   onboarding_step_reached   — fired when a new step is displayed
 *   onboarding_step_completed  — fired when the user advances from a step
 *   onboarding_completed      — fired when the user launches (step 4 → launch)
 *   onboarding_skipped        — fired when the user clicks "Skip onboarding"
 *   onboarding_closed         — fired when the user closes the wizard without completing
 *   onboarding_error          — fired when an error occurs during a step
 */

export type OnboardingEventName =
  | "onboarding_started"
  | "onboarding_step_reached"
  | "onboarding_step_completed"
  | "onboarding_completed"
  | "onboarding_skipped"
  | "onboarding_closed"
  | "onboarding_error";

export interface OnboardingEvent {
  name: OnboardingEventName;
  timestamp: string; // ISO 8601
  step?: number;
  elapsedSec?: number;
  metadata?: Record<string, unknown>;
}

const STORAGE_KEY = "doer:onboarding:events";
const SESSION_KEY = "doer:onboarding:session_id";

/** Generate a unique session ID for each onboarding attempt. */
function generateSessionId(): string {
  return `ob_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Get or create the current onboarding session ID. */
export function getOnboardingSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = generateSessionId();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/** Clear the session ID (call when onboarding completes or is dismissed). */
export function clearOnboardingSessionId(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

/** Persist an event to localStorage. Upgrade to fetch('/api/analytics') later. */
function persist(event: OnboardingEvent & { sessionId: string }): void {
  try {
    const existing = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]"
    ) as Array<OnboardingEvent & { sessionId: string }>;
    existing.push(event);
    // Cap at 500 events to prevent unbounded growth
    if (existing.length > 500) {
      existing.splice(0, existing.length - 500);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch {
    // localStorage may be unavailable (private mode, quota) — silently skip
  }
}

/** Core tracking function. */
export function trackOnboardingEvent(
  name: OnboardingEventName,
  options?: {
    step?: number;
    elapsedSec?: number;
    metadata?: Record<string, unknown>;
  }
): void {
  const event: OnboardingEvent & { sessionId: string } = {
    name,
    timestamp: new Date().toISOString(),
    sessionId: getOnboardingSessionId(),
    ...(options?.step !== undefined && { step: options.step }),
    ...(options?.elapsedSec !== undefined && { elapsedSec: options.elapsedSec }),
    ...(options?.metadata && { metadata: options.metadata }),
  };

  // Console log in development for debugging
  if (import.meta.env.DEV) {
    console.debug("[onboarding-analytics]", event.name, {
      step: event.step,
      elapsedSec: event.elapsedSec,
      ...event.metadata,
    });
  }

  persist(event);
}

/** Convenience helpers — call these from the OnboardingWizard component. */
export const onboardingAnalytics = {
  /** Call when the wizard opens. */
  started: () => trackOnboardingEvent("onboarding_started", { step: 0 }),

  /** Call when a new step is displayed. */
  stepReached: (step: number, elapsedSec: number) =>
    trackOnboardingEvent("onboarding_step_reached", { step, elapsedSec }),

  /** Call when the user advances from a step. */
  stepCompleted: (step: number, elapsedSec: number) =>
    trackOnboardingEvent("onboarding_step_completed", { step, elapsedSec }),

  /** Call when the user launches (completes onboarding). */
  completed: (elapsedSec: number) =>
    trackOnboardingEvent("onboarding_completed", { elapsedSec }),

  /** Call when the user clicks "Skip onboarding". */
  skipped: (step: number, elapsedSec: number) =>
    trackOnboardingEvent("onboarding_skipped", { step, elapsedSec }),

  /** Call when the user closes the wizard without completing. */
  closed: (step: number, elapsedSec: number) =>
    trackOnboardingEvent("onboarding_closed", { step, elapsedSec }),

  /** Call when an error occurs. */
  error: (step: number, error: string) =>
    trackOnboardingEvent("onboarding_error", {
      step,
      metadata: { error },
    }),
};

/** Retrieve all stored events (for debugging or export). */
export function getOnboardingEvents(): Array<OnboardingEvent & { sessionId: string }> {
  try {
    return JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]"
    ) as Array<OnboardingEvent & { sessionId: string }>;
  } catch {
    return [];
  }
}

/** Clear all stored events. */
export function clearOnboardingEvents(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Compute drop-off statistics from stored events.
 * Returns per-step completion counts and drop-off rates.
 */
export function computeDropOffStats(): {
  started: number;
  completed: number;
  skipped: number;
  closed: number;
  stepReachCounts: Record<number, number>;
  stepCompletionCounts: Record<number, number>;
  dropOffByStep: Record<number, number>;
  completionRate: number;
  medianTimeToComplete?: number;
} {
  const events = getOnboardingEvents();
  const sessions = new Map<string, Set<OnboardingEvent>>();

  // Group events by session
  for (const event of events) {
    const sessionId = (event as OnboardingEvent & { sessionId: string }).sessionId;
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, new Set());
    }
    sessions.get(sessionId)!.add(event);
  }

  let started = 0;
  let completed = 0;
  let skipped = 0;
  let closed = 0;
  const stepReachCounts: Record<number, number> = {};
  const stepCompletionCounts: Record<number, number> = {};
  const completionTimes: number[] = [];

  for (const sessionEvents of sessions.values()) {
    const eventsArray = Array.from(sessionEvents);
    const hasStarted = eventsArray.some((e) => e.name === "onboarding_started");
    const hasCompleted = eventsArray.some((e) => e.name === "onboarding_completed");
    const hasSkipped = eventsArray.some((e) => e.name === "onboarding_skipped");
    const hasClosed = eventsArray.some((e) => e.name === "onboarding_closed");

    if (hasStarted) started++;
    if (hasCompleted) {
      completed++;
      const completedEvent = eventsArray.find((e) => e.name === "onboarding_completed");
      if (completedEvent?.elapsedSec !== undefined) {
        completionTimes.push(completedEvent.elapsedSec);
      }
    }
    if (hasSkipped) skipped++;
    if (hasClosed) closed++;

    for (const event of eventsArray) {
      if (event.name === "onboarding_step_reached" && event.step !== undefined) {
        stepReachCounts[event.step] = (stepReachCounts[event.step] || 0) + 1;
      }
      if (event.name === "onboarding_step_completed" && event.step !== undefined) {
        stepCompletionCounts[event.step] = (stepCompletionCounts[event.step] || 0) + 1;
      }
    }
  }

  // Calculate drop-off per step
  const dropOffByStep: Record<number, number> = {};
  for (let step = 0; step <= 4; step++) {
    const reached = stepReachCounts[step] || 0;
    const completedFromStep = stepCompletionCounts[step] || 0;
    const completedOnboarding = step === 4 ? completed : 0;
    const advanced = completedFromStep + completedOnboarding;
    if (reached > 0) {
      dropOffByStep[step] = reached - advanced;
    }
  }

  // Median time to complete
  let medianTimeToComplete: number | undefined;
  if (completionTimes.length > 0) {
    completionTimes.sort((a, b) => a - b);
    const mid = Math.floor(completionTimes.length / 2);
    medianTimeToComplete =
      completionTimes.length % 2 === 0
        ? Math.round((completionTimes[mid - 1] + completionTimes[mid]) / 2)
        : completionTimes[mid];
  }

  return {
    started,
    completed,
    skipped,
    closed,
    stepReachCounts,
    stepCompletionCounts,
    dropOffByStep,
    completionRate: started > 0 ? completed / started : 0,
    medianTimeToComplete,
  };
}
