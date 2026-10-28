import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { expenseKeys } from "@/features/expenses/keys";
import { vendorKeys } from "@/features/vendors/keys";
import type { Vendor, VendorCreateBody, VendorTrade, VendorUpdateBody } from "@/types/vendor";

const path = (id: string) => `/vendors/${encodeURIComponent(id)}`;

/** GET /vendors?includeArchived=true: every vendor (no paging, not scoped). The page searches and filters on the client. */
export function useVendors() {
  return useQuery({
    queryKey: vendorKeys.list,
    queryFn: ({ signal }) => apiFetch<Vendor[]>("/vendors", { query: { includeArchived: true }, signal }),
  });
}

/** GET /vendors/:id (archived or not). `placeholder`: the list row, shown until the detail arrives. */
export function useVendor(id: string, placeholder?: Vendor) {
  return useQuery({
    queryKey: vendorKeys.detail(id),
    queryFn: ({ signal }) => apiFetch<Vendor>(path(id), { signal }),
    placeholderData: placeholder,
  });
}

/** GET /vendors/trades, kept 1 hour (labels come only from here). */
export function useVendorTrades() {
  return useQuery({
    queryKey: vendorKeys.trades,
    queryFn: ({ signal }) => apiFetch<VendorTrade[]>("/vendors/trades", { signal }),
    staleTime: 60 * 60 * 1000,
  });
}

/** Trade key -> label from GET /vendors/trades; the key itself until the catalog loads. */
export function useTradeLabel() {
  const trades = useVendorTrades();
  return useCallback((key: string) => trades.data?.find((t) => t.key === key)?.label ?? key, [trades.data]);
}

/** After a vendor change: the saved detail into the cache, the list, and expenses (they embed the vendor's name and trade). */
function refreshAfterVendorChange(qc: QueryClient, saved?: Vendor, withExpenses = true) {
  if (saved) qc.setQueryData(vendorKeys.detail(saved.id), saved);
  void qc.invalidateQueries({ queryKey: vendorKeys.all });
  if (withExpenses) void qc.invalidateQueries({ queryKey: expenseKeys.all });
}

/** POST /vendors. 409 on a name clash (the message says to unarchive when the other vendor is archived). */
export function useCreateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: VendorCreateBody) => apiFetch<Vendor>("/vendors", { method: "POST", body }),
    onSuccess: (saved) => refreshAfterVendorChange(qc, saved, false),
  });
}

/** PATCH /vendors/:id (archived ones too). The rate pair is checked against the saved values. */
export function useUpdateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: VendorUpdateBody }) => apiFetch<Vendor>(path(id), { method: "PATCH", body }),
    onSuccess: (saved) => refreshAfterVendorChange(qc, saved),
  });
}

/** POST /vendors/:id/archive or /unarchive. */
export function useArchiveVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, archive }: { id: string; archive: boolean }) =>
      apiFetch<Vendor>(`${path(id)}/${archive ? "archive" : "unarchive"}`, { method: "POST" }),
    onSuccess: (saved) => refreshAfterVendorChange(qc, saved),
  });
}

/** DELETE /vendors/:id: only while expenseCount is 0 (409 otherwise: "… Archive it instead."). */
export function useDeleteVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<Vendor>(path(id), { method: "DELETE" }),
    onSuccess: (_deleted, id) => {
      qc.removeQueries({ queryKey: vendorKeys.detail(id) });
      void qc.invalidateQueries({ queryKey: vendorKeys.list });
    },
  });
}
