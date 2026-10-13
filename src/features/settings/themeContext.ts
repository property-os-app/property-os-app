import { createContext, useContext } from "react";
import type { ThemePreference } from "@/features/settings/theme";

export interface ThemeContextValue {
  /** What the user chose. */
  preference: ThemePreference;
  /** What is shown now ("system" resolved). */
  resolved: "light" | "dark";
  /** Saves and applies a new preference right away. */
  setPreference: (preference: ThemePreference) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Reads and changes the theme. Only works inside ThemeProvider. */
export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider");
  return value;
}
