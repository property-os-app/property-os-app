import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { leaseKeys, rentRollPrefix } from "@/features/leases/keys";
import { tenantKeys } from "@/features/tenants/keys";
import type { Charge, ChargeCreateBody, LedgerResponse, Payment, PaymentCreateBody, VoidBody } from "@/types/ledger";

const leasePath = (id: string) => `/leases/${encodeURIComponent(id)}`;

/**
 * After any charge, payment, void or rent generation: the rent roll, every lease query (lists, details, ledgers:
 * balances change) and tenants (their lease cards show balances).
 */
export function refreshAfterMoneyChange(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: rentRollPrefix });
  void qc.invalidateQueries({ queryKey: leaseKeys.all });
  void qc.invalidateQueries({ queryKey: tenantKeys.all });
}

/** GET /leases/:id/ledger: entries oldest first, voided ones included, plus the summary. Works for any lease status. */
export function useLedger(leaseId: string) {
  return useQuery({
    queryKey: leaseKeys.ledger(leaseId),
    queryFn: ({ signal }) => apiFetch<LedgerResponse>(`${leasePath(leaseId)}/ledger`, { signal }),
  });
}

/** POST /leases/:id/charges. 409 on a DRAFT lease or "Rent for {month} already exists". */
export function useAddCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leaseId, body }: { leaseId: string; body: ChargeCreateBody }) =>
      apiFetch<Charge>(`${leasePath(leaseId)}/charges`, { method: "POST", body }),
    onSuccess: () => refreshAfterMoneyChange(qc),
  });
}

/** POST /leases/:id/payments. Overpayment is allowed (balance goes negative). 409 on a DRAFT lease. */
export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leaseId, body }: { leaseId: string; body: PaymentCreateBody }) =>
      apiFetch<Payment>(`${leasePath(leaseId)}/payments`, { method: "POST", body }),
    onSuccess: () => refreshAfterMoneyChange(qc),
  });
}

/** POST /leases/:id/charges/:chargeId/void (OWNER). 409 "Charge {number} is already voided". */
export function useVoidCharge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leaseId, chargeId, body }: { leaseId: string; chargeId: string; body: VoidBody }) =>
      apiFetch<Charge>(`${leasePath(leaseId)}/charges/${encodeURIComponent(chargeId)}/void`, { method: "POST", body }),
    onSuccess: () => refreshAfterMoneyChange(qc),
  });
}

/** POST /leases/:id/payments/:paymentId/void (OWNER). 409 "Payment {number} is already voided". */
export function useVoidPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leaseId, paymentId, body }: { leaseId: string; paymentId: string; body: VoidBody }) =>
      apiFetch<Payment>(`${leasePath(leaseId)}/payments/${encodeURIComponent(paymentId)}/void`, { method: "POST", body }),
    onSuccess: () => refreshAfterMoneyChange(qc),
  });
}
