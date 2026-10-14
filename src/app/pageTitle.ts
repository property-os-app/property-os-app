import { createContext, useContext, useEffect } from "react";
import type { ModuleKey } from "@/components/organisms";

/** Set by AppLayout: lets a page replace its route title (e.g. with the property name). */
export const PageTitleContext = createContext<(title: string | null) => void>(() => {});

/** Shows `title` in the Topbar and the browser tab instead of the route title, while the page is mounted. */
export function usePageTitle(title: string | undefined): void {
  const setTitle = useContext(PageTitleContext);
  useEffect(() => {
    setTitle(title ?? null);
    return () => setTitle(null);
  }, [title, setTitle]);
}

/** Set by AppLayout: lets a page replace its route's Sidebar item. */
export const PageNavContext = createContext<(nav: ModuleKey | null) => void>(() => {});

/** Highlights `nav` in the Sidebar instead of the route's `handle.nav`, while the page is mounted. */
export function usePageNav(nav: ModuleKey | undefined): void {
  const setNav = useContext(PageNavContext);
  useEffect(() => {
    setNav(nav ?? null);
    return () => setNav(null);
  }, [nav, setNav]);
}
