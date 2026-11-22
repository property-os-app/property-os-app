/** The desktop menu's collapsed / expanded choice, remembered per browser. Storage can be missing or throw (private mode, blocked site data): then the menu is simply expanded and nothing is saved. */

export const SIDEBAR_COLLAPSED_KEY = "propos.sidebar.collapsed";

type KeyValueStore = Pick<Storage, "getItem" | "setItem">;

function defaultStorage(): KeyValueStore | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** true only when "1" was saved; anything else (nothing, garbage, an error) is expanded. */
export function readSidebarCollapsed(storage: KeyValueStore | null = defaultStorage()): boolean {
  try {
    return storage?.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

/** Saves the choice; a storage error is ignored (the choice then lasts until the page reloads). */
export function writeSidebarCollapsed(collapsed: boolean, storage: KeyValueStore | null = defaultStorage()): void {
  try {
    storage?.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    // Not saved; nothing else to do.
  }
}
