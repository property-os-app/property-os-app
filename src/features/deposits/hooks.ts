import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { depositKeys } from "@/features/deposits/keys";
import { refreshAfterMoneyChange } from "@/features/ledger/hooks";
import { unitKeys } from "@/features/units/keys";
import type { DepositBody, DepositResponse, EndPreview, VoidAfterEndResult } from "@/types/deposit";

const leasePath = (id: string) => `/leases/${encodeURIComponent(id)}`;

/** GET /leases/:id/deposit: the deposit held, its status and the saved settlement (any lease status). */
export function useDeposit(leaseId: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: depositKeys.deposit(leaseId),
    queryFn: ({ signal }) => apiFetch<DepositResponse>(`${leasePath(leaseId)}/deposit`, { signal }),
    enabled: options.enabled,
  });
}

/**
 * PUT /leases/:id/deposit (money.record): saves or replaces the whole settlement. ENDED / TERMINATED only (409 otherwise).
 * Its DEPOSIT payment changes the ledger and the rent roll, so everything money-related is refreshed.
 */
export function useSaveDeposit(leaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: DepositBody) => apiFetch<DepositResponse>(`${leasePath(leaseId)}/deposit`, { method: "PUT", body, retry: false }),
    onSuccess: (saved) => {
      qc.setQueryData(depositKeys.deposit(leaseId), saved);
      refreshAfterMoneyChange(qc);
    },
  });
}

/**
 * GET /leases/:id/end-preview: what ending would void, and what was paid of it. `endedOn` "" = no query (an already ended lease,
 * or a lease that hasn't started: previewed as cancelled). Only runs while `enabled` (a valid date). Nothing is written.
 */
export function useEndPreview(leaseId: string, endedOn: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: depositKeys.endPreview(leaseId, endedOn),
    queryFn: ({ signal }) => apiFetch<EndPreview>(`${leasePath(leaseId)}/end-preview`, { query: { endedOn: endedOn || undefined }, signal }),
    enabled: options.enabled,
    // Keep the last list while the next date loads, so the modal doesn't jump.
    placeholderData: (previous) => previous,
  });
}

/** POST /leases/:id/void-charges-after-end (money.void): voids the rent for months fully after the end of an ENDED / TERMINATED lease. */
export function useVoidChargesAfterEnd(leaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<VoidAfterEndResult>(`${leasePath(leaseId)}/void-charges-after-end`, { method: "POST", retry: false }),
    onSuccess: () => {
      refreshAfterMoneyChange(qc);
      void qc.invalidateQueries({ queryKey: unitKeys.all });
    },
  });
}
