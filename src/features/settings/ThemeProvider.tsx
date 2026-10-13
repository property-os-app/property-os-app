import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ThemeContext, type ThemeContextValue } from "@/features/settings/themeContext";
import {
  applyTheme,
  darkMediaQuery,
  readThemePreference,
  saveThemePreference,
  type ThemePreference,
} from "@/features/settings/theme";

/** Holds the theme preference (saved per device), applies the "dark" class and follows the system setting live. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState(readThemePreference);
  const [systemDark, setSystemDark] = useState(() => darkMediaQuery()?.matches ?? false);
  const dark = preference === "system" ? systemDark : preference === "dark";

  // Keep systemDark in step with the computer's setting.
  useEffect(() => {
    const query = darkMediaQuery();
    if (!query) return;
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    applyTheme(dark);
  }, [dark]);

  const setPreference = useCallback((next: ThemePreference) => {
    saveThemePreference(next);
    setPreferenceState(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, resolved: dark ? "dark" : "light", setPreference }),
    [preference, dark, setPreference],
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}
