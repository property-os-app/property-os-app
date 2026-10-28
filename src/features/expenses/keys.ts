import type { ExpenseListQuery, ExpenseSummaryQuery } from "@/types/expense";

/** TanStack Query keys for expenses. Invalidating `all` refreshes lists (the page and each vendor's), summaries and details. */
export const expenseKeys = {
  all: ["expenses"] as const,
  lists: ["expenses", "list"] as const,
  list: (query: ExpenseListQuery) => ["expenses", "list", query] as const,
  summary: (query: ExpenseSummaryQuery) => ["expenses", "summary", query] as const,
  detail: (id: string) => ["expenses", "detail", id] as const,
  /** Outside `all`: the catalog never changes with an expense. */
  categories: ["expense-categories"] as const,
};
