/** The Expenses page filters and the GET /expenses and /expenses/summary queries built from them (unit-tested). */
import type { SortState } from "@/components/organisms";
import { RANGE_PRESETS, resolveRange, type DateRange, type RangePreset } from "@/features/expenses/dateRange";
import type { ExpenseListQuery, ExpenseStatus, ExpenseSummaryQuery } from "@/types/expense";

/** URL filter values. "all" / "0" are the defaults (left out of the URL). from / to only count with range "custom". */
export type ExpenseFilters = {
  /** "1": portfolio-wide expenses only (Owner). */
  portfolio: "0" | "1";
  category: string;
  vendor: string;
  status: "all" | ExpenseStatus;
  range: RangePreset;
  from: string;
  to: string;
  voided: "0" | "1";
};

export const initialExpenseFilters: ExpenseFilters = {
  portfolio: "0",
  category: "all",
  vendor: "all",
  status: "all",
  range: "ytd",
  from: "",
  to: "",
  voided: "0",
};

export const EXPENSE_STATUSES: ExpenseStatus[] = ["PENDING_APPROVAL", "APPROVED", "REJECTED"];
export const EXPENSE_SORT_KEYS = ["date", "amount"] as const;
export const DEFAULT_EXPENSE_SORT: SortState = { key: "date", direction: "desc" };
export const EXPENSE_PAGE_SIZE = 25;

const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

/** Allowed URL values per filter. Category and vendor are checked against their lists once loaded. */
export function expenseFilterValues(opts: { isOwner: boolean; categories?: string[]; vendors?: string[] }) {
  const inList = (list?: string[]) => (v: string) => (list ? list.includes(v) : undefined);
  return {
    portfolio: opts.isOwner ? ["0", "1"] : ["0"],
    category: inList(opts.categories),
    vendor: inList(opts.vendors),
    status: EXPENSE_STATUSES,
    range: RANGE_PRESETS,
    from: isDate,
    to: isDate,
    voided: ["0", "1"],
  };
}

/** Filters the user changed (search not counted; from / to are part of the range): the phone "Filters" count. */
export function activeExpenseFilterCount(f: ExpenseFilters): number {
  const keys = ["portfolio", "category", "vendor", "status", "range", "voided"] as const;
  return keys.filter((k) => f[k] !== initialExpenseFilters[k]).length;
}

export interface ExpenseQueryInput {
  /** The saved (debounced) search. */
  search: string;
  filters: ExpenseFilters;
  sort: SortState;
  page: number;
  pageSize?: number;
  /** The sidebar scope: a property id, or null for every property. */
  scope: string | null;
  isOwner: boolean;
  /** Local "YYYY-MM-DD". */
  today: string;
}

/** The range for the filters (the server has no default range on the list, so it is always sent). */
export function expenseRange(f: ExpenseFilters, today: string): DateRange {
  return resolveRange(f.range, f.from, f.to, today);
}

/** True when the Owner's "Portfolio-wide only" is on (ignored for managers: the server would answer 403). */
export function isPortfolioOnly(f: ExpenseFilters, isOwner: boolean): boolean {
  return isOwner && f.portfolio === "1";
}

/**
 * GET /expenses query. Always sends from / to. "Portfolio-wide only" sends allProperties=true and never propertyId
 * (the server rejects both together); otherwise the scope is the propertyId. Defaults (newest first, no voided) are left out.
 */
export function expenseQuery(input: ExpenseQueryInput): ExpenseListQuery {
  const { filters: f, sort } = input;
  const range = expenseRange(f, input.today);
  const portfolio = isPortfolioOnly(f, input.isOwner);
  const q: ExpenseListQuery = { page: input.page, pageSize: input.pageSize ?? EXPENSE_PAGE_SIZE, from: range.from, to: range.to };
  const search = input.search.trim();
  if (search) q.search = search;
  if (portfolio) q.allProperties = true;
  else if (input.scope) q.propertyId = input.scope;
  if (f.category !== "all") q.category = f.category;
  if (f.vendor !== "all") q.vendorId = f.vendor;
  if (f.status !== "all") q.status = f.status;
  if (f.voided === "1") q.includeVoided = true;
  if (sort && (sort.key === "date" || sort.key === "amount")) {
    if (sort.key !== "date") q.sort = sort.key;
    if (sort.direction !== "desc") q.order = sort.direction;
  }
  return q;
}

/**
 * GET /expenses/summary query: the date range and the property only (other filters don't change the KPIs).
 * The summary can't be limited to portfolio-wide expenses, so "Portfolio-wide only" leaves out propertyId (every expense).
 */
export function expenseSummaryQuery(input: Pick<ExpenseQueryInput, "filters" | "scope" | "isOwner" | "today">): ExpenseSummaryQuery {
  const range = expenseRange(input.filters, input.today);
  const q: ExpenseSummaryQuery = { from: range.from, to: range.to };
  if (!isPortfolioOnly(input.filters, input.isOwner) && input.scope) q.propertyId = input.scope;
  return q;
}
