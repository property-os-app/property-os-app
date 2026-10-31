import { useSyncExternalStore } from "react";

/** Below Tailwind's `md` (48rem = 768px): phones get cards instead of tables. */
const PHONE_QUERY = "(max-width: 47.99rem)";

function mediaQuery(): MediaQueryList | null {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia(PHONE_QUERY) : null;
}

function subscribe(onChange: () => void) {
  const query = mediaQuery();
  query?.addEventListener("change", onChange);
  return () => query?.removeEventListener("change", onChange);
}

/** True under 768px wide. Read synchronously on the first render (no flash of the table), updates on resize and rotation. */
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, () => mediaQuery()?.matches ?? false, () => false);
}
