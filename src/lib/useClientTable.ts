import { useMemo, useState } from "react";
import type { SortState } from "@/components/organisms";
import { toCents } from "@/lib/format";
import { compareNatural } from "@/lib/sort";

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
  /** Sortable columns by DataTable column key. */
  sorts?: Record<string, SortColumn<Row>>;
  initialSort?: SortState;
  pageSize?: number;
}

function compare(kind: SortKind, a: string | number, b: string | number): number {
  if (kind === "number") return Number(a) - Number(b);
  if (kind === "money") return toCents(a) - toCents(b);
  if (kind === "date") return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
  return compareNatural(String(a), String(b));
}

/**
 * Search, filters, sort and pagination in memory (the API has none).
 * Changing the search or a filter goes back to page 1. Empty values always sort last.
 */
export function useClientTable<Row, F extends Record<string, string> = Record<string, string>>({
  rows,
  searchText,
  initialFilters,
  matchFilters,
  sorts,
  initialSort = null,
  pageSize = 25,
}: ClientTableOptions<Row, F>) {
  const [search, setSearchState] = useState("");
  const [filters, setFilters] = useState<F>(() => initialFilters ?? ({} as F));
  const [sort, setSortState] = useState<SortState>(initialSort);
  const [page, setPage] = useState(1);

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
  const current = Math.min(page, pageCount);
  const start = (current - 1) * pageSize;
  const pageRows = filteredRows.slice(start, start + pageSize);
  const isFiltered = search.trim() !== "" || JSON.stringify(filters) !== JSON.stringify(initialFilters ?? {});

  return {
    search,
    setSearch: (value: string) => {
      setSearchState(value);
      setPage(1);
    },
    filters,
    setFilter: <K extends keyof F>(key: K, value: F[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      setPage(1);
    },
    /** Clears the search and resets every filter. */
    clearFilters: () => {
      setSearchState("");
      setFilters(initialFilters ?? ({} as F));
      setPage(1);
    },
    /** True when the search or a filter is not at its starting value. */
    isFiltered,
    sort,
    setSort: setSortState,
    page: current,
    setPage,
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
