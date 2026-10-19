import type { SortState } from "@/components/organisms";

/** Query keys owned by a list table. Filter keys are the filter names (e.g. "status"). Other keys (like ?month=) are left alone. */
export const SEARCH_KEY = "q";
export const SORT_KEY = "sort";
export const PAGE_KEY = "page";

/**
 * Allowed values per filter: a list, or a check that returns true (valid), false (invalid) or
 * undefined (can't tell yet, e.g. the managers are still loading: the value is kept).
 */
export type FilterValues<F extends Record<string, string>> = {
  [K in keyof F]?: readonly string[] | ((value: string) => boolean | undefined);
};

export interface TableParams<F extends Record<string, string>> {
  search: string;
  filters: F;
  sort: SortState;
  page: number;
}

export interface TableDefaults<F extends Record<string, string>> {
  filters: F;
  sort: SortState;
  sortKeys: readonly string[];
  filterValues?: FilterValues<F>;
}

function isAllowed(check: readonly string[] | ((value: string) => boolean | undefined) | undefined, value: string): boolean {
  if (!check) return true;
  if (typeof check === "function") return check(value) !== false;
  return check.includes(value);
}

/** "balance-desc" -> { key: "balance", direction: "desc" }; null when the format or key is unknown. */
function parseSort(raw: string | null, sortKeys: readonly string[]): SortState {
  const match = raw?.match(/^(.+)-(asc|desc)$/);
  if (!match || !sortKeys.includes(match[1])) return null;
  return { key: match[1], direction: match[2] as "asc" | "desc" };
}

/** Reads a table's state from query params. Missing, unknown or invalid values fall back to the defaults. */
export function readTableParams<F extends Record<string, string>>(params: URLSearchParams, defaults: TableDefaults<F>): TableParams<F> {
  const filters = { ...defaults.filters };
  for (const key of Object.keys(defaults.filters) as (keyof F & string)[]) {
    const raw = params.get(key);
    if (raw !== null && raw !== "" && isAllowed(defaults.filterValues?.[key], raw)) filters[key] = raw as F[typeof key];
  }
  const rawPage = params.get(PAGE_KEY);
  const page = rawPage && /^[1-9]\d{0,5}$/.test(rawPage) ? Number(rawPage) : 1;
  return {
    search: params.get(SEARCH_KEY) ?? "",
    filters,
    sort: parseSort(params.get(SORT_KEY), defaults.sortKeys) ?? defaults.sort,
    page,
  };
}

/** Returns `params` with the table's keys set from `state`. Default values are left out; other keys are kept. */
export function writeTableParams<F extends Record<string, string>>(
  params: URLSearchParams,
  state: TableParams<F>,
  defaults: TableDefaults<F>,
): URLSearchParams {
  const out = new URLSearchParams(params);
  const set = (key: string, value: string | null) => (value === null ? out.delete(key) : out.set(key, value));

  set(SEARCH_KEY, state.search.trim() === "" ? null : state.search);
  for (const key of Object.keys(defaults.filters) as (keyof F & string)[]) {
    set(key, state.filters[key] === defaults.filters[key] ? null : state.filters[key]);
  }
  const sameSort = state.sort?.key === defaults.sort?.key && state.sort?.direction === defaults.sort?.direction;
  set(SORT_KEY, sameSort || !state.sort ? null : `${state.sort.key}-${state.sort.direction}`);
  set(PAGE_KEY, state.page > 1 ? String(state.page) : null);
  return out;
}
