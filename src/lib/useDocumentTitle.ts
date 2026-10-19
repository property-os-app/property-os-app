import { useEffect } from "react";

/** Sets the browser tab title to "<title> · PropertyOS". */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = `${title} · PropertyOS`;
  }, [title]);
}
