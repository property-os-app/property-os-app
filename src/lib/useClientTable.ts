import { useEffect, useEffectEvent, useId, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import type { SortState } from "@/components/organisms";
import { toCents } from "@/lib/format";
import { compareNatural } from "@/lib/sort";
import { readTableParams, SEARCH_KEY, writeTableParams, type FilterValues, type TableDefaults, type TableParams } from "@/lib/tableParams";

/** How a column sorts: text (A→Z, "2" before "10"), number, money (API string, via toCents) or a "YYYY-MM-DD" date (as a string). */
export type SortKind = "text" | "number" | "money" | "date";

export interface SortColumn<Row> {
  kind: SortKind;
  value: (row: Row) => string | number | null | undefined;
}

export interface ClientTableOptions<Row, F extends Record<string, string>> {
  /** All rows from the API (undefined while loading). */
  rows: Row[] | undefined;
  /** Texts the search box looks in (case-insensitive "contains"). */
  searchText?: (row: Row) => (string | null | undefined)[];
  /** Filter values (e.g. { type: "all" }) and the test for one row. */
  initialFilters?: F;
  matchFilters?: (row: Row, filters: F) => boolean;
  /** Allowed values per filter: unknown values from the URL are ignored. */
  filterValues?: FilterValues<F>;
  /** Sortable columns by DataTable column key. */
  sorts?: Record<string, SortColumn<Row>>;
  initialSort?: SortState;
  pageSize?: number;
  /** Keep search, filters, sort and page in the URL query (list pages). Off: kept in memory (a table inside a page). */
  inUrl?: boolean;
}

const SEARCH_DEBOUNCE_MS = 300;

/** Returns the same object while `key` is unchanged (parsed URL values are new objects on every render). */
function useStable<T>(value: T, key: string): T {
  const [kept, setKept] = useState({ key, value });
  if (kept.key !== key) {
    setKept({ key, value });
    return value;
  }
  return kept.value;
}

function compare(kind: SortKind, a: string | number, b: string | number): number {
  if (kind === "number") return Number(a) - Number(b);
  if (kind === "money") return toCents(a) - toCents(b);
  if (kind === "date") return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
  return compareNatural(String(a), String(b));
}

/**
 * Search, filters, sort and pagination in memory (the API has none).
 * With `inUrl` the state lives in the query (?q=olivia&status=OVERDUE&sort=balance-desc&page=2), so Back, refresh and
 * shared links keep it. Every change replaces the history entry and keeps the scroll position; the search box reaches
 * the URL after a short pause. Changing the search or a filter goes back to page 1. Empty values always sort last.
 */
export function useClientTable<Row, F extends Record<string, string> = Record<string, string>>({
  rows,
  searchText,
  initialFilters,
  matchFilters,
  filterValues,
  sorts,
  initialSort = null,
  pageSize = 25,
  inUrl = false,
}: ClientTableOptions<Row, F>) {
  const [urlParams, setUrlParams] = useSearchParams();
  const [memoryParams, setMemoryParams] = useState(() => new URLSearchParams());
  const params = inUrl ? urlParams : memoryParams;

  const defaults: TableDefaults<F> = {
    filters: initialFilters ?? ({} as F),
    sort: initialSort,
    sortKeys: Object.keys(sorts ?? {}),
    filterValues,
  };
  const saved = readTableParams(params, defaults);

  const filtersKey = JSON.stringify(saved.filters);
  const filters = useStable(saved.filters, filtersKey);
  const sort = useStable(saved.sort, JSON.stringify(saved.sort));

  /** Merges `change` into the saved state and writes it (URL: replace, no scroll reset). */
  const write = (change: Partial<TableParams<F>>) => {
    const update = (prev: URLSearchParams) => writeTableParams(prev, { ...readTableParams(prev, defaults), ...change }, defaults);
    if (inUrl) setUrlParams(update, { replace: true, preventScrollReset: true });
    else setMemoryParams(update);
  };

  // The search box shows `search` at once; the URL gets it after a pause. `seenSearch` is the last saved value we know,
  // so a change from outside (Back, a sidebar link without a query) replaces the box text, but our own write doesn't.
  const savedSearch = params.get(SEARCH_KEY) ?? "";
  const [search, setSearchState] = useState(savedSearch);
  const [seenSearch, setSeenSearch] = useState(savedSearch);
  if (savedSearch !== seenSearch) {
    setSeenSearch(savedSearch);
    setSearchState(savedSearch);
  }
  const searchPending = search !== savedSearch && !(search.trim() === "" && savedSearch === "");
  const commitSearch = useEffectEvent((value: string) => {
    setSeenSearch(value.trim() === "" ? "" : value);
    write({ search: value, page: 1 });
  });
  useEffect(() => {
    if (!searchPending) return;
    const timer = setTimeout(() => commitSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, searchPending]);

  // Id for the element around the table or cards: a page change scrolls its top back into view.
  const listId = useId();

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    let out = (rows ?? []).filter((row) => {
      if (matchFilters && !matchFilters(row, filters)) return false;
      if (!term || !searchText) return true;
      return searchText(row).some((text) => text?.toLowerCase().includes(term));
    });
    const column = sort ? sorts?.[sort.key] : undefined;
    if (sort && column) {
      const dir = sort.direction === "asc" ? 1 : -1;
      out = [...out].sort((ra, rb) => {
        const a = column.value(ra);
        const b = column.value(rb);
        const aEmpty = a === null || a === undefined || a === "";
        const bEmpty = b === null || b === undefined || b === "";
        if (aEmpty || bEmpty) return aEmpty === bEmpty ? 0 : aEmpty ? 1 : -1;
        return compare(column.kind, a, b) * dir;
      });
    }
    return out;
  }, [rows, search, filters, matchFilters, searchText, sort, sorts]);

  const total = filteredRows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  // While a typed search waits for the URL, show page 1 of the new results.
  const current = Math.min(searchPending ? 1 : saved.page, pageCount);
  const start = (current - 1) * pageSize;
  const pageRows = filteredRows.slice(start, start + pageSize);
  const isFiltered = search.trim() !== "" || filtersKey !== JSON.stringify(defaults.filters);
  const activeFilterCount = Object.keys(defaults.filters).filter((key) => filters[key] !== defaults.filters[key]).length;

  return {
    search,
    setSearch: setSearchState,
    filters,
    setFilter: <K extends keyof F>(key: K, value: F[K]) => write({ filters: { ...filters, [key]: value }, page: 1 }),
    /** Clears the search and resets every filter. */
    clearFilters: () => {
      setSearchState("");
      setSeenSearch("");
      write({ search: "", filters: defaults.filters, page: 1 });
    },
    /** Resets every filter but keeps the search (the phone filter sheet). */
    resetFilters: () => write({ filters: defaults.filters, page: 1 }),
    /** True when the search or a filter is not at its starting value. */
    isFiltered,
    /** Filters not at their starting value (search not counted): the phone "Filters" button count. */
    activeFilterCount,
    sort,
    setSort: (next: SortState) => write({ sort: next }),
    page: current,
    /** Changes the page; if the top of the `listId` element is out of view, scrolls it back in (below its scroll margin). */
    setPage: (next: number) => {
      write({ page: next });
      const el = document.getElementById(listId);
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
      if (top < margin || top > window.innerHeight) el.scrollIntoView({ block: "start" });
    },
    /** Put as `id` on the element around the table or cards, with `scroll-mt-24` so it stops below the sticky Topbar. */
    listId,
    pageCount,
    /** Show Pagination only when this is true (more than one page). */
    showPagination: pageCount > 1,
    /** "1–25 of 40". */
    summary: total === 0 ? "0 results" : `${start + 1}–${Math.min(start + pageSize, total)} of ${total}`,
    /** All rows after search and filters, before paging. */
    filteredRows,
    /** The rows of the current page. */
    pageRows,
    total,
  };
}
