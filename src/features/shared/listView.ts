import { useStoredView } from "@/lib/useStoredView";

/** A main list's desktop view. Phones always show cards and hide the toggle. */
export type ListView = "cards" | "table";

const VIEWS = ["cards", "table"] as const;

/** A board page's desktop view (Maintenance). Phones show the board as one column at a time, or cards for the table. */
export type BoardView = "board" | "table";

const BOARD_VIEWS = ["board", "table"] as const;

/** The page's saved Cards / Table choice (localStorage key `propertyos.{page}.view`). */
export function useListView(page: string, fallback: ListView) {
  return useStoredView<ListView>(`propertyos.${page}.view`, VIEWS, fallback);
}

/** The page's saved Board / Table choice (same storage key pattern). */
export function useBoardView(page: string, fallback: BoardView) {
  return useStoredView<BoardView>(`propertyos.${page}.view`, BOARD_VIEWS, fallback);
}
