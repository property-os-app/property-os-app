import { useState } from "react";

/** Reads a saved list of column keys, keeping only known keys. null when nothing valid is saved. */
export function parseSavedColumns(saved: string | null, known: readonly string[]): string[] | null {
  if (!saved) return null;
  try {
    const value: unknown = JSON.parse(saved);
    if (!Array.isArray(value)) return null;
    return known.filter((k) => value.includes(k));
  } catch {
    return null;
  }
}

/**
 * A table's shown optional columns, remembered in this browser (localStorage `propertyos.{page}.columns`, like useListView).
 * Storage can throw (private mode, blocked site data): then the defaults are used and choices last for this visit only.
 * Returns the shown keys (in `known` order), `toggle(key, shown)` and `reset()`.
 */
export function useColumnVisibility(page: string, known: readonly string[], defaults: readonly string[]) {
  const key = `propertyos.${page}.columns`;
  const [visible, setVisible] = useState<string[]>(() => {
    try {
      return parseSavedColumns(localStorage.getItem(key), known) ?? known.filter((k) => defaults.includes(k));
    } catch {
      return known.filter((k) => defaults.includes(k));
    }
  });

  const save = (next: string[]) => {
    setVisible(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // Not saved: the choice still works for this visit.
    }
  };

  const toggle = (column: string, shown: boolean) => {
    const set = new Set(visible);
    if (shown) set.add(column);
    else set.delete(column);
    save(known.filter((k) => set.has(k)));
  };

  const reset = () => {
    setVisible(known.filter((k) => defaults.includes(k)));
    try {
      localStorage.removeItem(key);
    } catch {
      // Nothing saved anyway.
    }
  };

  return { visible, toggle, reset } as const;
}
