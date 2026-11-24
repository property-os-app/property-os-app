/** Which option the Combobox highlights (-1 = none), as plain functions so they can be tested. */

/** The keys that move the highlight. */
export type ComboboxMoveKey = "ArrowDown" | "ArrowUp" | "Home" | "End";

export function isMoveKey(key: string): key is ComboboxMoveKey {
  return key === "ArrowDown" || key === "ArrowUp" || key === "Home" || key === "End";
}

/** The highlight after a key: ↓ / ↑ wrap around, Home / End go to the first / last. -1 when there are no options. */
export function moveActive(key: ComboboxMoveKey, active: number, count: number): number {
  if (count === 0) return -1;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  if (key === "ArrowDown") return active < 0 || active >= count - 1 ? 0 : active + 1;
  return active <= 0 || active >= count ? count - 1 : active - 1;
}

/**
 * The highlight when the list opens or the typed text changes. Something typed: the first match, so Enter picks it.
 * Nothing typed: the chosen option, or none (so Enter can't pick something nobody looked for).
 */
export function initialActive(typed: boolean, count: number, selectedIndex: number): number {
  if (count === 0) return -1;
  return typed ? 0 : selectedIndex;
}
