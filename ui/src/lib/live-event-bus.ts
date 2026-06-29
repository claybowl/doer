import { useEffect, useRef } from "react";
import type { LiveEvent } from "@doerai/shared";

/**
 * A tiny in-process pub/sub for the raw company live-event stream.
 *
 * `LiveUpdatesProvider` already owns the single WebSocket to
 * `/api/companies/:id/events/ws` and uses each event to invalidate React Query
 * caches + raise toasts. Mission Control needs the raw events too (to drive
 * ripples, blooms, handoff tokens, and the narrated feed) — but opening a second
 * socket would be wasteful. Instead the provider re-publishes every parsed event
 * here, and components subscribe via `useLiveEventStream`.
 */

type LiveEventListener = (event: LiveEvent) => void;

const listeners = new Set<LiveEventListener>();

/** Called by LiveUpdatesProvider for every parsed event. */
export function publishLiveEventToBus(event: LiveEvent) {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // A bad subscriber must not break the socket pump or other subscribers.
    }
  }
}

export function subscribeLiveEvents(listener: LiveEventListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Subscribe to the raw live-event stream for the lifetime of a component.
 * The latest `listener` is always invoked without re-subscribing on every render.
 */
export function useLiveEventStream(listener: LiveEventListener) {
  const ref = useRef(listener);
  ref.current = listener;
  useEffect(() => subscribeLiveEvents((event) => ref.current(event)), []);
}
