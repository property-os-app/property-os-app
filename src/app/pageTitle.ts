import { createContext, useContext, useEffect } from "react";

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
