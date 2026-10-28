import { useEffect, useEffectEvent, useId, useState } from "react";
import { useSearchParams } from "react-router";
import type { SortState } from "@/components/organisms";
import { readTableParams, SEARCH_KEY, writeTableParams, type FilterValues, type TableDefaults, type TableParams } from "@/lib/tableParams";

export interface ServerTableOptions<F extends Record<string, string>> {
  initialFilters: F;
  /** Allowed values per filter: unknown values from the URL are ignored. */
  filterValues?: FilterValues<F>;
  /** Sortable keys (the DataTable column keys the server can sort by). */
  sortKeys: readonly string[];
  initialSort: SortState;
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

/**
 * List state for a paginated API (the server searches, filters, sorts and pages). The state lives in the URL query with the
 * same keys as useClientTable (?q=&{filter}=&sort=key-dir&page=), so Back, refresh and shared links keep it; every change
 * replaces the history entry without a scroll jump. The search box updates at once and reaches the URL (and the query,
 * via `savedSearch`) after a short pause. A search or filter change goes back to page 1. Build the request from
 * `savedSearch`, `filters`, `sort` and `page`; the rows and page count come from the answer.
 */
export function useServerTable<F extends Record<string, string>>({ initialFilters, filterValues, sortKeys, initialSort }: ServerTableOptions<F>) {
  const [params, setParams] = useSearchParams();
  const defaults: TableDefaults<F> = { filters: initialFilters, sort: initialSort, sortKeys, filterValues };
  const saved = readTableParams(params, defaults);

  const filtersKey = JSON.stringify(saved.filters);
  const filters = useStable(saved.filters, filtersKey);
  const sort = useStable(saved.sort, JSON.stringify(saved.sort));

  const write = (change: Partial<TableParams<F>>) =>
    setParams((prev) => writeTableParams(prev, { ...readTableParams(prev, defaults), ...change }, defaults), { replace: true, preventScrollReset: true });

  // Same pattern as useClientTable: the box shows `search` at once; `seenSearch` tells our own write from an outside change.
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

  const listId = useId();
  const isFiltered = search.trim() !== "" || filtersKey !== JSON.stringify(initialFilters);

  return {
    /** What the search box shows. */
    search,
    setSearch: setSearchState,
    /** The search in the URL (debounced): send this one. */
    savedSearch,
    filters,
    setFilter: <K extends keyof F>(key: K, value: F[K]) => write({ filters: { ...filters, [key]: value }, page: 1 }),
    /** Several filters in one write (e.g. a date preset and its dates). */
    setFilters: (change: Partial<F>) => write({ filters: { ...filters, ...change }, page: 1 }),
    /** Clears the search and resets every filter. */
    clearFilters: () => {
      setSearchState("");
      setSeenSearch("");
      write({ search: "", filters: initialFilters, page: 1 });
    },
    /** Resets every filter but keeps the search (the phone filter sheet). */
    resetFilters: () => write({ filters: initialFilters, page: 1 }),
    isFiltered,
    sort,
    setSort: (next: SortState) => write({ sort: next ?? initialSort, page: 1 }),
    /** The saved page (1 while a typed search waits for the URL). */
    page: searchPending ? 1 : saved.page,
    /** Changes the page; if the top of the `listId` element is out of view, scrolls it back in (below its scroll margin). */
    setPage: (next: number) => {
      write({ page: next });
      const el = document.getElementById(listId);
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
      if (top < margin || top > window.innerHeight) el.scrollIntoView({ block: "start" });
    },
    /** Put as `id` on the element around the table or cards, with `scroll-mt-24`. */
    listId,
  };
}

/** "26–50 of 312" for a server page; "0 results" when empty. */
export function serverPageSummary(page: number, pageSize: number, totalItems: number): string {
  if (totalItems === 0) return "0 results";
  const start = (page - 1) * pageSize + 1;
  return `${Math.min(start, totalItems)}–${Math.min(page * pageSize, totalItems)} of ${totalItems}`;
}
