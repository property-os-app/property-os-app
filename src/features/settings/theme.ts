/** The user's theme choice. "system" follows the computer's light/dark setting. */
export type ThemePreference = "light" | "dark" | "system";

/** localStorage key. index.html reads the same key before the app loads (no flash). */
export const THEME_KEY = "propertyos.theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function isPreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

/** The saved preference, or "light" when nothing valid is saved or storage is blocked. */
export function readThemePreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return isPreference(saved) ? saved : "light";
  } catch {
    return "light";
  }
}

/** Saves the preference. Ignores blocked storage (the choice then lasts until reload). */
export function saveThemePreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_KEY, preference);
  } catch {
    // Storage blocked: nothing to do.
  }
}

/** The media query for the computer's dark setting, or null when the browser has none. */
export function darkMediaQuery(): MediaQueryList | null {
  return typeof window.matchMedia === "function" ? window.matchMedia(DARK_QUERY) : null;
}

/** Adds or removes the "dark" class on <html>; every design system component follows it. */
export function applyTheme(dark: boolean): void {
  document.documentElement.classList.toggle("dark", dark);
}
