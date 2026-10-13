import { useState } from "react";

/**
 * A list page's view choice (e.g. "cards" | "table") remembered in localStorage.
 * Storage can throw (private mode, blocked site data): then the default is used and the choice lasts for this visit only.
 */
export function useStoredView<V extends string>(key: string, values: readonly V[], fallback: V) {
  const [view, setViewState] = useState<V>(() => {
    try {
      const saved = localStorage.getItem(key);
      return values.includes(saved as V) ? (saved as V) : fallback;
    } catch {
      return fallback;
    }
  });

  const setView = (next: V) => {
    setViewState(next);
    try {
      localStorage.setItem(key, next);
    } catch {
      // Not saved: the choice still works for this visit.
    }
  };

  return [view, setView] as const;
}
