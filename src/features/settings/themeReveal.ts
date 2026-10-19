import { flushSync } from "react-dom";
import { applyTheme, type ThemePreference } from "@/features/settings/theme";

const REVEAL_MS = 400;

/**
 * Switches to light or dark with a circle growing from `origin` (View Transitions API).
 * No API support or reduced motion: switches instantly. Saves the same way Settings does.
 */
export function changeThemeWithReveal(origin: HTMLElement, dark: boolean, setPreference: (preference: ThemePreference) => void): void {
  const change = () => {
    setPreference(dark ? "dark" : "light");
    // ThemeProvider also applies it in an effect; doing it here makes sure the new snapshot already has it.
    applyTheme(dark);
  };

  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  if (typeof document.startViewTransition !== "function" || reduceMotion) {
    change();
    return;
  }

  const box = origin.getBoundingClientRect();
  const x = box.left + box.width / 2;
  const y = box.top + box.height / 2;
  // Far enough to cover the farthest corner of the window.
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

  const transition = document.startViewTransition(() => flushSync(change));
  transition.ready
    .then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: REVEAL_MS, easing: "ease-out", pseudoElement: "::view-transition-new(root)" },
      );
    })
    // Skipped transitions (e.g. a second click mid-way) still apply the change; nothing to show.
    .catch(() => {});
}
