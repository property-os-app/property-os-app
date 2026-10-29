import { useCallback } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { ApiError, apiFetch } from "@/lib/api";
import { expenseKeys } from "@/features/expenses/keys";
import { maintenanceKeys } from "@/features/maintenance/keys";
import { vendorKeys } from "@/features/vendors/keys";
import type { Expense, ExpenseCategory, ExpenseCreateBody, ExpenseList, ExpenseListQuery, ExpenseSummary, ExpenseSummaryQuery, ExpenseUpdateBody } from "@/types/expense";

const path = (id: string) => `/expenses/${encodeURIComponent(id)}`;

/** GET /expenses: one page (server-side search, filters, sort and paging). The last page stays on screen while the next loads. */
export function useExpenses(query: ExpenseListQuery, opts: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: expenseKeys.list(query),
    queryFn: ({ signal }) => apiFetch<ExpenseList>("/expenses", { query, signal }),
    placeholderData: keepPreviousData,
    enabled: opts.enabled ?? true,
  });
}

/** GET /expenses/summary: the KPI cards and "By category" for a date range and property. */
export function useExpenseSummary(query: ExpenseSummaryQuery) {
  return useQuery({
    queryKey: expenseKeys.summary(query),
    queryFn: ({ signal }) => apiFetch<ExpenseSummary>("/expenses/summary", { query, signal }),
    placeholderData: keepPreviousData,
  });
}

/** GET /expenses/:id (404 also when out of scope). `placeholder`: the list row, shown until the detail arrives. */
export function useExpense(id: string, placeholder?: Expense) {
  return useQuery({
    queryKey: expenseKeys.detail(id),
    queryFn: ({ signal }) => apiFetch<Expense>(path(id), { signal }),
    placeholderData: placeholder,
  });
}

/** GET /expenses/categories, kept 1 hour (labels and default types come only from here). */
export function useExpenseCategories() {
  return useQuery({
    queryKey: expenseKeys.categories,
    queryFn: ({ signal }) => apiFetch<ExpenseCategory[]>("/expenses/categories", { signal }),
    staleTime: 60 * 60 * 1000,
  });
}

/** Category key -> label from GET /expenses/categories; the key itself until the catalog loads. */
export function useCategoryLabel() {
  const categories = useExpenseCategories();
  return useCallback((key: string) => categories.data?.find((c) => c.key === key)?.label ?? key, [categories.data]);
}

/**
 * After any expense write: the saved detail into the cache, then lists, summaries, vendors (their expenseCount) and tickets
 * (a linked expense's approval, void or amount changes the ticket's actualCost and the maintenance cost KPIs).
 */
function refreshAfterExpenseChange(qc: QueryClient, saved?: Expense) {
  if (saved) qc.setQueryData(expenseKeys.detail(saved.id), saved);
  void qc.invalidateQueries({ queryKey: expenseKeys.all });
  void qc.invalidateQueries({ queryKey: vendorKeys.all });
  void qc.invalidateQueries({ queryKey: maintenanceKeys.all });
}

/** A 409 means someone else changed it ("already approved", "changed at the same time"): refetch so the screen is current. */
function refreshOnConflict(qc: QueryClient, err: unknown) {
  if (err instanceof ApiError && err.status === 409) refreshAfterExpenseChange(qc);
}

/** POST /expenses: APPROVED for the Owner, PENDING_APPROVAL for a manager. */
export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ExpenseCreateBody) => apiFetch<Expense>("/expenses", { method: "POST", body }),
    onSuccess: (saved) => refreshAfterExpenseChange(qc, saved),
    onError: (err) => refreshOnConflict(qc, err),
  });
}

/** PATCH /expenses/:id. A manager saving their REJECTED expense resubmits it (PENDING_APPROVAL), even with an empty body. */
export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ExpenseUpdateBody }) => apiFetch<Expense>(path(id), { method: "PATCH", body }),
    onSuccess: (saved) => refreshAfterExpenseChange(qc, saved),
    onError: (err) => refreshOnConflict(qc, err),
  });
}

export type ExpenseAction = "approve" | "reject" | "void";

/** POST /expenses/:id/approve (no body), /reject and /void (`{ reason }`, 1–300). */
export function useExpenseAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: ExpenseAction; reason?: string }) =>
      apiFetch<Expense>(`${path(id)}/${action}`, { method: "POST", body: action === "approve" ? undefined : { reason } }),
    onSuccess: (saved) => refreshAfterExpenseChange(qc, saved),
    onError: (err) => refreshOnConflict(qc, err),
  });
}

/** DELETE /expenses/:id: only PENDING_APPROVAL or REJECTED (never approved: void those). */
export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<Expense>(path(id), { method: "DELETE" }),
    onSuccess: (_deleted, id) => {
      // The drawer closes; don't refetch the deleted detail (it would 404).
      qc.removeQueries({ queryKey: expenseKeys.detail(id) });
      refreshAfterExpenseChange(qc);
    },
    onError: (err) => refreshOnConflict(qc, err),
  });
}
