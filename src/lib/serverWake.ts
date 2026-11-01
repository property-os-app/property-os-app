import { useSyncExternalStore } from "react";
import { env } from "@/lib/env";

/**
 * Cold start on free hosting: the API server sleeps when idle and needs up to ~60 seconds to wake. While waking, its host
 * may answer with a 502/503/504, its own HTML "waking up" page, or no answer at all (network error). apiFetch retries
 * those with backoff (WAKE_LIMIT_MS), and pages show "Waking up the server…" while useServerWaking() is true.
 */

/** How long apiFetch keeps retrying a waking server before giving up with "Can't reach the server". */
export const WAKE_LIMIT_MS = 90_000;
/** A first request still unanswered after this long shows the waking message. */
export const SLOW_AFTER_MS = 4_000;

/** "gateway": 502/503/504 from the host. "html": the host's HTML waking page (our API only answers JSON or PDF). */
export type WakingKind = "gateway" | "html";

/** Is this response the host waking the server instead of our API answering? null for a normal answer (2xx, 4xx, 500 JSON). */
export function wakingKind(status: number, contentType: string | null): WakingKind | null {
  if (status === 502 || status === 503 || status === 504) return "gateway";
  if (contentType && /text\/html/i.test(contentType)) return "html";
  return null;
}

/**
 * May this failure be retried? GET: always (a waking response or a network error). Other methods only when the host
 * answered for a sleeping server (502, 503 or its HTML page), so the request never reached our API and can't run twice.
 * A network error or a 504 on a POST/PATCH/DELETE may have reached it, so it fails as before.
 */
export function canRetryWaking(method: string, failure: WakingKind | "network", status?: number): boolean {
  if (method === "GET") return true;
  if (failure === "html") return true;
  return failure === "gateway" && (status === 502 || status === 503);
}

/** Wait before retry number `attempt` (0-based): 1s, 2s, 4s, then every 5s. */
export function wakeDelay(attempt: number): number {
  return Math.min(1000 * 2 ** attempt, 5000);
}

/* ---------- "Waking up the server…" state, shared by every request ---------- */

let slowCount = 0;
// True once any request got a real answer: later slow requests (a big PDF) don't show the message unless they hit a waking response.
let awake = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** One request's part of the waking state. Call `waking()` on a waking response or network error, and `done()` at the end. */
export interface WakeTracker {
  waking(): void;
  /** `answered`: our API really answered (any status), so the server is awake. */
  done(answered: boolean): void;
}

/** Starts tracking one request: it counts as "waking" after SLOW_AFTER_MS while the server isn't known to be awake. */
export function trackRequest(): WakeTracker {
  let counted = false;
  const count = () => {
    if (counted) return;
    counted = true;
    slowCount++;
    emit();
  };
  const timer = setTimeout(() => {
    if (!awake) count();
  }, SLOW_AFTER_MS);
  return {
    waking: count,
    done(answered) {
      clearTimeout(timer);
      if (answered) awake = true;
      if (counted) {
        counted = false;
        slowCount--;
        emit();
      }
    },
  };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** True while a request is waiting on a sleeping server. */
export function useServerWaking(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => slowCount > 0,
    () => false,
  );
}

/** Fire-and-forget GET /health (no auth, result ignored) so the server starts waking while the user signs in. */
export function pingHealth(): void {
  try {
    void fetch(`${env.VITE_API_URL}/health`, { cache: "no-store" }).catch(() => {});
  } catch {
    // Ignored: only a head start.
  }
}
