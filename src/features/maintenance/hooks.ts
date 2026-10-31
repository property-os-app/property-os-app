import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { ApiError, apiFetch } from "@/lib/api";
import { expenseKeys } from "@/features/expenses/keys";
import { maintenanceKeys } from "@/features/maintenance/keys";
import { vendorKeys } from "@/features/vendors/keys";
import type {
  MaintenanceTicket,
  TicketCreateBody,
  TicketList,
  TicketListQuery,
  TicketResolveBody,
  TicketSummary,
  TicketSummaryQuery,
  TicketUpdateBody,
} from "@/types/maintenance";

const path = (id: string) => `/maintenance-tickets/${encodeURIComponent(id)}`;

/** GET /maintenance-tickets: one page (server-side search, filters, sort and paging). The last page stays on screen while the next loads. */
export function useTickets(query: TicketListQuery, opts: { enabled?: boolean; keepPrevious?: boolean } = {}) {
  return useQuery({
    queryKey: maintenanceKeys.list(query),
    queryFn: ({ signal }) => apiFetch<TicketList>("/maintenance-tickets", { query, signal }),
    placeholderData: opts.keepPrevious === false ? undefined : keepPreviousData,
    enabled: opts.enabled ?? true,
  });
}

/** GET /maintenance-tickets/summary. `{}` = every ticket the caller can see, year to date (the sidebar badge). */
export function useTicketSummary(query: TicketSummaryQuery) {
  return useQuery({
    queryKey: maintenanceKeys.summary(query),
    queryFn: ({ signal }) => apiFetch<TicketSummary>("/maintenance-tickets/summary", { query, signal }),
    placeholderData: keepPreviousData,
  });
}

/** GET /maintenance-tickets/:id (404 also when out of scope). `placeholder`: the list row, shown until the detail arrives. */
export function useTicket(id: string, placeholder?: MaintenanceTicket) {
  return useQuery({
    queryKey: maintenanceKeys.detail(id),
    queryFn: ({ signal }) => apiFetch<MaintenanceTicket>(path(id), { signal }),
    placeholderData: placeholder,
  });
}

/**
 * After any ticket write: the saved ticket into the cache, then every ticket query (board, table, summaries, badge, vendor
 * tabs), vendors (rating, jobs, active tickets) and expenses (a resolve with a cost records one; actualCost follows them).
 */
export function refreshAfterTicketChange(qc: QueryClient, saved?: MaintenanceTicket) {
  if (saved) qc.setQueryData(maintenanceKeys.detail(saved.id), saved);
  void qc.invalidateQueries({ queryKey: maintenanceKeys.all });
  void qc.invalidateQueries({ queryKey: vendorKeys.all });
  void qc.invalidateQueries({ queryKey: expenseKeys.all });
}

/** A 409 (changed meanwhile, someone else acted first) or 403 (a permission was just turned off): refetch so the screen shows the current state. */
function refreshOnConflict(qc: QueryClient, err: unknown) {
  if (err instanceof ApiError && (err.status === 409 || err.status === 403)) refreshAfterTicketChange(qc);
}

/** POST /maintenance-tickets: ASSIGNED with a vendorId, else OPEN. */
export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: TicketCreateBody) => apiFetch<MaintenanceTicket>("/maintenance-tickets", { method: "POST", body }),
    onSuccess: (saved) => refreshAfterTicketChange(qc, saved),
    onError: (err) => refreshOnConflict(qc, err),
  });
}

/** PATCH /maintenance-tickets/:id (active: details; RESOLVED: only resolutionNote / vendorRating). */
export function useUpdateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: TicketUpdateBody }) => apiFetch<MaintenanceTicket>(path(id), { method: "PATCH", body }),
    onSuccess: (saved) => refreshAfterTicketChange(qc, saved),
    onError: (err) => refreshOnConflict(qc, err),
  });
}

/** The action routes and their bodies. */
export type TicketAction =
  | { action: "assign"; body: { vendorId: string } }
  | { action: "unassign" | "start" | "reopen"; body?: undefined }
  | { action: "resolve"; body: TicketResolveBody }
  | { action: "cancel"; body: { reason: string } };

/** POST /maintenance-tickets/:id/{assign | unassign | start | resolve | reopen | cancel}. */
export function useTicketAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, body }: { id: string } & TicketAction) => apiFetch<MaintenanceTicket>(`${path(id)}/${action}`, { method: "POST", body }),
    onSuccess: (saved) => refreshAfterTicketChange(qc, saved),
    onError: (err) => refreshOnConflict(qc, err),
  });
}
