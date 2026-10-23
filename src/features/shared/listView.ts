import { useStoredView } from "@/lib/useStoredView";

/** A main list's desktop view. Phones always show cards and hide the toggle. */
export type ListView = "cards" | "table";

const VIEWS = ["cards", "table"] as const;

/** The page's saved Cards / Table choice (localStorage key `propertyos.{page}.view`). */
export function useListView(page: string, fallback: ListView) {
  return useStoredView<ListView>(`propertyos.${page}.view`, VIEWS, fallback);
}
