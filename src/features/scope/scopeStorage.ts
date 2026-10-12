/** Saves the chosen property scope in localStorage. Every access is wrapped: storage can be blocked. */

const KEY = "propertyos.scope";

/** The saved propertyId, or null for "All properties". */
export function readSavedScope(): string | null {
  try {
    return localStorage.getItem(KEY) || null;
  } catch {
    return null;
  }
}

/** Saves a propertyId, or removes it for null. */
export function saveScope(propertyId: string | null): void {
  try {
    if (propertyId) localStorage.setItem(KEY, propertyId);
    else localStorage.removeItem(KEY);
  } catch {
    // Storage blocked: the choice just won't survive a reload.
  }
}

/** Removes the saved scope (on sign out). */
export function clearSavedScope(): void {
  saveScope(null);
}
