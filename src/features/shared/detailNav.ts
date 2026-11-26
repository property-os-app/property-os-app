/** Navigation hooks for the detail pages (lease, tenant, unit): going back like the back arrow, and the tab kept in ?tab=. */
import { useLocation, useNavigate, useSearchParams } from "react-router";
import type { Crumb } from "@/features/shared/DetailParts";

/** React Router keeps the history index in history.state; above 0 means there is an in-app page to go back to. */
const hasAppHistory = () => ((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0;

/**
 * Leave a detail page the way its back arrow does: back in history when `backInHistory` and there is an in-app entry,
 * else to `parent.to`. Also used after a Delete. `canGoBack()`: whether it would go back in history.
 */
export function useGoBack(parent: Crumb, backInHistory: boolean) {
  const navigate = useNavigate();
  const canGoBack = () => backInHistory && hasAppHistory();
  const goBack = () => void (canGoBack() ? navigate(-1) : navigate(parent.to));
  return { goBack, canGoBack };
}

/** The tab from ?tab= (unknown or hidden: the first), and a setter that keeps the router state (Back still knows the origin). */
export function useTabParam<T extends string>(tabs: readonly T[]) {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab") as T | null;
  const tab: T = raw && tabs.includes(raw) ? raw : tabs[0];
  const setTab = (next: T) =>
    setParams(
      (prev) => {
        const out = new URLSearchParams(prev);
        out.set("tab", next);
        return out;
      },
      { replace: true, preventScrollReset: true, state: location.state },
    );
  return [tab, setTab] as const;
}
